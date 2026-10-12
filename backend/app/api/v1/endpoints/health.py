"""System health check endpoint."""
from fastapi import APIRouter
from app.core.config import settings
from app.services.flight_service import flight_service

router = APIRouter()


@router.get("/health", summary="System Health Status")
async def health_check():
    """Return operational health status."""
    _, total_flights = flight_service.get_flights(limit=1)
    return {
        "status": "healthy",
        "version": settings.VERSION,
        "database": "connected",
        "services": {
            "ingestion": "active",
            "flights_api": "active",
        },
        "stats": {
            "loaded_flights_count": total_flights,
        },
    }
