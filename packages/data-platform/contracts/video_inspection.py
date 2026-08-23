"""
Video Inspection Data Contract

Canonical schema for video inspection runs flowing through the lakehouse.
Provides the foundational dataset for visual inspection lifecycle tracking and ML dataset construction.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class VideoSourceType(str, Enum):
    """Source type of the inspection footage."""
    UPLOAD = "UPLOAD"
    DRONE = "DRONE"
    PHONE_CAPTURE = "PHONE_CAPTURE"
    WALKTHROUGH = "WALKTHROUGH"
    FIXED_SCAN = "FIXED_SCAN"


class VideoAnalysisStatus(str, Enum):
    """Lifecycle status of video analysis."""
    PENDING = "PENDING"
    EXTRACTING = "EXTRACTING"
    ANALYZING = "ANALYZING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class VideoInspectionEvent(BaseModel):
    """Canonical video inspection event contract."""

    video_id: int = Field(..., description="Unique video inspection record identifier", ge=1)
    tenant_id: int = Field(..., description="Owning tenant identifier", ge=1)
    asset_id: int = Field(..., description="Target asset identifier", ge=1)
    inspection_id: Optional[int] = Field(default=None, description="Linked physical inspection record", ge=1)
    uploaded_by_id: int = Field(..., description="User who uploaded the footage", ge=1)
    
    file_name: str = Field(..., description="Original video filename", max_length=500)
    file_url: str = Field(..., description="Storage URL or relative path")
    storage_key: Optional[str] = Field(default=None, description="Storage adapter locator key", max_length=500)
    file_size_bytes: Optional[int] = Field(default=None, description="Video file size in bytes", ge=0)
    duration_seconds: Optional[float] = Field(default=None, description="Video duration in seconds", ge=0.0)
    
    source_type: VideoSourceType = Field(default=VideoSourceType.UPLOAD, description="Footage capture source")
    status: VideoAnalysisStatus = Field(default=VideoAnalysisStatus.PENDING, description="Pipeline processing status")
    
    frame_count: int = Field(default=0, description="Total keyframes sampled", ge=0)
    sampling_rate_fps: float = Field(default=1.0, description="Calculated sampling frequency in FPS", ge=0.0)
    target_frame_budget: int = Field(default=45, description="Allocated target frame budget", ge=1)
    
    summary: Optional[str] = Field(default=None, description="Synthesized executive inspection summary")
    raw_video_deleted: bool = Field(default=false, description="Whether raw video has been pruned by retention worker")
    raw_video_deleted_at: Optional[datetime] = Field(default=None, description="Timestamp of raw video purging")
    
    created_at: datetime = Field(..., description="Upload timestamp (UTC)")
    updated_at: datetime = Field(..., description="Last modification timestamp (UTC)")

    model_config = {"from_attributes": True}
