"""Flight schedule and telemetry endpoints."""
from typing import List, Optional, Union
from fastapi import APIRouter, HTTPException, Query, Response, status

from app.schemas.common import ErrorResponse
from app.schemas.flight import (
    FlightRecord,
    HistoricalFlightRecord,
    LiveFlightRecord,
    RecordType,
    FlightStatus,
)
from app.services.flight_service import flight_service

router = APIRouter()


@router.get(
    "",
    response_model=List[Union[HistoricalFlightRecord, LiveFlightRecord, FlightRecord]],
    summary="List Flight Schedules",
    responses={
        status.HTTP_400_BAD_REQUEST: {"model": ErrorResponse, "description": "Invalid query parameters"},
        422: {"description": "Validation error"},
    },
)
async def list_flights(
    response: Response,
    origin: Optional[str] = Query(
        None,
        min_length=3,
        max_length=3,
        description="Filter by 3-letter IATA origin airport code (e.g. 'DEL')",
    ),
    destination: Optional[str] = Query(
        None,
        min_length=3,
        max_length=3,
        description="Filter by 3-letter IATA destination airport code (e.g. 'BOM')",
    ),
    airline: Optional[str] = Query(
        None,
        description="Filter by airline name or substring (e.g. 'IndiGo')",
    ),
    status_filter: Optional[FlightStatus] = Query(
        None,
        alias="status",
        description="Filter by operational status (e.g. 'DELAYED', 'ON_TIME')",
    ),
    record_type: Optional[RecordType] = Query(
        None,
        description="Filter by record permanence: 'HISTORICAL' or 'LIVE_TRACKING'",
    ),
    delayed_only: bool = Query(
        False,
        description="Filter exclusively for flights experiencing positive delay minutes",
    ),
    limit: int = Query(
        50,
        ge=1,
        le=100,
        description="Maximum number of flight records to return (1 to 100)",
    ),
    offset: int = Query(
        0,
        ge=0,
        description="Number of records to skip for pagination",
    ),
):
    """Retrieve scheduled and operational flights with filtering and pagination."""
    flights, total_count = flight_service.get_flights(
        origin=origin,
        destination=destination,
        airline=airline,
        status=status_filter,
        record_type=record_type,
        delayed_only=delayed_only,
        limit=limit,
        offset=offset,
    )

    response.headers["X-Total-Count"] = str(total_count)
    response.headers["X-Limit"] = str(limit)
    response.headers["X-Offset"] = str(offset)

    return flights


@router.get(
    "/{flight_id}",
    response_model=Union[HistoricalFlightRecord, LiveFlightRecord, FlightRecord],
    summary="Get Flight Detail",
    responses={
        status.HTTP_404_NOT_FOUND: {"model": ErrorResponse, "description": "Flight record not found"},
    },
)
async def get_flight(flight_id: str):
    """Retrieve full operational record for a specific flight by unique ID."""
    flight = flight_service.get_flight_by_id(flight_id)
    if not flight:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Flight with ID '{flight_id}' was not found.",
        )
    return flight
