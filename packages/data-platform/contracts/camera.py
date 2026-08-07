"""
Camera Metadata Data Contract

Canonical schema for camera records flowing through the lakehouse.
IMPORTANT: Never expose actual RTSP credentials in analytical tables.
The stream_url_reference is a redacted/hashed reference, NOT the raw URL.
"""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field


class CameraStatus(str, Enum):
    """Valid camera statuses."""
    ONLINE = "ONLINE"
    OFFLINE = "OFFLINE"
    MAINTENANCE = "MAINTENANCE"
    ERROR = "ERROR"


class CameraType(str, Enum):
    """Common camera types in infrastructure monitoring."""
    PTZ = "PTZ"
    FIXED = "FIXED"
    DOME = "DOME"
    THERMAL = "THERMAL"
    MULTISENSOR = "MULTISENSOR"
    OTHER = "OTHER"


class CameraLocation(BaseModel):
    """Camera installation location."""
    latitude: Optional[Decimal] = Field(default=None, ge=-90, le=90)
    longitude: Optional[Decimal] = Field(default=None, ge=-180, le=180)
    elevation_m: Optional[float] = Field(default=None, description="Height above ground in meters")
    mounting: Optional[str] = Field(default=None, description="Mounting type (pole, wall, tower)")


class CameraOrientation(BaseModel):
    """Camera orientation/field of view."""
    pan_degrees: Optional[float] = Field(default=None, ge=0, le=360)
    tilt_degrees: Optional[float] = Field(default=None, ge=-90, le=90)
    fov_horizontal: Optional[float] = Field(default=None, ge=0, le=360)


class CameraMetadata(BaseModel):
    """Canonical camera metadata contract.

    SECURITY NOTE: stream_url_reference must NOT contain the actual
    RTSP URL, username, or password. Use a hashed reference or
    internal identifier that maps to credentials stored in a secure vault.
    """

    camera_id: int = Field(..., description="Unique camera identifier", ge=1)
    tenant_id: int = Field(..., description="Owning tenant", ge=1)
    asset_id: int = Field(..., description="Parent asset", ge=1)
    name: str = Field(..., description="Camera name", min_length=1, max_length=255)
    camera_type: str = Field(..., description="Camera type classification", max_length=100)
    stream_url_reference: Optional[str] = Field(
        default=None,
        description="Redacted stream URL reference (NOT the raw RTSP URL with credentials)",
        max_length=500,
    )
    status: CameraStatus = Field(default=CameraStatus.OFFLINE, description="Current status")
    location: Optional[CameraLocation] = Field(default=None, description="Installation location")
    orientation: Optional[CameraOrientation] = Field(default=None, description="Camera orientation")
    installation_date: Optional[date] = Field(default=None, description="Installation date")
    config: Optional[dict[str, Any]] = Field(default=None, description="Extensible config")
    created_at: datetime = Field(..., description="Record creation timestamp (UTC)")
    updated_at: datetime = Field(..., description="Last update timestamp (UTC)")

    model_config = {"from_attributes": True}
