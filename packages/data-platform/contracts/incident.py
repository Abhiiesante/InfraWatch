"""
Incident Event Data Contract

Canonical schema for incident events flowing through the lakehouse.
The `source` field distinguishes human-reported incidents from AI-generated ones.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field


class IncidentSeverity(str, Enum):
    """Incident severity levels."""
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class IncidentStatus(str, Enum):
    """Incident lifecycle statuses."""
    OPEN = "OPEN"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"
    DISMISSED = "DISMISSED"


class IncidentSource(str, Enum):
    """How the incident was originated.

    Distinguishes human-reported incidents from those generated
    by sensors, ML models, computer vision, or LLM analysis.
    """
    MANUAL = "MANUAL"
    INSPECTION = "INSPECTION"
    SENSOR = "SENSOR"
    ML = "ML"
    VISION_AI = "VISION_AI"
    LLM_ASSISTED = "LLM_ASSISTED"


class IncidentEvent(BaseModel):
    """Canonical incident event contract.

    A prediction is evidence. An incident is a business decision.
    These concepts are kept separate throughout the platform.
    """

    incident_id: int = Field(..., description="Unique incident identifier", ge=1)
    tenant_id: int = Field(..., description="Owning tenant", ge=1)
    asset_id: Optional[int] = Field(default=None, description="Affected asset (if known)", ge=1)
    reporter_id: int = Field(..., description="User who reported/created", ge=1)
    title: str = Field(..., description="Incident title", min_length=1, max_length=255)
    description: Optional[str] = Field(default=None, description="Detailed description")
    source: IncidentSource = Field(
        default=IncidentSource.MANUAL,
        description="How the incident was originated",
    )
    incident_type: Optional[str] = Field(
        default=None,
        description="Type classification (e.g., 'FIRE', 'INTRUSION', 'EQUIPMENT_FAILURE')",
        max_length=100,
    )
    severity: IncidentSeverity = Field(default=IncidentSeverity.MEDIUM, description="Severity level")
    status: IncidentStatus = Field(default=IncidentStatus.OPEN, description="Lifecycle status")
    confidence: Optional[float] = Field(
        default=None,
        description="AI confidence score (0.0-1.0) if source is ML/AI",
        ge=0.0,
        le=1.0,
    )
    category: Optional[str] = Field(default=None, description="Incident category", max_length=255)

    # AI triage fields
    ai_suggested_severity: Optional[str] = Field(default=None, max_length=50)
    ai_suggested_category: Optional[str] = Field(default=None, max_length=255)
    ai_confidence: Optional[float] = Field(default=None, ge=0.0, le=100.0)
    ai_triaged_at: Optional[datetime] = Field(default=None)

    created_at: datetime = Field(..., description="Incident creation timestamp (UTC)")
    resolved_at: Optional[datetime] = Field(default=None, description="Resolution timestamp (UTC)")
    updated_at: Optional[datetime] = Field(default=None, description="Last update timestamp (UTC)")

    model_config = {"from_attributes": True}
