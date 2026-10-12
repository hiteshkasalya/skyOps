/**
 * SkyOps Authoritative API & Domain Types
 * Strictly conforms to docs/api.md and docs/architecture.md contracts.
 */

export type FlightStatus =
  | 'ON_TIME'
  | 'DELAYED'
  | 'BOARDING'
  | 'TAXIING'
  | 'DEPARTED'
  | 'ARRIVED'
  | 'CANCELLED';

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

export interface FlightLocationDetail {
  iata_code: string;
  name: string;
  city: string;
  terminal?: string;
  gate?: string;
  runway?: string;
}

/**
 * Summary flight entity returned by GET /api/v1/flights
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
  estimated_departure: string;
  actual_departure?: string | null;
  scheduled_arrival: string;
  estimated_arrival: string;
  actual_arrival?: string | null;
  status: FlightStatus;
  terminal: string;
  assigned_gate: string;
  assigned_runway: string;
  delay_minutes: number;
  delay_reason?: string | null;
  // Detail extensions available when inspecting a flight
  turnaround?: TurnaroundDetails;
  passengers?: FlightPassengerMetrics;
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
 * Data provenance indicator
 */
export type DataSourceOrigin = 'LIVE' | 'DEMO_FIXTURE' | 'SIMULATED' | 'HISTORICAL';

export interface DataPayloadMeta {
  source: DataSourceOrigin;
  fetchedAt: string;
  isSimulated: boolean;
  endpointUrl?: string;
  notes?: string;
}
