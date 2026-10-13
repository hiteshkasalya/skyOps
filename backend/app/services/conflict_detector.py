"""Deterministic conflict detection engine for airport resources and schedules."""
import hashlib
import logging
from typing import Dict, List, Optional, Set, Tuple

from app.schemas.airport import Airport
from app.schemas.conflict import ConflictSeverity, ConflictType, OperationalConflict
from app.schemas.resource import (
    FlightResourceAssignment,
    Gate,
    GateOccupancy,
    Runway,
    RunwayOccupancy,
    TimeWindow,
)
from app.services.resource_service import ResourceService, resource_service

logger = logging.getLogger(__name__)


class ConflictDetectionService:
    """Deterministic, rule-based detector for resource contention and schedule anomalies."""

    def __init__(self, res_service: Optional[ResourceService] = None):
        self.resource_service = res_service or resource_service

    def _generate_conflict_id(self, conflict_type: ConflictType, resource_id: str, flights: List[str]) -> str:
        """Deterministically generate a stable conflict identifier."""
        raw_key = f"{conflict_type.value}:{resource_id}:{'-'.join(sorted(flights))}"
        digest = hashlib.md5(raw_key.encode("utf-8")).hexdigest()[:10]
        prefix = conflict_type.value.lower().replace("_", "-")
        return f"{prefix}-{digest}"

    def detect_runway_closure_conflicts(
        self,
        assignments: List[FlightResourceAssignment],
    ) -> List[OperationalConflict]:
        """Detect flight runway occupancies scheduled across active runway closure windows."""
        conflicts: List[OperationalConflict] = []

        for assignment in assignments:
            # Check departure runway
            dep_rw = assignment.departure_runway_occupancy
            if dep_rw and dep_rw.interval:
                runway_obj = self.resource_service.get_runway(dep_rw.airport_code, dep_rw.runway_id)
                if runway_obj:
                    conflict_closure = runway_obj.has_closure_conflict(dep_rw.interval)
                    if conflict_closure:
                        overlap = TimeWindow(
                            start_time=max(dep_rw.interval.start_time, conflict_closure.start_time),
                            end_time=min(dep_rw.interval.end_time, conflict_closure.end_time),
                        )
                        c_id = self._generate_conflict_id(
                            ConflictType.RUNWAY_CLOSURE_CONFLICT,
                            f"{dep_rw.airport_code}-{dep_rw.runway_id}",
                            [assignment.flight_id],
                        )
                        conflicts.append(
                            OperationalConflict(
                                conflict_id=c_id,
                                type=ConflictType.RUNWAY_CLOSURE_CONFLICT,
                                severity=ConflictSeverity.CRITICAL,
                                airport_code=dep_rw.airport_code,
                                resource_type="RUNWAY",
                                resource_id=dep_rw.runway_id,
                                interval=overlap,
                                affected_flights=[assignment.flight_id],
                                explanation=(
                                    f"Flight {assignment.flight_number} departure runway occupancy "
                                    f"({dep_rw.interval.start_time.strftime('%H:%M')} - "
                                    f"{dep_rw.interval.end_time.strftime('%H:%M')} UTC) overlaps with "
                                    f"closure on Runway {dep_rw.runway_id} due to '{conflict_closure.reason}'."
                                ),
                            )
                        )

            # Check arrival runway
            arr_rw = assignment.arrival_runway_occupancy
            if arr_rw and arr_rw.interval:
                runway_obj = self.resource_service.get_runway(arr_rw.airport_code, arr_rw.runway_id)
                if runway_obj:
                    conflict_closure = runway_obj.has_closure_conflict(arr_rw.interval)
                    if conflict_closure:
                        overlap = TimeWindow(
                            start_time=max(arr_rw.interval.start_time, conflict_closure.start_time),
                            end_time=min(arr_rw.interval.end_time, conflict_closure.end_time),
                        )
                        c_id = self._generate_conflict_id(
                            ConflictType.RUNWAY_CLOSURE_CONFLICT,
                            f"{arr_rw.airport_code}-{arr_rw.runway_id}",
                            [assignment.flight_id],
                        )
                        conflicts.append(
                            OperationalConflict(
                                conflict_id=c_id,
                                type=ConflictType.RUNWAY_CLOSURE_CONFLICT,
                                severity=ConflictSeverity.CRITICAL,
                                airport_code=arr_rw.airport_code,
                                resource_type="RUNWAY",
                                resource_id=arr_rw.runway_id,
                                interval=overlap,
                                affected_flights=[assignment.flight_id],
                                explanation=(
                                    f"Flight {assignment.flight_number} arrival runway occupancy "
                                    f"({arr_rw.interval.start_time.strftime('%H:%M')} - "
                                    f"{arr_rw.interval.end_time.strftime('%H:%M')} UTC) overlaps with "
                                    f"closure on Runway {arr_rw.runway_id} due to '{conflict_closure.reason}'."
                                ),
                            )
                        )

        return conflicts

    def detect_runway_reservation_conflicts(
        self,
        assignments: List[FlightResourceAssignment],
    ) -> List[OperationalConflict]:
        """Detect simultaneous reservation of the same runway by multiple movements."""
        conflicts: List[OperationalConflict] = []
        occupancies_by_runway: Dict[Tuple[str, str], List[RunwayOccupancy]] = {}

        for assignment in assignments:
            if assignment.departure_runway_occupancy:
                key = (assignment.departure_runway_occupancy.airport_code, assignment.departure_runway_occupancy.runway_id)
                occupancies_by_runway.setdefault(key, []).append(assignment.departure_runway_occupancy)
            if assignment.arrival_runway_occupancy:
                key = (assignment.arrival_runway_occupancy.airport_code, assignment.arrival_runway_occupancy.runway_id)
                occupancies_by_runway.setdefault(key, []).append(assignment.arrival_runway_occupancy)

        seen_pairs: Set[Tuple[str, str]] = set()

        for (airport_code, runway_id), occ_list in occupancies_by_runway.items():
            n = len(occ_list)
            for i in range(n):
                for j in range(i + 1, n):
                    occ_a = occ_list[i]
                    occ_b = occ_list[j]

                    if occ_a.flight_id == occ_b.flight_id:
                        continue

                    pair_key = tuple(sorted([occ_a.flight_id, occ_b.flight_id]))
                    if pair_key in seen_pairs:
                        continue

                    if occ_a.interval.overlaps(occ_b.interval):
                        seen_pairs.add(pair_key)
                        overlap = TimeWindow(
                            start_time=max(occ_a.interval.start_time, occ_b.interval.start_time),
                            end_time=min(occ_a.interval.end_time, occ_b.interval.end_time),
                        )
                        c_id = self._generate_conflict_id(
                            ConflictType.RUNWAY_RESERVATION_CONFLICT,
                            f"{airport_code}-{runway_id}",
                            [occ_a.flight_id, occ_b.flight_id],
                        )
                        conflicts.append(
                            OperationalConflict(
                                conflict_id=c_id,
                                type=ConflictType.RUNWAY_RESERVATION_CONFLICT,
                                severity=ConflictSeverity.CRITICAL,
                                airport_code=airport_code,
                                resource_type="RUNWAY",
                                resource_id=runway_id,
                                interval=overlap,
                                affected_flights=sorted([occ_a.flight_id, occ_b.flight_id]),
                                explanation=(
                                    f"Runway slot reservation contention on Runway {runway_id} at {airport_code} "
                                    f"between {occ_a.movement_type.value} of {occ_a.flight_id} and "
                                    f"{occ_b.movement_type.value} of {occ_b.flight_id} overlapping from "
                                    f"{overlap.start_time.strftime('%H:%M')} to {overlap.end_time.strftime('%H:%M')} UTC."
                                ),
                            )
                        )

        return conflicts

    def detect_gate_occupancy_conflicts(
        self,
        assignments: List[FlightResourceAssignment],
    ) -> List[OperationalConflict]:
        """Detect gate double-booking when multiple aircraft occupy the same gate interval."""
        conflicts: List[OperationalConflict] = []
        occupancies_by_gate: Dict[Tuple[str, str], List[GateOccupancy]] = {}

        for assignment in assignments:
            if assignment.departure_gate_occupancy:
                key = (assignment.departure_gate_occupancy.airport_code, assignment.departure_gate_occupancy.gate_id)
                occupancies_by_gate.setdefault(key, []).append(assignment.departure_gate_occupancy)
            if assignment.arrival_gate_occupancy:
                key = (assignment.arrival_gate_occupancy.airport_code, assignment.arrival_gate_occupancy.gate_id)
                occupancies_by_gate.setdefault(key, []).append(assignment.arrival_gate_occupancy)

        seen_pairs: Set[Tuple[str, str]] = set()

        for (airport_code, gate_id), occ_list in occupancies_by_gate.items():
            n = len(occ_list)
            for i in range(n):
                for j in range(i + 1, n):
                    occ_a = occ_list[i]
                    occ_b = occ_list[j]

                    if occ_a.flight_id == occ_b.flight_id:
                        continue

                    pair_key = tuple(sorted([occ_a.flight_id, occ_b.flight_id]))
                    if pair_key in seen_pairs:
                        continue

                    if occ_a.interval.overlaps(occ_b.interval):
                        seen_pairs.add(pair_key)
                        overlap = TimeWindow(
                            start_time=max(occ_a.interval.start_time, occ_b.interval.start_time),
                            end_time=min(occ_a.interval.end_time, occ_b.interval.end_time),
                        )
                        c_id = self._generate_conflict_id(
                            ConflictType.GATE_OCCUPANCY_CONFLICT,
                            f"{airport_code}-{gate_id}",
                            [occ_a.flight_id, occ_b.flight_id],
                        )
                        conflicts.append(
                            OperationalConflict(
                                conflict_id=c_id,
                                type=ConflictType.GATE_OCCUPANCY_CONFLICT,
                                severity=ConflictSeverity.HIGH,
                                airport_code=airport_code,
                                resource_type="GATE",
                                resource_id=f"Gate {gate_id}",
                                interval=overlap,
                                affected_flights=sorted([occ_a.flight_id, occ_b.flight_id]),
                                explanation=(
                                    f"Gate double-booking contention on Gate {gate_id} at {airport_code} "
                                    f"between flights {occ_a.flight_id} and {occ_b.flight_id} overlapping from "
                                    f"{overlap.start_time.strftime('%H:%M')} to {overlap.end_time.strftime('%H:%M')} UTC."
                                ),
                            )
                        )

        return conflicts

    def detect_turnaround_conflicts(
        self,
        assignments: List[FlightResourceAssignment],
    ) -> List[OperationalConflict]:
        """Detect insufficient aircraft turnaround time between inbound arrival and departure."""
        conflicts: List[OperationalConflict] = []

        for assignment in assignments:
            if assignment.inbound_flight_id and assignment.turnaround_buffer_minutes is not None:
                if not assignment.turnaround_compliant:
                    req_min = self.resource_service.get_min_turnaround_minutes(assignment.aircraft_type)
                    severity = ConflictSeverity.HIGH if assignment.turnaround_buffer_minutes < (req_min / 2) else ConflictSeverity.MEDIUM
                    c_id = self._generate_conflict_id(
                        ConflictType.INSUFFICIENT_TURNAROUND,
                        assignment.inbound_flight_id,
                        [assignment.inbound_flight_id, assignment.flight_id],
                    )
                    conflicts.append(
                        OperationalConflict(
                            conflict_id=c_id,
                            type=ConflictType.INSUFFICIENT_TURNAROUND,
                            severity=severity,
                            airport_code=assignment.origin_airport,
                            resource_type="AIRCRAFT_TURNAROUND",
                            resource_id=assignment.inbound_flight_id,
                            interval=None,
                            affected_flights=[assignment.inbound_flight_id, assignment.flight_id],
                            explanation=(
                                f"Insufficient turnaround buffer ({assignment.turnaround_buffer_minutes} mins available, "
                                f"{req_min} mins required) at {assignment.origin_airport} between inbound leg "
                                f"{assignment.inbound_flight_id} and outbound flight {assignment.flight_id}."
                            ),
                        )
                    )

        return conflicts

    def detect_resource_availability_conflicts(
        self,
        assignments: List[FlightResourceAssignment],
    ) -> List[OperationalConflict]:
        """Detect assignments to inactive resources or resources outside operational windows."""
        conflicts: List[OperationalConflict] = []

        for assignment in assignments:
            # Check departure gate active status
            if assignment.departure_gate_occupancy:
                gate_id = assignment.departure_gate_occupancy.gate_id
                ap_code = assignment.departure_gate_occupancy.airport_code
                gate_obj = self.resource_service.get_gate(ap_code, gate_id)
                if gate_obj and not gate_obj.is_active:
                    c_id = self._generate_conflict_id(
                        ConflictType.RESOURCE_UNAVAILABLE,
                        f"{ap_code}-{gate_id}",
                        [assignment.flight_id],
                    )
                    conflicts.append(
                        OperationalConflict(
                            conflict_id=c_id,
                            type=ConflictType.RESOURCE_UNAVAILABLE,
                            severity=ConflictSeverity.HIGH,
                            airport_code=ap_code,
                            resource_type="GATE",
                            resource_id=f"Gate {gate_id}",
                            interval=assignment.departure_gate_occupancy.interval,
                            affected_flights=[assignment.flight_id],
                            explanation=f"Assigned departure Gate {gate_id} at {ap_code} is currently decommissioned or inactive.",
                        )
                    )

            # Check departure runway active status
            if assignment.departure_runway_occupancy:
                rw_id = assignment.departure_runway_occupancy.runway_id
                ap_code = assignment.departure_runway_occupancy.airport_code
                rw_obj = self.resource_service.get_runway(ap_code, rw_id)
                if rw_obj and not rw_obj.is_active:
                    c_id = self._generate_conflict_id(
                        ConflictType.RESOURCE_UNAVAILABLE,
                        f"{ap_code}-{rw_id}",
                        [assignment.flight_id],
                    )
                    conflicts.append(
                        OperationalConflict(
                            conflict_id=c_id,
                            type=ConflictType.RESOURCE_UNAVAILABLE,
                            severity=ConflictSeverity.CRITICAL,
                            airport_code=ap_code,
                            resource_type="RUNWAY",
                            resource_id=rw_id,
                            interval=assignment.departure_runway_occupancy.interval,
                            affected_flights=[assignment.flight_id],
                            explanation=f"Assigned departure Runway {rw_id} at {ap_code} is currently decommissioned or inactive.",
                        )
                    )

        return conflicts

    def detect_all_conflicts(
        self,
        assignments: List[FlightResourceAssignment],
    ) -> List[OperationalConflict]:
        """Execute full deterministic conflict detection across all resource dimensions."""
        all_conflicts: List[OperationalConflict] = []
        all_conflicts.extend(self.detect_runway_closure_conflicts(assignments))
        all_conflicts.extend(self.detect_runway_reservation_conflicts(assignments))
        all_conflicts.extend(self.detect_gate_occupancy_conflicts(assignments))
        all_conflicts.extend(self.detect_turnaround_conflicts(assignments))
        all_conflicts.extend(self.detect_resource_availability_conflicts(assignments))
        return all_conflicts

    def evaluate_active_conflicts(self) -> List[OperationalConflict]:
        """Build resource assignments from active flights and detect all operational conflicts."""
        from app.services.flight_service import flight_service
        flights, _ = flight_service.get_flights(limit=100)

        # Map flights for inbound turnaround linking (e.g. by aircraft tail number or explicit linkage)
        inbound_by_tail: Dict[str, Tuple[str, datetime]] = {}
        for f in flights:
            if f.tail_number and (f.actual_arrival or f.scheduled_arrival):
                arr_time = f.actual_arrival or f.scheduled_arrival
                inbound_by_tail[f.tail_number] = (f.flight_id, arr_time)

        assignments: List[FlightResourceAssignment] = []
        for f in flights:
            # Check for inbound link with earlier arrival
            inbound_id = None
            inbound_arr = None
            if f.tail_number in inbound_by_tail:
                cand_id, cand_arr = inbound_by_tail[f.tail_number]
                if cand_id != f.flight_id and cand_arr < f.scheduled_departure:
                    inbound_id = cand_id
                    inbound_arr = cand_arr

            try:
                assignment = self.resource_service.assign_flight_resources(
                    flight=f,
                    departure_gate=f.gate,
                    inbound_flight_id=inbound_id,
                    inbound_flight_arrival=inbound_arr,
                )
                assignments.append(assignment)
            except Exception as e:
                logger.debug("Skipping resource assignment for flight %s: %s", f.flight_id, e)

        return self.detect_all_conflicts(assignments)


# Global singleton instance
conflict_detection_service = ConflictDetectionService()
