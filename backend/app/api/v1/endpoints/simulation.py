"""Disruption simulation and tactical recovery REST API endpoints."""
import logging
from fastapi import APIRouter, HTTPException, status

from app.schemas.simulation import DisruptionSimulationRequest, DisruptionSimulationResponse
from app.services.simulation_service import simulation_service

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post(
    "/run",
    response_model=DisruptionSimulationResponse,
    status_code=status.HTTP_200_OK,
    summary="Run Disruption Simulation",
    description=(
        "Simulate runway closure operational impact on an isolated copy of current flight schedules. "
        "Generates deterministic, rule-based tactical recovery proposals and evaluates pre/post disruption conflict metrics."
    ),
)
@router.post(
    "/runway-closure",
    response_model=DisruptionSimulationResponse,
    status_code=status.HTTP_200_OK,
    summary="Simulate Runway Closure (Alias)",
    description="Alias endpoint for runway closure simulation and tactical recovery.",
    include_in_schema=False,
)
async def run_disruption_simulation(
    request: DisruptionSimulationRequest,
) -> DisruptionSimulationResponse:
    """Execute end-to-end runway closure simulation without altering live schedules."""
    try:
        response = simulation_service.run_runway_closure_simulation(request)
        return response
    except ValueError as exc:
        msg = str(exc)
        if "not found" in msg.lower() or "not registered" in msg.lower():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=msg)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)
    except Exception as exc:
        logger.exception("Unexpected error during disruption simulation: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Disruption simulation failed: {str(exc)}",
        )
