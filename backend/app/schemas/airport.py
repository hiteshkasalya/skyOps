"""Airport domain schemas and resource collections."""
from typing import Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.resource import Gate, Runway, TurnaroundRequirement


class Airport(BaseModel):
    """Airport entity representation."""
    model_config = ConfigDict(from_attributes=True)

    airport_code: str = Field(..., min_length=3, max_length=3, description="3-letter IATA airport code")
    icao_code: str = Field(..., min_length=4, max_length=4, description="4-letter ICAO airport code")
    name: str = Field(..., description="Full airport name")
    city: str = Field(..., description="Airport metropolitan city")
    country: str = Field(default="India", description="Country")
    timezone: str = Field(default="Asia/Kolkata", description="IANA timezone name")
    terminals: List[str] = Field(default_factory=list, description="Active terminal codes (e.g. ['T1', 'T2', 'T3'])")
    runways: List[Runway] = Field(default_factory=list, description="Associated operational runways")
    gates: List[Gate] = Field(default_factory=list, description="Associated terminal gates")

    @field_validator("airport_code")
    @classmethod
    def normalize_iata(cls, v: str) -> str:
        return v.strip().upper()

    @field_validator("icao_code")
    @classmethod
    def normalize_icao(cls, v: str) -> str:
        return v.strip().upper()
