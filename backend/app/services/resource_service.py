"""Airport resource management, occupancy scheduling, and turnaround compliance service."""
import json
import logging
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union

from app.core.config import settings
from app.schemas.airport import Airport
from app.schemas.flight import BaseFlightRecord
from app.schemas.resource import (
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

logger = logging.getLogger(__name__)


class ResourceService:
    """Manages airport topology, runway availability, gate occupancy, and turnaround rules."""

    def __init__(self, data_path: Optional[Union[str, Path]] = None):
        self.data_path = Path(
            data_path or (settings.BASE_DIR / "data" / "simulated_airport_resources.json")
        )
        self.airports: Dict[str, Airport] = {}
        self.turnaround_rules: Dict[str, TurnaroundRequirement] = {}
        self.load_resources()

    def load_resources(self) -> None:
        """Load simulated airport infrastructure and turnaround rules from JSON."""
        if not self.data_path.exists():
            logger.warning("Simulated resource file not found at %s", self.data_path)
            return

        with open(self.data_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        # Parse airports
        for ap_data in data.get("airports", []):
            airport = Airport.model_validate(ap_data)
            self.airports[airport.airport_code] = airport

        # Parse turnaround rules
        for tr_data in data.get("turnaround_requirements", []):
            tr = TurnaroundRequirement.model_validate(tr_data)
            self.turnaround_rules[tr.aircraft_type] = tr

    def get_airport(self, airport_code: str) -> Optional[Airport]:
        """Lookup airport by 3-letter IATA code."""
        return self.airports.get(airport_code.strip().upper())

    def get_runways(self, airport_code: str) -> List[Runway]:
        """Get all runways for an airport."""
        airport = self.get_airport(airport_code)
        return airport.runways if airport else []

    def get_runway(self, airport_code: str, runway_id: str) -> Optional[Runway]:
        """Find a specific runway by ID at a given airport."""
        for rw in self.get_runways(airport_code):
            if rw.runway_id == runway_id.strip():
                return rw
        return None

    def get_gates(self, airport_code: str) -> List[Gate]:
        """Get all gates for an airport."""
        airport = self.get_airport(airport_code)
        return airport.gates if airport else []

    def get_gate(self, airport_code: str, gate_id: str) -> Optional[Gate]:
        """Find a specific gate by ID at a given airport."""
        for g in self.get_gates(airport_code):
            if g.gate_id == gate_id.strip():
                return g
        return None

    def add_runway_closure(
        self,
        airport_code: str,
        runway_id: str,
        start_time: datetime,
        end_time: datetime,
        reason: str,
    ) -> ClosureWindow:
        """Schedule or record a runway closure window with time-window validation."""
        runway = self.get_runway(airport_code, runway_id)
        if not runway:
            raise ValueError(f"Runway '{runway_id}' does not exist at airport '{airport_code}'.")

        closure = ClosureWindow(start_time=start_time, end_time=end_time, reason=reason)
        runway.closure_windows.append(closure)
        return closure

    def validate_turnaround(
        self,
        inbound_arrival: datetime,
        outbound_departure: datetime,
        aircraft_type: str = "A320neo",
    ) -> Tuple[bool, int, int]:
        """Validate if buffer between inbound arrival and departure satisfies minimum requirement."""
        if outbound_departure <= inbound_arrival:
            return False, 0, self.get_min_turnaround_minutes(aircraft_type)

        buffer_minutes = int((outbound_departure - inbound_arrival).total_seconds() / 60.0)
        required_minutes = self.get_min_turnaround_minutes(aircraft_type)
        is_compliant = buffer_minutes >= required_minutes
        return is_compliant, buffer_minutes, required_minutes

    def get_min_turnaround_minutes(self, aircraft_type: str) -> int:
        """Return required turnaround minutes for an aircraft type."""
        rule = self.turnaround_rules.get(aircraft_type)
        return rule.min_turnaround_minutes if rule else 40

    def assign_flight_resources(
        self,
        flight: BaseFlightRecord,
        departure_gate: Optional[str] = None,
        departure_runway: Optional[str] = None,
        arrival_runway: Optional[str] = None,
        arrival_gate: Optional[str] = None,
        inbound_flight_arrival: Optional[datetime] = None,
        inbound_flight_id: Optional[str] = None,
    ) -> FlightResourceAssignment:
        """Construct validated resource assignment for a flight, deriving occupancy intervals."""
        dep_airport_code = flight.origin_airport
        arr_airport_code = flight.destination_airport

        # Validate origin & destination airports exist in topology
        origin_ap = self.get_airport(dep_airport_code)
        if not origin_ap:
            raise ValueError(f"Origin airport '{dep_airport_code}' is not registered in resource topology.")

        dest_ap = self.get_airport(arr_airport_code)
        if not dest_ap:
            raise ValueError(f"Destination airport '{arr_airport_code}' is not registered in resource topology.")

        # 1. Resolve & Validate Departure Gate
        dep_gate_id = departure_gate or flight.gate
        if dep_gate_id:
            gate_obj = self.get_gate(dep_airport_code, dep_gate_id)
            if not gate_obj:
                raise ValueError(f"Departure gate '{dep_gate_id}' not found at airport '{dep_airport_code}'.")
        else:
            # Fallback to first available gate
            gates = self.get_gates(dep_airport_code)
            dep_gate_id = gates[0].gate_id if gates else "41"

        # Gate Occupancy Interval: 40 minutes prior to departure until departure
        dep_gate_interval = TimeWindow(
            start_time=flight.scheduled_departure - timedelta(minutes=40),
            end_time=flight.scheduled_departure,
        )
        gate_dep_occ = GateOccupancy(
            gate_id=dep_gate_id,
            airport_code=dep_airport_code,
            flight_id=flight.flight_id,
            interval=dep_gate_interval,
        )

        # 2. Resolve & Validate Departure Runway
        dep_rw_id = departure_runway
        if dep_rw_id:
            rw_obj = self.get_runway(dep_airport_code, dep_rw_id)
            if not rw_obj:
                raise ValueError(f"Departure runway '{dep_rw_id}' not found at airport '{dep_airport_code}'.")
        else:
            # Select first open runway
            rws = self.get_runways(dep_airport_code)
            dep_rw_id = rws[0].runway_id if rws else "10/28"

        # Runway Departure Slot: 2 mins prior to 1 min after scheduled departure
        dep_rw_interval = TimeWindow(
            start_time=flight.scheduled_departure - timedelta(minutes=2),
            end_time=flight.scheduled_departure + timedelta(minutes=1),
        )
        rw_dep_occ = RunwayOccupancy(
            runway_id=dep_rw_id,
            airport_code=dep_airport_code,
            flight_id=flight.flight_id,
            movement_type=MovementType.DEPARTURE,
            interval=dep_rw_interval,
        )

        # 3. Resolve & Validate Arrival Runway
        arr_rw_id = arrival_runway
        if arr_rw_id:
            arr_rw_obj = self.get_runway(arr_airport_code, arr_rw_id)
            if not arr_rw_obj:
                raise ValueError(f"Arrival runway '{arr_rw_id}' not found at airport '{arr_airport_code}'.")
        else:
            rws = self.get_runways(arr_airport_code)
            arr_rw_id = rws[0].runway_id if rws else "09/27"

        # Runway Arrival Slot: 2 mins prior to 1 min after scheduled arrival
        arr_rw_interval = TimeWindow(
            start_time=flight.scheduled_arrival - timedelta(minutes=2),
            end_time=flight.scheduled_arrival + timedelta(minutes=1),
        )
        rw_arr_occ = RunwayOccupancy(
            runway_id=arr_rw_id,
            airport_code=arr_airport_code,
            flight_id=flight.flight_id,
            movement_type=MovementType.ARRIVAL,
            interval=arr_rw_interval,
        )

        # 4. Resolve & Validate Arrival Gate
        arr_gate_id = arrival_gate
        if arr_gate_id:
            arr_gate_obj = self.get_gate(arr_airport_code, arr_gate_id)
            if not arr_gate_obj:
                raise ValueError(f"Arrival gate '{arr_gate_id}' not found at airport '{arr_airport_code}'.")
        else:
            gates = self.get_gates(arr_airport_code)
            arr_gate_id = gates[0].gate_id if gates else "22"

        # Arrival Gate Occupancy: arrival time to 30 mins after arrival
        arr_gate_interval = TimeWindow(
            start_time=flight.scheduled_arrival,
            end_time=flight.scheduled_arrival + timedelta(minutes=30),
        )
        gate_arr_occ = GateOccupancy(
            gate_id=arr_gate_id,
            airport_code=arr_airport_code,
            flight_id=flight.flight_id,
            interval=arr_gate_interval,
        )

        # 5. Evaluate Turnaround if Inbound Flight Provided
        turnaround_compliant = True
        buffer_mins = None
        if inbound_flight_arrival:
            turnaround_compliant, buffer_mins, _ = self.validate_turnaround(
                inbound_arrival=inbound_flight_arrival,
                outbound_departure=flight.scheduled_departure,
                aircraft_type=flight.aircraft_type,
            )

        return FlightResourceAssignment(
            flight_id=flight.flight_id,
            flight_number=flight.flight_number,
            aircraft_type=flight.aircraft_type,
            origin_airport=dep_airport_code,
            departure_gate_occupancy=gate_dep_occ,
            departure_runway_occupancy=rw_dep_occ,
            destination_airport=arr_airport_code,
            arrival_runway_occupancy=rw_arr_occ,
            arrival_gate_occupancy=gate_arr_occ,
            inbound_flight_id=inbound_flight_id,
            turnaround_buffer_minutes=buffer_mins,
            turnaround_compliant=turnaround_compliant,
            is_simulated=True,
        )


# Global singleton instance
resource_service = ResourceService()
