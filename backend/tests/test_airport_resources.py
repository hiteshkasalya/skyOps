"""Unit tests for Airport Resources, Runway/Gate Occupancy, and Turnaround Models."""
from datetime import datetime, timedelta, timezone
import pytest
from pydantic import ValidationError

from app.schemas.airport import Airport
from app.schemas.flight import BaseFlightRecord
from app.schemas.resource import (
    AircraftCategory,
    ClosureWindow,
    FlightResourceAssignment,
    Gate,
    GateOccupancy,
    MovementType,
    Runway,
    RunwayOccupancy,
    TimeWindow,
    TurnaroundRequirement,
)
from app.services.resource_service import ResourceService


@pytest.fixture
def resource_service():
    """Returns an instance of ResourceService loaded with simulated data."""
    return ResourceService()


@pytest.fixture
def sample_flight():
    """Returns a sample flight record without gate or runway assignments."""
    now = datetime(2026, 10, 12, 8, 0, 0, tzinfo=timezone.utc)
    return BaseFlightRecord(
        flight_id="TEST-FLIGHT-001",
        flight_number="6E 204",
        airline="IndiGo",
        origin_airport="DEL",
        destination_airport="BOM",
        aircraft_type="A320neo",
        scheduled_departure=now,
        scheduled_arrival=now + timedelta(hours=2),
    )


def test_time_window_validation():
    """Verify TimeWindow enforces end_time > start_time."""
    start = datetime(2026, 10, 12, 10, 0, 0, tzinfo=timezone.utc)
    end = datetime(2026, 10, 12, 11, 0, 0, tzinfo=timezone.utc)

    window = TimeWindow(start_time=start, end_time=end)
    assert window.duration_minutes == 60.0

    # Test invalid interval where end <= start
    with pytest.raises(ValidationError):
        TimeWindow(start_time=end, end_time=start)

    with pytest.raises(ValidationError):
        TimeWindow(start_time=start, end_time=start)


def test_time_window_overlap():
    """Verify TimeWindow overlap logic."""
    t1 = datetime(2026, 10, 12, 10, 0, tzinfo=timezone.utc)
    t2 = datetime(2026, 10, 12, 11, 0, tzinfo=timezone.utc)
    t3 = datetime(2026, 10, 12, 10, 30, tzinfo=timezone.utc)
    t4 = datetime(2026, 10, 12, 11, 30, tzinfo=timezone.utc)

    w1 = TimeWindow(start_time=t1, end_time=t2)
    w2 = TimeWindow(start_time=t3, end_time=t4)
    w3 = TimeWindow(start_time=t2, end_time=t4)

    assert w1.overlaps(w2) is True
    assert w2.overlaps(w1) is True
    # Abutting windows should not overlap
    assert w1.overlaps(w3) is False


def test_runway_closure_and_availability():
    """Verify runway availability and closure window detection."""
    start_closure = datetime(2026, 10, 12, 9, 0, tzinfo=timezone.utc)
    end_closure = datetime(2026, 10, 12, 10, 0, tzinfo=timezone.utc)

    closure = ClosureWindow(start_time=start_closure, end_time=end_closure, reason="MAINTENANCE")
    runway = Runway(
        runway_id="10/28",
        airport_code="DEL",
        length_meters=3810,
        is_active=True,
        closure_windows=[closure],
    )

    # Before closure -> available
    assert runway.is_available_at(start_closure - timedelta(minutes=10)) is True
    # During closure -> unavailable
    assert runway.is_available_at(start_closure + timedelta(minutes=15)) is False
    # After closure -> available
    assert runway.is_available_at(end_closure + timedelta(minutes=5)) is True

    # Test conflict detection
    flight_window = TimeWindow(
        start_time=start_closure + timedelta(minutes=10),
        end_time=start_closure + timedelta(minutes=15),
    )
    assert runway.has_closure_conflict(flight_window) is not None


def test_turnaround_validation(resource_service):
    """Verify turnaround requirements by aircraft type."""
    inbound_arr = datetime(2026, 10, 12, 7, 10, tzinfo=timezone.utc)
    outbound_dep_compliant = datetime(2026, 10, 12, 8, 0, tzinfo=timezone.utc)   # 50 mins buffer
    outbound_dep_too_short = datetime(2026, 10, 12, 7, 30, tzinfo=timezone.utc)   # 20 mins buffer

    # A320neo requires 35 mins
    is_ok, buffer, required = resource_service.validate_turnaround(
        inbound_arr, outbound_dep_compliant, aircraft_type="A320neo"
    )
    assert is_ok is True
    assert buffer == 50
    assert required == 35

    # Short buffer fails
    is_ok, buffer, required = resource_service.validate_turnaround(
        inbound_arr, outbound_dep_too_short, aircraft_type="A320neo"
    )
    assert is_ok is False
    assert buffer == 20
    assert required == 35


def test_resource_service_airport_lookup(resource_service):
    """Verify resource service loads simulated airports, runways, and gates."""
    del_ap = resource_service.get_airport("DEL")
    assert del_ap is not None
    assert del_ap.airport_code == "DEL"
    assert del_ap.icao_code == "VIDP"
    assert len(del_ap.runways) >= 2
    assert len(del_ap.gates) >= 4

    # Case-insensitivity check
    bom_ap = resource_service.get_airport("bom")
    assert bom_ap is not None
    assert bom_ap.airport_code == "BOM"

    # Non-existent airport
    assert resource_service.get_airport("XYZ") is None


def test_flight_resource_assignment_defaults(resource_service, sample_flight):
    """Verify flight resource assignment generates simulated allocations when none are in data."""
    assignment = resource_service.assign_flight_resources(sample_flight)

    assert assignment.flight_id == sample_flight.flight_id
    assert assignment.origin_airport == "DEL"
    assert assignment.destination_airport == "BOM"
    assert assignment.is_simulated is True

    # Check departure gate occupancy interval (40 mins prior to dep)
    gate_occ = assignment.departure_gate_occupancy
    assert gate_occ is not None
    assert gate_occ.airport_code == "DEL"
    assert gate_occ.interval.end_time == sample_flight.scheduled_departure
    assert gate_occ.interval.duration_minutes == 40.0

    # Check departure runway slot (3 mins around dep)
    rw_occ = assignment.departure_runway_occupancy
    assert rw_occ is not None
    assert rw_occ.airport_code == "DEL"
    assert rw_occ.movement_type == MovementType.DEPARTURE
    assert rw_occ.interval.duration_minutes == 3.0


def test_flight_resource_assignment_explicit(resource_service, sample_flight):
    """Verify flight resource assignment accepts and validates explicit gate and runway identifiers."""
    assignment = resource_service.assign_flight_resources(
        sample_flight,
        departure_gate="42",
        departure_runway="10/28",
        arrival_runway="09/27",
        arrival_gate="22",
        inbound_flight_id="INBOUND-001",
        inbound_flight_arrival=sample_flight.scheduled_departure - timedelta(minutes=45),
    )

    assert assignment.departure_gate_occupancy.gate_id == "42"
    assert assignment.departure_runway_occupancy.runway_id == "10/28"
    assert assignment.arrival_runway_occupancy.runway_id == "09/27"
    assert assignment.arrival_gate_occupancy.gate_id == "22"
    assert assignment.inbound_flight_id == "INBOUND-001"
    assert assignment.turnaround_buffer_minutes == 45
    assert assignment.turnaround_compliant is True


def test_flight_resource_assignment_invalid_identifiers(resource_service, sample_flight):
    """Verify rejection when specifying non-existent gate or runway identifiers."""
    # Invalid departure gate
    with pytest.raises(ValueError, match="Departure gate 'GATE_999' not found"):
        resource_service.assign_flight_resources(sample_flight, departure_gate="GATE_999")

    # Invalid departure runway
    with pytest.raises(ValueError, match="Departure runway 'RUNWAY_INVALID' not found"):
        resource_service.assign_flight_resources(sample_flight, departure_runway="RUNWAY_INVALID")
