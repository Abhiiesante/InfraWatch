from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

# =============================================================================
# WAREHOUSE & LOGISTICS DOMAIN (Phase 4 Expansion)
# Data Contracts for Delta Lake Bronze -> Silver Ingestion
# =============================================================================

class DetectionClass(str, Enum):
    AMR = "AMR"
    FORKLIFT = "FORKLIFT"
    PALLET = "PALLET"
    PERSON = "PERSON"
    PPE_HARDHAT = "PPE_HARDHAT"
    PPE_VEST = "PPE_VEST"

class BoundingBox(BaseModel):
    x_min: float = Field(..., ge=0.0, le=1.0)
    y_min: float = Field(..., ge=0.0, le=1.0)
    x_max: float = Field(..., ge=0.0, le=1.0)
    y_max: float = Field(..., ge=0.0, le=1.0)

class DetectedObject(BaseModel):
    object_id: str = Field(..., description="Unique tracker ID across frames if available")
    class_name: DetectionClass
    confidence: float = Field(..., ge=0.0, le=1.0)
    bbox: BoundingBox
    metadata: Optional[Dict[str, Any]] = None

class ObjectDetectionEvent(BaseModel):
    """
    Contract for real-time bounding box streams emitted by 
    Warehouse Vision Models parsing RTSP feeds (RGB).
    """
    event_id: str
    tenant_id: int
    camera_id: int
    timestamp: datetime
    detected_objects: List[DetectedObject]
    frame_width: int
    frame_height: int

class ZoneViolationType(str, Enum):
    UNAUTHORIZED_ACCESS = "UNAUTHORIZED_ACCESS"
    PPE_MISSING = "PPE_MISSING"
    PROXIMITY_DANGER = "PROXIMITY_DANGER"
    SPEEDING = "SPEEDING"

class ZoneViolationEvent(BaseModel):
    """
    Contract for Spatiotemporal violations computed by 
    evaluating ObjectDetectionEvents against FacilityZone polygons.
    """
    violation_id: str
    tenant_id: int
    zone_id: int
    camera_id: int
    timestamp: datetime
    violation_type: ZoneViolationType
    severity: str = Field(..., description="LOW, MEDIUM, HIGH, CRITICAL")
    involved_objects: List[str] = Field(..., description="List of object_ids involved")
    description: str
