"""Aggregated API v1 router."""
from fastapi import APIRouter
from app.api.v1.endpoints import airports, conflicts, diagnosis, flights, health, simulation

api_router = APIRouter()
api_router.include_router(health.router, tags=["Health"])
api_router.include_router(airports.router, prefix="/airports", tags=["Airports"])
api_router.include_router(diagnosis.router, prefix="/flights", tags=["Diagnosis & Recovery"])
api_router.include_router(flights.router, prefix="/flights", tags=["Flights"])
api_router.include_router(conflicts.router, prefix="/conflicts", tags=["Conflicts"])
api_router.include_router(conflicts.router, prefix="/schedules/conflicts", tags=["Conflicts"])
api_router.include_router(simulation.router, prefix="/simulation", tags=["Simulation"])
api_router.include_router(simulation.router, prefix="/simulations", tags=["Simulation"])
