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
| `/api/v1/airports` | `GET` | List operational hub airports | **Planned / In Development** |
| `/api/v1/airports/{code}/runways` | `GET` | Runways and hourly movement capacities | **Planned / In Development** |
| `/api/v1/airports/{code}/gates` | `GET` | Terminal gates, sizes, and occupancy | **Planned / In Development** |
| `/api/v1/flights` | `GET` | Filterable list of scheduled flights | **Implemented** |
| `/api/v1/flights/{id}` | `GET` | Full telemetry and turnaround details for a flight | **Implemented** |
| `/api/v1/conflicts` | `GET` | Active gate and schedule conflicts | **Planned / In Development** |
| `/api/v1/simulations/runway-closure` | `POST` | Simulate runway closure impact & recovery proposals | **Planned** |
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
- **Status**: Planned / In Development
- **Description**: Retrieve list of managed airports.
- **Query Parameters**: `limit` (int, default 50), `offset` (int, default 0)
- **Response `200 OK`**:
  ```json
  [
    {
      "id": "del-uuid",
      "iata_code": "DEL",
      "icao_code": "VIDP",
      "name": "Indira Gandhi International Airport",
      "city": "New Delhi",
      "country": "India",
      "timezone": "Asia/Kolkata",
      "active_terminals": ["T1", "T2", "T3"],
      "active_runways_count": 4
    }
  ]
  ```

### `GET /api/v1/airports/{code}/runways`
- **Status**: Planned / In Development
- **Description**: List runways and operational capacities for a given airport.
- **Path Parameter**: `code` (e.g. `DEL`)
- **Response `200 OK`**:
  ```json
  [
    {
      "id": "runway-del-10-28",
      "runway_identifier": "10/28",
      "length_meters": 3810,
      "surface_type": "ASPHALT",
      "status": "OPEN",
      "current_capacity_movements_per_hour": 35
    }
  ]
  ```

### `GET /api/v1/airports/{code}/gates`
- **Status**: Planned / In Development
- **Description**: Retrieve gate statuses and assignments for an airport terminal.
- **Path Parameter**: `code` (e.g. `DEL`)
- **Query Parameters**: `terminal` (string, optional)
- **Response `200 OK`**:
  ```json
  [
    {
      "id": "gate-del-t3-42",
      "gate_number": "42",
      "terminal": "T3",
      "max_aircraft_size": "NARROW_BODY",
      "has_jetbridge": true,
      "status": "OCCUPIED",
      "current_flight_id": "6E-204"
    }
  ]
  ```

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

### `GET /api/v1/conflicts`
- **Status**: Planned / In Development
- **Description**: Fetch active operational conflicts (gate overlap, turnaround buffer violations).
- **Query Parameters**: `airport` (string, optional), `severity` (string, optional)
- **Response `200 OK`**:
  ```json
  [
    {
      "id": "conflict-gate-42-del",
      "type": "GATE_OCCUPANCY_OVERLAP",
      "severity": "HIGH",
      "airport_code": "DEL",
      "resource_type": "GATE",
      "resource_id": "Gate 42 (T3)",
      "conflicting_flight_ids": ["6E-204-DEL-BOM", "6E-5032-DEL-BLR"],
      "overlap_start": "2026-10-12T08:30:00Z",
      "overlap_end": "2026-10-12T09:05:00Z",
      "description": "Flight 6E 204 delayed departure overlaps with scheduled gate arrival for 6E 5032"
    }
  ]
  ```

---

## 8. Disruption Simulation APIs

### `POST /api/v1/simulations/runway-closure` (Runway Closure Simulation)
- **Status**: Planned
- **Description**: Simulate operational impact and generate tactical recovery proposals when an airport runway is temporarily closed (due to disabled aircraft, emergency maintenance, or weather).
- **Request Body**:
  ```json
  {
    "airport_code": "DEL",
    "runway_identifier": "10/28",
    "closure_start": "2026-10-12T09:00:00Z",
    "closure_end": "2026-10-12T11:30:00Z",
    "reason": "EMERGENCY_INSPECTION_FOD"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "simulation_id": "sim-runway-del-1028-20261012",
    "airport_code": "DEL",
    "runway_identifier": "10/28",
    "closure_window": {
      "start": "2026-10-12T09:00:00Z",
      "end": "2026-10-12T11:30:00Z",
      "duration_minutes": 150
    },
    "impact_summary": {
      "capacity_reduction_percentage": 28.5,
      "total_impacted_flights": 18,
      "diverted_flights_count": 2,
      "ground_delayed_departures_count": 12,
      "holding_arrivals_count": 4,
      "total_projected_delay_minutes": 495
    },
    "affected_flights": [
      {
        "flight_id": "6E-6112-DEL-HYD",
        "action_required": "REROUTE_RUNWAY",
        "original_runway": "10/28",
        "assigned_alternate_runway": "09/27",
        "projected_delay_minutes": 20
      },
      {
        "flight_id": "6E-344-CCU-DEL",
        "action_required": "HOLD_OR_DIVERT",
        "holding_time_minutes": 25,
        "fuel_status": "SUFFICIENT"
      }
    ],
    "recovery_proposals": [
      {
        "proposal_id": "prop-1",
        "title": "Re-sequence Departures to Runway 09/27",
        "action_type": "RUNWAY_REDISTRIBUTION",
        "description": "Shift 8 narrow-body departures from closed Runway 10/28 to Runway 09/27 with 3-minute wake turbulence separation.",
        "estimated_delay_mitigation_minutes": 140
      },
      {
        "proposal_id": "prop-2",
        "title": "Ground Delay Program (GDP) for Short-Haul Inbounds",
        "action_type": "ORIGIN_GROUND_HOLD",
        "description": "Issue ground stops at origin for BOM and JAI departures bound for DEL to prevent airborne holding stacks.",
        "estimated_delay_mitigation_minutes": 210
      }
    ]
  }
  ```

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
| 2026-10-12 | `GET /api/v1/flights`, `GET /api/v1/flights/{flight_id}` | Implemented flight listing with filtering, pagination headers (`X-Total-Count`, `X-Limit`, `X-Offset`), flight details, and structured 404/422 responses based on validated flight dataset loader. | Endpoints are now live and callable at `http://127.0.0.1:8000/api/v1/flights`. Provides exact JSON schemas for frontend consume. |
| 2026-10-12 | Project Contract Establishment | Added detailed schemas for flight list, flight detail (`GET /api/v1/flights/{id}`), and runway closure simulation (`POST /api/v1/simulations/runway-closure`); documented CORS, error format, and status matrix. | Clarifies flight detail card models, simulation payload specs, and confirmed endpoint readiness statuses. |
| 2026-10-06 | Baseline Contracts | Initial definition of SkyOps REST & WS endpoints | Baseline specifications established |
