"""
InfraWatch Data Platform — Pipeline Configuration

Centralized, validated parameters for all data pipelines.
Every parameter has a type, a validation rule, and a sensible default only where safe.
"""

from __future__ import annotations

from datetime import date, datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, field_validator


class TriggerMode(str, Enum):
    """Pipeline trigger modes."""
    BATCH = "batch"
    STREAMING = "streaming"
    TRIGGERED = "triggered"


class PipelineConfig(BaseModel):
    """Validated pipeline execution parameters.

    These parameters are passed to every pipeline invocation.
    Production thresholds are never hardcoded — always configurable.
    """

    # --- Environment ---
    environment: str = Field(
        default="dev",
        description="Target environment (dev, test, staging, prod)",
    )
    catalog: Optional[str] = Field(
        default=None,
        description="Override Unity Catalog name. If None, derived from environment.",
    )

    # --- Scope ---
    source: str = Field(
        description="Data source identifier (e.g., 'postgresql', 'iot_hub', 'camera_frames')",
    )
    tenant_id: Optional[int] = Field(
        default=None,
        description="Restrict pipeline to a single tenant. None = all tenants.",
    )

    # --- Time window ---
    processing_date: date = Field(
        default_factory=date.today,
        description="Logical processing date for the pipeline run.",
    )
    start_timestamp: Optional[datetime] = Field(
        default=None,
        description="Start of the time window for incremental processing.",
    )
    end_timestamp: Optional[datetime] = Field(
        default=None,
        description="End of the time window for incremental processing.",
    )

    # --- Processing ---
    checkpoint_path: Optional[str] = Field(
        default=None,
        description="Checkpoint location for streaming/incremental ingestion.",
    )
    batch_size: int = Field(
        default=10000,
        ge=1,
        le=10_000_000,
        description="Maximum records per micro-batch.",
    )
    trigger_mode: TriggerMode = Field(
        default=TriggerMode.BATCH,
        description="Pipeline execution mode.",
    )

    # --- ML / Model ---
    model_version: Optional[str] = Field(
        default=None,
        description="Specific model version for inference. None = champion.",
    )
    confidence_threshold: float = Field(
        default=0.75,
        ge=0.0,
        le=1.0,
        description="Minimum confidence score for predictions to be actionable.",
    )
    anomaly_threshold: float = Field(
        default=3.0,
        ge=0.0,
        description="Z-score threshold for anomaly detection.",
    )
    lookback_window: int = Field(
        default=168,
        ge=1,
        description="Lookback window in hours for feature calculations.",
    )

    # --- Operational ---
    max_retries: int = Field(
        default=3,
        ge=0,
        le=10,
        description="Maximum retry attempts for transient failures.",
    )
    enable_alert_creation: bool = Field(
        default=False,
        description="Whether to create alerts/incidents from pipeline output.",
    )
    dry_run: bool = Field(
        default=False,
        description="If True, pipeline validates but does not write output.",
    )

    @field_validator("environment")
    @classmethod
    def validate_environment(cls, v: str) -> str:
        valid = {"dev", "test", "staging", "prod"}
        if v not in valid:
            raise ValueError(f"environment must be one of {valid}, got '{v}'")
        return v

    @field_validator("end_timestamp")
    @classmethod
    def validate_time_range(cls, v: Optional[datetime], info: Any) -> Optional[datetime]:
        start = info.data.get("start_timestamp")
        if v is not None and start is not None and v <= start:
            raise ValueError("end_timestamp must be after start_timestamp")
        return v


# We need the Any import for the validator
from typing import Any  # noqa: E402
