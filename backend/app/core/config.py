"""Application core configuration."""
import os
from pathlib import Path
from typing import List


class Settings:
    PROJECT_NAME: str = "SkyOps"
    API_V1_STR: str = "/api/v1"
    VERSION: str = "0.1.0"

    # CORS configuration
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    # Base directory of the backend
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent

    # Default flight dataset path
    DATA_PATH: Path = BASE_DIR / "data" / "synthetic_indigo_flights_demo.csv"


settings = Settings()
