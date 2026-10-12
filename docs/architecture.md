# SkyOps Architecture Documentation

## 1. System Overview

**SkyOps** is an enterprise-grade, AI-powered real-time airport operations and disruption management platform. The platform monitors flight schedules, airport resource allocations (gates, runways, taxiways), predicts operational delays, detects resource conflicts, and provides automated constraint optimization, runway-closure disruption simulation, and AI Copilot decision support for airport operations teams.

---

## 2. High-Level Architecture & Ownership Boundaries

```
                                 ┌─────────────────────────────────┐
                                 │     External Flight & Weather   │
                                 │              APIs               │
                                 └────────────────┬────────────────┘
                                                  │
                                                  ▼
┌────────────────────────┐       ┌─────────────────────────────────┐
│   Frontend Application │       │    Flight Ingestion Engine      │
│  (Next.js / TypeScript)│       └────────────────┬────────────────┘
│      [Developer 2]     │                        │
└───────────┬────────────┘                        │
            │ HTTP / WS                           ▼
            │                    ┌─────────────────────────────────┐
            └───────────────────►│    FastAPI Application Core     │
                                 │         [Developer 1]           │
                                 └────────────────┬────────────────┘
                                                  │
         ┌───────────────────┬────────────────────┼────────────────────┬───────────────────┐
         │                   │                    │                    │                   │
         ▼                   ▼                    ▼                    ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌──────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ PostgreSQL /    │ │ Real-Time WS    │ │ Conflict & Delay │ │ Runway Closure  │ │ OR-Tools & ML / │
│ SQLite DB       │ │ Event Hub       │ │ Cascade Engine   │ │ Simulator       │ │ GenAI RAG Engine│
└─────────────────┘ └─────────────────┘ └──────────────────┘ └─────────────────┘ └─────────────────┘
```

### 2.1 Developer Ownership Matrix
- **Developer 1 (Backend & AI/ML - `backend` branch)**:
  - FastAPI application core, middleware, CORS, and REST routing.
  - SQLAlchemy models, database persistence, and migrations.
  - Flight ingestion, normalization, and scheduling domain logic.
  - WebSockets telemetry and real-time operational broadcasting.
  - Conflict detection engine (gate overlap, turnaround violations).
  - Delay propagation modeling (cascade impact calculation).
  - Runway-closure simulation engine and recovery proposal generator.
  - OR-Tools constraint optimization for gate allocation and schedule re-slotting.
  - Machine learning delay prediction and GenAI RAG Copilot services.
  - Backend automated test suite (`pytest`) and API contracts ([docs/api.md](file:///c:/Skyops/docs/api.md)).

- **Developer 2 (Frontend & UI - `frontend` branch)**:
  - Next.js and React web application architecture.
  - Real-time operations dashboards and telemetry visualizations.
  - Interactive airport maps, runway status indicators, and gate Gantt charts.
  - AI Copilot conversational UI and action confirmation cards.

---

## 3. Core Subsystems & Components

### 3.1 FastAPI Backend Core
- **Framework**: FastAPI (Python 3.11+) with Pydantic v2 data validation.
- **Base URL**: `/api/v1`
- **CORS Configuration**: Restricts origins to trusted frontend domains (`http://localhost:3000` during development) with full support for GET, POST, PUT, DELETE, OPTIONS methods and credentials.
- **Error Handling**: Standardized RFC 7807 compatible error payloads with machine-readable error codes and descriptive messaging.

### 3.2 Database Layer (PostgreSQL & SQLite)
- **Database**: PostgreSQL 15+ in production; SQLite supported for zero-setup local development and rapid test execution.
- **ORM**: SQLAlchemy 2.0 with explicit relationship definitions and async query patterns.
- **Entities**:
  - `Airport`: IATA/ICAO codes, geographic location, active terminals.
  - `Runway`: Identifiers, length, operational capacity, weather limits, closure state.
  - `Gate`: Terminal number, size class, jet bridge equipment, occupancy status.
  - `Flight`: Airline, flight number, route, scheduled/estimated/actual departure & arrival, assigned resources, delay minutes, disruption causes.
  - `Turnaround`: Catering, fueling, baggage, cleaning, and boarding phase milestones.
  - `Conflict`: Resource contention events, severity ratings, impacted flights.
  - `Simulation`: Disruption scenarios, impacted flight projections, recovery proposals.

### 3.3 Conflict Detection & Delay Propagation Engine
- **Conflict Engine**: Continuous spatial-temporal evaluation of gate allocations and runway time slots to flag overlaps and turnaround buffer breaches.
- **Delay Propagation**: Graph-based cascade modeling tracing how an upstream arrival delay causes downstream departures and connecting flights to miss operating windows.

### 3.4 Runway Closure Simulation & Tactical Recovery Engine
- **Simulation**: Models the sudden or planned closure of one or more runways at a given airport over a designated time window.
- **Impact Analysis**: Calculates queue buildups, arrival holds, departure ground stops, and flight diversions.
- **Recovery Proposals**: Generates actionable recovery strategies:
  - Diverting traffic to alternate operational runways.
  - Ground-holding non-urgent departures.
  - Re-slotting arrival windows to prevent holding-pattern fuel emergencies.

### 3.5 OR-Tools Optimization Engine
- **Technology**: Google OR-Tools (Constraint Programming CP-SAT / Mixed Integer Programming).
- **Role**: Re-assigns gates, re-sequences runway movements, and minimizes total passenger delay penalties during major disruptions.

### 3.6 ML Delay Prediction & GenAI RAG Engine
- **ML Delay Prediction**: Predictive models forecasting flight delay likelihood and duration based on historical patterns, weather METAR reports, and inbound delays.
- **GenAI Copilot & RAG**: Semantic search over airport Standard Operating Procedures (SOPs) and disruption playbooks, providing operational recommendations via natural language.

---

## 4. Subsystem Implementation Status

To maintain transparent tracking across teams, the current development status of each backend component is cataloged below:

| Subsystem / Feature | Current Status | Notes |
|---|---|---|
| **Architecture & API Contracts** | **Established** | Documented in `docs/architecture.md` and `docs/api.md` |
| **Developer Guidelines & Git Rules** | **Established** | Documented in `AGENTS.md` |
| **FastAPI Core (`backend/app`)** | **Implemented** | Application core, CORS, and health check |
| **IndiGo Operational Dataset & Ingestion**| **Implemented** | Synthetic IndiGo dataset (DEL, BOM, BLR, CCU, HYD) with Pandas loader |
| **Flight REST APIs** | **Implemented** | `/flights`, `/flights/{id}` with filtering, pagination headers, and 404/422 handling |
| **Airport Resources & Schedule Models** | **Implemented** | Airport topology, runway closures, gate compatibility, and turnaround validation |
| **Database Models & Session** | **Planned / In Development** | SQLAlchemy models for Airport, Gate, Flight |
| **Conflict Detection Engine** | **Implemented** | Deterministic detector for runway closures, runway overlaps, gate contention, and turnaround breaches |
| **Runway-Closure Simulator** | **Planned** | Simulation engine and recovery proposals API |
| **Delay Propagation Modeling** | **Planned** | Cascade delay tree calculation |
| **OR-Tools Gate Optimization** | **Planned** | Constraint solver integration |
| **ML Delay Prediction** | **Planned** | Historical training & inference service |
| **GenAI RAG Copilot** | **Planned** | Vector store and LLM integration |
| **WebSockets Live Telemetry** | **Planned** | Push event manager (`/ws/v1/live-ops`) |
