"""Airport resources, runway/gate occupancy, and turnaround models."""
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class MovementType(str, Enum):
    """Flight movement type on a runway."""
    DEPARTURE = "DEPARTURE"
    ARRIVAL = "ARRIVAL"


class AircraftCategory(str, Enum):
    """Aircraft category classifications."""
    NARROW_BODY = "NARROW_BODY"
    WIDE_BODY = "WIDE_BODY"
    REGIONAL = "REGIONAL"


class TimeWindow(BaseModel):
    """Temporal interval with start and end time validation."""
    model_config = ConfigDict(from_attributes=True)

    start_time: datetime = Field(..., description="Start timestamp in UTC")
    end_time: datetime = Field(..., description="End timestamp in UTC")

    @model_validator(mode="after")
    def validate_chronology(self) -> "TimeWindow":
        if self.end_time <= self.start_time:
            raise ValueError(
                f"end_time ({self.end_time.isoformat()}) must be strictly after start_time ({self.start_time.isoformat()})"
            )
        return self

    def overlaps(self, other: "TimeWindow") -> bool:
        """Check if this interval overlaps with another time window."""
        return max(self.start_time, other.start_time) < min(self.end_time, other.end_time)

    def contains(self, timestamp: datetime) -> bool:
        """Check if a specific timestamp falls within this interval."""
        return self.start_time <= timestamp <= self.end_time

    @property
    def duration_minutes(self) -> float:
        """Duration of interval in minutes."""
        return (self.end_time - self.start_time).total_seconds() / 60.0


class ClosureWindow(TimeWindow):
    """Scheduled or emergency closure interval for an airport resource."""
    reason: str = Field(..., description="Operational reason for closure (e.g. MAINTENANCE, WEATHER, FOD)")


class Runway(BaseModel):
    """Airport runway model with availability and closure tracking."""
    model_config = ConfigDict(from_attributes=True)

    runway_id: str = Field(..., description="Runway identifier (e.g. '10/28', '09/27')")
    airport_code: str = Field(..., min_length=3, max_length=3, description="3-letter IATA airport code")
    length_meters: int = Field(..., gt=0, description="Runway length in meters")
    is_active: bool = Field(default=True, description="Master operational status")
    closure_windows: List[ClosureWindow] = Field(default_factory=list, description="Scheduled closure intervals")

    @field_validator("airport_code")
    @classmethod
    def normalize_airport_code(cls, v: str) -> str:
        return v.strip().upper()

    def is_available_at(self, timestamp: datetime) -> bool:
        """Check whether runway is open at a given timestamp."""
        if not self.is_active:
            return False
        for closure in self.closure_windows:
            if closure.contains(timestamp):
                return False
        return True

    def has_closure_conflict(self, window: TimeWindow) -> Optional[ClosureWindow]:
        """Check if a time window conflicts with any runway closure window."""
        for closure in self.closure_windows:
            if closure.overlaps(window):
                return closure
        return None


class Gate(BaseModel):
    """Terminal gate model with aircraft size and availability constraints."""
    model_config = ConfigDict(from_attributes=True)

    gate_id: str = Field(..., description="Gate identifier (e.g. '42', 'B20')")
    airport_code: str = Field(..., min_length=3, max_length=3, description="3-letter IATA airport code")
    terminal: str = Field(..., description="Terminal designation (e.g. 'T3', 'T2')")
    max_aircraft_size: AircraftCategory = Field(default=AircraftCategory.NARROW_BODY, description="Maximum size class")
    has_jetbridge: bool = Field(default=True, description="Jetbridge presence")
    is_active: bool = Field(default=True, description="Master gate status")
    closure_windows: List[ClosureWindow] = Field(default_factory=list, description="Gate maintenance intervals")

    @field_validator("airport_code")
    @classmethod
    def normalize_airport_code(cls, v: str) -> str:
        return v.strip().upper()

    def is_available_at(self, timestamp: datetime) -> bool:
        """Check whether gate is operational at a given timestamp."""
        if not self.is_active:
            return False
        for closure in self.closure_windows:
            if closure.contains(timestamp):
                return False
        return True


class RunwayOccupancy(BaseModel):
    """Runway slot occupation by a flight during takeoff or landing."""
    model_config = ConfigDict(from_attributes=True)

    runway_id: str = Field(..., description="Runway identifier")
    airport_code: str = Field(..., min_length=3, max_length=3, description="3-letter IATA airport code")
    flight_id: str = Field(..., description="Associated flight identifier")
    movement_type: MovementType = Field(..., description="Departure or Arrival movement")
    interval: TimeWindow = Field(..., description="Runway occupancy interval")


class GateOccupancy(BaseModel):
    """Terminal gate occupation during boarding, debarkation, or turnaround."""
    model_config = ConfigDict(from_attributes=True)

    gate_id: str = Field(..., description="Gate identifier")
    airport_code: str = Field(..., min_length=3, max_length=3, description="3-letter IATA airport code")
    flight_id: str = Field(..., description="Associated flight identifier")
    interval: TimeWindow = Field(..., description="Gate occupancy interval")


class TurnaroundRequirement(BaseModel):
    """Minimum turnaround duration requirements and phase breakdown by aircraft type."""
    model_config = ConfigDict(from_attributes=True)

    aircraft_type: str = Field(..., description="Aircraft type (e.g. 'A320neo', 'A321neo')")
    min_turnaround_minutes: int = Field(default=40, ge=20, description="Minimum allowable turnaround in minutes")
    deboarding_minutes: int = Field(default=10, ge=0)
    cleaning_minutes: int = Field(default=10, ge=0)
    fueling_minutes: int = Field(default=15, ge=0)
    catering_minutes: int = Field(default=10, ge=0)
    boarding_minutes: int = Field(default=15, ge=0)


class FlightResourceAssignment(BaseModel):
    """Combined flight schedule and operational resource assignments."""
    model_config = ConfigDict(from_attributes=True)

    flight_id: str = Field(..., description="Unique flight identifier")
    flight_number: str = Field(..., description="Flight number")
    aircraft_type: str = Field(default="A320neo", description="Aircraft equipment")

    # Origin airport resource assignments
    origin_airport: str = Field(..., min_length=3, max_length=3)
    departure_gate_occupancy: Optional[GateOccupancy] = Field(default=None)
    departure_runway_occupancy: Optional[RunwayOccupancy] = Field(default=None)

    # Destination airport resource assignments
    destination_airport: str = Field(..., min_length=3, max_length=3)
    arrival_runway_occupancy: Optional[RunwayOccupancy] = Field(default=None)
    arrival_gate_occupancy: Optional[GateOccupancy] = Field(default=None)

    # Turnaround linkage
    inbound_flight_id: Optional[str] = Field(default=None, description="Previous leg flight ID for turnaround")
    turnaround_buffer_minutes: Optional[int] = Field(default=None, description="Available buffer before departure")
    turnaround_compliant: bool = Field(default=True, description="Meets minimum turnaround threshold")
    is_simulated: bool = Field(default=True, description="Labels data as simulated operational allocation")
