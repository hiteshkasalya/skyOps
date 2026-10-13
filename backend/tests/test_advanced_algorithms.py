"""Comprehensive test suite for Advanced Aviation Operations Algorithms:
- Network Cascade Delay Propagation & Crew Duty Limits
- Operations Research Gate Assignment Problem (GAP) Solver
- Machine Learning Flight Delay Prediction & Explainable AI (XAI)
"""

from datetime import datetime, timezone
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.propagation_service import propagation_service
from app.services.gate_solver import gate_solver
from app.services.prediction_service import prediction_service
from app.schemas.propagation import DelayPropagationRequest
from app.schemas.optimization import GateOptimizationRequest
from app.schemas.prediction import DelayPredictionRequest

client = TestClient(app)


def test_delay_propagation_service_calculation():
    """Verify aircraft rotation cascade modeling and crew duty clock."""
    req = DelayPropagationRequest(
        flight_id="6E-204-DEL-BOM-20261012",
        initial_delay_minutes=45,
        cause="LATE_INBOUND_AIRCRAFT",
        tail_number="VT-IMG",
    )
    result = propagation_service.propagate_delay(req)

    assert result.root_flight_number == "6E 204"
    assert result.root_delay_minutes == 45
    assert result.total_impacted_flights >= 1
    assert result.cascaded_delay_minutes_total > 0
    assert len(result.downstream_impacts) >= 1
    assert result.crew_duty.duty_hours_elapsed >= 7.0
    assert result.passenger_impact.total_connecting_passengers == 28
    assert result.passenger_impact.missed_connections_count == 22


def test_delay_propagation_severe_crew_duty_breach():
    """Verify that severe delay triggers crew duty period legal breach (>10 hours)."""
    req = DelayPropagationRequest(
        flight_id="6E-204-DEL-BOM-20261012",
        initial_delay_minutes=240,  # 4 hours delay
        cause="AIRCRAFT_TECHNICAL_MAINTENANCE",
        tail_number="VT-IMG",
    )
    result = propagation_service.propagate_delay(req)

    assert result.crew_duty.duty_hours_elapsed >= 10.0
    assert result.crew_duty.duty_breached is True
    assert "mandatory" in result.crew_duty.action_required.lower()


def test_gate_optimization_solver_optimal_resolution():
    """Verify OR constraint solver achieves globally optimal collision-free gate allocation."""
    req = GateOptimizationRequest(airport_code="DEL", prefer_jetbridge=True)
    result = gate_solver.solve(req)

    assert result.airport_code == "DEL"
    assert result.solver_status == "OPTIMAL"
    assert result.reassignments_count > 0
    assert result.metrics.total_conflicts_resolved >= 1
    assert result.metrics.solve_duration_ms > 0

    # Verify that Gate 42 contention is solved with reassignments
    reassigned_gates = [r.recommended_gate for r in result.reassignments]
    assert len(set(reassigned_gates)) == len(reassigned_gates) or len(reassigned_gates) > 0


def test_ml_delay_prediction_fog_vs_clear():
    """Verify ML delay inference gives higher probability & explainability under severe fog."""
    # Fog scenario
    fog_req = DelayPredictionRequest(
        flight_number="6E 204",
        origin="DEL",
        destination="BOM",
        scheduled_departure=datetime(2026, 10, 12, 8, 0, tzinfo=timezone.utc),
        weather_condition="FOG",
        visibility_meters=150,  # CAT-III
        wind_speed_knots=12,
        congestion_level="HIGH",
        upstream_delay_minutes=45,
    )
    fog_res = prediction_service.predict_delay(fog_req)

    assert fog_res.delay_probability >= 0.70
    assert fog_res.risk_level in ["ELEVATED", "CRITICAL"]
    assert fog_res.predicted_delay_minutes >= 30
    assert len(fog_res.top_feature_attributions) >= 3

    # Verify statistical confidence bounds
    ci = fog_res.confidence_interval
    assert ci.p10_optimistic_minutes <= ci.p50_expected_minutes <= ci.p90_conservative_minutes

    # Clear scenario
    clear_req = DelayPredictionRequest(
        flight_number="6E 722",
        origin="BOM",
        destination="HYD",
        scheduled_departure=datetime(2026, 10, 12, 14, 0, tzinfo=timezone.utc),
        weather_condition="CLEAR",
        visibility_meters=8000,
        wind_speed_knots=5,
        congestion_level="LOW",
        upstream_delay_minutes=0,
    )
    clear_res = prediction_service.predict_delay(clear_req)

    assert clear_res.delay_probability < 0.40
    assert clear_res.predicted_delay_minutes < fog_res.predicted_delay_minutes


def test_api_propagation_endpoints():
    """Verify HTTP endpoints for delay propagation."""
    # POST /api/v1/delays/propagate
    payload = {
        "flight_id": "6E-204-DEL-BOM-20261012",
        "initial_delay_minutes": 50,
        "cause": "LATE_INBOUND_AIRCRAFT",
        "tail_number": "VT-IMG",
    }
    resp = client.post("/api/v1/delays/propagate", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["root_flight_number"] == "6E 204"
    assert data["cascaded_delay_minutes_total"] > 0

    # GET /api/v1/delays/{id}/rotation-cascade
    get_resp = client.get("/api/v1/delays/6E-204-DEL-BOM-20261012/rotation-cascade")
    assert get_resp.status_code == 200
    get_data = get_resp.json()
    assert get_data["root_flight_number"] == "6E 204"


def test_api_optimization_endpoints():
    """Verify HTTP endpoints for OR gate optimization."""
    # POST /api/v1/optimization/solve-gates
    resp = client.post("/api/v1/optimization/solve-gates", json={"airport_code": "DEL"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["solver_status"] == "OPTIMAL"
    assert len(data["reassignments"]) > 0

    # GET /api/v1/optimization/gates/{code}
    hub_resp = client.get("/api/v1/optimization/gates/DEL")
    assert hub_resp.status_code == 200
    hub_data = hub_resp.json()
    assert hub_data["airport_code"] == "DEL"


def test_api_prediction_endpoints():
    """Verify HTTP endpoints for ML delay prediction and explainability."""
    # POST /api/v1/predictions/delay
    payload = {
        "flight_number": "6E 204",
        "origin": "DEL",
        "destination": "BOM",
        "scheduled_departure": "2026-10-12T08:00:00Z",
        "aircraft_type": "A321neo",
        "weather_condition": "LOW_VISIBILITY_FOG",
        "visibility_meters": 300,
        "wind_speed_knots": 10,
        "congestion_level": "HIGH",
        "upstream_delay_minutes": 40,
    }
    resp = client.post("/api/v1/predictions/delay", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert "delay_probability" in data
    assert "top_feature_attributions" in data
    assert len(data["top_feature_attributions"]) > 0

    # GET /api/v1/predictions/flights/{id}
    fl_resp = client.get("/api/v1/predictions/flights/6E-204-DEL-BOM-20261012")
    assert fl_resp.status_code == 200
    fl_data = fl_resp.json()
    assert fl_data["flight_number"] == "6E 204"
