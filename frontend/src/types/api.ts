/**
 * SkyOps Authoritative API & Domain Types
 * Strictly conforms to docs/api.md, docs/architecture.md, and backend/app/schemas/flight.py
 */

export type FlightStatus =
  | 'SCHEDULED'
  | 'BOARDING'
  | 'TAXIING'
  | 'DEPARTED'
  | 'ON_TIME'
  | 'DELAYED'
  | 'ARRIVED'
  | 'CANCELLED';

export type RecordType = 'HISTORICAL' | 'LIVE_TRACKING';

export type ConflictSeverity = 'HIGH' | 'MEDIUM' | 'LOW';

export type ConflictType =
  | 'GATE_OCCUPANCY_OVERLAP'
  | 'RUNWAY_BUFFER_BREACH'
  | 'TURNAROUND_DELAY_CASCADE'
  | string;

export type MilestoneStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'DELAYED';

export interface TurnaroundDetails {
  inbound_flight_id?: string;
  inbound_arrival_actual?: string | null;
  deboarding_status: MilestoneStatus;
  cleaning_status: MilestoneStatus;
  fueling_status: MilestoneStatus;
  catering_status: MilestoneStatus;
  baggage_loading_status: MilestoneStatus;
  boarding_status: MilestoneStatus;
}

export interface FlightPassengerMetrics {
  total: number;
  connecting_passengers: number;
  tight_connections_at_risk: number;
}

/**
 * Standard Normalized Flight representation
 * Supports both docs/api.md and backend/app/schemas/flight.py shapes.
 */
export interface Flight {
  id: string;
  flight_number: string;
  airline: string;
  origin: string;
  destination: string;
  aircraft_type: string;
  registration: string;
  scheduled_departure: string;
  scheduled_arrival: string;
  estimated_departure?: string | null;
  estimated_arrival?: string | null;
  actual_departure?: string | null;
  actual_arrival?: string | null;
  status: FlightStatus;
  terminal?: string | null;
  assigned_gate?: string | null;
  assigned_runway?: string | null;
  delay_minutes: number;
  delay_reason?: string | null;
  record_type: RecordType;
  data_source: string;
  // Detail extensions when available
  turnaround?: TurnaroundDetails;
  passengers?: FlightPassengerMetrics;
}

/**
 * Raw backend record representation for robust ingestion parsing
 */
export interface RawBackendFlightRecord {
  flight_id?: string;
  id?: string;
  flight_number: string;
  airline?: string;
  origin_airport?: string;
  origin?: string;
  destination_airport?: string;
  destination?: string;
  aircraft_type?: string;
  tail_number?: string | null;
  registration?: string | null;
  scheduled_departure: string;
  scheduled_arrival: string;
  estimated_departure?: string | null;
  estimated_arrival?: string | null;
  actual_departure?: string | null;
  actual_arrival?: string | null;
  status?: string;
  current_status?: string;
  delay_minutes?: number;
  current_delay_minutes?: number;
  delay_reason?: string | null;
  terminal?: string | null;
  gate?: string | null;
  assigned_gate?: string | null;
  assigned_runway?: string | null;
  record_type?: string;
  data_source?: string;
  active_conflict?: boolean;
}

/**
 * Operational conflict returned by GET /api/v1/conflicts
 */
export interface Conflict {
  id: string;
  type: ConflictType;
  severity: ConflictSeverity;
  airport_code: string;
  resource_type: string;
  resource_id: string;
  conflicting_flight_ids: string[];
  overlap_start: string;
  overlap_end: string;
  description: string;
}

/**
 * Airport details returned by GET /api/v1/airports
 */
export interface Airport {
  id: string;
  iata_code: string;
  icao_code: string;
  name: string;
  city: string;
  country: string;
  timezone: string;
  active_terminals: string[];
  active_runways_count: number;
}

/**
 * Health status returned by GET /api/v1/health
 */
export interface HealthStatus {
  status: string;
  version: string;
  database: string;
  services: {
    ingestion: string;
    conflict_detection: string;
    simulation_engine: string;
    optimization_engine: string;
    ml_prediction: string;
  };
}

/**
 * Connection states for live API monitoring
 */
export type ApiConnectionStatus =
  | 'CONNECTED_LIVE'
  | 'NETWORK_ERROR'
  | 'HTTP_ERROR'
  | 'INVALID_RESPONSE'
  | 'OFFLINE_BENCHMARK';

export interface ApiFetchResult<T> {
  data: T;
  status: ApiConnectionStatus;
  httpStatusCode?: number;
  endpointUrl: string;
  errorMessage?: string;
  fetchedAt: string;
  recordCount: number;
  isHistoricalDataset: boolean;
}

/**
 * Data provenance indicator
 */
export type DataSourceOrigin = 'LIVE' | 'DEMO_FIXTURE' | 'SIMULATED' | 'HISTORICAL';
