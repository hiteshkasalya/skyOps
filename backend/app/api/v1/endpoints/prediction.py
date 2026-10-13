from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, status
from app.schemas.prediction import DelayPredictionRequest, DelayPredictionResponse
from app.services.prediction_service import prediction_service
from app.services.flight_service import flight_service

router = APIRouter(tags=["ML Predictions"])


@router.post(
    "/delay",
    response_model=DelayPredictionResponse,
    status_code=status.HTTP_200_OK,
    summary="Predict flight delay probability, duration, and feature attribution",
)
def predict_flight_delay(request: DelayPredictionRequest):
    """Predict delay duration and risk probability with explainable AI (XAI) feature breakdown."""
    return prediction_service.predict_delay(request)


@router.get(
    "/flights/{flight_id}",
    response_model=DelayPredictionResponse,
    status_code=status.HTTP_200_OK,
    summary="Get ML delay prediction for an existing scheduled flight",
)
def get_flight_delay_prediction(flight_id: str):
    """Generate ML delay prediction for an active flight in the schedule."""
    flight = flight_service.get_flight(flight_id)
    if not flight:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Flight '{flight_id}' not found in operational schedule.",
        )

    # Derive weather condition based on current delay reason or nominal
    weather = "CLEAR"
    vis = 5000
    wind = 8
    congestion = "NORMAL"

    if flight.delay_reason == "WEATHER":
        weather = "FOG"
        vis = 350
    elif flight.delay_reason == "AIR_TRAFFIC_CONTROL":
        congestion = "HIGH"

    req = DelayPredictionRequest(
        flight_number=flight.flight_number,
        origin=flight.origin_airport,
        destination=flight.destination_airport,
        scheduled_departure=flight.scheduled_departure,
        aircraft_type=flight.aircraft_type,
        weather_condition=weather,
        visibility_meters=vis,
        wind_speed_knots=wind,
        congestion_level=congestion,
        upstream_delay_minutes=flight.delay_minutes or 0,
    )
    return prediction_service.predict_delay(req)
