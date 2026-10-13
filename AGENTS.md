# SkyOps Agent & Developer Instructions (AGENTS.md)

Welcome to the **SkyOps** repository. SkyOps is an AI-powered real-time airport operations and disruption management platform.

---

## 1. System Architecture & Ownership Responsibilities

SkyOps is organized with a strict separation between Backend/AI and Frontend systems to facilitate a seamless, concurrent two-developer workflow.

### Developer 1: Backend & AI/ML (Primary Focus)
Developer 1 is strictly responsible for the entire backend ecosystem, including:
- **FastAPI Core**: RESTful API endpoints, request validation, dependencies, middleware, CORS, and OpenAPI specifications.
- **PostgreSQL & SQLAlchemy**: Database schema design, ORM models, migrations (Alembic), indexing, and performance query optimization.
- **Airport Operations Domain**: Data modeling and operational logic for Airports, Runways, Gates, Flight Schedules, and Turnaround processes.
- **Flight Data Ingestion**: Integration with external flight APIs, data transformation, validation, and scheduled/streaming ingestion jobs.
- **Real-Time Engine**: WebSockets infrastructure for streaming live operational updates, gate conflicts, and disruption events.
- **Conflict Detection Engine**: Algorithmic identification of schedule overlapping, runway congestion, and gate assignment conflicts.
- **Delay Propagation Modeling**: Graph/cascade modeling of upstream flight delays onto downstream flights, gates, and connections.
- **Runway Closure Simulation & Recovery**: Simulation engine modeling the operational impact of runway closures and generating tactical recovery proposals.
- **OR-Tools Optimization**: Constraint programming and solver integration for automated gate allocation and schedule re-fleeting.
- **ML Delay Prediction**: Machine learning models and inference APIs for predicting flight delays based on weather, traffic, and historical data.
- **GenAI & RAG Engine**: Retrieval-Augmented Generation pipeline, vector store integration, operational agent tools, and Copilot backends.
- **Backend Testing**: Unit, integration, and performance tests for backend logic.

### Developer 2: Frontend & UI
Developer 2 is strictly responsible for:
- **Next.js & TypeScript**: Frontend web application architecture and component design.
- **UI/UX & Visualizations**: Real-time operations dashboards, interactive airport maps, gate Gantt charts, and timeline visualizers.
- **AI Copilot UI**: Chat interface, prompt suggestors, and rich action cards for operational decision support.

---

## 2. Strict Git Safety & Workflow Protocol

All backend developers and AI agents must follow this Git workflow without exception:

### 2.1 Before Every Task (Pre-Task Routine)
1. Run `git status --short --branch`.
2. Verify the branch is `backend`. If not, **STOP**.
3. Run `git fetch origin`.
4. Inspect local and remote branch status.
5. **Never discard or overwrite uncommitted work.**
6. If local changes exist, preserve them and stop before syncing if necessary.
7. If the branch has diverged or merge conflicts exist, **STOP** and explain the conflict. Do not automatically resolve important conflicts.
8. If clean and safe, sync using `git pull --ff-only origin backend`.
9. **NEVER** use `git reset --hard`, force push (`--force`), or any destructive Git commands that risk data loss.

### 2.2 After Each Task (Post-Task Routine)
1. Run relevant automated test suites (`pytest`).
2. Inspect `git diff` and `git status`.
3. Check for secrets, credentials, `.env` files, or unrelated files.
4. Stage only intended files (`git add <files>`).
5. Commit with a small, clear, descriptive commit message detailing *what* and *why*.
6. Push to `origin/backend`.
7. Verify the push output and report the commit hash.
8. If tests fail or the branch is unsafe, **do not push**.

### 2.3 Branch Boundaries
- Developer 1 works **ONLY** on the `backend` branch.
- **NEVER** work directly on `main`. `main` is the stable integration branch.
- **NEVER** push directly to `main`. Backend additions are integrated into `main` solely via Pull Requests.
- **NEVER** switch to or work on the `frontend` branch unless explicitly instructed by the user.

---

## 3. Frontend Protection Guidelines

- The `frontend/` directory belongs strictly to Developer 2.
- **Do NOT** modify frontend source code, components, package dependencies, or configuration files.
- If a backend change requires a corresponding frontend adjustment (e.g., API payload change), update [docs/api.md](file:///c:/Skyops/docs/api.md) first and clearly document the frontend impact in the contract registry.

---

## 4. Local Development Setup

### 4.1 Prerequisites
- Python 3.11+ (Python 3.13 supported)
- Git
- PostgreSQL 15+ (optional for local prototyping; SQLite supported for zero-setup local development)

### 4.2 Backend Environment Setup
```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
```

### 4.3 Running the Backend Server
```bash
# Run FastAPI with live reload
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
Interactive API documentation will be available at:
- Swagger UI: `http://127.0.0.1:8000/docs`
- ReDoc: `http://127.0.0.1:8000/redoc`

### 4.4 Running Backend Tests
```bash
# Run pytest test suite
pytest
```

---

## 5. Development & Coding Standards

- **Python & FastAPI**:
  - Follow PEP 8 guidelines and strict type hinting (`pydantic` schemas, `typing` module).
  - Enforce clean layer separation: `routers/` -> `services/` -> `models/` / `schemas/`.
  - Use asynchronous standard patterns (`async def`) for I/O operations (database queries, external HTTP calls).
- **Security & Secret Management**:
  - **NEVER** hardcode or expose API keys, database credentials, or secret keys in source code or commits.
  - Store all secrets in `.env`. Ensure `.env` is listed in `.gitignore` and never committed.
- **Database Guidelines**:
  - Use SQLAlchemy ORM with explicit model relationships and constraint definitions.
  - Maintain migration scripts via Alembic for any schema modification.
  - Add database indexes on frequently queried fields (e.g., `flight_number`, `scheduled_departure`, `airport_code`).
- **Testing Requirements**:
  - Maintain comprehensive test coverage using `pytest`.
  - Run test suites before declaring tasks completed and before pushing.
- **AI/ML & Optimization Standards**:
  - Decouple ML models, simulation engines, and OR-Tools solver logic from HTTP handlers into independent service engines.
  - Handle rate limits, timeouts, and fallback mechanisms gracefully in external API and GenAI integrations.

---

## 6. Task Execution Rules

- **Work in small, testable increments**. Never attempt to build the entire platform in a single task.
- **Inspect before modifying**: Always inspect existing architecture and relevant files before proposing or implementing changes.
- **Document API changes**: Maintain [docs/api.md](file:///c:/Skyops/docs/api.md) whenever an API endpoint contract is added or modified.
- **No Unimplemented Claims**: Never invent flight data or claim unimplemented functionality works.
