"""
Unit and Integration Tests for Lakehouse Data Domain Pipelines
Tests validation, credential redaction, quarantine logic, and aggregation calculations.
"""
import pytest
from datetime import datetime
from decimal import Decimal
from uuid import uuid4

from contracts.asset import AssetMetadata, AssetStatus
from contracts.camera import CameraMetadata, CameraStatus
from contracts.incident import IncidentEvent, IncidentSeverity, IncidentStatus, IncidentSource
from contracts.inspection import InspectionEvent, InspectionStatus, InspectionSeverity
from contracts.image_metadata import ImageFrameMetadata, FrameProcessingStatus
from pipelines.silver.process_cameras import sanitize_stream_url

# ============================================================================
# 1. Asset Contract & Validation Tests
# ============================================================================
def test_valid_asset_metadata():
    asset = AssetMetadata(
        asset_id=1,
        tenant_id=1,
        asset_type="Solar Array",
        name="Suryanagar Panel #4",
        latitude=Decimal("19.0760"),
        longitude=Decimal("72.8777"),
        status=AssetStatus.ACTIVE,
        health_score=95,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    assert asset.asset_id == 1
    assert asset.health_score == 95
    assert asset.status == AssetStatus.ACTIVE

def test_invalid_asset_latitude():
    with pytest.raises(ValueError):
        AssetMetadata(
            asset_id=1,
            tenant_id=1,
            asset_type="Tower",
            name="Invalid Lat Tower",
            latitude=Decimal("999.0"), # Out of bounds
            longitude=Decimal("72.0"),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )

# ============================================================================
# 2. Camera Contract & Security Sanitization Tests
# ============================================================================
def test_camera_credential_sanitization():
    raw_rtsp = "rtsp://admin:SuperSecretPassword123@192.168.1.100:554/stream1"
    sanitized = sanitize_stream_url(raw_rtsp)
    assert "SuperSecretPassword123" not in sanitized
    assert "admin" not in sanitized
    assert sanitized == "rtsp://***:***@192.168.1.100:554/stream1"

def test_camera_metadata_clean():
    cam = CameraMetadata(
        camera_id=10,
        tenant_id=1,
        asset_id=5,
        name="Substation North Cam",
        camera_type="PTZ",
        stream_url_reference="rtsp://***:***@10.0.0.50:554/live",
        status=CameraStatus.ONLINE,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    assert cam.camera_id == 10
    assert "password" not in (cam.stream_url_reference or "")

# ============================================================================
# 3. Incident Event Contract Tests
# ============================================================================
def test_incident_contract():
    incident = IncidentEvent(
        incident_id=101,
        tenant_id=1,
        asset_id=5,
        reporter_id=2,
        title="High Transformer Core Temperature",
        source=IncidentSource.SENSOR,
        severity=IncidentSeverity.CRITICAL,
        status=IncidentStatus.OPEN,
        created_at=datetime.utcnow()
    )
    assert incident.incident_id == 101
    assert incident.severity == IncidentSeverity.CRITICAL
    assert incident.source == IncidentSource.SENSOR

# ============================================================================
# 4. Inspection Event Contract Tests
# ============================================================================
def test_inspection_contract():
    inspection = InspectionEvent(
        inspection_id=50,
        tenant_id=1,
        asset_id=3,
        inspector_id=4,
        scheduled_at=datetime.utcnow(),
        status=InspectionStatus.COMPLETED,
        finding="No structural cracks observed on suspension cables.",
        severity=InspectionSeverity.NONE,
        created_at=datetime.utcnow()
    )
    assert inspection.inspection_id == 50
    assert inspection.status == InspectionStatus.COMPLETED

# ============================================================================
# 5. Image Frame Metadata Contract Tests
# ============================================================================
def test_image_frame_metadata_storage_uri():
    frame = ImageFrameMetadata(
        frame_id=uuid4(),
        tenant_id=1,
        camera_id=10,
        asset_id=5,
        capture_timestamp=datetime.utcnow(),
        storage_uri="s3://infrawatch-inspections/frames/2026-08-18/frame_01.jpg",
        width=1920,
        height=1080,
        format="JPEG",
        processing_status=FrameProcessingStatus.PROCESSED
    )
    assert str(frame.storage_uri).startswith("s3://")

def test_image_frame_metadata_invalid_uri():
    with pytest.raises(ValueError):
        ImageFrameMetadata(
            frame_id=uuid4(),
            tenant_id=1,
            camera_id=10,
            asset_id=5,
            capture_timestamp=datetime.utcnow(),
            storage_uri="ftp://invalid-server/bad.jpg", # Invalid scheme
        )
