"""Tests for Flight REST API endpoints."""
import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_endpoint():
    """Verify health endpoint returns healthy status and loaded flight statistics."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data
    assert data["services"]["flights_api"] == "active"
    assert data["stats"]["loaded_flights_count"] >= 12


def test_list_flights_success():
    """Verify list flights returns 200 and populated list of flights with pagination headers."""
    response = client.get("/api/v1/flights")
    assert response.status_code == 200
    flights = response.json()
    assert isinstance(flights, list)
    assert len(flights) >= 12

    # Check headers
    assert "X-Total-Count" in response.headers
    assert int(response.headers["X-Total-Count"]) >= 12
    assert response.headers["X-Limit"] == "50"
    assert response.headers["X-Offset"] == "0"

    # Validate structure of first record
    first = flights[0]
    assert "flight_id" in first
    assert "flight_number" in first
    assert "origin_airport" in first
    assert "destination_airport" in first
    assert "scheduled_departure" in first
    assert "scheduled_arrival" in first
    assert "status" in first
    assert "delay_minutes" in first
    assert "record_type" in first


def test_list_flights_filtering():
    """Verify filtering by origin, destination, and delayed status."""
    # Filter by origin DEL
    del_res = client.get("/api/v1/flights?origin=DEL")
    assert del_res.status_code == 200
    del_flights = del_res.json()
    assert len(del_flights) > 0
    assert all(f["origin_airport"] == "DEL" for f in del_flights)

    # Filter by destination BOM
    bom_res = client.get("/api/v1/flights?destination=BOM")
    assert bom_res.status_code == 200
    bom_flights = bom_res.json()
    assert len(bom_flights) > 0
    assert all(f["destination_airport"] == "BOM" for f in bom_flights)

    # Filter by status DELAYED
    delayed_res = client.get("/api/v1/flights?status=DELAYED")
    assert delayed_res.status_code == 200
    delayed_flights = delayed_res.json()
    assert len(delayed_flights) >= 3
    assert all(f["status"] == "DELAYED" for f in delayed_flights)

    # Filter by delayed_only=true
    delayed_only_res = client.get("/api/v1/flights?delayed_only=true")
    assert delayed_only_res.status_code == 200
    delayed_only_flights = delayed_only_res.json()
    assert len(delayed_only_flights) >= 3
    assert all(f["delay_minutes"] > 0 for f in delayed_only_flights)


def test_list_flights_pagination():
    """Verify limit and offset pagination controls."""
    res_page_1 = client.get("/api/v1/flights?limit=3&offset=0")
    assert res_page_1.status_code == 200
    page_1 = res_page_1.json()
    assert len(page_1) == 3
    assert res_page_1.headers["X-Limit"] == "3"
    assert res_page_1.headers["X-Offset"] == "0"

    res_page_2 = client.get("/api/v1/flights?limit=3&offset=3")
    assert res_page_2.status_code == 200
    page_2 = res_page_2.json()
    assert len(page_2) == 3
    assert res_page_2.headers["X-Offset"] == "3"

    # Ensure page 1 and page 2 are distinct items
    page_1_ids = {f["flight_id"] for f in page_1}
    page_2_ids = {f["flight_id"] for f in page_2}
    assert page_1_ids.isdisjoint(page_2_ids)


def test_get_flight_by_id_success():
    """Verify getting a specific flight by unique ID."""
    response = client.get("/api/v1/flights/6E-204-DEL-BOM-20261012")
    assert response.status_code == 200
    flight = response.json()
    assert flight["flight_id"] == "6E-204-DEL-BOM-20261012"
    assert flight["flight_number"] == "6E 204"
    assert flight["origin_airport"] == "DEL"
    assert flight["destination_airport"] == "BOM"
    assert flight["status"] == "DELAYED"
    assert flight["delay_minutes"] == 45
    assert flight["delay_reason"] == "LATE_INBOUND_AIRCRAFT"
    assert flight["record_type"] == "HISTORICAL"


def test_get_flight_by_id_not_found():
    """Verify getting a non-existent flight returns 404 with structured error response."""
    response = client.get("/api/v1/flights/NON_EXISTENT_FLIGHT_ID_999")
    assert response.status_code == 404
    error = response.json()
    assert error["status_code"] == 404
    assert error["error"] == "Not Found"
    assert "NON_EXISTENT_FLIGHT_ID_999" in error["message"]
    assert "timestamp" in error
    assert "details" in error


def test_query_validation_errors():
    """Verify invalid query parameters return 422 Unprocessable Entity."""
    # Limit out of range (< 1)
    res_bad_limit = client.get("/api/v1/flights?limit=0")
    assert res_bad_limit.status_code == 422

    # Origin code wrong length (> 3)
    res_bad_origin = client.get("/api/v1/flights?origin=DELHI")
    assert res_bad_origin.status_code == 422
