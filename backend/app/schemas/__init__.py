"""Data validation and serialization schemas."""
from .common import ErrorResponse
from .flight import (
    RecordType,
    FlightStatus,
    BaseFlightRecord,
    HistoricalFlightRecord,
    LiveFlightRecord,
    FlightRecord,
)

__all__ = [
    "ErrorResponse",
    "RecordType",
    "FlightStatus",
    "BaseFlightRecord",
    "HistoricalFlightRecord",
    "LiveFlightRecord",
    "FlightRecord",
]
