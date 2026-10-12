"""Runway closure disruption simulation and tactical recovery engine."""
import copy
import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Set, Tuple

from app.schemas.conflict import ConflictType, OperationalConflict
from app.schemas.resource import FlightResourceAssignment, Runway, RunwayOccupancy, TimeWindow
from app.schemas.simulation import (
    AffectedFlightImpact,
    BaselineMetrics,
    DisruptionSimulationRequest,
    DisruptionSimulationResponse,
    PostDisruptionMetrics,
    RecoveryMetrics,
    RecoveryProposal,
)
from app.services.conflict_detector import ConflictDetectionService
from app.services.flight_service import FlightService, flight_service
from app.services.resource_service import ResourceService, resource_service

logger = logging.getLogger(__name__)


class SimulationService:
    """Simulates airport disruption events and computes transparent rule-based recovery proposals.
    
    Guarantees:
    - Never mutates the live flight schedule or live airport resource state.
    - Transparent rule-based re-sequencing heuristics without opaque assumptions.
    - Labels algorithmic limitations explicitly (non-optimal, CP/MIP solver planned for Phase 3).
    """

    def __init__(
        self,
        flight_svc: Optional[FlightService] = None,
        res_svc: Optional[ResourceService] = None,
    ):
        self.flight_service = flight_svc or flight_service
        self.resource_service = res_svc or resource_service

    def resolve_airport_and_runway(
        self,
        airport_code: Optional[str],
        runway_identifier: str,
    ) -> Tuple[str, Runway]:
        """Validate or infer airport code and verify target runway existence."""
        clean_rw = runway_identifier.strip()

        if airport_code:
            clean_ap = airport_code.strip().upper()
            ap = self.resource_service.get_airport(clean_ap)
            if not ap:
                raise ValueError(f"Airport '{clean_ap}' is not registered in resource topology.")
            rw = self.resource_service.get_runway(clean_ap, clean_rw)
            if not rw:
                raise ValueError(f"Runway '{clean_rw}' not found at airport '{clean_ap}'.")
            return clean_ap, rw

        # Infer airport from runway identifier
        matching_airports: List[Tuple[str, Runway]] = []
        for ap_code in self.resource_service.airports.keys():
            rw = self.resource_service.get_runway(ap_code, clean_rw)
            if rw:
                matching_airports.append((ap_code, rw))

        if not matching_airports:
            raise ValueError(
                f"Runway '{clean_rw}' was not found at any registered airport in topology."
            )
        if len(matching_airports) > 1:
            matching_codes = [m[0] for m in matching_airports]
            raise ValueError(
                f"Runway '{clean_rw}' exists at multiple airports ({', '.join(matching_codes)}). "
                f"Please specify 'airport_code' explicitly."
            )

        return matching_airports[0]

    def run_runway_closure_simulation(
        self,
        request: DisruptionSimulationRequest,
    ) -> DisruptionSimulationResponse:
        """Execute end-to-end runway closure simulation on an isolated state copy."""
        # 1. Validate disruption parameters & resolve airport/runway
        airport_code, _ = self.resolve_airport_and_runway(
            airport_code=request.airport_code,
            runway_identifier=request.runway_identifier,
        )

        closure_window = TimeWindow(
            start_time=request.closure_start,
            end_time=request.closure_end,
        )

        # 2. Create isolated simulation copies (live state remains untouched)
        sim_res_service = ResourceService.__new__(ResourceService)
        sim_res_service.data_path = self.resource_service.data_path
        sim_res_service.airports = copy.deepcopy(self.resource_service.airports)
        sim_res_service.turnaround_rules = copy.deepcopy(self.resource_service.turnaround_rules)

        sim_flights = copy.deepcopy(self.flight_service._flights)

        # 3. Compute baseline metrics (before closure)
        detector = ConflictDetectionService(res_service=sim_res_service)
        assignments_map: Dict[str, FlightResourceAssignment] = {}
        for f in sim_flights:
            try:
                assignment = sim_res_service.assign_flight_resources(
                    flight=f,
                    departure_gate=f.gate,
                )
                assignments_map[f.flight_id] = assignment
            except Exception as exc:
                logger.debug("Skipping assignment for flight %s: %s", f.flight_id, exc)

        baseline_assignments = list(assignments_map.values())
        baseline_conflicts = detector.detect_all_conflicts(baseline_assignments)
        baseline_total_delay = sum(getattr(f, "delay_minutes", 0) for f in sim_flights)

        # 4. Apply runway closure window to the simulation copy
        sim_res_service.add_runway_closure(
            airport_code=airport_code,
            runway_id=request.runway_identifier,
            start_time=request.closure_start,
            end_time=request.closure_end,
            reason=request.reason or "RUNWAY_MAINTENANCE_CLOSURE",
        )

        # 5. Detect disrupted conflicts with closure active
        disrupted_conflicts = detector.detect_all_conflicts(baseline_assignments)

        # 6. Identify flights directly affected by the closure
        affected_flights_map: Dict[str, Tuple[str, datetime]] = {}  # flight_id -> (movement_type, time)

        for assignment in baseline_assignments:
            # Check departure runway
            dep_rw = assignment.departure_runway_occupancy
            if (
                dep_rw
                and dep_rw.airport_code == airport_code
                and dep_rw.runway_id == request.runway_identifier
                and dep_rw.interval.overlaps(closure_window)
            ):
                affected_flights_map[assignment.flight_id] = ("DEPARTURE", dep_rw.interval.start_time + timedelta(minutes=2))

            # Check arrival runway
            arr_rw = assignment.arrival_runway_occupancy
            if (
                arr_rw
                and arr_rw.airport_code == airport_code
                and arr_rw.runway_id == request.runway_identifier
                and arr_rw.interval.overlaps(closure_window)
            ):
                affected_flights_map[assignment.flight_id] = ("ARRIVAL", arr_rw.interval.start_time + timedelta(minutes=2))

        # Filter by affected_flight_ids if specified
        if request.affected_flight_ids is not None:
            allowed_ids = set(request.affected_flight_ids)
            affected_flights_map = {
                fid: val for fid, val in affected_flights_map.items() if fid in allowed_ids
            }

        # 7. Generate rule-based recovery proposals
        candidate_runways = [
            rw for rw in sim_res_service.get_runways(airport_code)
            if rw.runway_id != request.runway_identifier and rw.is_active
        ]

        # Track occupancies across candidate runways to prevent double-booking
        active_occupancies: Dict[str, List[TimeWindow]] = {
            rw.runway_id: [] for rw in candidate_runways
        }
        for asgn in baseline_assignments:
            if asgn.flight_id in affected_flights_map:
                continue  # Will be re-sequenced
            if asgn.departure_runway_occupancy and asgn.departure_runway_occupancy.airport_code == airport_code:
                rw_id = asgn.departure_runway_occupancy.runway_id
                if rw_id in active_occupancies:
                    active_occupancies[rw_id].append(asgn.departure_runway_occupancy.interval)
            if asgn.arrival_runway_occupancy and asgn.arrival_runway_occupancy.airport_code == airport_code:
                rw_id = asgn.arrival_runway_occupancy.runway_id
                if rw_id in active_occupancies:
                    active_occupancies[rw_id].append(asgn.arrival_runway_occupancy.interval)

        recovery_proposals: List[RecoveryProposal] = []
        affected_impact_list: List[AffectedFlightImpact] = []
        all_feasible = True

        for idx, (flight_id, (mvt_type, orig_time)) in enumerate(sorted(affected_flights_map.items())):
            asgn = assignments_map[flight_id]

            if not candidate_runways:
                # Infeasible: No alternate runway available at airport
                all_feasible = False
                action = "DIVERT_REQUIRED" if mvt_type == "ARRIVAL" else "GROUND_DELAY"
                action_type = "FLIGHT_DIVERSION" if mvt_type == "ARRIVAL" else "GROUND_HOLD"
                affected_impact_list.append(
                    AffectedFlightImpact(
                        flight_id=flight_id,
                        flight_number=asgn.flight_number,
                        movement_type=mvt_type,
                        original_runway=request.runway_identifier,
                        proposed_runway=None,
                        scheduled_time=orig_time,
                        action_required=action,
                        projected_delay_minutes=120,
                    )
                )
                recovery_proposals.append(
                    RecoveryProposal(
                        proposal_id=f"prop-{idx + 1}",
                        flight_id=flight_id,
                        action_type=action_type,
                        title=f"{'Divert' if mvt_type == 'ARRIVAL' else 'Ground Hold'} {asgn.flight_number}",
                        description=(
                            f"No alternate operational runway available at {airport_code}. "
                            f"{'Flight diversion required to nearest alternate hub.' if mvt_type == 'ARRIVAL' else 'Origin ground stop required until runway reopens.'}"
                        ),
                        original_runway=request.runway_identifier,
                        proposed_runway=None,
                        original_time=orig_time,
                        proposed_time=orig_time + timedelta(minutes=120),
                        delay_added_minutes=120,
                        delay_mitigated_minutes=0,
                    )
                )
                continue

            # Search earliest feasible slot across candidate runways
            feasible_slot: Optional[Tuple[str, int, TimeWindow]] = None
            for slot_delay in range(0, 125, 5):  # 0 to 120 minutes in 5-min increments
                cand_time = orig_time + timedelta(minutes=slot_delay)
                cand_interval = TimeWindow(
                    start_time=cand_time - timedelta(minutes=2),
                    end_time=cand_time + timedelta(minutes=1),
                )

                for cand_rw in candidate_runways:
                    # Check runway closure windows
                    if cand_rw.has_closure_conflict(cand_interval):
                        continue
                    # Check separation overlap with other movements on candidate runway
                    overlap = False
                    for occ in active_occupancies[cand_rw.runway_id]:
                        if occ.overlaps(cand_interval):
                            overlap = True
                            break
                    if not overlap:
                        feasible_slot = (cand_rw.runway_id, slot_delay, cand_interval)
                        break

                if feasible_slot:
                    break

            if feasible_slot:
                alt_rw_id, delay_mins, new_interval = feasible_slot
                active_occupancies[alt_rw_id].append(new_interval)

                # Apply re-assignment in simulation copy
                if mvt_type == "DEPARTURE":
                    asgn.departure_runway_occupancy.runway_id = alt_rw_id
                    asgn.departure_runway_occupancy.interval = new_interval
                else:
                    asgn.arrival_runway_occupancy.runway_id = alt_rw_id
                    asgn.arrival_runway_occupancy.interval = new_interval

                action_req = "REROUTE_RUNWAY" if delay_mins == 0 else "REROUTE_AND_DELAY"
                affected_impact_list.append(
                    AffectedFlightImpact(
                        flight_id=flight_id,
                        flight_number=asgn.flight_number,
                        movement_type=mvt_type,
                        original_runway=request.runway_identifier,
                        proposed_runway=alt_rw_id,
                        scheduled_time=orig_time,
                        action_required=action_req,
                        projected_delay_minutes=delay_mins,
                    )
                )
                recovery_proposals.append(
                    RecoveryProposal(
                        proposal_id=f"prop-{idx + 1}",
                        flight_id=flight_id,
                        action_type="RUNWAY_REALLOCATION",
                        title=f"Reassign {mvt_type.capitalize()} to Runway {alt_rw_id}",
                        description=(
                            f"Re-sequence flight {asgn.flight_number} from closed Runway "
                            f"{request.runway_identifier} to alternate Runway {alt_rw_id} "
                            f"with {delay_mins}m slot adjustment."
                        ),
                        original_runway=request.runway_identifier,
                        proposed_runway=alt_rw_id,
                        original_time=orig_time,
                        proposed_time=orig_time + timedelta(minutes=delay_mins),
                        delay_added_minutes=delay_mins,
                        delay_mitigated_minutes=max(0, 45 - delay_mins),
                    )
                )
            else:
                # Infeasible for this flight within 120-minute threshold
                all_feasible = False
                action = "DIVERT_REQUIRED" if mvt_type == "ARRIVAL" else "GROUND_DELAY"
                action_type = "FLIGHT_DIVERSION" if mvt_type == "ARRIVAL" else "GROUND_HOLD"
                affected_impact_list.append(
                    AffectedFlightImpact(
                        flight_id=flight_id,
                        flight_number=asgn.flight_number,
                        movement_type=mvt_type,
                        original_runway=request.runway_identifier,
                        proposed_runway=None,
                        scheduled_time=orig_time,
                        action_required=action,
                        projected_delay_minutes=120,
                    )
                )
                recovery_proposals.append(
                    RecoveryProposal(
                        proposal_id=f"prop-{idx + 1}",
                        flight_id=flight_id,
                        action_type=action_type,
                        title=f"Hold/Divert {asgn.flight_number}",
                        description=(
                            f"Alternate runways reached capacity within maximum delay window. "
                            f"{'Diversion recommended.' if mvt_type == 'ARRIVAL' else 'Ground cancellation recommended.'}"
                        ),
                        original_runway=request.runway_identifier,
                        proposed_runway=None,
                        original_time=orig_time,
                        proposed_time=orig_time + timedelta(minutes=120),
                        delay_added_minutes=120,
                        delay_mitigated_minutes=0,
                    )
                )

        # 8. Re-evaluate conflicts after applying tactical recovery proposals
        recovered_assignments = list(assignments_map.values())
        recovered_conflicts = detector.detect_all_conflicts(recovered_assignments)

        # Check if any runway closure conflicts persist within the simulated closure window
        remaining_closure_conflicts = [
            c for c in recovered_conflicts
            if c.type == ConflictType.RUNWAY_CLOSURE_CONFLICT
            and c.resource_id == request.runway_identifier
            and c.interval is not None
            and c.interval.overlaps(closure_window)
        ]
        if remaining_closure_conflicts or not all_feasible:
            is_feasible = False
        else:
            is_feasible = True

        # 9. Calculate metrics and deltas
        resolved_count = max(0, len(disrupted_conflicts) - len(recovered_conflicts))
        net_delay_added = sum(p.delay_added_minutes for p in recovery_proposals)
        projected_disrupted_delay = baseline_total_delay + (len(affected_impact_list) * 45)

        timestamp_str = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
        sim_id = f"sim-{airport_code.lower()}-{request.runway_identifier.replace('/', '')}-{timestamp_str}"

        return DisruptionSimulationResponse(
            simulation_id=sim_id,
            airport_code=airport_code,
            runway_identifier=request.runway_identifier,
            closure_window=closure_window,
            reason=request.reason or "RUNWAY_MAINTENANCE_CLOSURE",
            is_feasible=is_feasible,
            recovery_strategy="RULE_BASED_HEURISTIC",
            baseline_metrics=BaselineMetrics(
                total_flights=len(sim_flights),
                conflicts_count=len(baseline_conflicts),
                total_delay_minutes=baseline_total_delay,
            ),
            post_disruption_metrics=PostDisruptionMetrics(
                impacted_flights_count=len(affected_impact_list),
                conflicts_count=len(disrupted_conflicts),
                total_projected_delay_minutes=projected_disrupted_delay,
            ),
            recovery_metrics=RecoveryMetrics(
                resolved_conflicts_count=resolved_count,
                remaining_conflicts_count=len(recovered_conflicts),
                net_delay_added_minutes=net_delay_added,
            ),
            affected_flights=affected_impact_list,
            recovery_proposals=recovery_proposals,
            remaining_conflicts=recovered_conflicts,
            limitations_notice=(
                "Deterministic rule-based heuristic recovery proposal. "
                "Does not guarantee mathematical optimality. "
                "Constraint programming (OR-Tools) solver integration planned for Phase 3."
            ),
        )


# Global singleton instance
simulation_service = SimulationService()
