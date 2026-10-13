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

/**
 * Runway Closure Simulation Request & Response
 * Strictly conforms to docs/api.md section 8
 */
export interface RunwayClosureRequest {
  airport_code: string;
  runway_identifier: string;
  closure_start: string;
  closure_end: string;
  reason: string;
}

export interface AffectedFlight {
  flight_id: string;
  action_required: string;
  original_runway?: string;
  assigned_alternate_runway?: string;
  projected_delay_minutes?: number;
  holding_time_minutes?: number;
  fuel_status?: string;
}

export interface RecoveryProposal {
  proposal_id: string;
  title: string;
  action_type: string;
  description: string;
  estimated_delay_mitigation_minutes: number;
}

export interface SimulationClosureWindow {
  start: string;
  end: string;
  duration_minutes: number;
}

export interface SimulationImpactSummary {
  capacity_reduction_percentage: number;
  total_impacted_flights: number;
  diverted_flights_count: number;
  ground_delayed_departures_count: number;
  holding_arrivals_count: number;
  total_projected_delay_minutes: number;
}

export interface RunwayClosureSimulationResult {
  simulation_id: string;
  airport_code: string;
  runway_identifier: string;
  closure_window: SimulationClosureWindow;
  impact_summary: SimulationImpactSummary;
  affected_flights: AffectedFlight[];
  recovery_proposals: RecoveryProposal[];
  conflicts_generated?: Conflict[];
  is_simulated: boolean;
  data_source: string;
}

export interface IdentifiedIssue {
  issue_code: string;
  title: string;
  category: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  root_cause_explanation: string;
  detected_parameters: Record<string, any>;
}

export interface PotentialDefect {
  defect_id: string;
  title: string;
  category: string;
  probability: string;
  impact_description: string;
  projected_delay_addition_minutes: number;
}

export interface TacticalRecoveryAction {
  step_number: number;
  action_type: string;
  title: string;
  description: string;
  target_resource: string;
  mitigated_delay_minutes: number;
}

export interface StateSnapshot {
  operational_status: string;
  total_projected_delay_minutes: number;
  gate_status: string;
  runway_status: string;
  turnaround_buffer_minutes?: number | null;
  turnaround_compliant: boolean;
  downstream_flights_impacted: number;
  passengers_at_risk: number;
  active_conflicts_count: number;
}

export interface DeltaSummary {
  delay_saved_minutes: number;
  conflicts_eliminated: number;
  passengers_protected: number;
  turnaround_buffer_restored_minutes: number;
  teacher_summary_verdict: string;
}

export interface BeforeVsAfterComparison {
  before: StateSnapshot;
  after: StateSnapshot;
  delta_summary: DeltaSummary;
}

export interface FlightDiagnosisResponse {
  flight_id: string;
  flight_number: string;
  airline: string;
  route: string;
  origin_airport: string;
  destination_airport: string;
  aircraft_type: string;
  tail_number?: string | null;
  scheduled_departure: string;
  scheduled_arrival: string;
  has_issue: boolean;
  issue: IdentifiedIssue;
  potential_defects: PotentialDefect[];
  recovery_actions: TacticalRecoveryAction[];
  audit_comparison: BeforeVsAfterComparison;
  diagnosed_at: string;
}

export interface InjectedIssueRequest {
  delay_minutes?: number;
  delay_reason?: string;
  blocked_gate?: string;
  closed_runway?: string;
}
