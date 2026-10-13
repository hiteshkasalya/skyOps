"""Pydantic schemas for airport gate assignment constraint optimization (GAP)."""

from datetime import datetime
from typing import List, Optional, Dict
from pydantic import BaseModel, Field


class GateReassignment(BaseModel):
    """Recommended gate reassignment action produced by the constraint solver."""
    flight_id: str
    flight_number: str
    airline: str
    aircraft_type: str
    original_gate: Optional[str]
    recommended_gate: str
    terminal: str
    reason: str
    delay_mitigated_minutes: int
    walking_distance_meters: int
    jetbridge_compatible: bool = True


class SolverMetrics(BaseModel):
    """Operations Research solver performance & objective metrics."""
    solver_algorithm: str = "INTEGER_LINEAR_ASSIGNMENT"
    solver_status: str = "OPTIMAL"  # OPTIMAL, FEASIBLE, INFEASIBLE
    solve_duration_ms: float
    total_conflicts_resolved: int
    total_flights_evaluated: int
    objective_cost: float
    total_passenger_walking_reduction_meters: int


class GateOptimizationRequest(BaseModel):
    """Parameters to trigger constraint gate re-allocation."""
    airport_code: str = Field(default="DEL", min_length=3, max_length=3, description="Airport IATA code")
    time_window_start: Optional[datetime] = None
    time_window_end: Optional[datetime] = None
    prefer_jetbridge: bool = True
    weights: Optional[Dict[str, float]] = Field(
        default=None,
        description="Weights for walking distance, conflict avoidance, and gate changes"
    )


class GateOptimizationResponse(BaseModel):
    """Output of the OR gate assignment optimization."""
    airport_code: str
    optimized_at: datetime
    solver_status: str
    reassignments_count: int
    reassignments: List[GateReassignment]
    metrics: SolverMetrics
    dispatcher_summary: str
