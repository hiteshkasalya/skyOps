"""Conflict detection data schemas."""
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field

from app.schemas.resource import TimeWindow


class ConflictType(str, Enum):
    """Categorization of operational resource and schedule conflicts."""
    RUNWAY_CLOSURE_CONFLICT = "RUNWAY_CLOSURE_CONFLICT"
    RUNWAY_RESERVATION_CONFLICT = "RUNWAY_RESERVATION_CONFLICT"
    GATE_OCCUPANCY_CONFLICT = "GATE_OCCUPANCY_CONFLICT"
    INSUFFICIENT_TURNAROUND = "INSUFFICIENT_TURNAROUND"
    RESOURCE_UNAVAILABLE = "RESOURCE_UNAVAILABLE"


class ConflictSeverity(str, Enum):
    """Severity rating of the operational conflict."""
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class OperationalConflict(BaseModel):
    """Structured representation of an operational schedule/resource contention."""
    model_config = ConfigDict(from_attributes=True)

    conflict_id: str = Field(..., description="Unique conflict identifier")
    type: ConflictType = Field(..., description="Category of conflict")
    severity: ConflictSeverity = Field(..., description="Operational severity rating")
    airport_code: str = Field(..., min_length=3, max_length=3, description="3-letter IATA airport code")
    resource_type: str = Field(..., description="Contended resource class (RUNWAY, GATE, AIRCRAFT_TURNAROUND)")
    resource_id: str = Field(..., description="Resource identifier (e.g. '10/28', 'Gate 42')")
    interval: Optional[TimeWindow] = Field(default=None, description="Temporal interval of contention overlap")
    affected_flights: List[str] = Field(..., min_length=1, description="List of impacted flight IDs or flight numbers")
    explanation: str = Field(..., description="Deterministic human-readable explanation of the conflict")
    detected_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Timestamp when conflict was detected",
    )
