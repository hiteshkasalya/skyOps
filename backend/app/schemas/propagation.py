"""Pydantic schemas for downstream delay propagation and aircraft rotation network."""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class DownstreamFlightImpact(BaseModel):
    """Impact details on a downstream flight leg sharing the same aircraft tail or crew."""
    flight_id: str
    flight_number: str
    route: str
    tail_number: str
    scheduled_departure: datetime
    projected_departure: datetime
    projected_delay_minutes: int
    connection_type: str = Field(
        ...,
        description="SAME_AIRCRAFT_TURNAROUND, CREW_ROTATION, or PASSENGER_TRANSFER"
    )
    absorbed_by_buffer_minutes: int = 0
    cascading_penalty_minutes: int = 0
    atc_slot_forfeiture: bool = False


class CrewDutyImpact(BaseModel):
    """Crew flight duty period (FDP) monitoring under aviation regulatory standards."""
    tail_number: str
    crew_pairing_id: str
    duty_hours_elapsed: float
    max_legal_duty_hours: float = 10.0
    duty_breached: bool = False
    action_required: Optional[str] = None


class PassengerImpact(BaseModel):
    """Passenger connection risk metrics across the flight network."""
    total_connecting_passengers: int
    missed_connections_count: int
    tight_connections_count: int
    rebooking_cost_estimate_inr: float
    critical_destinations: List[str] = Field(default_factory=list)


class DelayPropagationRequest(BaseModel):
    """Payload to simulate downstream delay propagation."""
    flight_id: str
    initial_delay_minutes: int = Field(..., ge=0, le=720, description="Incurred upstream delay in minutes")
    cause: str = Field(default="LATE_INBOUND_AIRCRAFT", description="Primary delay reason")
    tail_number: Optional[str] = None


class DelayPropagationResponse(BaseModel):
    """Network cascade propagation result."""
    root_flight_id: str
    root_flight_number: str
    root_delay_minutes: int
    aircraft_tail: str
    total_impacted_flights: int
    cascaded_delay_minutes_total: int
    downstream_impacts: List[DownstreamFlightImpact]
    crew_duty: CrewDutyImpact
    passenger_impact: PassengerImpact
    executive_assessment: str
    calculated_at: datetime
