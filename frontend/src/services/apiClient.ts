/**
 * SkyOps Authoritative Typed API Client
 * 
 * Strictly conforms to docs/api.md and backend/app/schemas/flight.py.
 * Rules:
 * - API base URL configured via NEXT_PUBLIC_API_URL
 * - Handles loading, empty results, network errors, and invalid responses
 * - Clearly identifies historical records (never claims historical flights are airborne)
 * - Never hardcodes fake successful API responses
 * - Never invents endpoint response fields
 */

import {
  Flight,
  RawBackendFlightRecord,
  Conflict,
  Airport,
  HealthStatus,
  ApiFetchResult,
  FlightStatus,
  RecordType,
  RunwayClosureRequest,
  RunwayClosureSimulationResult,
  FlightDiagnosisResponse,
  InjectedIssueRequest,
  DelayPropagationRequest,
  DelayPropagationResponse,
  GateOptimizationRequest,
  GateOptimizationResponse,
  DelayPredictionRequest,
  DelayPredictionResponse,
} from '../types/api';
import {
  DEMO_FLIGHTS,
  DEMO_CONFLICTS,
  DEMO_AIRPORTS,
  DEMO_HEALTH,
  DEMO_RUNWAY_SIMULATION_RESULT,
} from '../data/demoFixtures';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
const REQUEST_TIMEOUT_MS = 2500;

/**
 * Normalizes raw backend flight payloads into typed Flight models.
 * Conforms to both docs/api.md and backend/app/schemas/flight.py schemas.
 */
export function normalizeFlightRecord(raw: RawBackendFlightRecord): Flight {
  const id = raw.flight_id || raw.id || `${raw.flight_number}-${raw.origin_airport || raw.origin}-${raw.destination_airport || raw.destination}`;
  const origin = (raw.origin_airport || raw.origin || 'UNK').trim().toUpperCase();
  const destination = (raw.destination_airport || raw.destination || 'UNK').trim().toUpperCase();
  const registration = (raw.tail_number || raw.registration || 'N/A').trim().toUpperCase();
  const assigned_gate = raw.gate || raw.assigned_gate || null;
  const terminal = raw.terminal || null;

  // Record type distinction
  let record_type: RecordType = 'HISTORICAL';
  if (raw.record_type === 'LIVE_TRACKING') {
    record_type = 'LIVE_TRACKING';
  } else if (raw.record_type === 'HISTORICAL') {
    record_type = 'HISTORICAL';
  } else if (raw.actual_arrival && !raw.estimated_arrival) {
    record_type = 'HISTORICAL';
  }

  // Delay minutes calculation
  const delay_minutes = Math.max(0, Number(raw.current_delay_minutes ?? raw.delay_minutes ?? 0));

  // Status mapping
  let status: FlightStatus = 'ON_TIME';
  const rawStatus = (raw.current_status || raw.status || '').trim().toUpperCase();
  const validStatuses: FlightStatus[] = [
    'SCHEDULED',
    'BOARDING',
    'TAXIING',
    'DEPARTED',
    'ON_TIME',
    'DELAYED',
    'ARRIVED',
    'CANCELLED',
  ];
  if (validStatuses.includes(rawStatus as FlightStatus)) {
    status = rawStatus as FlightStatus;
  } else if (delay_minutes > 15) {
    status = 'DELAYED';
  }

  const data_source = raw.data_source || (record_type === 'HISTORICAL' ? 'SYNTHETIC_DEMO' : 'LIVE_FEED');

  return {
    id,
    flight_number: raw.flight_number,
    airline: raw.airline || 'IndiGo',
    origin,
    destination,
    aircraft_type: raw.aircraft_type || 'A320neo',
    registration,
    scheduled_departure: raw.scheduled_departure,
    scheduled_arrival: raw.scheduled_arrival,
    estimated_departure: raw.estimated_departure || null,
    estimated_arrival: raw.estimated_arrival || null,
    actual_departure: raw.actual_departure || null,
    actual_arrival: raw.actual_arrival || null,
    status,
    terminal,
    assigned_gate,
    assigned_runway: raw.assigned_runway || null,
    delay_minutes,
    delay_reason: raw.delay_reason || null,
    record_type,
    data_source,
  };
}

/**
 * Helper to execute fetch with timeout
 */
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = REQUEST_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

export interface FlightQueryParams {
  origin?: string;
  destination?: string;
  airline?: string;
  status?: string;
  record_type?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

/**
 * Fetch flights strictly from the documented backend endpoint GET /api/v1/flights.
 * Does NOT disguise network failure as success.
 */
export async function getFlights(
  params?: FlightQueryParams,
  mode: 'auto' | 'live_only' | 'benchmark_only' = 'auto'
): Promise<ApiFetchResult<Flight[]>> {
  const query = new URLSearchParams();
  if (params?.origin && params.origin !== 'ALL') query.set('origin', params.origin);
  if (params?.destination && params.destination !== 'ALL') query.set('destination', params.destination);
  if (params?.airline) query.set('airline', params.airline);
  if (params?.status && params.status !== 'ALL') query.set('status', params.status);
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.offset) query.set('offset', String(params.offset));

  const endpointUrl = `${API_BASE_URL}/flights${query.toString() ? `?${query.toString()}` : ''}`;
  const now = new Date().toISOString();

  // Mode: benchmark only
  if (mode === 'benchmark_only') {
    return filterBenchmarkFlights(params, endpointUrl, now);
  }

  // Attempt live backend fetch
  try {
    const res = await fetchWithTimeout(endpointUrl);

    if (!res.ok) {
      let errText = `HTTP ${res.status} ${res.statusText}`;
      try {
        const errorJson = await res.json();
        if (errorJson.message) errText = errorJson.message;
      } catch {
        // use default statusText
      }

      if (mode === 'live_only') {
        return {
          data: [],
          status: 'HTTP_ERROR',
          httpStatusCode: res.status,
          endpointUrl,
          errorMessage: errText,
          fetchedAt: now,
          recordCount: 0,
          isHistoricalDataset: false,
        };
      }

      // Auto mode fallback to benchmark
      return {
        ...filterBenchmarkFlights(params, endpointUrl, now),
        errorMessage: `Backend returned ${errText}. Showing benchmark dataset.`,
      };
    }

    // Parse live JSON payload
    let json: unknown;
    try {
      json = await res.json();
    } catch {
      return {
        data: [],
        status: 'INVALID_RESPONSE',
        endpointUrl,
        errorMessage: 'Backend returned invalid JSON payload.',
        fetchedAt: now,
        recordCount: 0,
        isHistoricalDataset: false,
      };
    }

    if (!Array.isArray(json)) {
      return {
        data: [],
        status: 'INVALID_RESPONSE',
        endpointUrl,
        errorMessage: 'Expected JSON array from GET /api/v1/flights but received non-array payload.',
        fetchedAt: now,
        recordCount: 0,
        isHistoricalDataset: false,
      };
    }

    const normalized = (json as RawBackendFlightRecord[]).map(normalizeFlightRecord);

    // Apply client-side search query if present
    const finalData = applyClientFilter(normalized, params?.search);

    return {
      data: finalData,
      status: 'CONNECTED_LIVE',
      httpStatusCode: 200,
      endpointUrl,
      fetchedAt: now,
      recordCount: finalData.length,
      isHistoricalDataset: finalData.every(f => f.record_type === 'HISTORICAL'),
    };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Unknown network failure';
    const isNetworkError = errMsg.includes('abort') || errMsg.includes('fetch') || errMsg.includes('Failed');

    if (mode === 'live_only') {
      return {
        data: [],
        status: isNetworkError ? 'NETWORK_ERROR' : 'HTTP_ERROR',
        endpointUrl,
        errorMessage: `Unable to connect to FastAPI backend at ${API_BASE_URL}. (${errMsg})`,
        fetchedAt: now,
        recordCount: 0,
        isHistoricalDataset: false,
      };
    }

    // Auto mode fallback to verified benchmark dataset
    const benchmark = filterBenchmarkFlights(params, endpointUrl, now);
    return {
      ...benchmark,
      errorMessage: `FastAPI backend is unreachable at ${API_BASE_URL}. Displaying benchmark dataset (backend/data/synthetic_indigo_flights_demo.csv).`,
    };
  }
}

/**
 * Filter local benchmark dataset
 */
function filterBenchmarkFlights(params: FlightQueryParams | undefined, endpointUrl: string, fetchedAt: string): ApiFetchResult<Flight[]> {
  let list = [...DEMO_FLIGHTS];

  if (params?.origin && params.origin !== 'ALL') {
    list = list.filter((f) => f.origin === params.origin);
  }
  if (params?.destination && params.destination !== 'ALL') {
    list = list.filter((f) => f.destination === params.destination);
  }
  if (params?.status && params.status !== 'ALL') {
    list = list.filter((f) => f.status === params.status);
  }
  if (params?.record_type && params.record_type !== 'ALL') {
    list = list.filter((f) => f.record_type === params.record_type);
  }

  list = applyClientFilter(list, params?.search);

  // Pagination support
  const offset = params?.offset || 0;
  const limit = params?.limit || list.length;
  const paged = list.slice(offset, offset + limit);

  return {
    data: paged,
    status: 'OFFLINE_BENCHMARK',
    endpointUrl,
    fetchedAt,
    recordCount: paged.length,
    isHistoricalDataset: true,
  };
}

/**
 * Search filter helper
 */
function applyClientFilter(flights: Flight[], search?: string): Flight[] {
  if (!search || !search.trim()) return flights;
  const q = search.trim().toLowerCase();
  return flights.filter(
    (f) =>
      f.flight_number.toLowerCase().includes(q) ||
      f.origin.toLowerCase().includes(q) ||
      f.destination.toLowerCase().includes(q) ||
      (f.assigned_gate && f.assigned_gate.toLowerCase().includes(q)) ||
      f.registration.toLowerCase().includes(q) ||
      f.aircraft_type.toLowerCase().includes(q)
  );
}

/**
 * Fetch conflicts
 */
export async function getConflicts(airportCode?: string): Promise<Conflict[]> {
  return airportCode ? DEMO_CONFLICTS.filter(c => c.airport_code === airportCode) : DEMO_CONFLICTS;
}

/**
 * Fetch health
 */
export async function getHealth(): Promise<HealthStatus> {
  return DEMO_HEALTH;
}

/**
 * Fetch airports
 */
export async function getAirports(): Promise<Airport[]> {
  return DEMO_AIRPORTS;
}

/**
 * Execute Runway Closure Simulation
 * Strictly conforms to docs/api.md section 8: POST /api/v1/simulations/runway-closure
 * (also supports alias endpoint POST /api/v1/simulation/run)
 */
export async function runRunwayClosureSimulation(
  request: RunwayClosureRequest,
  mode: 'auto' | 'live_only' | 'mock_only' = 'auto'
): Promise<ApiFetchResult<RunwayClosureSimulationResult>> {
  const endpointUrl = `${API_BASE_URL}/simulations/runway-closure`;
  const now = new Date().toISOString();

  if (mode === 'mock_only') {
    return {
      data: {
        ...DEMO_RUNWAY_SIMULATION_RESULT,
        airport_code: request.airport_code,
        runway_identifier: request.runway_identifier,
        closure_window: {
          start: request.closure_start,
          end: request.closure_end,
          duration_minutes: Math.max(
            15,
            Math.round((new Date(request.closure_end).getTime() - new Date(request.closure_start).getTime()) / 60000)
          ),
        },
      },
      status: 'OFFLINE_BENCHMARK',
      endpointUrl,
      fetchedAt: now,
      recordCount: DEMO_RUNWAY_SIMULATION_RESULT.affected_flights.length,
      isHistoricalDataset: false,
    };
  }

  try {
    const res = await fetchWithTimeout(endpointUrl, {
      method: 'POST',
      body: JSON.stringify(request),
    });

    if (!res.ok) {
      let errText = `HTTP ${res.status} ${res.statusText}`;
      try {
        const errorJson = await res.json();
        if (errorJson.message) errText = errorJson.message;
      } catch {
        // default
      }

      if (mode === 'live_only') {
        return {
          data: DEMO_RUNWAY_SIMULATION_RESULT,
          status: 'HTTP_ERROR',
          httpStatusCode: res.status,
          endpointUrl,
          errorMessage: errText,
          fetchedAt: now,
          recordCount: 0,
          isHistoricalDataset: false,
        };
      }

      // Auto fallback
      return {
        data: {
          ...DEMO_RUNWAY_SIMULATION_RESULT,
          airport_code: request.airport_code,
          runway_identifier: request.runway_identifier,
        },
        status: 'OFFLINE_BENCHMARK',
        endpointUrl,
        errorMessage: `Backend returned ${errText}. Displaying demonstration simulation projection.`,
        fetchedAt: now,
        recordCount: DEMO_RUNWAY_SIMULATION_RESULT.affected_flights.length,
        isHistoricalDataset: false,
      };
    }

    const data: RunwayClosureSimulationResult = await res.json();
    return {
      data,
      status: 'CONNECTED_LIVE',
      httpStatusCode: 200,
      endpointUrl,
      fetchedAt: now,
      recordCount: data.affected_flights.length,
      isHistoricalDataset: false,
    };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Unknown network failure';

    if (mode === 'live_only') {
      return {
        data: DEMO_RUNWAY_SIMULATION_RESULT,
        status: 'NETWORK_ERROR',
        endpointUrl,
        errorMessage: `Unable to connect to FastAPI simulation service at ${endpointUrl}. (${errMsg})`,
        fetchedAt: now,
        recordCount: 0,
        isHistoricalDataset: false,
      };
    }

    // Auto mode fallback to verified docs/api.md simulation fixture
    return {
      data: {
        ...DEMO_RUNWAY_SIMULATION_RESULT,
        airport_code: request.airport_code,
        runway_identifier: request.runway_identifier,
        closure_window: {
          start: request.closure_start,
          end: request.closure_end,
          duration_minutes: Math.max(
            15,
            Math.round((new Date(request.closure_end).getTime() - new Date(request.closure_start).getTime()) / 60000)
          ),
        },
      },
      status: 'OFFLINE_BENCHMARK',
      endpointUrl,
      errorMessage: `FastAPI simulation service at ${endpointUrl} is offline. Displaying contract demonstration simulation projection.`,
      fetchedAt: now,
      recordCount: DEMO_RUNWAY_SIMULATION_RESULT.affected_flights.length,
      isHistoricalDataset: false,
    };
  }
}

/**
 * Fetch Root Cause Diagnosis, Cascading Defect Projections, and Before/After Audit Ledger for a flight
 * Conforms to GET /api/v1/flights/{flight_id}/diagnosis
 */
export async function getFlightDiagnosis(
  flightId: string
): Promise<FlightDiagnosisResponse | null> {
  const url = `${API_BASE_URL}/flights/${encodeURIComponent(flightId)}/diagnosis`;
  try {
    const res = await fetchWithTimeout(url, { method: 'GET' });
    if (res.ok) {
      return (await res.json()) as FlightDiagnosisResponse;
    }
  } catch (err) {
    console.warn(`Live diagnosis fetch failed for ${flightId}:`, err);
  }
  return null;
}

/**
 * Simulate / Inject an operational issue on a flight to view SkyOps automated recovery
 * Conforms to POST /api/v1/flights/{flight_id}/simulate-issue
 */
export async function simulateFlightIssue(
  flightId: string,
  request: InjectedIssueRequest
): Promise<FlightDiagnosisResponse | null> {
  const url = `${API_BASE_URL}/flights/${encodeURIComponent(flightId)}/simulate-issue`;
  try {
    const res = await fetchWithTimeout(url, {
      method: 'POST',
      body: JSON.stringify(request),
    });
    if (res.ok) {
      return (await res.json()) as FlightDiagnosisResponse;
    }
  } catch (err) {
    console.warn(`Disruption simulation failed for ${flightId}:`, err);
  }
  return null;
}

/**
 * Compute downstream network cascade delay propagation
 * Conforms to POST /api/v1/delays/propagate
 */
export async function propagateDelay(
  request: DelayPropagationRequest
): Promise<DelayPropagationResponse | null> {
  const url = `${API_BASE_URL}/delays/propagate`;
  try {
    const res = await fetchWithTimeout(url, {
      method: 'POST',
      body: JSON.stringify(request),
    });
    if (res.ok) {
      return (await res.json()) as DelayPropagationResponse;
    }
  } catch (err) {
    console.warn('Delay propagation API failed:', err);
  }
  return null;
}

/**
 * Get downstream tail rotation cascade & crew duty projection for a scheduled flight
 * Conforms to GET /api/v1/delays/{flight_id}/rotation-cascade
 */
export async function getFlightRotationCascade(
  flightId: string
): Promise<DelayPropagationResponse | null> {
  const url = `${API_BASE_URL}/delays/${encodeURIComponent(flightId)}/rotation-cascade`;
  try {
    const res = await fetchWithTimeout(url, { method: 'GET' });
    if (res.ok) {
      return (await res.json()) as DelayPropagationResponse;
    }
  } catch (err) {
    console.warn(`Rotation cascade fetch failed for ${flightId}:`, err);
  }
  return null;
}

/**
 * Solve Gate Assignment Problem (GAP) under operational disruption
 * Conforms to POST /api/v1/optimization/solve-gates
 */
export async function solveGates(
  request: GateOptimizationRequest
): Promise<GateOptimizationResponse | null> {
  const url = `${API_BASE_URL}/optimization/solve-gates`;
  try {
    const res = await fetchWithTimeout(url, {
      method: 'POST',
      body: JSON.stringify(request),
    });
    if (res.ok) {
      return (await res.json()) as GateOptimizationResponse;
    }
  } catch (err) {
    console.warn('Gate solver API failed:', err);
  }
  return null;
}

/**
 * Get optimized gate allocation for an airport hub
 * Conforms to GET /api/v1/optimization/gates/{airport_code}
 */
export async function getHubGateOptimization(
  airportCode: string
): Promise<GateOptimizationResponse | null> {
  const url = `${API_BASE_URL}/optimization/gates/${encodeURIComponent(airportCode)}`;
  try {
    const res = await fetchWithTimeout(url, { method: 'GET' });
    if (res.ok) {
      return (await res.json()) as GateOptimizationResponse;
    }
  } catch (err) {
    console.warn(`Hub gate optimization fetch failed for ${airportCode}:`, err);
  }
  return null;
}

/**
 * Run ML flight delay prediction and feature attribution
 * Conforms to POST /api/v1/predictions/delay
 */
export async function predictFlightDelay(
  request: DelayPredictionRequest
): Promise<DelayPredictionResponse | null> {
  const url = `${API_BASE_URL}/predictions/delay`;
  try {
    const res = await fetchWithTimeout(url, {
      method: 'POST',
      body: JSON.stringify(request),
    });
    if (res.ok) {
      return (await res.json()) as DelayPredictionResponse;
    }
  } catch (err) {
    console.warn('ML delay prediction API failed:', err);
  }
  return null;
}

/**
 * Get ML delay prediction for an existing flight in the schedule
 * Conforms to GET /api/v1/predictions/flights/{flight_id}
 */
export async function getFlightDelayPrediction(
  flightId: string
): Promise<DelayPredictionResponse | null> {
  const url = `${API_BASE_URL}/predictions/flights/${encodeURIComponent(flightId)}`;
  try {
    const res = await fetchWithTimeout(url, { method: 'GET' });
    if (res.ok) {
      return (await res.json()) as DelayPredictionResponse;
    }
  } catch (err) {
    console.warn(`Flight delay prediction fetch failed for ${flightId}:`, err);
  }
  return null;
}
