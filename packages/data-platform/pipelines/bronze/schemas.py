"""
Bronze Layer Table Schemas

Bronze stores minimally transformed source data with full source fidelity.
Every bronze table adds technical metadata columns for lineage and deduplication.
No heavy business transformations happen here.
"""

from __future__ import annotations

from pyspark.sql.types import (
    DecimalType,
    IntegerType,
    LongType,
    StringType,
    StructField,
    StructType,
    TimestampType,
    BooleanType,
    DoubleType,
    MapType,
)


# ============================================================================
# Technical metadata columns added to ALL bronze tables
# ============================================================================

BRONZE_METADATA_FIELDS = [
    StructField("_ingestion_timestamp", TimestampType(), nullable=False),
    StructField("_source", StringType(), nullable=False),
    StructField("_source_file", StringType(), nullable=True),
    StructField("_batch_id", StringType(), nullable=False),
    StructField("_record_hash", StringType(), nullable=False),
    StructField("_schema_version", IntegerType(), nullable=False),
    StructField("_ingestion_date", StringType(), nullable=False),  # partition column YYYY-MM-DD
]


def _with_metadata(fields: list[StructField]) -> StructType:
    """Append standard bronze metadata columns to a schema."""
    return StructType(fields + BRONZE_METADATA_FIELDS)


# ============================================================================
# bronze.asset_events
# ============================================================================

ASSET_EVENTS_SCHEMA = _with_metadata([
    StructField("asset_id", IntegerType(), nullable=False),
    StructField("tenant_id", IntegerType(), nullable=False),
    StructField("asset_type", StringType(), nullable=True),
    StructField("name", StringType(), nullable=False),
    StructField("description", StringType(), nullable=True),
    StructField("latitude", DecimalType(10, 8), nullable=True),
    StructField("longitude", DecimalType(11, 8), nullable=True),
    StructField("address", StringType(), nullable=True),
    StructField("status", StringType(), nullable=True),
    StructField("health_score", IntegerType(), nullable=True),
    StructField("metadata_json", StringType(), nullable=True),  # Serialized JSONB
    StructField("created_at", TimestampType(), nullable=True),
    StructField("updated_at", TimestampType(), nullable=True),
])


# ============================================================================
# bronze.camera_events
# ============================================================================

CAMERA_EVENTS_SCHEMA = _with_metadata([
    StructField("camera_id", IntegerType(), nullable=False),
    StructField("tenant_id", IntegerType(), nullable=False),
    StructField("asset_id", IntegerType(), nullable=False),
    StructField("name", StringType(), nullable=True),
    StructField("camera_type", StringType(), nullable=True),
    StructField("stream_url_reference", StringType(), nullable=True),  # Redacted — no credentials
    StructField("status", StringType(), nullable=True),
    StructField("ip_address_hash", StringType(), nullable=True),  # Hashed for privacy
    StructField("installation_date", StringType(), nullable=True),
    StructField("created_at", TimestampType(), nullable=True),
    StructField("updated_at", TimestampType(), nullable=True),
])


# ============================================================================
# bronze.sensor_telemetry
# ============================================================================

SENSOR_TELEMETRY_SCHEMA = _with_metadata([
    StructField("event_id", StringType(), nullable=False),
    StructField("tenant_id", IntegerType(), nullable=False),
    StructField("asset_id", IntegerType(), nullable=False),
    StructField("sensor_id", StringType(), nullable=True),
    StructField("sensor_type", StringType(), nullable=False),
    StructField("event_timestamp", TimestampType(), nullable=False),
    StructField("value", DoubleType(), nullable=False),
    StructField("unit", StringType(), nullable=False),
    StructField("quality", StringType(), nullable=True),
    StructField("event_source", StringType(), nullable=True),
])


# ============================================================================
# bronze.inspection_events
# ============================================================================

INSPECTION_EVENTS_SCHEMA = _with_metadata([
    StructField("inspection_id", IntegerType(), nullable=False),
    StructField("tenant_id", IntegerType(), nullable=False),
    StructField("asset_id", IntegerType(), nullable=False),
    StructField("inspector_id", IntegerType(), nullable=False),
    StructField("scheduled_at", TimestampType(), nullable=True),
    StructField("completed_at", TimestampType(), nullable=True),
    StructField("status", StringType(), nullable=True),
    StructField("notes", StringType(), nullable=True),
    StructField("finding", StringType(), nullable=True),
    StructField("severity", StringType(), nullable=True),
    StructField("is_predictive", BooleanType(), nullable=True),
    StructField("prediction_id", IntegerType(), nullable=True),
    StructField("created_at", TimestampType(), nullable=True),
    StructField("updated_at", TimestampType(), nullable=True),
])


# ============================================================================
# bronze.incident_events
# ============================================================================

INCIDENT_EVENTS_SCHEMA = _with_metadata([
    StructField("incident_id", IntegerType(), nullable=False),
    StructField("tenant_id", IntegerType(), nullable=False),
    StructField("asset_id", IntegerType(), nullable=True),
    StructField("reporter_id", IntegerType(), nullable=False),
    StructField("title", StringType(), nullable=False),
    StructField("description", StringType(), nullable=True),
    StructField("source", StringType(), nullable=True),  # MANUAL, ML, VISION_AI, etc.
    StructField("incident_type", StringType(), nullable=True),
    StructField("severity", StringType(), nullable=True),
    StructField("status", StringType(), nullable=True),
    StructField("confidence", DoubleType(), nullable=True),
    StructField("category", StringType(), nullable=True),
    StructField("ai_suggested_severity", StringType(), nullable=True),
    StructField("ai_suggested_category", StringType(), nullable=True),
    StructField("ai_confidence", DoubleType(), nullable=True),
    StructField("ai_triaged_at", TimestampType(), nullable=True),
    StructField("created_at", TimestampType(), nullable=True),
    StructField("resolved_at", TimestampType(), nullable=True),
    StructField("updated_at", TimestampType(), nullable=True),
])


# ============================================================================
# bronze.image_metadata
# ============================================================================

IMAGE_METADATA_SCHEMA = _with_metadata([
    StructField("frame_id", StringType(), nullable=False),
    StructField("tenant_id", IntegerType(), nullable=False),
    StructField("camera_id", IntegerType(), nullable=False),
    StructField("asset_id", IntegerType(), nullable=False),
    StructField("capture_timestamp", TimestampType(), nullable=False),
    StructField("storage_uri", StringType(), nullable=False),
    StructField("checksum", StringType(), nullable=True),
    StructField("width", IntegerType(), nullable=True),
    StructField("height", IntegerType(), nullable=True),
    StructField("file_size_bytes", LongType(), nullable=True),
    StructField("format", StringType(), nullable=True),
    StructField("processing_status", StringType(), nullable=True),
])


# ============================================================================
# bronze.model_feedback
# ============================================================================

MODEL_FEEDBACK_SCHEMA = _with_metadata([
    StructField("feedback_id", StringType(), nullable=False),
    StructField("tenant_id", IntegerType(), nullable=False),
    StructField("prediction_id", StringType(), nullable=True),
    StructField("event_id", StringType(), nullable=True),
    StructField("reviewer_id", IntegerType(), nullable=True),
    StructField("decision", StringType(), nullable=True),       # CONFIRMED, DISMISSED, CORRECTED
    StructField("corrected_label", StringType(), nullable=True),
    StructField("notes", StringType(), nullable=True),
    StructField("model_name", StringType(), nullable=True),
    StructField("model_version", StringType(), nullable=True),
    StructField("reviewed_at", TimestampType(), nullable=True),
])


# ============================================================================
# bronze.application_events (general application audit trail)
# ============================================================================

APPLICATION_EVENTS_SCHEMA = _with_metadata([
    StructField("event_id", StringType(), nullable=False),
    StructField("tenant_id", IntegerType(), nullable=False),
    StructField("user_id", IntegerType(), nullable=True),
    StructField("action", StringType(), nullable=False),
    StructField("entity", StringType(), nullable=True),
    StructField("entity_id", IntegerType(), nullable=True),
    StructField("changes_json", StringType(), nullable=True),
    StructField("event_timestamp", TimestampType(), nullable=False),
])


# ============================================================================
# bronze.cv_events
# ============================================================================
from pyspark.sql.types import ArrayType

CV_EVENTS_SCHEMA = _with_metadata([
    StructField("camera_id", StringType(), nullable=False),
    StructField("timestamp", StringType(), nullable=False),
    StructField("model", StringType(), nullable=True),
    StructField("detections", ArrayType(
        StructType([
            StructField("id", StringType(), nullable=True),
            StructField("label", StringType(), nullable=True),
            StructField("conf", IntegerType(), nullable=True),
            StructField("x", DoubleType(), nullable=True),
            StructField("y", DoubleType(), nullable=True),
            StructField("w", DoubleType(), nullable=True),
            StructField("h", DoubleType(), nullable=True),
            StructField("color", StringType(), nullable=True),
            StructField("isViolation", BooleanType(), nullable=True)
        ])
    ), nullable=True),
])

# ============================================================================
# Registry of all bronze table schemas
# ============================================================================

BRONZE_TABLE_SCHEMAS: dict[str, StructType] = {
    "asset_events": ASSET_EVENTS_SCHEMA,
    "camera_events": CAMERA_EVENTS_SCHEMA,
    "sensor_telemetry": SENSOR_TELEMETRY_SCHEMA,
    "inspection_events": INSPECTION_EVENTS_SCHEMA,
    "incident_events": INCIDENT_EVENTS_SCHEMA,
    "image_metadata": IMAGE_METADATA_SCHEMA,
    "model_feedback": MODEL_FEEDBACK_SCHEMA,
    "application_events": APPLICATION_EVENTS_SCHEMA,
    "cv_events": CV_EVENTS_SCHEMA,
}
