"""Disruption simulation and tactical recovery schemas."""
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.schemas.conflict import OperationalConflict
from app.schemas.resource import TimeWindow


class DisruptionSimulationRequest(BaseModel):
    """Runway closure disruption simulation request payload."""
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    airport_code: Optional[str] = Field(
        default=None,
        min_length=3,
        max_length=3,
        description="3-letter IATA airport code (e.g. 'DEL'). Inferred if omitted and runway is unique.",
    )
    runway_identifier: str = Field(
        ...,
        alias="runway_id",
        description="Runway identifier to close (e.g. '10/28')",
    )
    closure_start: datetime = Field(..., description="Start timestamp of closure in UTC")
    closure_end: datetime = Field(..., description="End timestamp of closure in UTC")
    reason: Optional[str] = Field(
        default="RUNWAY_MAINTENANCE_CLOSURE",
        description="Operational reason for closure",
    )
    affected_flight_ids: Optional[List[str]] = Field(
        default=None,
        description="Optional list of specific flight IDs to filter/focus simulation on",
    )

    @field_validator("airport_code")
    @classmethod
    def normalize_airport_code(cls, v: Optional[str]) -> Optional[str]:
        return v.strip().upper() if v else None

    @field_validator("runway_identifier")
    @classmethod
    def normalize_runway_id(cls, v: str) -> str:
        return v.strip()

    @model_validator(mode="after")
    def validate_closure_chronology(self) -> "DisruptionSimulationRequest":
        if self.closure_end <= self.closure_start:
            raise ValueError(
                f"closure_end ({self.closure_end.isoformat()}) must be strictly after closure_start ({self.closure_start.isoformat()})"
            )
        return self


class AffectedFlightImpact(BaseModel):
    """Impact assessment for an individual flight affected by the runway closure."""
    model_config = ConfigDict(from_attributes=True)

    flight_id: str = Field(..., description="Unique flight identifier")
    flight_number: str = Field(..., description="Flight number (e.g. '6E 6112')")
    movement_type: str = Field(..., description="Movement direction: 'DEPARTURE' or 'ARRIVAL'")
    original_runway: str = Field(..., description="Originally scheduled runway")
    proposed_runway: Optional[str] = Field(default=None, description="Proposed alternate runway")
    scheduled_time: datetime = Field(..., description="Original scheduled movement time in UTC")
    action_required: str = Field(
        ...,
        description="Required action: 'REROUTE_RUNWAY', 'REROUTE_AND_DELAY', 'GROUND_DELAY', 'DIVERT_REQUIRED', 'NONE'",
    )
    projected_delay_minutes: int = Field(default=0, description="Projected schedule delay in minutes")


class RecoveryProposal(BaseModel):
    """Tactical recovery proposal for an affected flight."""
    model_config = ConfigDict(from_attributes=True)

    proposal_id: str = Field(..., description="Unique proposal identifier")
    flight_id: str = Field(..., description="Target flight identifier")
    action_type: str = Field(
        ...,
        description="Action category: 'RUNWAY_REALLOCATION', 'SLOT_DELAY', 'FLIGHT_DIVERSION', 'GROUND_HOLD'",
    )
    title: str = Field(..., description="Proposal title")
    description: str = Field(..., description="Detailed explanation of the tactical action")
    original_runway: str = Field(..., description="Runway before recovery")
    proposed_runway: Optional[str] = Field(default=None, description="Runway after recovery")
    original_time: datetime = Field(..., description="Original scheduled time in UTC")
    proposed_time: datetime = Field(..., description="Proposed revised time in UTC")
    delay_added_minutes: int = Field(default=0, description="Delay minutes introduced by recovery")
    delay_mitigated_minutes: int = Field(default=0, description="Estimated delay minutes mitigated")


class BaselineMetrics(BaseModel):
    """Schedule metrics before the disruption."""
    model_config = ConfigDict(from_attributes=True)

    total_flights: int = Field(..., description="Total evaluated flights")
    conflicts_count: int = Field(..., description="Initial conflicts before closure")
    total_delay_minutes: int = Field(..., description="Initial total delay minutes")


class PostDisruptionMetrics(BaseModel):
    """Schedule metrics after applying runway closure, before recovery."""
    model_config = ConfigDict(from_attributes=True)

    impacted_flights_count: int = Field(..., description="Flights directly disrupted by closure")
    conflicts_count: int = Field(..., description="Conflicts with runway closure active")
    total_projected_delay_minutes: int = Field(..., description="Projected delay with unmitigated closure")


class RecoveryMetrics(BaseModel):
    """Metrics comparing schedule after applying recovery proposals."""
    model_config = ConfigDict(from_attributes=True)

    resolved_conflicts_count: int = Field(..., description="Conflicts resolved by recovery")
    remaining_conflicts_count: int = Field(..., description="Unresolved conflicts after recovery")
    net_delay_added_minutes: int = Field(..., description="Net delay added by re-sequencing")


class DisruptionSimulationResponse(BaseModel):
    """Full end-to-end response for disruption simulation and recovery proposal."""
    model_config = ConfigDict(from_attributes=True)

    simulation_id: str = Field(..., description="Unique simulation execution identifier")
    airport_code: str = Field(..., description="Airport code")
    runway_identifier: str = Field(..., description="Closed runway identifier")
    closure_window: TimeWindow = Field(..., description="Runway closure time window")
    reason: str = Field(..., description="Disruption reason")
    is_feasible: bool = Field(..., description="Whether a feasible recovery schedule was established")
    recovery_strategy: str = Field(
        default="RULE_BASED_HEURISTIC",
        description="Recovery algorithm strategy (deterministic rule-based re-sequencing)",
    )
    baseline_metrics: BaselineMetrics = Field(..., description="Pre-disruption baseline metrics")
    post_disruption_metrics: PostDisruptionMetrics = Field(..., description="Disrupted schedule metrics")
    recovery_metrics: RecoveryMetrics = Field(..., description="Post-recovery schedule metrics")
    affected_flights: List[AffectedFlightImpact] = Field(
        default_factory=list, description="List of affected flights"
    )
    recovery_proposals: List[RecoveryProposal] = Field(
        default_factory=list, description="Tactical recovery proposals"
    )
    remaining_conflicts: List[OperationalConflict] = Field(
        default_factory=list, description="Operational conflicts remaining after recovery"
    )
    limitations_notice: str = Field(
        default=(
            "Deterministic rule-based heuristic recovery proposal. "
            "Does not guarantee mathematical optimality. "
            "Constraint programming (OR-Tools) solver integration planned for Phase 3."
        ),
        description="Transparency statement on algorithmic limitations",
    )
