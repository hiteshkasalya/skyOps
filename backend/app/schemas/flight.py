"""Flight schemas distinguishing historical records from live telemetry data."""
from datetime import datetime, timezone
from enum import Enum
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class RecordType(str, Enum):
    """Classification of flight record permanence."""
    HISTORICAL = "HISTORICAL"
    LIVE_TRACKING = "LIVE_TRACKING"


class FlightStatus(str, Enum):
    """Operational flight status."""
    SCHEDULED = "SCHEDULED"
    BOARDING = "BOARDING"
    TAXIING = "TAXIING"
    DEPARTED = "DEPARTED"
    ON_TIME = "ON_TIME"
    DELAYED = "DELAYED"
    ARRIVED = "ARRIVED"
    CANCELLED = "CANCELLED"


class BaseFlightRecord(BaseModel):
    """Common normalized flight attributes."""
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    flight_id: str = Field(..., description="Unique composite flight identifier")
    flight_number: str = Field(..., description="IATA flight number (e.g. '6E 204')")
    airline: str = Field(default="IndiGo", description="Operating airline")
    origin_airport: str = Field(..., min_length=3, max_length=3, description="3-letter IATA origin code")
    destination_airport: str = Field(..., min_length=3, max_length=3, description="3-letter IATA destination code")
    aircraft_type: str = Field(default="A320neo", description="Aircraft equipment type (e.g. A320neo, A321neo)")
    tail_number: Optional[str] = Field(default=None, description="Aircraft registration / tail number")
    scheduled_departure: datetime = Field(..., description="Scheduled departure timestamp in UTC")
    scheduled_arrival: datetime = Field(..., description="Scheduled arrival timestamp in UTC")
    terminal: Optional[str] = Field(default=None, description="Assigned terminal")
    gate: Optional[str] = Field(default=None, description="Assigned gate")
    record_type: RecordType = Field(default=RecordType.HISTORICAL, description="Data permanence category")
    data_source: str = Field(default="SYNTHETIC_DEMO", description="Source or provenance of data")


class HistoricalFlightRecord(BaseFlightRecord):
    """Historical flight record for past schedules, completed flights, and ML training."""
    record_type: RecordType = Field(default=RecordType.HISTORICAL)
    actual_departure: Optional[datetime] = Field(default=None, description="Actual departure timestamp")
    actual_arrival: Optional[datetime] = Field(default=None, description="Actual arrival timestamp")
    status: FlightStatus = Field(default=FlightStatus.ON_TIME, description="Final or schedule status")
    delay_minutes: int = Field(default=0, ge=0, description="Departure delay in minutes")
    delay_reason: Optional[str] = Field(default=None, description="Historical recorded delay cause")


class LiveFlightRecord(BaseFlightRecord):
    """Live flight record for dynamic operations and telemetry streaming."""
    record_type: RecordType = Field(default=RecordType.LIVE_TRACKING)
    estimated_departure: Optional[datetime] = Field(default=None, description="Estimated departure timestamp")
    estimated_arrival: Optional[datetime] = Field(default=None, description="Estimated arrival timestamp")
    actual_departure: Optional[datetime] = Field(default=None, description="Actual departure if wheels up")
    actual_arrival: Optional[datetime] = Field(default=None, description="Actual arrival if touched down")
    current_status: FlightStatus = Field(default=FlightStatus.ON_TIME, description="Live operational status")
    current_delay_minutes: int = Field(default=0, ge=0, description="Projected live delay in minutes")
    active_conflict: bool = Field(default=False, description="Flag indicating unresolved resource contention")
    last_telemetry_update: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), description="Timestamp of latest live packet")


class FlightRecord(BaseFlightRecord):
    """Normalized general flight representation supporting both modes."""
    actual_departure: Optional[datetime] = None
    actual_arrival: Optional[datetime] = None
    estimated_departure: Optional[datetime] = None
    estimated_arrival: Optional[datetime] = None
    status: FlightStatus = FlightStatus.ON_TIME
    delay_minutes: int = 0
    delay_reason: Optional[str] = None
