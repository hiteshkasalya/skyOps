from fastapi import APIRouter, HTTPException, status
from app.schemas.propagation import DelayPropagationRequest, DelayPropagationResponse
from app.services.propagation_service import propagation_service
from app.services.flight_service import flight_service

router = APIRouter(tags=["Delay Propagation"])


@router.post(
    "/propagate",
    response_model=DelayPropagationResponse,
    status_code=status.HTTP_200_OK,
    summary="Compute downstream network cascade delay propagation",
)
def propagate_delay(request: DelayPropagationRequest):
    """Compute downstream cascade delay impact down the aircraft rotation and crew network."""
    return propagation_service.propagate_delay(request)


@router.get(
    "/{flight_id}/rotation-cascade",
    response_model=DelayPropagationResponse,
    status_code=status.HTTP_200_OK,
    summary="Get downstream cascade impact for a scheduled flight",
)
def get_flight_rotation_cascade(flight_id: str):
    """Retrieve the downstream tail rotation cascade and crew duty projection for a flight."""
    flight = flight_service.get_flight(flight_id)
    if not flight:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Flight '{flight_id}' not found in operational schedule.",
        )

    delay = flight.delay_minutes or 0
    reason = flight.delay_reason or "LATE_INBOUND_AIRCRAFT"
    req = DelayPropagationRequest(
        flight_id=flight.flight_id,
        initial_delay_minutes=delay,
        cause=reason,
        tail_number=flight.tail_number,
    )
    return propagation_service.propagate_delay(req)
