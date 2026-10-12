"""Conflict detection REST endpoints."""
from typing import List, Optional
from fastapi import APIRouter, Query, Response

from app.schemas.conflict import ConflictSeverity, ConflictType, OperationalConflict
from app.services.conflict_detector import conflict_detection_service

router = APIRouter()


@router.get(
    "",
    response_model=List[OperationalConflict],
    summary="List Operational Conflicts",
)
async def list_conflicts(
    response: Response,
    airport: Optional[str] = Query(
        None,
        min_length=3,
        max_length=3,
        description="Filter by 3-letter IATA airport code (e.g. 'DEL')",
    ),
    severity: Optional[ConflictSeverity] = Query(
        None,
        description="Filter by conflict severity (CRITICAL, HIGH, MEDIUM, LOW)",
    ),
    conflict_type: Optional[ConflictType] = Query(
        None,
        alias="type",
        description="Filter by conflict category",
    ),
):
    """Retrieve detected operational resource contentions, runway closure violations, and turnaround breaches."""
    all_conflicts = conflict_detection_service.evaluate_active_conflicts()

    filtered = all_conflicts
    if airport:
        clean_airport = airport.strip().upper()
        filtered = [c for c in filtered if c.airport_code == clean_airport]

    if severity:
        filtered = [c for c in filtered if c.severity == severity]

    if conflict_type:
        filtered = [c for c in filtered if c.type == conflict_type]

    response.headers["X-Total-Count"] = str(len(filtered))
    return filtered
