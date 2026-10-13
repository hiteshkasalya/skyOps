"""Flight issue diagnosis, cascading defect projection, and tactical recovery schemas."""
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class DefectSeverity(str, Enum):
    """Severity ratings for operational flight defects."""
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    INFO = "INFO"


class DefectCategory(str, Enum):
    """Categorization of cascading operational defects."""
    GATE_CONTENTION = "GATE_CONTENTION"
    TURNAROUND_BREACH = "TURNAROUND_BREACH"
    RUNWAY_DISRUPTION = "RUNWAY_DISRUPTION"
    DOWNSTREAM_CASCADE = "DOWNSTREAM_CASCADE"
    PASSENGER_CONNECTION_RISK = "PASSENGER_CONNECTION_RISK"
    ATC_SLOT_VIOLATION = "ATC_SLOT_VIOLATION"
    WEATHER_RESTRICTION = "WEATHER_RESTRICTION"


class IdentifiedIssue(BaseModel):
    """Identified primary operational root issue on a flight."""
    model_config = ConfigDict(from_attributes=True)

    issue_code: str = Field(..., description="Machine-readable issue code (e.g. ISSUE-LATE-INBOUND)")
    title: str = Field(..., description="Concise human-readable description of root problem")
    category: str = Field(..., description="Operational domain category")
    severity: DefectSeverity = Field(..., description="Operational severity classification")
    root_cause_explanation: str = Field(..., description="In-depth narrative explaining what caused this issue")
    detected_parameters: Dict[str, Any] = Field(default_factory=dict, description="Numerical evidence parameters")


class PotentialDefect(BaseModel):
    """Downstream failure or defect that will occur if the issue is left unaddressed."""
    model_config = ConfigDict(from_attributes=True)

    defect_id: str = Field(..., description="Unique defect identifier")
    title: str = Field(..., description="Defect title (e.g. 'Terminal 3 Gate Deadlock')")
    category: DefectCategory = Field(..., description="Defect category")
    probability: str = Field(..., description="Probability of occurrence without intervention")
    impact_description: str = Field(..., description="Explanation of operational impact if unaddressed")
    projected_delay_addition_minutes: int = Field(default=0, description="Additional delay added by this cascade")


class TacticalRecoveryAction(BaseModel):
    """Tactical recovery action executed by SkyOps to resolve the defect."""
    model_config = ConfigDict(from_attributes=True)

    step_number: int = Field(..., description="Sequential action step")
    action_type: str = Field(..., description="Category of recovery action (e.g. GATE_REASSIGNMENT)")
    title: str = Field(..., description="Action title")
    description: str = Field(..., description="Detailed description of recovery action taken")
    target_resource: str = Field(..., description="Resource affected by action (e.g. Gate 46, Runway 11/29)")
    mitigated_delay_minutes: int = Field(default=0, description="Estimated minutes saved or recovered")


class StateSnapshot(BaseModel):
    """Snapshot of flight and airport status at a specific point in resolution."""
    model_config = ConfigDict(from_attributes=True)

    operational_status: str = Field(..., description="Flight and ramp operational state")
    total_projected_delay_minutes: int = Field(..., description="Projected cumulative schedule delay in minutes")
    gate_status: str = Field(..., description="Terminal gate assignment and conflict status")
    runway_status: str = Field(..., description="Assigned runway slot and availability status")
    turnaround_buffer_minutes: Optional[int] = Field(default=None, description="Available turnaround buffer in minutes")
    turnaround_compliant: bool = Field(default=True, description="Whether turnaround satisfies safety minimum")
    downstream_flights_impacted: int = Field(default=0, description="Count of secondary flights impacted in tail rotation")
    passengers_at_risk: int = Field(default=0, description="Connecting passengers risking missed flights")
    active_conflicts_count: int = Field(default=0, description="Count of unresolved spatial/temporal conflicts")


class DeltaSummary(BaseModel):
    """Quantitative benefits and improvement metrics delivered by SkyOps fix."""
    model_config = ConfigDict(from_attributes=True)

    delay_saved_minutes: int = Field(..., description="Net minutes of delay mitigated")
    conflicts_eliminated: int = Field(..., description="Number of conflicts resolved")
    passengers_protected: int = Field(..., description="Connecting passengers protected from misconnection")
    turnaround_buffer_restored_minutes: int = Field(..., description="Turnaround buffer regained")
    teacher_summary_verdict: str = Field(
        ...,
        description="High-level 2-sentence executive summary tailored for student-teacher presentation",
    )


class BeforeVsAfterComparison(BaseModel):
    """Before vs After resolution comparison showing early defects vs how they were fixed."""
    model_config = ConfigDict(from_attributes=True)

    before: StateSnapshot = Field(..., description="Initial defect state prior to SkyOps intervention")
    after: StateSnapshot = Field(..., description="Optimized operational state after SkyOps recovery plan")
    delta_summary: DeltaSummary = Field(..., description="Quantitative metric improvement summary")


class FlightDiagnosisResponse(BaseModel):
    """Complete flight issue diagnosis, cascading defect projection, fix, and audit ledger."""
    model_config = ConfigDict(from_attributes=True)

    flight_id: str = Field(..., description="Unique flight identifier")
    flight_number: str = Field(..., description="Flight number (e.g. '6E 204')")
    airline: str = Field(..., description="Operating airline")
    route: str = Field(..., description="Origin -> Destination route")
    origin_airport: str = Field(..., min_length=3, max_length=3)
    destination_airport: str = Field(..., min_length=3, max_length=3)
    aircraft_type: str = Field(..., description="Aircraft equipment (e.g. 'A321neo')")
    tail_number: Optional[str] = Field(default=None, description="Aircraft tail registration")
    scheduled_departure: datetime = Field(..., description="Scheduled departure time in UTC")
    scheduled_arrival: datetime = Field(..., description="Scheduled arrival time in UTC")
    has_issue: bool = Field(..., description="Whether flight currently has an active delay or conflict")
    issue: IdentifiedIssue = Field(..., description="Primary root issue diagnosed")
    potential_defects: List[PotentialDefect] = Field(
        default_factory=list,
        description="List of secondary defects that will cascade if unaddressed",
    )
    recovery_actions: List[TacticalRecoveryAction] = Field(
        default_factory=list,
        description="Step-by-step recovery plan executed by SkyOps",
    )
    audit_comparison: BeforeVsAfterComparison = Field(
        ...,
        description="Side-by-side Before vs After comparison for presentation demonstration",
    )
    diagnosed_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="UTC timestamp of diagnosis",
    )


class InjectedIssueRequest(BaseModel):
    """Optional payload to simulate/inject a custom issue for interactive teacher testing."""
    model_config = ConfigDict(from_attributes=True)

    delay_minutes: Optional[int] = Field(default=None, ge=0, le=360, description="Simulate an added departure delay in minutes")
    delay_reason: Optional[str] = Field(default=None, description="Simulate delay cause (e.g. WEATHER_VISIBILITY, CREW_DUTY)")
    blocked_gate: Optional[str] = Field(default=None, description="Simulate gate obstruction (e.g. Gate 42)")
    closed_runway: Optional[str] = Field(default=None, description="Simulate closed runway (e.g. 10/28)")
