"""
Asset Metadata Data Contract

Canonical schema for infrastructure asset records flowing through the lakehouse.
Maps to PostgreSQL `assets` table but is independent of Prisma ORM types.
"""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field, field_validator


class AssetStatus(str, Enum):
    """Valid asset statuses."""
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    MAINTENANCE = "MAINTENANCE"
    DECOMMISSIONED = "DECOMMISSIONED"
    DELETED = "DELETED"


class AssetMetadata(BaseModel):
    """Canonical asset metadata contract.

    Every asset record flowing from PostgreSQL into the lakehouse
    must conform to this schema.
    """

    asset_id: int = Field(..., description="Unique asset identifier", ge=1)
    tenant_id: int = Field(..., description="Owning organization/tenant", ge=1)
    asset_type: str = Field(..., description="Asset type name (e.g., 'Communication Tower')", min_length=1, max_length=255)
    name: str = Field(..., description="Human-readable asset name", min_length=1, max_length=255)
    description: Optional[str] = Field(default=None, description="Extended description")
    latitude: Optional[Decimal] = Field(default=None, description="WGS-84 latitude", ge=-90, le=90)
    longitude: Optional[Decimal] = Field(default=None, description="WGS-84 longitude", ge=-180, le=180)
    address: Optional[str] = Field(default=None, description="Physical address", max_length=500)
    installation_date: Optional[datetime] = Field(default=None, description="When the asset was installed/commissioned")
    manufacturer: Optional[str] = Field(default=None, description="Equipment manufacturer", max_length=255)
    model: Optional[str] = Field(default=None, description="Equipment model number", max_length=255)
    status: AssetStatus = Field(default=AssetStatus.ACTIVE, description="Current operational status")
    health_score: int = Field(default=100, description="Computed health score (0-100)", ge=0, le=100)
    metadata: Optional[dict[str, Any]] = Field(default=None, description="Extensible metadata JSONB")
    created_at: datetime = Field(..., description="Record creation timestamp (UTC)")
    updated_at: datetime = Field(..., description="Last update timestamp (UTC)")

    @field_validator("latitude")
    @classmethod
    def validate_latitude(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        if v is not None and (v < -90 or v > 90):
            raise ValueError(f"Latitude must be between -90 and 90, got {v}")
        return v

    @field_validator("longitude")
    @classmethod
    def validate_longitude(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        if v is not None and (v < -180 or v > 180):
            raise ValueError(f"Longitude must be between -180 and 180, got {v}")
        return v

    model_config = {"from_attributes": True}
