"""Tests for data contracts."""

import pytest
from datetime import datetime, timezone
from pydantic import ValidationError

from contracts.sensor_telemetry import SensorTelemetryEvent
from contracts.image_metadata import ImageFrameMetadata


def test_sensor_telemetry_valid_range():
    """Test sensor telemetry physical range validation."""
    # Valid temperature
    event = SensorTelemetryEvent(
        tenant_id=1,
        asset_id=1,
        sensor_type="TEMPERATURE",
        event_timestamp=datetime.now(timezone.utc),
        value=25.5,
        unit="C"
    )
    assert event.is_within_valid_range() is True
    
    # Invalid temperature (below absolute zero for typical operations)
    event_bad = SensorTelemetryEvent(
        tenant_id=1,
        asset_id=1,
        sensor_type="TEMPERATURE",
        event_timestamp=datetime.now(timezone.utc),
        value=-100.0,
        unit="C"
    )
    assert event_bad.is_within_valid_range() is False
    
    # Unknown sensor type (should pass range validation by default)
    event_unknown = SensorTelemetryEvent(
        tenant_id=1,
        asset_id=1,
        sensor_type="CUSTOM_SENSOR",
        event_timestamp=datetime.now(timezone.utc),
        value=999999.9,
        unit="X"
    )
    assert event_unknown.is_within_valid_range() is True


def test_image_metadata_storage_uri():
    """Test image metadata storage URI validation."""
    # Valid S3 URI
    valid = ImageFrameMetadata(
        tenant_id=1,
        camera_id=1,
        asset_id=1,
        capture_timestamp=datetime.now(timezone.utc),
        storage_uri="s3://infrawatch-bucket/images/frame1.jpg"
    )
    assert valid.storage_uri.startswith("s3://")
    
    # Valid Databricks Volume URI
    valid2 = ImageFrameMetadata(
        tenant_id=1,
        camera_id=1,
        asset_id=1,
        capture_timestamp=datetime.now(timezone.utc),
        storage_uri="/Volumes/infrawatch_dev/bronze/images/frame1.jpg"
    )
    assert valid2.storage_uri.startswith("/Volumes/")
    
    # Invalid URI
    with pytest.raises(ValidationError):
        ImageFrameMetadata(
            tenant_id=1,
            camera_id=1,
            asset_id=1,
            capture_timestamp=datetime.now(timezone.utc),
            storage_uri="invalid_path/frame1.jpg"
        )
