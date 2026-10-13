"""Flight defect diagnosis and tactical recovery REST API endpoints."""
import logging
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, Response, status

from app.schemas.diagnosis import FlightDiagnosisResponse, InjectedIssueRequest
from app.services.diagnosis_service import diagnosis_service

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get(
    "/diagnoses",
    response_model=List[FlightDiagnosisResponse],
    summary="List All Flight Diagnoses",
    description="Retrieve root issue diagnoses, cascading defect projections, and recovery ledgers across all scheduled flights.",
)
async def list_flight_diagnoses(
    response: Response,
    has_issue_only: bool = Query(
        False,
        description="Filter exclusively for flights experiencing active disruptions, delays, or resource conflicts",
    ),
    origin: Optional[str] = Query(None, min_length=3, max_length=3, description="Filter by origin airport code (e.g. 'DEL')"),
) -> List[FlightDiagnosisResponse]:
    """Return diagnosis and before-after recovery ledgers for all flights."""
    diagnoses = diagnosis_service.diagnose_all_flights()

    if has_issue_only:
        diagnoses = [d for d in diagnoses if d.has_issue]

    if origin:
        clean_origin = origin.strip().upper()
        diagnoses = [d for d in diagnoses if d.origin_airport == clean_origin]

    response.headers["X-Total-Count"] = str(len(diagnoses))
    return diagnoses


@router.get(
    "/{flight_id}/diagnosis",
    response_model=FlightDiagnosisResponse,
    summary="Diagnose Flight Root Cause, Projected Defects & Recovery Ledger",
    description=(
        "Analyzes a flight to determine its primary operational issue, projects downstream cascading defects if left unaddressed, "
        "generates a multi-step tactical fix, and provides a quantitative Before vs After comparison ledger for presentation."
    ),
)
async def get_flight_diagnosis(flight_id: str) -> FlightDiagnosisResponse:
    """Diagnose a specific flight by unique composite flight_id."""
    try:
        diagnosis = diagnosis_service.diagnose_flight(flight_id)
        return diagnosis
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except Exception as exc:
        logger.exception("Unexpected error diagnosing flight %s: %s", flight_id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Flight diagnosis failed: {str(exc)}",
        )


@router.post(
    "/{flight_id}/simulate-issue",
    response_model=FlightDiagnosisResponse,
    summary="Simulate / Inject Flight Defect & Observe SkyOps Auto-Recovery",
    description=(
        "Injects a hypothetical operational disruption (e.g. +45m delay, blocked gate, closed runway) into a flight. "
        "Returns the detected defect, projected cascading consequences, tactical resolution, and Before vs After comparison ledger."
    ),
)
async def simulate_flight_issue(
    flight_id: str,
    request: InjectedIssueRequest,
) -> FlightDiagnosisResponse:
    """Inject a disruption onto a flight and compute immediate diagnosis and recovery comparison."""
    try:
        diagnosis = diagnosis_service.diagnose_flight(flight_id, injected_issue=request)
        return diagnosis
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except Exception as exc:
        logger.exception("Unexpected error simulating issue on flight %s: %s", flight_id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Flight disruption simulation failed: {str(exc)}",
        )
