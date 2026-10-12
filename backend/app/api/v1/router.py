"""Aggregated API v1 router."""
from fastapi import APIRouter
from app.api.v1.endpoints import flights, health

api_router = APIRouter()
api_router.include_router(health.router, tags=["Health"])
api_router.include_router(flights.router, prefix="/flights", tags=["Flights"])
