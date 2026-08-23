"""
Video Finding Defect Data Contract

Canonical schema for localized visual defect findings extracted from video frames.
Forms the training/evaluation dataset for fine-tuning computer vision and multimodal models.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class FindingSeverity(str, Enum):
    """Defect severity level."""
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class FindingStatus(str, Enum):
    """Human review validation status."""
    PENDING_REVIEW = "PENDING_REVIEW"
    CONFIRMED = "CONFIRMED"
    DISMISSED = "DISMISSED"


class VideoFindingEvent(BaseModel):
    """Canonical visual defect finding contract."""

    finding_id: int = Field(..., description="Unique finding identifier", ge=1)
    video_id: int = Field(..., description="Parent video inspection ID", ge=1)
    tenant_id: int = Field(..., description="Owning tenant identifier", ge=1)
    asset_id: int = Field(..., description="Target asset identifier", ge=1)
    ai_event_id: Optional[int] = Field(default=None, description="Linked AI review event ID", ge=1)

    defect_type: str = Field(..., description="Classification category (e.g. CRACK, CORROSION, SPALLING, LEAK)")
    confidence: float = Field(..., description="Detection confidence percentage (0-100)", ge=0.0, le=100.0)
    severity: FindingSeverity = Field(default=FindingSeverity.MEDIUM, description="Operational severity")
    
    frame_number: int = Field(..., description="Index of the sampled frame", ge=0)
    frame_timestamp: float = Field(..., description="Offset timestamp in video seconds", ge=0.0)
    frame_image_url: Optional[str] = Field(default=None, description="Persistent cropped/annotated thumbnail URL")
    
    bounding_box: Dict[str, Any] = Field(
        default_factory=dict,
        description="Bounding box coordinates {x, y, width, height}",
    )
    triage_notes: Optional[str] = Field(default=None, description="LLM-synthesized engineering rationale")
    status: FindingStatus = Field(default=FindingStatus.PENDING_REVIEW, description="Review lifecycle status")

    created_at: datetime = Field(..., description="Finding extraction timestamp (UTC)")
    updated_at: datetime = Field(..., description="Last modification timestamp (UTC)")

    model_config = {"from_attributes": True}
