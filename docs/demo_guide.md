# SkyOps Live Demonstration Guide

This guide provides the exact sequence of steps, cURL commands, PowerShell commands, and expected JSON responses to demonstrate the **SkyOps** platform backend during the operational demonstration.

---

## 1. Quick Start & Server Startup

### 1.1 Start Backend Service
From the repository root:

```bash
# Navigate to backend directory
cd backend

# Activate virtual environment
# Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# Linux / macOS:
source venv/bin/activate

# Launch FastAPI application with live reload
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### 1.2 Interactive API Explorers
Once running, interactive documentation is accessible at:
- **Swagger UI**: `http://127.0.0.1:8000/docs`
- **ReDoc**: `http://127.0.0.1:8000/redoc`
- **Base API URL**: `http://127.0.0.1:8000/api/v1`

---

## 2. Demonstration Scenario Overview

- **Operational Hub**: Indira Gandhi International Airport (**DEL** / VIDP), New Delhi.
- **Date**: 12 October 2026.
- **Flight Network**: 12 scheduled IndiGo flights linking DEL, BOM, BLR, CCU, and HYD.
- **Data Provenance**:
  - Flight schedules: Synthetic operational dataset clearly labeled `SYNTHETIC_DEMO`.
  - Airport topology: Runways (`10/28`, `11/29`, `09/27`), terminal gates (`41`, `42`, `46`, `18`), and turnaround rules clearly labeled `is_simulated: true`.
- **Core Capabilities Highlighted**:
  1. System Health & Infrastructure Introspection.
  2. Flight Schedule Querying & Telemetry Filtering.
  3. Deterministic Conflict Detection (Gate double-booking & runway maintenance overlap).
  4. Disruption Simulation & Tactical Recovery Engine (Runway closure on isolated schedule copies without mutating live data).
  5. Infeasible Disruption Fallback Handling.

---

## 3. Step-by-Step Demonstration Script

### Step 1: Verify System Health & Ingestion Status
Demonstrates backend readiness, database connectivity, and flight loader state.

#### Command:
```bash
curl -X GET "http://127.0.0.1:8000/api/v1/health" -H "Accept: application/json"
```

#### Expected Response (`200 OK`):
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

### Step 2: Inspect Airport Infrastructure & Topology
Demonstrates spatial resource modeling for Indira Gandhi International Airport (DEL).

#### Command:
```bash
curl -X GET "http://127.0.0.1:8000/api/v1/airports/DEL" -H "Accept: application/json"
```

#### Key Highlights to Explain:
- **Runways**: Runway `10/28` (3,810m), `11/29` (4,430m), and `09/27` (3,810m).
- **Gates**: Gate `41`, `42`, `46` at Terminal 3 (T3), Gate `18` at Terminal 2 (T2).
- Note that simulated data is clearly flagged with `"is_active": true`.

---

### Step 3: Query Scheduled Flights from New Delhi
Demonstrates flight schedule filtering, pagination headers, and telemetry validation.

#### Command:
```bash
curl -X GET "http://127.0.0.1:8000/api/v1/flights?origin=DEL&limit=5" -H "Accept: application/json"
```

#### Expected Response (`200 OK`):
Returns flights originating at DEL, including:
- `6E 204` (DEL -> BOM) departing at 08:00 UTC (Terminal T3, Gate 42).
- `6E 5032` (DEL -> BLR) departing at 08:30 UTC (Terminal T3, Gate 42).
- `6E 6112` (DEL -> HYD) departing at 09:15 UTC (Terminal T2, Gate 18).
- `6E 103` (DEL -> BLR) departing at 10:00 UTC (Terminal T3, Gate 46).

#### Response Headers:
- `X-Total-Count`: Total matching flights.
- `X-Limit`: `5`.
- `X-Offset`: `0`.

---

### Step 4: Detect Pre-Existing Operational Conflicts
Demonstrates deterministic spatial-temporal conflict detection across runway occupancies and gate intervals.

#### Command:
```bash
curl -X GET "http://127.0.0.1:8000/api/v1/conflicts?airport=DEL" -H "Accept: application/json"
```

#### Key Highlights to Explain:
1. **Gate Double-Booking on Gate 42 (`GATE_OCCUPANCY_CONFLICT`)**:
   - Flight `6E 204` boards from 07:20 to 08:00 UTC.
   - Flight `6E 5032` boards from 07:50 to 08:30 UTC.
   - Overlap detected: `07:50 - 08:00 UTC` with `CRITICAL` / `HIGH` severity rating.
2. **Scheduled Sweeper Maintenance Overlap (`RUNWAY_CLOSURE_CONFLICT`)**:
   - Runway `10/28` has scheduled maintenance from 09:00 to 10:30 UTC.
   - Departure `6E 6112` (09:13 - 09:16 UTC) and `6E 103` (09:58 - 10:01 UTC) contend with this closure.

---

### Step 5: The Disruption Event — Emergency Runway 10/28 Closure Simulation
Simulate an emergency Foreign Object Debris (FOD) inspection on DEL Runway `10/28` from 09:00 to 10:30 UTC.

#### Command:
```bash
curl -X POST "http://127.0.0.1:8000/api/v1/simulation/run" \
  -H "Content-Type: application/json" \
  -d '{
    "airport_code": "DEL",
    "runway_identifier": "10/28",
    "closure_start": "2026-10-12T09:00:00Z",
    "closure_end": "2026-10-12T10:30:00Z",
    "reason": "EMERGENCY_FOD_INSPECTION"
  }'
```

#### Key Highlights to Explain in Response:
- **State Immutability**: The simulation cloned schedule data; live flight schedules and runway closures remain unmutated.
- **Affected Flights Detected**:
  - `6E 6112` (DEL -> HYD) departing at 09:15 UTC.
  - `6E 103` (DEL -> BLR) departing at 10:00 UTC.
- **Tactical Recovery Proposals Generated**:
  - `Proposal prop-1`: Reassigns `6E 103` departure to alternate Runway `11/29` with 0 minutes added delay.
  - `Proposal prop-2`: Reassigns `6E 6112` departure to alternate Runway `11/29` with 0 minutes added delay.
- **Delta Metrics Comparison**:
  - `resolved_conflicts_count`: 2 runway closure conflicts eliminated.
  - `net_delay_added_minutes`: 0 minutes added.
  - `is_feasible`: `true`.
- **Transparency Notice**:
  - Clearly acknowledges the deterministic rule-based heuristic recovery method and outlines the Phase 3 roadmap (OR-Tools CP-SAT solver).

---

### Step 6: Edge Case — Infeasible Recovery Handling
Demonstrate how the system handles scenarios where alternative runways are unavailable or airport code is ambiguous.

#### Example A: Ambiguous Runway Without Airport Code (`400 Bad Request`)
Runway `09/27` exists at both DEL and BOM.
```bash
curl -X POST "http://127.0.0.1:8000/api/v1/simulation/run" \
  -H "Content-Type: application/json" \
  -d '{
    "runway_identifier": "09/27",
    "closure_start": "2026-10-12T09:00:00Z",
    "closure_end": "2026-10-12T10:30:00Z"
  }'
```
**Response**: `400 Bad Request` explaining:
> `"Runway '09/27' exists at multiple airports (DEL, BOM). Please specify 'airport_code' explicitly."`

#### Example B: Chronological Order Violation (`422 Unprocessable Content`)
```bash
curl -X POST "http://127.0.0.1:8000/api/v1/simulation/run" \
  -H "Content-Type: application/json" \
  -d '{
    "airport_code": "DEL",
    "runway_identifier": "10/28",
    "closure_start": "2026-10-12T10:30:00Z",
    "closure_end": "2026-10-12T09:00:00Z"
  }'
```
**Response**: `422 Unprocessable Content` rejecting inverted closure timestamps.

---

## 4. Known Scope & Algorithmic Limitations

To ensure absolute transparency during operational demonstrations:
1. **Rule-Based Heuristic**: Tactical recovery re-sequencing uses deterministic separation heuristics. It does not yet guarantee mathematical global optimality (OR-Tools constraint solver integration is scheduled for Phase 3).
2. **Synthetic Operational Topology**: Airport runway configurations, gate layouts, and turnaround durations are realistic operational models constructed for demonstration purposes (`is_simulated: true`), as historical flight datasets do not include internal airport gate assignments.
3. **Frontend Integration**: Backend endpoints expose permissive CORS for `http://localhost:3000` and `http://127.0.0.1:3000` to support Developer 2's Next.js UI integration.
