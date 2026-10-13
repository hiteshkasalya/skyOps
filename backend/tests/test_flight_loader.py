"""Tests for FlightDataLoader normalization, validation, and error handling."""
from pathlib import Path
from datetime import datetime, timezone
import pytest

from app.schemas.flight import HistoricalFlightRecord, LiveFlightRecord, RecordType, FlightStatus
from app.services.flight_loader import FlightDataLoader


@pytest.fixture
def loader():
    """Returns an instance of FlightDataLoader."""
    return FlightDataLoader()


@pytest.fixture
def fixture_csv_path():
    """Returns the path to the fixture CSV."""
    return Path(__file__).parent / "fixtures" / "sample_flights_fixture.csv"


@pytest.fixture
def synthetic_demo_csv_path():
    """Returns the path to the main synthetic demo dataset."""
    return Path(__file__).parent.parent / "data" / "synthetic_indigo_flights_demo.csv"


def test_fixture_loading_and_counts(loader, fixture_csv_path):
    """Verify that valid rows are parsed and invalid rows are caught."""
    result = loader.load_csv(fixture_csv_path)

    assert result.total_rows == 7
    assert result.valid_count == 3
    assert result.invalid_count == 4


def test_normalization_of_airport_codes_and_defaults(loader, fixture_csv_path):
    """Verify that lowercase airport codes are capitalized and defaults applied."""
    result = loader.load_csv(fixture_csv_path)

    # Check VALID-02-LOWERCASE
    rec = next(r for r in result.valid_records if r.flight_id == "VALID-02-LOWERCASE")
    assert rec.origin_airport == "DEL"
    assert rec.destination_airport == "BOM"
    assert rec.airline == "IndiGo"
    assert rec.aircraft_type == "A321neo"
    assert rec.gate is None
    assert rec.delay_minutes == 0


def test_record_type_distinction(loader, fixture_csv_path):
    """Verify historical records are distinct from live tracking records."""
    result = loader.load_csv(fixture_csv_path)

    historical_recs = [r for r in result.valid_records if isinstance(r, HistoricalFlightRecord)]
    live_recs = [r for r in result.valid_records if isinstance(r, LiveFlightRecord)]

    assert len(historical_recs) == 2
    assert len(live_recs) == 1

    live_rec = live_recs[0]
    assert live_rec.flight_id == "VALID-03-LIVE"
    assert live_rec.record_type == RecordType.LIVE_TRACKING
    assert live_rec.current_delay_minutes == 20


def test_invalid_records_handling_reasons(loader, fixture_csv_path):
    """Verify detailed reasons are recorded for rejected rows."""
    result = loader.load_csv(fixture_csv_path)

    errors_by_row = [inv["errors"] for inv in result.invalid_records]

    # Check that missing flight number was caught
    assert any("flight_number" in err.lower() for errs in errors_by_row for err in errs)

    # Check that bad airport code was caught
    assert any("invalid origin airport code" in err.lower() for errs in errors_by_row for err in errs)

    # Check that unparseable timestamp was caught
    assert any("scheduled_departure" in err.lower() for errs in errors_by_row for err in errs)

    # Check that arrival before departure was caught
    assert any("scheduled_arrival must be after" in err.lower() for errs in errors_by_row for err in errs)


def test_loading_synthetic_demo_dataset(loader, synthetic_demo_csv_path):
    """Verify that the primary synthetic demo dataset loads cleanly with zero errors."""
    assert synthetic_demo_csv_path.exists()
    result = loader.load_csv(synthetic_demo_csv_path)

    assert result.total_rows >= 12
    assert result.valid_count == result.total_rows
    assert result.invalid_count == 0

    # Verify expected delayed flights exist
    delayed_flights = [r for r in result.valid_records if r.status == FlightStatus.DELAYED]
    assert len(delayed_flights) >= 3

    # Check delay causes
    reasons = [r.delay_reason for r in delayed_flights if hasattr(r, "delay_reason")]
    assert "LATE_INBOUND_AIRCRAFT" in reasons
    assert "WEATHER_VISIBILITY" in reasons


def test_file_not_found(loader):
    """Verify loader raises FileNotFoundError when target file does not exist."""
    with pytest.raises(FileNotFoundError):
        loader.load_csv("non_existent_file.csv")
