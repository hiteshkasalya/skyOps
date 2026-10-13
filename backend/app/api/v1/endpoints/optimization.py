from fastapi import APIRouter, HTTPException, status
from app.schemas.optimization import GateOptimizationRequest, GateOptimizationResponse
from app.services.gate_solver import gate_solver

router = APIRouter(tags=["Optimization"])


@router.post(
    "/solve-gates",
    response_model=GateOptimizationResponse,
    status_code=status.HTTP_200_OK,
    summary="Solve Gate Assignment Problem (GAP) under operational disruption",
)
def solve_gates(request: GateOptimizationRequest):
    """Run Hungarian / Linear Sum Assignment constraint solver to optimize gate re-assignments."""
    return gate_solver.solve(request)


@router.get(
    "/gates/{airport_code}",
    response_model=GateOptimizationResponse,
    status_code=status.HTTP_200_OK,
    summary="Get optimized gate allocation for an airport hub",
)
def get_hub_gate_optimization(airport_code: str):
    """Solve and return optimal gate allocation for an airport hub."""
    req = GateOptimizationRequest(airport_code=airport_code.upper())
    return gate_solver.solve(req)
