# SkyOps API Documentation & Contract Registry

This document serves as the authoritative API contract specification for the SkyOps backend. Any modifications to endpoint paths, request payloads, or response schemas **must** be documented here, and frontend impact must be explicitly noted.

---

## 1. General API Configuration & Standards

- **Base URL**: `/api/v1`
- **API Versioning**: URL-path versioned (`v1`). Breaking changes will increment the version prefix (e.g. `/api/v2`).
- **Content-Type**: `application/json`
- **CORS Policy**:
  - Allowed Origins: `http://localhost:3000` (development frontend), production frontend domain.
  - Allowed Methods: `GET`, `POST`, `PUT`, `DELETE`, `OPTIONS`, `PATCH`.
  - Allowed Headers: `Content-Type`, `Authorization`, `Accept`, `Origin`, `X-Requested-With`.
  - Allow Credentials: `true`.
- **Authentication**: Bearer Token / API Key via `Authorization: Bearer <token>` header (bypassable in local development mode).

---

## 2. Standard Error Response Structure

All non-2xx error responses follow a uniform structured JSON format:

```json
{
  "status_code": 404,
  "error": "Not Found",
  "message": "Flight with ID '6E-204-DEL-BOM' was not found.",
  "timestamp": "2026-10-12T12:00:00Z",
  "details": {
    "resource_type": "flight",
    "identifier": "6E-204-DEL-BOM"
  }
}
```

Common status codes:
- `400 Bad Request`: Business rule validation failure or malformed payload.
- `401 Unauthorized`: Missing or invalid authentication token.
- `403 Forbidden`: Insufficient permissions for requested action.
- `404 Not Found`: Target resource does not exist.
- `409 Conflict`: Operational or resource state conflict.
- `422 Unprocessable Entity`: FastAPI/Pydantic request validation error, formatted as:
  ```json
  {
    "detail": [
      {
        "loc": ["body", "runway_identifier"],
        "msg": "field required",
        "type": "missing"
      }
    ]
  }
  ```
- `500 Internal Server Error`: Unhandled server-side exception.

---

## 3. Endpoint Implementation Status Matrix

The following matrix documents the exact development status of all defined API contracts:

| Endpoint | Method | Description | Implementation Status |
|---|---|---|---|
| `/api/v1/health` | `GET` | Service & database health status | **Implemented** |
| `/api/v1/airports` | `GET` | List operational hub airports | **Implemented** |
| `/api/v1/airports/{code}/runways` | `GET` | Runways, lengths, and closure windows | **Implemented** |
| `/api/v1/airports/{code}/gates` | `GET` | Terminal gates, sizes, and compatibility | **Implemented** |
| `/api/v1/flights` | `GET` | Filterable list of scheduled flights | **Implemented** |
| `/api/v1/flights/{id}` | `GET` | Full telemetry and turnaround details for a flight | **Implemented** |
| `/api/v1/conflicts` | `GET` | Active gate, runway closure, reservation, and turnaround conflicts | **Implemented** |
| `/api/v1/schedules/conflicts` | `GET` | Alias for active operational schedule conflicts | **Implemented** |
| `/api/v1/simulation/run` | `POST` | Runway closure disruption simulation & recovery proposals | **Implemented** |
| `/api/v1/simulations/runway-closure` | `POST` | Alias endpoint for runway closure disruption simulation | **Implemented** |
| `/api/v1/delays/propagate` | `POST` | Model downstream cascade delays | **Planned** |
| `/api/v1/optimization/solve-gates` | `POST` | OR-Tools constraint gate re-allocation | **Planned** |
| `/api/v1/predictions/delay` | `POST` | ML flight delay probability and duration | **Planned** |
| `/api/v1/copilot/chat` | `POST` | GenAI RAG operational assistant | **Planned** |
| `/ws/v1/live-ops` | `WS` | Real-time operational event stream | **Planned** |

---

## 4. Health & System Endpoints

### `GET /api/v1/health`
- **Status**: Implemented
- **Description**: Returns operational health status of backend services, database connections, and background workers.
- **Response `200 OK`**:
  ```json
  {
    "status": "healthy",
    "version": "0.1.0",
    "database": "connected",
    "services": {
      "ingestion": "active",
      "flights_api": "active"
    },
    "stats": {
      "loaded_flights_count": 12
    }
  }
  ```

---

## 5. Airport & Resource Management APIs

### `GET /api/v1/airports`
- **Status**: Implemented
- **Description**: Retrieve list of operational hub airports, including their runways, terminals, and gates.
- **Response `200 OK`**:
  ```json
  [
    {
      "airport_code": "DEL",
      "icao_code": "VIDP",
      "name": "Indira Gandhi International Airport",
      "city": "New Delhi",
      "country": "India",
      "timezone": "Asia/Kolkata",
      "terminals": ["T1", "T2", "T3"],
      "runways": [
        {
          "runway_id": "10/28",
          "airport_code": "DEL",
          "length_meters": 3810,
          "is_active": true,
          "closure_windows": [
            {
              "start_time": "2026-10-12T09:00:00Z",
              "end_time": "2026-10-12T10:30:00Z",
              "reason": "SCHEDULED_SWEEPER_MAINTENANCE"
            }
          ]
        }
      ],
      "gates": [
        {
          "gate_id": "42",
          "airport_code": "DEL",
          "terminal": "T3",
          "max_aircraft_size": "NARROW_BODY",
          "has_jetbridge": true,
          "is_active": true,
          "closure_windows": []
        }
      ]
    }
  ]
  ```

### `GET /api/v1/airports/{code}`
- **Status**: Implemented
- **Description**: Retrieve complete infrastructure topology for a specific airport by IATA code.
- **Path Parameter**: `code` (e.g. `DEL`)
- **Response `200 OK`**: Airport object.

### `GET /api/v1/airports/{code}/runways`
- **Status**: Implemented
- **Description**: List runways, physical dimensions, and active closure windows for a given airport.
- **Path Parameter**: `code` (e.g. `DEL`)
- **Response `200 OK`**:
  ```json
  [
    {
      "runway_id": "10/28",
      "airport_code": "DEL",
      "length_meters": 3810,
      "is_active": true,
      "closure_windows": [
        {
          "start_time": "2026-10-12T09:00:00Z",
          "end_time": "2026-10-12T10:30:00Z",
          "reason": "SCHEDULED_SWEEPER_MAINTENANCE"
        }
      ]
    }
  ]
  ```

### `GET /api/v1/airports/{code}/gates`
- **Status**: Implemented
- **Description**: Retrieve terminal gates, jetbridge equipment, aircraft size compatibility, and operational status.
- **Path Parameter**: `code` (e.g. `DEL`)
- **Query Parameters**: `terminal` (string, optional, e.g. `T3`)
- **Response `200 OK`**:
  ```json
  [
    {
      "gate_id": "42",
      "airport_code": "DEL",
      "terminal": "T3",
      "max_aircraft_size": "NARROW_BODY",
      "has_jetbridge": true,
      "is_active": true,
      "closure_windows": []
    }
  ]
  ```

### Airport Resource & Schedule Model Schema Specifications

#### `TimeWindow` (Temporal Interval)
- `start_time` (ISO 8601 UTC string)
- `end_time` (ISO 8601 UTC string, validated: `end_time > start_time`)

#### `RunwayOccupancy`
- `runway_id` (string)
- `airport_code` (string, 3-letter IATA)
- `flight_id` (string)
- `movement_type` (`DEPARTURE` or `ARRIVAL`)
- `interval` (`TimeWindow`, typically 3 minutes around movement)

#### `GateOccupancy`
- `gate_id` (string)
- `airport_code` (string, 3-letter IATA)
- `flight_id` (string)
- `interval` (`TimeWindow`, e.g. boarding window prior to departure or deboarding window post arrival)

#### `TurnaroundRequirement`
- `aircraft_type` (e.g. `A320neo`, `A321neo`)
- `min_turnaround_minutes` (e.g. 35 mins for A320neo, 45 mins for A321neo)
- `deboarding_minutes`, `cleaning_minutes`, `fueling_minutes`, `catering_minutes`, `boarding_minutes`

#### `FlightResourceAssignment`
- `flight_id` (string)
- `origin_airport` (string)
- `departure_gate_occupancy` (`GateOccupancy`)
- `departure_runway_occupancy` (`RunwayOccupancy`)
- `destination_airport` (string)
- `arrival_runway_occupancy` (`RunwayOccupancy`)
- `arrival_gate_occupancy` (`GateOccupancy`)
- `inbound_flight_id` (string, optional)
- `turnaround_buffer_minutes` (integer, optional)
- `turnaround_compliant` (boolean)
- `is_simulated` (boolean: `true` for simulated operational allocation)

---

## 6. Flight Operations & Schedule APIs

### `GET /api/v1/flights` (Flight List)
- **Status**: Implemented
- **Description**: Fetch validated flight schedules and telemetry records with filtering and pagination.
- **Query Parameters**:
  - `origin` (string, optional): 3-letter IATA code (e.g. `DEL`)
  - `destination` (string, optional): 3-letter IATA code (e.g. `BOM`)
  - `airline` (string, optional): Airline name or substring (e.g. `IndiGo`)
  - `status` (string, optional): Operational status (`SCHEDULED`, `BOARDING`, `TAXIING`, `DEPARTED`, `ON_TIME`, `DELAYED`, `ARRIVED`, `CANCELLED`)
  - `record_type` (string, optional): `HISTORICAL` or `LIVE_TRACKING`
  - `delayed_only` (boolean, optional, default: `false`): Filter exclusively for flights experiencing positive delay minutes
  - `limit` (int, default: `50`, min: `1`, max: `100`): Maximum flight records to return
  - `offset` (int, default: `0`, min: `0`): Pagination offset
- **Response Headers**:
  - `X-Total-Count`: Total number of matching flight records
  - `X-Limit`: Applied limit
  - `X-Offset`: Applied offset
- **Response `200 OK`**:
  ```json
  [
    {
      "flight_id": "6E-204-DEL-BOM-20261012",
      "flight_number": "6E 204",
      "airline": "IndiGo",
      "origin_airport": "DEL",
      "destination_airport": "BOM",
      "aircraft_type": "A321neo",
      "tail_number": "VT-IMG",
      "scheduled_departure": "2026-10-12T08:00:00Z",
      "scheduled_arrival": "2026-10-12T10:15:00Z",
      "terminal": "T3",
      "gate": "42",
      "record_type": "HISTORICAL",
      "data_source": "SYNTHETIC_DEMO",
      "actual_departure": "2026-10-12T08:45:00Z",
      "actual_arrival": "2026-10-12T11:00:00Z",
      "status": "DELAYED",
      "delay_minutes": 45,
      "delay_reason": "LATE_INBOUND_AIRCRAFT"
    },
    {
      "flight_id": "6E-5032-DEL-BLR-20261012",
      "flight_number": "6E 5032",
      "airline": "IndiGo",
      "origin_airport": "DEL",
      "destination_airport": "BLR",
      "aircraft_type": "A320neo",
      "tail_number": "VT-IZR",
      "scheduled_departure": "2026-10-12T08:30:00Z",
      "scheduled_arrival": "2026-10-12T11:15:00Z",
      "terminal": "T3",
      "gate": "42",
      "record_type": "HISTORICAL",
      "data_source": "SYNTHETIC_DEMO",
      "actual_departure": "2026-10-12T08:30:00Z",
      "actual_arrival": "2026-10-12T11:15:00Z",
      "status": "ON_TIME",
      "delay_minutes": 0,
      "delay_reason": null
    }
  ]
  ```

### `GET /api/v1/flights/{flight_id}` (Flight Detail)
- **Status**: Implemented
- **Description**: Fetch complete operational flight record by unique composite identifier. Distinguishes historical records from live telemetry tracking records.
- **Path Parameter**: `flight_id` (string, e.g. `6E-204-DEL-BOM-20261012`)
- **Response `200 OK` (Historical Record Example)**:
  ```json
  {
    "flight_id": "6E-204-DEL-BOM-20261012",
    "flight_number": "6E 204",
    "airline": "IndiGo",
    "origin_airport": "DEL",
    "destination_airport": "BOM",
    "aircraft_type": "A321neo",
    "tail_number": "VT-IMG",
    "scheduled_departure": "2026-10-12T08:00:00Z",
    "scheduled_arrival": "2026-10-12T10:15:00Z",
    "terminal": "T3",
    "gate": "42",
    "record_type": "HISTORICAL",
    "data_source": "SYNTHETIC_DEMO",
    "actual_departure": "2026-10-12T08:45:00Z",
    "actual_arrival": "2026-10-12T11:00:00Z",
    "status": "DELAYED",
    "delay_minutes": 45,
    "delay_reason": "LATE_INBOUND_AIRCRAFT"
  }
  ```
- **Response `200 OK` (Live Telemetry Tracking Record Example)**:
  ```json
  {
    "flight_id": "VALID-03-LIVE",
    "flight_number": "6E 501",
    "airline": "IndiGo",
    "origin_airport": "BLR",
    "destination_airport": "DEL",
    "aircraft_type": "A320neo",
    "tail_number": "VT-LIVE",
    "scheduled_departure": "2026-10-12T10:00:00Z",
    "scheduled_arrival": "2026-10-12T12:45:00Z",
    "terminal": "T1",
    "gate": "12",
    "record_type": "LIVE_TRACKING",
    "data_source": "FIXTURE",
    "estimated_departure": "2026-10-12T10:20:00Z",
    "estimated_arrival": "2026-10-12T12:45:00Z",
    "actual_departure": "2026-10-12T10:20:00Z",
    "actual_arrival": null,
    "current_status": "DELAYED",
    "current_delay_minutes": 20,
    "active_conflict": false,
    "last_telemetry_update": "2026-10-12T12:30:00Z"
  }
  ```
- **Response `404 Not Found`**:
  ```json
  {
    "status_code": 404,
    "error": "Not Found",
    "message": "Flight with ID 'NON_EXISTENT_FLIGHT_ID' was not found.",
    "timestamp": "2026-10-12T12:00:00Z",
    "details": {
      "path": "/api/v1/flights/NON_EXISTENT_FLIGHT_ID"
    }
  }
  ```

---

## 7. Conflict Detection APIs

### `GET /api/v1/conflicts` & `GET /api/v1/schedules/conflicts`
- **Status**: Implemented
- **Description**: Deterministically detect active operational resource contentions, runway closure overlaps, runway reservation contentions, gate double-bookings, and insufficient turnaround buffers.
- **Query Parameters**:
  - `airport` (string, optional): 3-letter IATA airport code filter (e.g. `DEL`)
  - `severity` (string, optional): Severity rating (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`)
  - `type` (string, optional): Conflict classification (`RUNWAY_CLOSURE_CONFLICT`, `RUNWAY_RESERVATION_CONFLICT`, `GATE_OCCUPANCY_CONFLICT`, `INSUFFICIENT_TURNAROUND`, `RESOURCE_UNAVAILABLE`)
- **Response Headers**:
  - `X-Total-Count`: Total number of detected conflicts matching filter
- **Response `200 OK`**:
  ```json
  [
    {
      "conflict_id": "gate-occupancy-conflict-74c1537b01",
      "type": "GATE_OCCUPANCY_CONFLICT",
      "severity": "HIGH",
      "airport_code": "DEL",
      "resource_type": "GATE",
      "resource_id": "Gate 42",
      "interval": {
        "start_time": "2026-10-12T07:50:00Z",
        "end_time": "2026-10-12T08:30:00Z"
      },
      "affected_flights": [
        "6E-204-DEL-BOM-20261012",
        "6E-5032-DEL-BLR-20261012"
      ],
      "explanation": "Gate double-booking contention on Gate 42 at DEL between flights 6E-204-DEL-BOM-20261012 and 6E-5032-DEL-BLR-20261012 overlapping from 07:50 to 08:30 UTC.",
      "detected_at": "2026-10-12T12:00:00Z"
    },
    {
      "conflict_id": "runway-closure-conflict-32a82df109",
      "type": "RUNWAY_CLOSURE_CONFLICT",
      "severity": "CRITICAL",
      "airport_code": "DEL",
      "resource_type": "RUNWAY",
      "resource_id": "10/28",
      "interval": {
        "start_time": "2026-10-12T09:13:00Z",
        "end_time": "2026-10-12T09:16:00Z"
      },
      "affected_flights": [
        "6E-6112-DEL-HYD-20261012"
      ],
      "explanation": "Flight 6E 6112 departure runway occupancy (09:13 - 09:16 UTC) overlaps with closure on Runway 10/28 due to 'SCHEDULED_SWEEPER_MAINTENANCE'.",
      "detected_at": "2026-10-12T12:00:00Z"
    },
    {
      "conflict_id": "insufficient-turnaround-b44c80219f",
      "type": "INSUFFICIENT_TURNAROUND",
      "severity": "HIGH",
      "airport_code": "DEL",
      "resource_type": "AIRCRAFT_TURNAROUND",
      "resource_id": "6E-102-BLR-DEL-20261012",
      "interval": null,
      "affected_flights": [
        "6E-102-BLR-DEL-20261012",
        "6E-204-DEL-BOM-20261012"
      ],
      "explanation": "Insufficient turnaround buffer (5 mins available, 45 mins required) at DEL between inbound leg 6E-102-BLR-DEL-20261012 and outbound flight 6E-204-DEL-BOM-20261012.",
      "detected_at": "2026-10-12T12:00:00Z"
    }
  ]
  ```

---

## 8. Disruption Simulation APIs

### `POST /api/v1/simulation/run` (and `POST /api/v1/simulations/runway-closure`)
- **Status**: Implemented
- **Description**: Simulate operational disruption impact and generate tactical recovery proposals when an airport runway is temporarily closed (due to disabled aircraft, emergency maintenance, inspection, or weather). The simulation executes strictly on an isolated clone of the current schedule and resource state, **never modifying live operational schedules**.
- **Algorithmic Recovery Strategy**: Deterministic rule-based heuristic re-sequencing and alternate runway reallocation with wake-vortex slot separation. Clearly discloses limitations (OR-Tools CP-SAT solver integration planned for Phase 3).
- **Request Body Parameters**:
  - `runway_identifier` (string, required, alias: `runway_id`): Closed runway identifier (e.g. `10/28`).
  - `closure_start` (ISO 8601 UTC string, required): Start timestamp of the runway closure.
  - `closure_end` (ISO 8601 UTC string, required): End timestamp of the closure (validated: `closure_end > closure_start`).
  - `airport_code` (string, optional): 3-letter IATA airport code (e.g. `DEL`). Inferred automatically if omitted and runway identifier is unique across hubs.
  - `reason` (string, optional, default: `"RUNWAY_MAINTENANCE_CLOSURE"`): Operational cause of runway closure.
  - `affected_flight_ids` (array of strings, optional): Explicit subset of flight IDs to evaluate.
- **Request Body Example**:
  ```json
  {
    "airport_code": "DEL",
    "runway_identifier": "10/28",
    "closure_start": "2026-10-12T09:00:00Z",
    "closure_end": "2026-10-12T10:30:00Z",
    "reason": "EMERGENCY_FOD_INSPECTION"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "simulation_id": "sim-del-1028-20261012090104",
    "airport_code": "DEL",
    "runway_identifier": "10/28",
    "closure_window": {
      "start_time": "2026-10-12T09:00:00Z",
      "end_time": "2026-10-12T10:30:00Z"
    },
    "reason": "EMERGENCY_FOD_INSPECTION",
    "is_feasible": true,
    "recovery_strategy": "RULE_BASED_HEURISTIC",
    "baseline_metrics": {
      "total_flights": 12,
      "conflicts_count": 7,
      "total_delay_minutes": 175
    },
    "post_disruption_metrics": {
      "impacted_flights_count": 2,
      "conflicts_count": 7,
      "total_projected_delay_minutes": 265
    },
    "recovery_metrics": {
      "resolved_conflicts_count": 2,
      "remaining_conflicts_count": 5,
      "net_delay_added_minutes": 0
    },
    "affected_flights": [
      {
        "flight_id": "6E-103-DEL-BLR-20261012",
        "flight_number": "6E 103",
        "movement_type": "DEPARTURE",
        "original_runway": "10/28",
        "proposed_runway": "11/29",
        "scheduled_time": "2026-10-12T10:00:00Z",
        "action_required": "REROUTE_RUNWAY",
        "projected_delay_minutes": 0
      },
      {
        "flight_id": "6E-6112-DEL-HYD-20261012",
        "flight_number": "6E 6112",
        "movement_type": "DEPARTURE",
        "original_runway": "10/28",
        "proposed_runway": "11/29",
        "scheduled_time": "2026-10-12T09:15:00Z",
        "action_required": "REROUTE_RUNWAY",
        "projected_delay_minutes": 0
      }
    ],
    "recovery_proposals": [
      {
        "proposal_id": "prop-1",
        "flight_id": "6E-103-DEL-BLR-20261012",
        "action_type": "RUNWAY_REALLOCATION",
        "title": "Reassign Departure to Runway 11/29",
        "description": "Re-sequence flight 6E 103 from closed Runway 10/28 to alternate Runway 11/29 with 0m slot adjustment.",
        "original_runway": "10/28",
        "proposed_runway": "11/29",
        "original_time": "2026-10-12T10:00:00Z",
        "proposed_time": "2026-10-12T10:00:00Z",
        "delay_added_minutes": 0,
        "delay_mitigated_minutes": 45
      },
      {
        "proposal_id": "prop-2",
        "flight_id": "6E-6112-DEL-HYD-20261012",
        "action_type": "RUNWAY_REALLOCATION",
        "title": "Reassign Departure to Runway 11/29",
        "description": "Re-sequence flight 6E 6112 from closed Runway 10/28 to alternate Runway 11/29 with 0m slot adjustment.",
        "original_runway": "10/28",
        "proposed_runway": "11/29",
        "original_time": "2026-10-12T09:15:00Z",
        "proposed_time": "2026-10-12T09:15:00Z",
        "delay_added_minutes": 0,
        "delay_mitigated_minutes": 45
      }
    ],
    "remaining_conflicts": [
      {
        "conflict_id": "gate-occupancy-conflict-22fb60c79f",
        "type": "GATE_OCCUPANCY_CONFLICT",
        "severity": "HIGH",
        "airport_code": "DEL",
        "resource_type": "GATE",
        "resource_id": "Gate 42",
        "interval": {
          "start_time": "2026-10-12T07:50:00Z",
          "end_time": "2026-10-12T08:00:00Z"
        },
        "affected_flights": [
          "6E-204-DEL-BOM-20261012",
          "6E-5032-DEL-BLR-20261012"
        ],
        "explanation": "Gate double-booking contention on Gate 42 at DEL between flights 6E-204-DEL-BOM-20261012 and 6E-5032-DEL-BLR-20261012 overlapping from 07:50 to 08:00 UTC.",
        "detected_at": "2026-10-12T09:01:04Z"
      }
    ],
    "limitations_notice": "Deterministic rule-based heuristic recovery proposal. Does not guarantee mathematical optimality. Constraint programming (OR-Tools) solver integration planned for Phase 3."
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: Ambiguous runway without specified `airport_code` or business rule validation error.
  - `404 Not Found`: Runway or airport not found in resource topology.
  - `422 Unprocessable Content`: `closure_end <= closure_start` or missing required fields.

---

## 9. Delay Propagation & Optimization APIs

### `POST /api/v1/delays/propagate`
- **Status**: Planned
- **Description**: Compute cascade delay impact down the schedule tree for an upstream disruption.
- **Request Body**:
  ```json
  {
    "flight_id": "6E-204-DEL-BOM",
    "initial_delay_minutes": 45,
    "cause": "LATE_INBOUND_AIRCRAFT"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "root_flight_id": "6E-204-DEL-BOM",
    "total_impacted_flights": 3,
    "cascaded_delay_minutes_total": 110,
    "downstream_impacts": [
      {
        "flight_id": "6E-205-BOM-DEL",
        "projected_delay_minutes": 40,
        "connection_type": "SAME_AIRCRAFT_TURNAROUND"
      }
    ]
  }
  ```

### `POST /api/v1/optimization/solve-gates`
- **Status**: Planned
- **Description**: Run OR-Tools constraint solver to optimize gate re-assignments under disruption.
- **Request Body**:
  ```json
  {
    "airport_code": "DEL",
    "time_window_start": "2026-10-12T08:00:00Z",
    "time_window_end": "2026-10-12T14:00:00Z"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "solver_status": "OPTIMAL",
    "reassignments_count": 2,
    "reassignments": [
      {
        "flight_id": "6E-5032-DEL-BLR",
        "original_gate": "42",
        "recommended_gate": "46",
        "delay_mitigated_minutes": 35
      }
    ]
  }
  ```

---

## 10. ML Prediction & AI Copilot APIs

### `POST /api/v1/predictions/delay`
- **Status**: Planned
- **Description**: Predict flight delay probability and expected delay duration using ML models.
- **Request Body**:
  ```json
  {
    "flight_number": "6E 204",
    "origin": "DEL",
    "destination": "BOM",
    "scheduled_departure": "2026-10-12T08:00:00Z",
    "aircraft_type": "A321neo",
    "weather_condition": "LOW_VISIBILITY_FOG"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "delay_probability": 0.78,
    "predicted_delay_minutes": 42,
    "confidence": 0.86,
    "key_risk_factors": ["Morning fog category II at DEL", "Inbound aircraft delayed 25 mins"]
  }
  ```

### `POST /api/v1/copilot/chat`
- **Status**: Planned
- **Description**: Interact with the SkyOps GenAI & RAG Operational Copilot.
- **Request Body**:
  ```json
  {
    "message": "What is the status of Gate 42 at DEL T3 right now and are there any conflicts?",
    "session_id": "session-indigo-demo-1"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "response": "Gate 42 at DEL Terminal 3 has an active high-severity conflict. Flight 6E 204 is delayed until 08:45 UTC, overlapping with the scheduled arrival of 6E 5032 at 08:30 UTC.",
    "suggested_actions": [
      {
        "action": "Reassign 6E 5032 to Gate 46",
        "endpoint": "/api/v1/optimization/solve-gates"
      }
    ]
  }
  ```

---

## 11. Real-Time WebSockets (`/ws/v1/live-ops`)

- **Status**: Planned
- **Connection URL**: `ws://localhost:8000/ws/v1/live-ops`
- **Protocol**: JSON Event Streaming
- **Server Push Event Example**:
  ```json
  {
    "event": "CONFLICT_DETECTED",
    "timestamp": "2026-10-12T08:05:00Z",
    "payload": {
      "conflict_id": "conflict-gate-42-del",
      "type": "GATE_OCCUPANCY_OVERLAP",
      "resource_id": "Gate 42 (T3)",
      "conflicting_flight_ids": ["6E-204-DEL-BOM", "6E-5032-DEL-BLR"]
    }
  }
  ```

---

## 12. Contract Change Log

| Date | Endpoint / Payload | Change Description | Frontend Impact |
| --- | --- | --- | --- |
| 2026-10-12 | `GET /api/v1/conflicts`, `GET /api/v1/schedules/conflicts` | Implemented deterministic conflict detection for runway closure overlaps, runway slot contention, gate double-booking, and insufficient turnaround buffers. | Exposes operational contention alerts and explanations for front-end alert banners and Gantt charts. |
| 2026-10-12 | `GET /api/v1/airports`, `GET /api/v1/airports/{code}/runways`, `GET /api/v1/airports/{code}/gates` | Implemented airport topology, runway closure tracking, gate sizes, and flight resource occupancy assignment schemas. | Exposes operational runways, active closures, and gates with compatibility for interactive map & Gantt visualizers. |
| 2026-10-12 | `GET /api/v1/flights`, `GET /api/v1/flights/{flight_id}` | Implemented flight listing with filtering, pagination headers (`X-Total-Count`, `X-Limit`, `X-Offset`), flight details, and structured 404/422 responses based on validated flight dataset loader. | Endpoints are now live and callable at `http://127.0.0.1:8000/api/v1/flights`. Provides exact JSON schemas for frontend consume. |
| 2026-10-12 | Project Contract Establishment | Added detailed schemas for flight list, flight detail (`GET /api/v1/flights/{id}`), and runway closure simulation (`POST /api/v1/simulations/runway-closure`); documented CORS, error format, and status matrix. | Clarifies flight detail card models, simulation payload specs, and confirmed endpoint readiness statuses. |
| 2026-10-06 | Baseline Contracts | Initial definition of SkyOps REST & WS endpoints | Baseline specifications established |
