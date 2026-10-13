"""Common schemas including standardized error response format."""
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from pydantic import BaseModel, Field


class ErrorResponse(BaseModel):
    """Standardized error response matching RFC 7807 SkyOps contract."""
    status_code: int = Field(..., description="HTTP status code")
    error: str = Field(..., description="Error category description")
    message: str = Field(..., description="Human-readable explanation of error")
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), description="Timestamp of error event")
    details: Optional[Dict[str, Any]] = Field(default=None, description="Structured error context details")
