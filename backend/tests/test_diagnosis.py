"""Unit and integration tests for Flight Issue Diagnosis, Cascading Defect Projection, and Recovery Ledgers."""
from fastapi.testclient import TestClient
import pytest

from app.main import app
from app.schemas.diagnosis import DefectCategory, DefectSeverity, FlightDiagnosisResponse
from app.services.diagnosis_service import diagnosis_service

client = TestClient(app)


def test_diagnose_delayed_flight_with_gate_and_turnaround_conflict():
    """Verify diagnosis of flight 6E 204: detects late inbound, gate deadlock, turnaround breach, and generates audit ledger."""
    flight_id = "6E-204-DEL-BOM-20261012"
    diagnosis = diagnosis_service.diagnose_flight(flight_id)

    assert isinstance(diagnosis, FlightDiagnosisResponse)
    assert diagnosis.flight_number == "6E 204"
    assert diagnosis.origin_airport == "DEL"
    assert diagnosis.destination_airport == "BOM"
    assert diagnosis.has_issue is True

    # 1. Root Issue Check
    assert diagnosis.issue.severity in [DefectSeverity.CRITICAL, DefectSeverity.HIGH]
    assert "Inbound" in diagnosis.issue.title or "Delay" in diagnosis.issue.title
    assert "VT-IMG" in diagnosis.issue.detected_parameters.get("tail_number", "") or "delay_minutes" in diagnosis.issue.detected_parameters

    # 2. Potential Defects Projection Check
    defect_categories = [d.category for d in diagnosis.potential_defects]
    assert DefectCategory.GATE_CONTENTION in defect_categories
    assert DefectCategory.TURNAROUND_BREACH in defect_categories
    assert DefectCategory.DOWNSTREAM_CASCADE in defect_categories

    # Check that probabilities and descriptions are populated
    for defect in diagnosis.potential_defects:
        assert defect.probability != ""
        assert defect.impact_description != ""

    # 3. Tactical Recovery Plan Check
    assert len(diagnosis.recovery_actions) >= 3
    action_types = [a.action_type for a in diagnosis.recovery_actions]
    assert "DYNAMIC_GATE_REASSIGNMENT" in action_types
    assert "FAST_TRACK_TURNAROUND" in action_types

    # 4. Before vs After Comparison Ledger Check
    ledger = diagnosis.audit_comparison
    assert ledger.before.operational_status in ["CRITICAL_DEFECTS_IMMINENT", "OPERATIONAL_BOTTLENECK_ACTIVE"]
    assert ledger.before.turnaround_compliant is False
    assert ledger.before.turnaround_buffer_minutes <= 10
    assert ledger.before.active_conflicts_count >= 1

    assert ledger.after.operational_status == "OPTIMIZED_RECOVERED"
    assert ledger.after.turnaround_compliant is True
    assert ledger.after.active_conflicts_count == 0
    assert ledger.after.total_projected_delay_minutes < ledger.before.total_projected_delay_minutes

    # Delta summary
    assert ledger.delta_summary.delay_saved_minutes > 0
    assert ledger.delta_summary.conflicts_eliminated >= 1
    assert "SkyOps" in ledger.delta_summary.teacher_summary_verdict


def test_diagnose_runway_closure_affected_flight():
    """Verify diagnosis of flight 6E 6112: scheduled on Runway 10/28 during active closure window."""
    flight_id = "6E-6112-DEL-HYD-20261012"
    diagnosis = diagnosis_service.diagnose_flight(flight_id)

    assert diagnosis.flight_number == "6E 6112"
    assert diagnosis.has_issue is True

    # Root issue should detect runway disruption or closure
    assert diagnosis.issue.category in ["RUNWAY_DISRUPTION", "GATE_CONTENTION"]

    # Recovery should include runway or gate reallocation
    assert len(diagnosis.recovery_actions) >= 1
    ledger = diagnosis.audit_comparison
    assert ledger.after.active_conflicts_count == 0
    assert ledger.delta_summary.teacher_summary_verdict != ""


def test_diagnose_on_time_compliant_flight():
    """Verify diagnosis of a clean, on-time flight with no operational bottlenecks."""
    flight_id = "6E-722-BOM-HYD-20261012"
    diagnosis = diagnosis_service.diagnose_flight(flight_id)

    assert diagnosis.flight_number == "6E 722"
    # Delay is 0
    assert diagnosis.issue.severity == DefectSeverity.INFO
    assert len(diagnosis.recovery_actions) >= 1
    assert diagnosis.audit_comparison.after.turnaround_compliant is True


def test_simulate_injected_issue_on_flight():
    """Test interactive issue injection: simulate +50m delay and blocked gate on an on-time flight."""
    flight_id = "6E-801-BOM-BLR-20261012"
    payload = {
        "delay_minutes": 50,
        "delay_reason": "WEATHER_VISIBILITY",
        "blocked_gate": "Gate 24",
    }

    res = client.post(f"/api/v1/flights/{flight_id}/simulate-issue", json=payload)
    assert res.status_code == 200
    diag = res.json()

    assert diag["has_issue"] is True
    assert diag["issue"]["category"] == "WEATHER_RESTRICTION"
    assert len(diag["potential_defects"]) >= 1
    assert len(diag["recovery_actions"]) >= 1
    assert diag["audit_comparison"]["delta_summary"]["delay_saved_minutes"] > 0


def test_api_get_flight_diagnosis_success():
    """Test REST endpoint GET /api/v1/flights/{flight_id}/diagnosis."""
    res = client.get("/api/v1/flights/6E-204-DEL-BOM-20261012/diagnosis")
    assert res.status_code == 200
    data = res.json()

    assert data["flight_id"] == "6E-204-DEL-BOM-20261012"
    assert "issue" in data
    assert "potential_defects" in data
    assert "recovery_actions" in data
    assert "audit_comparison" in data
    assert "delta_summary" in data["audit_comparison"]


def test_api_get_flight_diagnosis_not_found():
    """Test REST endpoint returns 404 for unknown flight ID."""
    res = client.get("/api/v1/flights/INVALID-FLIGHT-999/diagnosis")
    assert res.status_code == 404
    assert "not found" in res.json()["message"].lower()


def test_api_list_flight_diagnoses_endpoint():
    """Test REST endpoint GET /api/v1/flights/diagnoses with filtering."""
    res = client.get("/api/v1/flights/diagnoses")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) >= 10
    assert "X-Total-Count" in res.headers

    # Test filtering by has_issue_only
    res_issues = client.get("/api/v1/flights/diagnoses?has_issue_only=true")
    assert res_issues.status_code == 200
    data_issues = res_issues.json()
    assert all(d["has_issue"] is True for d in data_issues)
    assert len(data_issues) > 0
