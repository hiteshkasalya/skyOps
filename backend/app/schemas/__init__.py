"""Data validation and serialization schemas."""
from .airport import Airport
from .common import ErrorResponse
from .flight import (
    RecordType,
    FlightStatus,
    BaseFlightRecord,
    HistoricalFlightRecord,
    LiveFlightRecord,
    FlightRecord,
)
from .resource import (
    AircraftCategory,
    ClosureWindow,
    FlightResourceAssignment,
    Gate,
    GateOccupancy,
    MovementType,
    Runway,
    RunwayOccupancy,
    TimeWindow,
    TurnaroundRequirement,
)

__all__ = [
    "Airport",
    "AircraftCategory",
    "BaseFlightRecord",
    "ClosureWindow",
    "ErrorResponse",
    "FlightRecord",
    "FlightResourceAssignment",
    "FlightStatus",
    "Gate",
    "GateOccupancy",
    "HistoricalFlightRecord",
    "LiveFlightRecord",
    "MovementType",
    "RecordType",
    "Runway",
    "RunwayOccupancy",
    "TimeWindow",
    "TurnaroundRequirement",
]
