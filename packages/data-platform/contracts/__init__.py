"""
InfraWatch Data Contracts

Canonical Pydantic schemas defining the shape of data flowing through
the InfraWatch lakehouse. These contracts are the single source of truth
for data structure across ingestion, bronze, silver, and gold layers.
"""

from .asset import AssetEvent
from .camera import CameraEvent
from .incident import IncidentEvent
from .inspection import InspectionEvent
from .sensor_telemetry import SensorTelemetryEvent
from .image_metadata import ImageMetadataEvent
from .video_inspection import VideoInspectionEvent
from .video_finding import VideoFindingEvent

__all__ = [
    "AssetEvent",
    "CameraEvent",
    "IncidentEvent",
    "InspectionEvent",
    "SensorTelemetryEvent",
    "ImageMetadataEvent",
    "VideoInspectionEvent",
    "VideoFindingEvent",
]

