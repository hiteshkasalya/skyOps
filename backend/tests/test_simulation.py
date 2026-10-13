"""Unit and integration tests for runway closure disruption simulation and tactical recovery."""
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
import pytest

from app.main import app
from app.schemas.conflict import ConflictType
from app.schemas.simulation import (
    DisruptionSimulationRequest,
    DisruptionSimulationResponse,
)
from app.services.flight_service import flight_service
from app.services.resource_service import resource_service
from app.services.simulation_service import simulation_service

client = TestClient(app)


def test_simulation_valid_runway_closure():
    """Test valid runway closure with affected flights, recovery proposals, and metric comparisons."""
    # 6E-6112 departs DEL at 09:15 UTC (runway occupancy 09:13 - 09:16 on default runway 10/28)
    # 6E-103 departs DEL at 10:00 UTC (runway occupancy 09:58 - 10:01 on default runway 10/28)
    req = DisruptionSimulationRequest(
        airport_code="DEL",
        runway_identifier="10/28",
        closure_start=datetime(2026, 10, 12, 9, 0, tzinfo=timezone.utc),
        closure_end=datetime(2026, 10, 12, 10, 30, tzinfo=timezone.utc),
        reason="EMERGENCY_FOD_INSPECTION",
    )

    response = simulation_service.run_runway_closure_simulation(req)

    assert isinstance(response, DisruptionSimulationResponse)
    assert response.airport_code == "DEL"
    assert response.runway_identifier == "10/28"
    assert response.reason == "EMERGENCY_FOD_INSPECTION"
    assert response.is_feasible is True
    assert response.recovery_strategy == "RULE_BASED_HEURISTIC"

    # Verify affected flights detected
    assert len(response.affected_flights) >= 2
    affected_ids = [af.flight_id for af in response.affected_flights]
    assert "6E-6112-DEL-HYD-20261012" in affected_ids
    assert "6E-103-DEL-BLR-20261012" in affected_ids

    # Verify recovery proposals generated
    assert len(response.recovery_proposals) >= 2
    for prop in response.recovery_proposals:
        assert prop.original_runway == "10/28"
        assert prop.proposed_runway in ["11/29", "09/27"]
        assert prop.action_type == "RUNWAY_REALLOCATION"

    # Verify metrics comparison
    assert response.post_disruption_metrics.impacted_flights_count == len(response.affected_flights)
    assert response.recovery_metrics.resolved_conflicts_count >= 1
    assert "OR-Tools" in response.limitations_notice


def test_simulation_no_affected_flights():
    """Test simulation when runway closure occurs during a quiet window with no scheduled operations."""
    req = DisruptionSimulationRequest(
        airport_code="DEL",
        runway_identifier="10/28",
        closure_start=datetime(2026, 10, 12, 1, 0, tzinfo=timezone.utc),
        closure_end=datetime(2026, 10, 12, 2, 0, tzinfo=timezone.utc),
        reason="NIGHT_CALIBRATION",
    )

    response = simulation_service.run_runway_closure_simulation(req)

    assert response.is_feasible is True
    assert len(response.affected_flights) == 0
    assert len(response.recovery_proposals) == 0
    assert response.post_disruption_metrics.impacted_flights_count == 0
    assert response.recovery_metrics.net_delay_added_minutes == 0


def test_simulation_infeasible_recovery():
    """Test simulation when no alternate runways are available to accommodate displaced flights."""
    # Temporarily deactivate alternate runways on a cloned resource service
    from app.services.resource_service import ResourceService
    import copy

    isolated_res = ResourceService.__new__(ResourceService)
    isolated_res.data_path = resource_service.data_path
    isolated_res.airports = copy.deepcopy(resource_service.airports)
    isolated_res.turnaround_rules = copy.deepcopy(resource_service.turnaround_rules)

    # Deactivate alternate runways 11/29 and 09/27 at DEL
    del_ap = isolated_res.get_airport("DEL")
    assert del_ap is not None
    for rw in del_ap.runways:
        if rw.runway_id != "10/28":
            rw.is_active = False

    from app.services.simulation_service import SimulationService
    infeasible_sim_svc = SimulationService(res_svc=isolated_res)

    req = DisruptionSimulationRequest(
        airport_code="DEL",
        runway_identifier="10/28",
        closure_start=datetime(2026, 10, 12, 9, 0, tzinfo=timezone.utc),
        closure_end=datetime(2026, 10, 12, 10, 30, tzinfo=timezone.utc),
        reason="MAJOR_INCIDENT_TOTAL_CONGESTION",
    )

    response = infeasible_sim_svc.run_runway_closure_simulation(req)

    assert response.is_feasible is False
    assert len(response.affected_flights) >= 2
    for af in response.affected_flights:
        assert af.action_required in ["GROUND_DELAY", "DIVERT_REQUIRED"]
        assert af.proposed_runway is None

    for prop in response.recovery_proposals:
        assert prop.action_type in ["GROUND_HOLD", "FLIGHT_DIVERSION"]


def test_simulation_live_state_immutability():
    """Verify strictly that the simulation does not mutate live schedule or airport resources."""
    # Record initial counts
    initial_flight_count = len(flight_service._flights)
    del_rw_1028 = resource_service.get_runway("DEL", "10/28")
    assert del_rw_1028 is not None
    initial_closure_count = len(del_rw_1028.closure_windows)

    # Execute simulation
    req = DisruptionSimulationRequest(
        airport_code="DEL",
        runway_identifier="10/28",
        closure_start=datetime(2026, 10, 12, 9, 0, tzinfo=timezone.utc),
        closure_end=datetime(2026, 10, 12, 10, 30, tzinfo=timezone.utc),
        reason="IMMUTABILITY_CHECK",
    )
    _ = simulation_service.run_runway_closure_simulation(req)

    # Verify live state remained completely unchanged
    assert len(flight_service._flights) == initial_flight_count
    assert len(del_rw_1028.closure_windows) == initial_closure_count


def test_simulation_affected_flight_ids_filter():
    """Test filtering simulation to a specific subset of affected flight IDs."""
    req = DisruptionSimulationRequest(
        airport_code="DEL",
        runway_identifier="10/28",
        closure_start=datetime(2026, 10, 12, 9, 0, tzinfo=timezone.utc),
        closure_end=datetime(2026, 10, 12, 10, 30, tzinfo=timezone.utc),
        affected_flight_ids=["6E-6112-DEL-HYD-20261012"],
    )

    response = simulation_service.run_runway_closure_simulation(req)

    assert len(response.affected_flights) == 1
    assert response.affected_flights[0].flight_id == "6E-6112-DEL-HYD-20261012"
    assert len(response.recovery_proposals) == 1


def test_api_post_simulation_run_success():
    """Test POST /api/v1/simulation/run HTTP endpoint."""
    payload = {
        "airport_code": "DEL",
        "runway_identifier": "10/28",
        "closure_start": "2026-10-12T09:00:00Z",
        "closure_end": "2026-10-12T10:30:00Z",
        "reason": "SCHEDULED_MAINTENANCE",
    }
    resp = client.post("/api/v1/simulation/run", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["airport_code"] == "DEL"
    assert data["runway_identifier"] == "10/28"
    assert data["is_feasible"] is True
    assert "recovery_proposals" in data
    assert "baseline_metrics" in data
    assert "post_disruption_metrics" in data
    assert "recovery_metrics" in data


def test_api_post_simulations_alias_endpoint():
    """Test POST /api/v1/simulations/runway-closure alias endpoint."""
    payload = {
        "airport_code": "DEL",
        "runway_identifier": "10/28",
        "closure_start": "2026-10-12T09:00:00Z",
        "closure_end": "2026-10-12T10:30:00Z",
    }
    resp = client.post("/api/v1/simulations/runway-closure", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["airport_code"] == "DEL"
    assert data["is_feasible"] is True


def test_api_simulation_validation_errors():
    """Test API error handling for invalid timestamps, non-existent runway and airport."""
    # Invalid chronologic order (end <= start)
    resp = client.post(
        "/api/v1/simulation/run",
        json={
            "airport_code": "DEL",
            "runway_identifier": "10/28",
            "closure_start": "2026-10-12T10:30:00Z",
            "closure_end": "2026-10-12T09:00:00Z",
        },
    )
    assert resp.status_code == 422

    # Non-existent airport
    resp = client.post(
        "/api/v1/simulation/run",
        json={
            "airport_code": "XYZ",
            "runway_identifier": "10/28",
            "closure_start": "2026-10-12T09:00:00Z",
            "closure_end": "2026-10-12T10:30:00Z",
        },
    )
    assert resp.status_code == 404

    # Non-existent runway
    resp = client.post(
        "/api/v1/simulation/run",
        json={
            "airport_code": "DEL",
            "runway_identifier": "99/99",
            "closure_start": "2026-10-12T09:00:00Z",
            "closure_end": "2026-10-12T10:30:00Z",
        },
    )
    assert resp.status_code == 404


def test_simulation_inferred_unique_airport_code():
    """Verify that a unique runway identifier correctly infers its airport when omitted."""
    resp = client.post(
        "/api/v1/simulation/run",
        json={
            "runway_identifier": "10/28",
            "closure_start": "2026-10-12T09:00:00Z",
            "closure_end": "2026-10-12T10:30:00Z",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["airport_code"] == "DEL"


def test_simulation_ambiguous_runway_requires_airport_code():
    """Verify that a non-unique runway identifier (e.g. 09/27 at DEL and BOM) errors if airport_code omitted."""
    resp = client.post(
        "/api/v1/simulation/run",
        json={
            "runway_identifier": "09/27",
            "closure_start": "2026-10-12T09:00:00Z",
            "closure_end": "2026-10-12T10:30:00Z",
        },
    )
    assert resp.status_code == 400
    assert "multiple airports" in resp.json()["message"].lower()
