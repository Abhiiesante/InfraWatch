"""
Sensor Telemetry Data Contract

Canonical schema for sensor telemetry events.
Supports: temperature, vibration, voltage, current, humidity,
pressure, wind speed, battery, signal strength, and custom sensor types.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID, uuid4

from pydantic import BaseModel, Field, field_validator


class SensorType(str, Enum):
    """Known sensor types. Extensible — new types can be added."""
    TEMPERATURE = "TEMPERATURE"
    VIBRATION = "VIBRATION"
    VOLTAGE = "VOLTAGE"
    CURRENT = "CURRENT"
    HUMIDITY = "HUMIDITY"
    PRESSURE = "PRESSURE"
    WIND_SPEED = "WIND_SPEED"
    BATTERY = "BATTERY"
    SIGNAL_STRENGTH = "SIGNAL_STRENGTH"
    RPM = "RPM"
    SOLAR_IRRADIANCE = "SOLAR_IRRADIANCE"
    AMPERAGE = "AMPERAGE"
    OTHER = "OTHER"


class DataQuality(str, Enum):
    """Telemetry reading quality indicator."""
    GOOD = "GOOD"
    SUSPECT = "SUSPECT"
    BAD = "BAD"
    MISSING = "MISSING"


# Physically plausible ranges per sensor type (for data quality validation)
SENSOR_VALID_RANGES: dict[str, tuple[float, float]] = {
    "TEMPERATURE": (-80.0, 200.0),         # °C
    "VIBRATION": (0.0, 100.0),             # mm/s
    "VOLTAGE": (0.0, 1_000_000.0),         # V
    "CURRENT": (0.0, 100_000.0),           # A
    "HUMIDITY": (0.0, 100.0),              # %
    "PRESSURE": (0.0, 2000.0),             # hPa
    "WIND_SPEED": (0.0, 500.0),            # km/h
    "BATTERY": (0.0, 100.0),               # %
    "SIGNAL_STRENGTH": (-150.0, 0.0),      # dBm
    "RPM": (0.0, 100_000.0),              # rpm
    "SOLAR_IRRADIANCE": (0.0, 2000.0),     # W/m²
    "AMPERAGE": (0.0, 100_000.0),          # A
}


class SensorTelemetryEvent(BaseModel):
    """Canonical sensor telemetry event contract.

    Each record represents a single sensor reading at a point in time.
    The event_id is a UUID for global deduplication.
    """

    event_id: UUID = Field(default_factory=uuid4, description="Globally unique event identifier")
    tenant_id: int = Field(..., description="Owning tenant", ge=1)
    asset_id: int = Field(..., description="Asset producing the reading", ge=1)
    sensor_id: Optional[str] = Field(
        default=None,
        description="Physical sensor identifier (if available)",
        max_length=255,
    )
    sensor_type: str = Field(..., description="Type of sensor (e.g., TEMPERATURE)", max_length=50)
    event_timestamp: datetime = Field(..., description="When the reading was taken (UTC)")
    ingestion_timestamp: datetime = Field(
        default_factory=datetime.utcnow,
        description="When the event was ingested (UTC)",
    )
    value: float = Field(..., description="Sensor reading value")
    unit: str = Field(..., description="Unit of measurement", max_length=20)
    quality: DataQuality = Field(default=DataQuality.GOOD, description="Data quality indicator")
    source: str = Field(
        default="APPLICATION",
        description="Event source (APPLICATION, IOT_HUB, SCADA, SIMULATOR)",
        max_length=50,
    )

    @field_validator("sensor_type")
    @classmethod
    def normalize_sensor_type(cls, v: str) -> str:
        return v.upper().strip()

    def is_within_valid_range(self) -> bool:
        """Check if value is within physically plausible range for its sensor type."""
        valid_range = SENSOR_VALID_RANGES.get(self.sensor_type.upper())
        if valid_range is None:
            return True  # Unknown sensor types pass validation
        return valid_range[0] <= self.value <= valid_range[1]

    model_config = {"from_attributes": True}
