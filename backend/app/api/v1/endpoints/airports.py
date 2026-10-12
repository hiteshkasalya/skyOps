"""Airport and resource query endpoints."""
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, status

from app.schemas.airport import Airport
from app.schemas.common import ErrorResponse
from app.schemas.resource import ClosureWindow, Gate, Runway
from app.services.resource_service import resource_service

router = APIRouter()


@router.get(
    "",
    response_model=List[Airport],
    summary="List Hub Airports",
)
async def list_airports():
    """Retrieve all operational hub airports."""
    return list(resource_service.airports.values())


@router.get(
    "/{code}",
    response_model=Airport,
    summary="Get Airport Detail",
    responses={status.HTTP_404_NOT_FOUND: {"model": ErrorResponse}},
)
async def get_airport(code: str):
    """Retrieve detailed topology for a specific airport by IATA code."""
    airport = resource_service.get_airport(code)
    if not airport:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Airport with code '{code}' was not found.",
        )
    return airport


@router.get(
    "/{code}/runways",
    response_model=List[Runway],
    summary="List Airport Runways",
    responses={status.HTTP_404_NOT_FOUND: {"model": ErrorResponse}},
)
async def list_runways(code: str):
    """Retrieve runways and closure windows for a specific airport."""
    airport = resource_service.get_airport(code)
    if not airport:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Airport with code '{code}' was not found.",
        )
    return airport.runways


@router.get(
    "/{code}/gates",
    response_model=List[Gate],
    summary="List Airport Gates",
    responses={status.HTTP_404_NOT_FOUND: {"model": ErrorResponse}},
)
async def list_gates(
    code: str,
    terminal: Optional[str] = Query(None, description="Optional terminal filter (e.g. 'T3')"),
):
    """Retrieve gates and aircraft compatibility for a specific airport."""
    airport = resource_service.get_airport(code)
    if not airport:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Airport with code '{code}' was not found.",
        )
    gates = airport.gates
    if terminal:
        gates = [g for g in gates if g.terminal.upper() == terminal.strip().upper()]
    return gates
