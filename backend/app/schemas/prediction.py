"""Pydantic schemas for ML flight delay prediction and feature attribution (XAI)."""

from datetime import datetime
from typing import List, Optional, Dict
from pydantic import BaseModel, Field


class FeatureAttribution(BaseModel):
    """Explainable AI (SHAP-style) attribution of each risk factor towards delay."""
    feature_name: str
    feature_category: str  # METAR_WEATHER, CONGESTION, SCHEDULE_BUFFER, ROUTE_CORRIDOR
    value: str
    contribution_minutes: float
    percentage_weight: float
    description: str


class ConfidenceInterval(BaseModel):
    """Statistical bounds for predicted delay duration (95% credible interval)."""
    p10_optimistic_minutes: int
    p50_expected_minutes: int
    p90_conservative_minutes: int


class DelayPredictionRequest(BaseModel):
    """Inputs to predict flight delay probability and duration."""
    flight_number: str
    origin: str = Field(..., min_length=3, max_length=3)
    destination: str = Field(..., min_length=3, max_length=3)
    scheduled_departure: datetime
    aircraft_type: str = Field(default="A321neo")
    weather_condition: Optional[str] = Field(default="CLEAR", description="CLEAR, FOG, THUNDERSTORM, MONSOON_RAIN, CROSSWIND")
    visibility_meters: Optional[int] = Field(default=5000, ge=50, le=15000)
    wind_speed_knots: Optional[int] = Field(default=8, ge=0, le=75)
    congestion_level: Optional[str] = Field(default="NORMAL", description="LOW, NORMAL, HIGH, CRITICAL")
    upstream_delay_minutes: Optional[int] = Field(default=0, ge=0)


class DelayPredictionResponse(BaseModel):
    """Machine learning inference output with risk scoring and explainability."""
    flight_number: str
    origin: str
    destination: str
    predicted_at: datetime
    delay_probability: float = Field(..., ge=0.0, le=1.0, description="Probability (0.0 to 1.0) of delay > 15 mins")
    risk_level: str = Field(..., description="LOW, MODERATE, ELEVATED, CRITICAL")
    predicted_delay_minutes: int
    confidence_interval: ConfidenceInterval
    top_feature_attributions: List[FeatureAttribution]
    ml_model_metadata: Dict[str, str] = Field(
        default_factory=lambda: {
            "model_type": "GradientBoostedEnsemble + HeuristicCalibrator",
            "version": "v1.4-operational",
            "trained_dataset": "IndiGo Metar & ADS-B Rotation Benchmark",
        }
    )
    operational_recommendation: str
