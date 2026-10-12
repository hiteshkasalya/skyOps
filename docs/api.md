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
- `400 Bad Request`: Validation failure or malformed payload.
- `401 Unauthorized`: Missing or invalid authentication token.
- `403 Forbidden`: Insufficient permissions for requested action.
- `404 Not Found`: Target resource does not exist.
- `409 Conflict`: Operational or resource state conflict.
- `500 Internal Server Error`: Unhandled server-side exception.

---

## 3. Endpoint Implementation Status Matrix

The following matrix documents the exact development status of all defined API contracts:

| Endpoint | Method | Description | Implementation Status |
|---|---|---|---|
| `/api/v1/health` | `GET` | Service & database health status | **Planned / In Development** |
| `/api/v1/airports` | `GET` | List operational hub airports | **Planned / In Development** |
| `/api/v1/airports/{code}/runways` | `GET` | Runways and hourly movement capacities | **Planned / In Development** |
| `/api/v1/airports/{code}/gates` | `GET` | Terminal gates, sizes, and occupancy | **Planned / In Development** |
| `/api/v1/flights` | `GET` | Filterable list of scheduled flights | **Planned / In Development** |
| `/api/v1/flights/{id}` | `GET` | Full telemetry and turnaround details for a flight | **Planned / In Development** |
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
- **Status**: Planned / In Development
- **Description**: Returns operational health status of backend services, database connections, and background workers.
- **Response `200 OK`**:
  ```json
  {
    "status": "healthy",
    "version": "0.1.0",
    "database": "connected",
    "services": {
      "ingestion": "active",
      "conflict_detection": "active",
      "simulation_engine": "ready",
      "optimization_engine": "ready",
      "ml_prediction": "ready"
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
- **Status**: Planned / In Development
- **Description**: Fetch live flight schedule with optional filtering.
- **Query Parameters**:
  - `origin` (string, optional): 3-letter IATA code (e.g. `DEL`)
  - `destination` (string, optional): 3-letter IATA code (e.g. `BOM`)
  - `airline` (string, optional): Airline name or code (e.g. `IndiGo`)
  - `status` (string, optional): `ON_TIME`, `DELAYED`, `BOARDING`, `TAXIING`, `DEPARTED`, `ARRIVED`, `CANCELLED`
  - `date` (string, optional): `YYYY-MM-DD`
  - `limit` (int, default 50)
  - `offset` (int, default 0)
- **Response `200 OK`**:
  ```json
  [
    {
      "id": "6E-204-DEL-BOM",
      "flight_number": "6E 204",
      "airline": "IndiGo",
      "origin": "DEL",
      "destination": "BOM",
      "aircraft_type": "A321neo",
      "registration": "VT-IMG",
      "scheduled_departure": "2026-10-12T08:00:00Z",
      "estimated_departure": "2026-10-12T08:45:00Z",
      "actual_departure": null,
      "scheduled_arrival": "2026-10-12T10:15:00Z",
      "estimated_arrival": "2026-10-12T11:00:00Z",
      "actual_arrival": null,
      "status": "DELAYED",
      "terminal": "T3",
      "assigned_gate": "42",
      "assigned_runway": "10/28",
      "delay_minutes": 45,
      "delay_reason": "LATE_INBOUND_AIRCRAFT"
    }
  ]
  ```

### `GET /api/v1/flights/{id}` (Flight Detail)
- **Status**: Planned / In Development
- **Description**: Fetch detailed operational telemetry, passenger connection metrics, and turnaround milestone tracking for a specific flight.
- **Path Parameter**: `id` (string, unique flight identifier)
- **Response `200 OK`**:
  ```json
  {
    "id": "6E-204-DEL-BOM",
    "flight_number": "6E 204",
    "airline": "IndiGo",
    "origin": {
      "iata_code": "DEL",
      "name": "Indira Gandhi International Airport",
      "city": "New Delhi",
      "terminal": "T3",
      "gate": "42",
      "runway": "10/28"
    },
    "destination": {
      "iata_code": "BOM",
      "name": "Chhatrapati Shivaji Maharaj International Airport",
      "city": "Mumbai",
      "terminal": "T2",
      "gate": "22",
      "runway": "09/27"
    },
    "aircraft": {
      "type": "A321neo",
      "registration": "VT-IMG",
      "capacity": 222,
      "current_pax_count": 214
    },
    "timing": {
      "scheduled_departure": "2026-10-12T08:00:00Z",
      "estimated_departure": "2026-10-12T08:45:00Z",
      "actual_departure": null,
      "scheduled_arrival": "2026-10-12T10:15:00Z",
      "estimated_arrival": "2026-10-12T11:00:00Z",
      "actual_arrival": null,
      "delay_minutes": 45,
      "delay_reason": "LATE_INBOUND_AIRCRAFT"
    },
    "status": "DELAYED",
    "turnaround": {
      "inbound_flight_id": "6E-102-BLR-DEL",
      "inbound_arrival_actual": "2026-10-12T07:35:00Z",
      "deboarding_status": "COMPLETED",
      "cleaning_status": "IN_PROGRESS",
      "fueling_status": "PENDING",
      "catering_status": "IN_PROGRESS",
      "baggage_loading_status": "PENDING",
      "boarding_status": "PENDING"
    },
    "passengers": {
      "total": 214,
      "connecting_passengers": 38,
      "tight_connections_at_risk": 9
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
| 2026-10-12 | Project Contract Establishment | Added detailed schemas for flight list, flight detail (`GET /api/v1/flights/{id}`), and runway closure simulation (`POST /api/v1/simulations/runway-closure`); documented CORS, error format, and status matrix. | Clarifies flight detail card models, simulation payload specs, and confirmed endpoint readiness statuses. |
| 2026-10-06 | Baseline Contracts | Initial definition of SkyOps REST & WS endpoints | Baseline specifications established |
