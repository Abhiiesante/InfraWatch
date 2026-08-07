"""
Inspection Event Data Contract

Canonical schema for inspection events flowing through the lakehouse.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class InspectionStatus(str, Enum):
    """Valid inspection statuses."""
    SCHEDULED = "SCHEDULED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    OVERDUE = "OVERDUE"


class InspectionSeverity(str, Enum):
    """Finding severity from an inspection."""
    NONE = "NONE"
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class InspectionEvent(BaseModel):
    """Canonical inspection event contract."""

    inspection_id: int = Field(..., description="Unique inspection identifier", ge=1)
    tenant_id: int = Field(..., description="Owning tenant", ge=1)
    asset_id: int = Field(..., description="Inspected asset", ge=1)
    inspector_id: int = Field(..., description="Inspector user ID", ge=1)
    scheduled_at: datetime = Field(..., description="Scheduled inspection date/time (UTC)")
    completed_at: Optional[datetime] = Field(default=None, description="Actual completion time (UTC)")
    status: InspectionStatus = Field(default=InspectionStatus.SCHEDULED, description="Inspection status")
    notes: Optional[str] = Field(default=None, description="Inspector notes")
    finding: Optional[str] = Field(default=None, description="Summary of findings")
    severity: InspectionSeverity = Field(default=InspectionSeverity.NONE, description="Finding severity")
    is_predictive: bool = Field(default=False, description="Whether triggered by predictive model")
    prediction_id: Optional[int] = Field(default=None, description="Linked prediction if predictive")
    created_at: datetime = Field(..., description="Record creation timestamp (UTC)")
    updated_at: Optional[datetime] = Field(default=None, description="Last update timestamp (UTC)")

    model_config = {"from_attributes": True}
