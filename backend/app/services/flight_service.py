"""Flight operations service for querying and managing flights."""
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union

from app.core.config import settings
from app.schemas.flight import (
    FlightRecord,
    HistoricalFlightRecord,
    LiveFlightRecord,
    RecordType,
    FlightStatus,
)
from app.services.flight_loader import FlightDataLoader


class FlightService:
    """Service handling flight query logic, caching, and filtering."""

    def __init__(self, data_path: Optional[Union[str, Path]] = None):
        self.data_path = Path(data_path or settings.DATA_PATH)
        self.loader = FlightDataLoader()
        self._flights: List[Union[HistoricalFlightRecord, LiveFlightRecord, FlightRecord]] = []
        self._flights_by_id: Dict[str, Union[HistoricalFlightRecord, LiveFlightRecord, FlightRecord]] = {}
        self.load_data()

    def load_data(self) -> None:
        """Load and cache flights from the dataset file."""
        if self.data_path.exists():
            result = self.loader.load_csv(self.data_path)
            self._flights = result.valid_records
            self._flights_by_id = {
                f.flight_id.strip(): f for f in self._flights
            }
        else:
            self._flights = []
            self._flights_by_id = {}

    def get_flights(
        self,
        origin: Optional[str] = None,
        destination: Optional[str] = None,
        airline: Optional[str] = None,
        status: Optional[FlightStatus] = None,
        record_type: Optional[RecordType] = None,
        delayed_only: bool = False,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[Union[HistoricalFlightRecord, LiveFlightRecord, FlightRecord]], int]:
        """Filter and paginate flights."""
        filtered = self._flights

        if origin:
            clean_origin = origin.strip().upper()
            filtered = [f for f in filtered if f.origin_airport == clean_origin]

        if destination:
            clean_dest = destination.strip().upper()
            filtered = [f for f in filtered if f.destination_airport == clean_dest]

        if airline:
            clean_airline = airline.strip().lower()
            filtered = [f for f in filtered if clean_airline in f.airline.lower()]

        if status:
            filtered = [
                f for f in filtered
                if (getattr(f, "status", None) == status or getattr(f, "current_status", None) == status)
            ]

        if record_type:
            filtered = [f for f in filtered if f.record_type == record_type]

        if delayed_only:
            filtered = [
                f for f in filtered
                if (getattr(f, "delay_minutes", 0) > 0 or getattr(f, "current_delay_minutes", 0) > 0)
            ]

        total = len(filtered)
        paginated = filtered[offset : offset + limit]
        return paginated, total

    def get_flight_by_id(
        self, flight_id: str
    ) -> Optional[Union[HistoricalFlightRecord, LiveFlightRecord, FlightRecord]]:
        """Retrieve a specific flight by unique flight_id (case-insensitive fallback)."""
        clean_id = flight_id.strip()
        if clean_id in self._flights_by_id:
            return self._flights_by_id[clean_id]

        lower_id = clean_id.lower()
        for fid, flight in self._flights_by_id.items():
            if fid.lower() == lower_id:
                return flight

        return None


# Global singleton instance for application use
flight_service = FlightService()
