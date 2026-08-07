"""
Image/Frame Metadata Data Contract

Canonical schema for camera frame metadata.
IMPORTANT: Do NOT store large image binaries in Delta tables.
Store object-storage URIs (S3/ADLS/Volumes) and metadata only.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID, uuid4

from pydantic import BaseModel, Field, field_validator


class FrameProcessingStatus(str, Enum):
    """Frame processing lifecycle."""
    CAPTURED = "CAPTURED"
    QUEUED = "QUEUED"
    PROCESSING = "PROCESSING"
    PROCESSED = "PROCESSED"
    FAILED = "FAILED"
    SKIPPED = "SKIPPED"


class ImageFrameMetadata(BaseModel):
    """Canonical image/frame metadata contract.

    Each record is a reference to a captured frame stored in object storage.
    The actual image binary lives at `storage_uri`, not in the Delta table.
    """

    frame_id: UUID = Field(default_factory=uuid4, description="Globally unique frame identifier")
    tenant_id: int = Field(..., description="Owning tenant", ge=1)
    camera_id: int = Field(..., description="Source camera", ge=1)
    asset_id: int = Field(..., description="Associated asset", ge=1)
    capture_timestamp: datetime = Field(..., description="When the frame was captured (UTC)")
    storage_uri: str = Field(
        ...,
        description="Object storage URI (s3://, abfss://, /Volumes/...)",
        min_length=1,
        max_length=2000,
    )
    checksum: Optional[str] = Field(
        default=None,
        description="SHA-256 checksum of the image file",
        max_length=64,
    )
    width: Optional[int] = Field(default=None, description="Image width in pixels", ge=1)
    height: Optional[int] = Field(default=None, description="Image height in pixels", ge=1)
    file_size_bytes: Optional[int] = Field(default=None, description="File size in bytes", ge=0)
    format: Optional[str] = Field(
        default=None,
        description="Image format (JPEG, PNG, etc.)",
        max_length=20,
    )
    processing_status: FrameProcessingStatus = Field(
        default=FrameProcessingStatus.CAPTURED,
        description="Current processing status",
    )
    ingestion_timestamp: datetime = Field(
        default_factory=datetime.utcnow,
        description="When the metadata was ingested (UTC)",
    )

    @field_validator("storage_uri")
    @classmethod
    def validate_storage_uri(cls, v: str) -> str:
        """Ensure storage_uri looks like a valid object storage path."""
        valid_prefixes = ("s3://", "abfss://", "gs://", "/Volumes/", "/dbfs/", "file://", "https://")
        if not any(v.startswith(p) for p in valid_prefixes):
            raise ValueError(
                f"storage_uri must start with one of {valid_prefixes}, got: {v[:50]}"
            )
        return v

    model_config = {"from_attributes": True}
