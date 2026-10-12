"""Tests for deterministic SkyOps Conflict Detection Service."""
from datetime import datetime, timedelta, timezone
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.schemas.conflict import ConflictSeverity, ConflictType
from app.schemas.flight import BaseFlightRecord
from app.schemas.resource import (
    ClosureWindow,
    FlightResourceAssignment,
    Gate,
    GateOccupancy,
    MovementType,
    Runway,
    RunwayOccupancy,
    TimeWindow,
)
from app.services.conflict_detector import ConflictDetectionService
from app.services.resource_service import ResourceService

client = TestClient(app)


@pytest.fixture
def resource_service():
    """Returns clean ResourceService with simulated airport topology."""
    return ResourceService()


@pytest.fixture
def detector(resource_service):
    """Returns ConflictDetectionService."""
    return ConflictDetectionService(res_service=resource_service)


def test_detect_runway_closure_conflict(detector, resource_service):
    """Verify runway closure overlap is detected with CRITICAL severity."""
    # DEL Runway 10/28 has a closure from 09:00 to 10:30 UTC
    dep_time = datetime(2026, 10, 12, 9, 15, tzinfo=timezone.utc)
    assignment = FlightResourceAssignment(
        flight_id="FLIGHT-CLOSURE-TEST",
        flight_number="6E 111",
        origin_airport="DEL",
        destination_airport="BOM",
        departure_runway_occupancy=RunwayOccupancy(
            runway_id="10/28",
            airport_code="DEL",
            flight_id="FLIGHT-CLOSURE-TEST",
            movement_type=MovementType.DEPARTURE,
            interval=TimeWindow(
                start_time=dep_time - timedelta(minutes=2),
                end_time=dep_time + timedelta(minutes=1),
            ),
        ),
    )

    conflicts = detector.detect_runway_closure_conflicts([assignment])
    assert len(conflicts) == 1
    c = conflicts[0]
    assert c.type == ConflictType.RUNWAY_CLOSURE_CONFLICT
    assert c.severity == ConflictSeverity.CRITICAL
    assert c.resource_id == "10/28"
    assert c.airport_code == "DEL"
    assert "SCHEDULED_SWEEPER_MAINTENANCE" in c.explanation


def test_detect_runway_reservation_conflict(detector):
    """Verify two overlapping runway movements on the same runway are detected."""
    t_base = datetime(2026, 10, 12, 8, 0, tzinfo=timezone.utc)
    rw_interval_a = TimeWindow(start_time=t_base, end_time=t_base + timedelta(minutes=3))
    rw_interval_b = TimeWindow(start_time=t_base + timedelta(minutes=1), end_time=t_base + timedelta(minutes=4))

    assign_a = FlightResourceAssignment(
        flight_id="FLIGHT-RW-A",
        flight_number="6E 201",
        origin_airport="DEL",
        destination_airport="BOM",
        departure_runway_occupancy=RunwayOccupancy(
            runway_id="11/29",
            airport_code="DEL",
            flight_id="FLIGHT-RW-A",
            movement_type=MovementType.DEPARTURE,
            interval=rw_interval_a,
        ),
    )

    assign_b = FlightResourceAssignment(
        flight_id="FLIGHT-RW-B",
        flight_number="6E 202",
        origin_airport="DEL",
        destination_airport="BLR",
        departure_runway_occupancy=RunwayOccupancy(
            runway_id="11/29",
            airport_code="DEL",
            flight_id="FLIGHT-RW-B",
            movement_type=MovementType.DEPARTURE,
            interval=rw_interval_b,
        ),
    )

    conflicts = detector.detect_runway_reservation_conflicts([assign_a, assign_b])
    assert len(conflicts) == 1
    c = conflicts[0]
    assert c.type == ConflictType.RUNWAY_RESERVATION_CONFLICT
    assert c.severity == ConflictSeverity.CRITICAL
    assert c.resource_id == "11/29"
    assert sorted(c.affected_flights) == ["FLIGHT-RW-A", "FLIGHT-RW-B"]


def test_detect_gate_occupancy_conflict(detector):
    """Verify overlapping gate occupancy intervals are flagged with HIGH severity."""
    t_base = datetime(2026, 10, 12, 8, 0, tzinfo=timezone.utc)
    gate_win_a = TimeWindow(start_time=t_base, end_time=t_base + timedelta(minutes=40))
    gate_win_b = TimeWindow(start_time=t_base + timedelta(minutes=20), end_time=t_base + timedelta(minutes=60))

    assign_a = FlightResourceAssignment(
        flight_id="FLIGHT-GATE-A",
        flight_number="6E 301",
        origin_airport="DEL",
        destination_airport="BOM",
        departure_gate_occupancy=GateOccupancy(
            gate_id="42",
            airport_code="DEL",
            flight_id="FLIGHT-GATE-A",
            interval=gate_win_a,
        ),
    )

    assign_b = FlightResourceAssignment(
        flight_id="FLIGHT-GATE-B",
        flight_number="6E 302",
        origin_airport="DEL",
        destination_airport="CCU",
        departure_gate_occupancy=GateOccupancy(
            gate_id="42",
            airport_code="DEL",
            flight_id="FLIGHT-GATE-B",
            interval=gate_win_b,
        ),
    )

    conflicts = detector.detect_gate_occupancy_conflicts([assign_a, assign_b])
    assert len(conflicts) == 1
    c = conflicts[0]
    assert c.type == ConflictType.GATE_OCCUPANCY_CONFLICT
    assert c.severity == ConflictSeverity.HIGH
    assert c.resource_id == "Gate 42"
    assert sorted(c.affected_flights) == ["FLIGHT-GATE-A", "FLIGHT-GATE-B"]


def test_detect_insufficient_turnaround(detector):
    """Verify turnaround below aircraft minimum buffer is detected."""
    assign = FlightResourceAssignment(
        flight_id="OUTBOUND-401",
        flight_number="6E 401",
        aircraft_type="A320neo",
        origin_airport="DEL",
        destination_airport="BOM",
        inbound_flight_id="INBOUND-300",
        turnaround_buffer_minutes=15,    # 15m is strictly less than 35m minimum for A320neo
        turnaround_compliant=False,
    )

    conflicts = detector.detect_turnaround_conflicts([assign])
    assert len(conflicts) == 1
    c = conflicts[0]
    assert c.type == ConflictType.INSUFFICIENT_TURNAROUND
    assert c.severity in [ConflictSeverity.HIGH, ConflictSeverity.MEDIUM]
    assert "15 mins available" in c.explanation


def test_detect_resource_unavailable(detector, resource_service):
    """Verify assignment to an inactive resource is detected."""
    # Temporarily mark Gate 42 as inactive
    gate_42 = resource_service.get_gate("DEL", "42")
    assert gate_42 is not None
    gate_42.is_active = False

    t_now = datetime(2026, 10, 12, 11, 0, tzinfo=timezone.utc)
    assign = FlightResourceAssignment(
        flight_id="FLIGHT-INACTIVE-RES",
        flight_number="6E 505",
        origin_airport="DEL",
        destination_airport="BOM",
        departure_gate_occupancy=GateOccupancy(
            gate_id="42",
            airport_code="DEL",
            flight_id="FLIGHT-INACTIVE-RES",
            interval=TimeWindow(start_time=t_now, end_time=t_now + timedelta(minutes=30)),
        ),
    )

    conflicts = detector.detect_resource_availability_conflicts([assign])
    assert len(conflicts) == 1
    assert conflicts[0].type == ConflictType.RESOURCE_UNAVAILABLE
    assert conflicts[0].resource_id == "Gate 42"

    # Restore gate active state
    gate_42.is_active = True


def test_non_conflicting_schedule(detector):
    """Verify properly spaced non-overlapping schedules yield 0 conflicts."""
    t_1 = datetime(2026, 10, 12, 6, 0, tzinfo=timezone.utc)
    t_2 = datetime(2026, 10, 12, 7, 0, tzinfo=timezone.utc)

    assign_1 = FlightResourceAssignment(
        flight_id="CLEAN-FLIGHT-1",
        flight_number="6E 101",
        origin_airport="DEL",
        destination_airport="BOM",
        departure_gate_occupancy=GateOccupancy(
            gate_id="41",
            airport_code="DEL",
            flight_id="CLEAN-FLIGHT-1",
            interval=TimeWindow(start_time=t_1, end_time=t_1 + timedelta(minutes=30)),
        ),
        departure_runway_occupancy=RunwayOccupancy(
            runway_id="11/29",
            airport_code="DEL",
            flight_id="CLEAN-FLIGHT-1",
            movement_type=MovementType.DEPARTURE,
            interval=TimeWindow(start_time=t_1 + timedelta(minutes=28), end_time=t_1 + timedelta(minutes=31)),
        ),
        turnaround_buffer_minutes=60,
        turnaround_compliant=True,
    )

    assign_2 = FlightResourceAssignment(
        flight_id="CLEAN-FLIGHT-2",
        flight_number="6E 102",
        origin_airport="DEL",
        destination_airport="BLR",
        departure_gate_occupancy=GateOccupancy(
            gate_id="42",     # Different gate
            airport_code="DEL",
            flight_id="CLEAN-FLIGHT-2",
            interval=TimeWindow(start_time=t_2, end_time=t_2 + timedelta(minutes=30)),
        ),
        departure_runway_occupancy=RunwayOccupancy(
            runway_id="11/29",   # Same runway, but 1 hour later
            airport_code="DEL",
            flight_id="CLEAN-FLIGHT-2",
            movement_type=MovementType.DEPARTURE,
            interval=TimeWindow(start_time=t_2 + timedelta(minutes=28), end_time=t_2 + timedelta(minutes=31)),
        ),
        turnaround_buffer_minutes=55,
        turnaround_compliant=True,
    )

    all_conflicts = detector.detect_all_conflicts([assign_1, assign_2])
    assert len(all_conflicts) == 0


def test_missing_data_does_not_invent_conflicts(detector):
    """Verify detector does not report conflicts when required assignment data is absent."""
    bare_assign = FlightResourceAssignment(
        flight_id="BARE-FLIGHT",
        flight_number="6E 001",
        origin_airport="DEL",
        destination_airport="BOM",
        departure_gate_occupancy=None,
        departure_runway_occupancy=None,
        arrival_gate_occupancy=None,
        arrival_runway_occupancy=None,
        inbound_flight_id=None,
        turnaround_buffer_minutes=None,
    )

    conflicts = detector.detect_all_conflicts([bare_assign])
    assert len(conflicts) == 0


def test_conflicts_api_endpoints():
    """Verify GET /api/v1/conflicts and alias GET /api/v1/schedules/conflicts."""
    # Test primary endpoint
    res1 = client.get("/api/v1/conflicts")
    assert res1.status_code == 200
    conflicts1 = res1.json()
    assert isinstance(conflicts1, list)
    assert len(conflicts1) > 0
    assert "X-Total-Count" in res1.headers

    # Test alias endpoint
    res2 = client.get("/api/v1/schedules/conflicts")
    assert res2.status_code == 200
    conflicts2 = res2.json()
    assert len(conflicts2) == len(conflicts1)

    # Validate structure of first conflict
    first_c = conflicts1[0]
    assert "conflict_id" in first_c
    assert "type" in first_c
    assert "severity" in first_c
    assert "airport_code" in first_c
    assert "resource_type" in first_c
    assert "resource_id" in first_c
    assert "affected_flights" in first_c
    assert "explanation" in first_c

    # Test airport filtering
    del_res = client.get("/api/v1/conflicts?airport=DEL")
    assert del_res.status_code == 200
    del_conflicts = del_res.json()
    assert all(c["airport_code"] == "DEL" for c in del_conflicts)
