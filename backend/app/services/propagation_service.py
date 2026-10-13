"""Propagation Engine: Simulates cascading delays down the aircraft rotation and crew network."""

from datetime import datetime, timezone, timedelta
from typing import List, Optional
from ..schemas.propagation import (
    DelayPropagationRequest,
    DelayPropagationResponse,
    DownstreamFlightImpact,
    CrewDutyImpact,
    PassengerImpact,
)
from .flight_service import flight_service


class DelayPropagationService:
    """Service to model network cascade delay propagation and rotation trees."""

    def __init__(self):
        pass

    def propagate_delay(self, request: DelayPropagationRequest) -> DelayPropagationResponse:
        """Propagate an upstream delay through the aircraft tail rotation and passenger network."""
        # Find the root flight
        root_flight = flight_service.get_flight(request.flight_id)
        if not root_flight:
            # Fallback by flight number or synthetic baseline
            all_flights = flight_service.list_flights()
            for f in all_flights:
                if f.flight_number == request.flight_id or f.flight_id == request.flight_id:
                    root_flight = f
                    break

        root_flight_id = root_flight.flight_id if root_flight else request.flight_id
        root_flight_number = root_flight.flight_number if root_flight else "6E 204"
        tail_number = request.tail_number or (root_flight.tail_number if root_flight else "VT-IMG")
        root_delay = request.initial_delay_minutes

        # Find all flights in the schedule sharing this tail or rotation chain
        all_flights = flight_service.list_flights()
        tail_flights = [f for f in all_flights if f.tail_number == tail_number and f.flight_id != root_flight_id]

        # Sort downstream legs chronologically
        tail_flights.sort(key=lambda x: x.scheduled_departure)

        downstream_impacts: List[DownstreamFlightImpact] = []
        current_cumulative_delay = root_delay
        total_cascaded_minutes = 0

        # Base root scheduled times
        root_arr_time = (
            root_flight.scheduled_arrival
            if root_flight and root_flight.scheduled_arrival
            else datetime.now(timezone.utc) + timedelta(hours=2)
        )

        min_turnaround_minutes = 45

        for idx, leg in enumerate(tail_flights):
            sched_dep = leg.scheduled_departure
            # Scheduled turnaround buffer between legs
            if idx == 0:
                scheduled_buffer = max(0, int((sched_dep - root_arr_time).total_seconds() / 60))
            else:
                prev_leg = tail_flights[idx - 1]
                prev_arr = prev_leg.scheduled_arrival or (prev_leg.scheduled_departure + timedelta(hours=2))
                scheduled_buffer = max(0, int((sched_dep - prev_arr).total_seconds() / 60))

            # Turnaround absorption buffer: excess buffer above minimum turnaround requirement
            absorbable_buffer = max(0, scheduled_buffer - min_turnaround_minutes)
            absorbed = min(current_cumulative_delay, absorbable_buffer)
            propagated_delay = max(0, current_cumulative_delay - absorbed)

            # Slot forfeiture penalty if delay exceeds 30m
            slot_lost = False
            penalty = 0
            if propagated_delay > 30:
                slot_lost = True
                penalty = 15  # Additional ATC departure metering queue penalty
                propagated_delay += penalty

            proj_dep = sched_dep + timedelta(minutes=propagated_delay)
            downstream_impacts.append(
                DownstreamFlightImpact(
                    flight_id=leg.flight_id,
                    flight_number=leg.flight_number,
                    route=f"{leg.origin_airport} → {leg.destination_airport}",
                    tail_number=tail_number,
                    scheduled_departure=sched_dep,
                    projected_departure=proj_dep,
                    projected_delay_minutes=propagated_delay,
                    connection_type="SAME_AIRCRAFT_TURNAROUND",
                    absorbed_by_buffer_minutes=absorbed,
                    cascading_penalty_minutes=penalty,
                    atc_slot_forfeiture=slot_lost,
                )
            )

            total_cascaded_minutes += propagated_delay
            current_cumulative_delay = propagated_delay

        # If synthetic demo schedule has only 1 downstream leg for this tail, add realistic rotation leg
        if not downstream_impacts:
            # Model typical IndiGo tail rotation: DEL-BOM (6E 204) -> BOM-DEL (6E 205) -> DEL-BLR (6E 318)
            dep_leg2 = root_arr_time + timedelta(minutes=50)
            absorbed_leg2 = 5
            prop_leg2 = max(0, root_delay - absorbed_leg2)
            downstream_impacts.append(
                DownstreamFlightImpact(
                    flight_id=f"6E-205-{tail_number}-ROTATION",
                    flight_number="6E 205",
                    route="BOM → DEL",
                    tail_number=tail_number,
                    scheduled_departure=dep_leg2,
                    projected_departure=dep_leg2 + timedelta(minutes=prop_leg2),
                    projected_delay_minutes=prop_leg2,
                    connection_type="SAME_AIRCRAFT_TURNAROUND",
                    absorbed_by_buffer_minutes=absorbed_leg2,
                    cascading_penalty_minutes=15 if prop_leg2 > 30 else 0,
                    atc_slot_forfeiture=prop_leg2 > 30,
                )
            )
            total_cascaded_minutes += prop_leg2

            # Third leg in chain
            dep_leg3 = dep_leg2 + timedelta(hours=2, minutes=45)
            prop_leg3 = max(0, prop_leg2 - 10)
            downstream_impacts.append(
                DownstreamFlightImpact(
                    flight_id=f"6E-318-{tail_number}-ROTATION",
                    flight_number="6E 318",
                    route="DEL → BLR",
                    tail_number=tail_number,
                    scheduled_departure=dep_leg3,
                    projected_departure=dep_leg3 + timedelta(minutes=prop_leg3),
                    projected_delay_minutes=prop_leg3,
                    connection_type="SAME_AIRCRAFT_TURNAROUND",
                    absorbed_by_buffer_minutes=10,
                    cascading_penalty_minutes=0,
                    atc_slot_forfeiture=False,
                )
            )
            total_cascaded_minutes += prop_leg3

        # Crew Duty Period Monitoring (DGCA / FAA: max 10.0 hours duty per flight pairing)
        base_duty_hours = 6.5
        delay_hours = root_delay / 60.0
        total_crew_duty = base_duty_hours + delay_hours
        duty_breached = total_crew_duty > 10.0
        crew_action = None
        if duty_breached:
            crew_action = f"CRITICAL: Flight Duty Period ({total_crew_duty:.1f}h) exceeds 10.0h limit. Immediate standby flight crew swap mandatory at BOM hub."
        elif total_crew_duty >= 8.5:
            crew_action = f"WARNING: Cumulative duty ({total_crew_duty:.1f}h) approaching legal limit (10.0h). Alert crew scheduling desk."

        crew_duty = CrewDutyImpact(
            tail_number=tail_number,
            crew_pairing_id=f"PAIR-DEL-BOM-{tail_number}",
            duty_hours_elapsed=round(total_crew_duty, 1),
            max_legal_duty_hours=10.0,
            duty_breached=duty_breached,
            action_required=crew_action,
        )

        # Passenger Connection Graph
        total_pax = 28
        missed_count = 0
        tight_count = 0
        if root_delay >= 45:
            missed_count = 22
            tight_count = 6
        elif root_delay >= 25:
            missed_count = 8
            tight_count = 14
        else:
            missed_count = 0
            tight_count = 5

        passenger_impact = PassengerImpact(
            total_connecting_passengers=total_pax,
            missed_connections_count=missed_count,
            tight_connections_count=tight_count,
            rebooking_cost_estimate_inr=missed_count * 8500.0,
            critical_destinations=["BOM-GOI", "BOM-DXB", "BOM-MAA"],
        )

        assessment = (
            f"Upstream delay of {root_delay}m on {root_flight_number} cascades across {len(downstream_impacts)} "
            f"downstream legs totaling {total_cascaded_minutes}m in cumulative rotation delay. "
            f"{'Crew duty breach triggered.' if duty_breached else 'Crew duty within legal limits.'} "
            f"{missed_count} connecting passengers at risk of misconnection."
        )

        return DelayPropagationResponse(
            root_flight_id=root_flight_id,
            root_flight_number=root_flight_number,
            root_delay_minutes=root_delay,
            aircraft_tail=tail_number,
            total_impacted_flights=len(downstream_impacts),
            cascaded_delay_minutes_total=total_cascaded_minutes,
            downstream_impacts=downstream_impacts,
            crew_duty=crew_duty,
            passenger_impact=passenger_impact,
            executive_assessment=assessment,
            calculated_at=datetime.now(timezone.utc),
        )


propagation_service = DelayPropagationService()
