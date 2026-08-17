"""
Silver Layer Table Schemas

Silver represents validated, deduplicated, and standardized operational data.
Transformations applied: type normalization, timestamp UTC handling, null treatment,
deduplication, invalid telemetry filtering, referential integrity checks,
unit standardization, and status normalization.
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
)


# ============================================================================
# Silver metadata columns (lighter than bronze — validation lineage)
# ============================================================================

SILVER_METADATA_FIELDS = [
    StructField("_bronze_batch_id", StringType(), nullable=True),
    StructField("_validated_at", TimestampType(), nullable=False),
    StructField("_validation_version", IntegerType(), nullable=False),
]


def _with_metadata(fields: list[StructField]) -> StructType:
    """Append silver validation metadata to a schema."""
    return StructType(fields + SILVER_METADATA_FIELDS)


# ============================================================================
# silver.assets
# ============================================================================

ASSETS_SCHEMA = _with_metadata([
    StructField("asset_id", IntegerType(), nullable=False),
    StructField("tenant_id", IntegerType(), nullable=False),
    StructField("asset_type", StringType(), nullable=False),
    StructField("name", StringType(), nullable=False),
    StructField("description", StringType(), nullable=True),
    StructField("latitude", DecimalType(10, 8), nullable=True),
    StructField("longitude", DecimalType(11, 8), nullable=True),
    StructField("address", StringType(), nullable=True),
    StructField("status", StringType(), nullable=False),          # Normalized enum
    StructField("health_score", IntegerType(), nullable=False),
    StructField("created_at", TimestampType(), nullable=False),   # Always UTC
    StructField("updated_at", TimestampType(), nullable=False),
])


# ============================================================================
# silver.cameras
# ============================================================================

CAMERAS_SCHEMA = _with_metadata([
    StructField("camera_id", IntegerType(), nullable=False),
    StructField("tenant_id", IntegerType(), nullable=False),
    StructField("asset_id", IntegerType(), nullable=False),
    StructField("name", StringType(), nullable=False),
    StructField("camera_type", StringType(), nullable=False),     # Normalized
    StructField("status", StringType(), nullable=False),
    StructField("installation_date", StringType(), nullable=True),
    StructField("created_at", TimestampType(), nullable=False),
    StructField("updated_at", TimestampType(), nullable=False),
    # NOTE: No stream URL or IP — those stay in PostgreSQL only
])


# ============================================================================
# silver.sensor_telemetry
#
# Partitioned by: tenant_id, _ingestion_date (inherited from bronze)
# Optimized for time-series queries with Z-ORDER on (asset_id, event_timestamp)
# ============================================================================

SENSOR_TELEMETRY_SCHEMA = _with_metadata([
    StructField("event_id", StringType(), nullable=False),
    StructField("tenant_id", IntegerType(), nullable=False),
    StructField("asset_id", IntegerType(), nullable=False),
    StructField("sensor_id", StringType(), nullable=True),
    StructField("sensor_type", StringType(), nullable=False),     # Normalized uppercase
    StructField("event_timestamp", TimestampType(), nullable=False),
    StructField("value", DoubleType(), nullable=False),
    StructField("unit", StringType(), nullable=False),            # Standardized units
    StructField("quality", StringType(), nullable=False),         # GOOD, SUSPECT, BAD
    StructField("is_anomaly", BooleanType(), nullable=False),     # Range-validated flag
    StructField("event_date", StringType(), nullable=False),      # YYYY-MM-DD partition
])


# ============================================================================
# silver.inspections
# ============================================================================

INSPECTIONS_SCHEMA = _with_metadata([
    StructField("inspection_id", IntegerType(), nullable=False),
    StructField("tenant_id", IntegerType(), nullable=False),
    StructField("asset_id", IntegerType(), nullable=False),
    StructField("inspector_id", IntegerType(), nullable=False),
    StructField("scheduled_at", TimestampType(), nullable=False),
    StructField("completed_at", TimestampType(), nullable=True),
    StructField("status", StringType(), nullable=False),
    StructField("notes", StringType(), nullable=True),
    StructField("finding", StringType(), nullable=True),
    StructField("severity", StringType(), nullable=True),
    StructField("is_predictive", BooleanType(), nullable=False),
    StructField("prediction_id", IntegerType(), nullable=True),
    StructField("created_at", TimestampType(), nullable=False),
    StructField("updated_at", TimestampType(), nullable=True),
])


# ============================================================================
# silver.incidents
# ============================================================================

INCIDENTS_SCHEMA = _with_metadata([
    StructField("incident_id", IntegerType(), nullable=False),
    StructField("tenant_id", IntegerType(), nullable=False),
    StructField("asset_id", IntegerType(), nullable=True),
    StructField("reporter_id", IntegerType(), nullable=False),
    StructField("title", StringType(), nullable=False),
    StructField("description", StringType(), nullable=True),
    StructField("source", StringType(), nullable=False),          # MANUAL, ML, VISION_AI, etc.
    StructField("incident_type", StringType(), nullable=True),
    StructField("severity", StringType(), nullable=False),
    StructField("status", StringType(), nullable=False),
    StructField("confidence", DoubleType(), nullable=True),
    StructField("category", StringType(), nullable=True),
    StructField("created_at", TimestampType(), nullable=False),
    StructField("resolved_at", TimestampType(), nullable=True),
    StructField("updated_at", TimestampType(), nullable=True),
    StructField("resolution_hours", DoubleType(), nullable=True), # Computed: resolved - created
])


# ============================================================================
# silver.image_metadata
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
    StructField("processing_status", StringType(), nullable=False),
    StructField("capture_date", StringType(), nullable=False),    # YYYY-MM-DD partition
])


# ============================================================================
# silver.operator_feedback
# ============================================================================

OPERATOR_FEEDBACK_SCHEMA = _with_metadata([
    StructField("feedback_id", StringType(), nullable=False),
    StructField("tenant_id", IntegerType(), nullable=False),
    StructField("prediction_id", StringType(), nullable=True),
    StructField("event_id", StringType(), nullable=True),
    StructField("reviewer_id", IntegerType(), nullable=False),
    StructField("decision", StringType(), nullable=False),        # CONFIRMED, DISMISSED, CORRECTED, ESCALATED
    StructField("corrected_label", StringType(), nullable=True),
    StructField("notes", StringType(), nullable=True),
    StructField("model_name", StringType(), nullable=True),
    StructField("model_version", StringType(), nullable=True),
    StructField("reviewed_at", TimestampType(), nullable=False),
])


# ============================================================================
# silver.cv_detections
# ============================================================================

CV_DETECTIONS_SCHEMA = _with_metadata([
    StructField("detection_id", StringType(), nullable=False),
    StructField("camera_id", IntegerType(), nullable=False),
    StructField("tenant_id", IntegerType(), nullable=False),
    StructField("event_timestamp", TimestampType(), nullable=False),
    StructField("model_name", StringType(), nullable=True),
    StructField("label", StringType(), nullable=False),
    StructField("confidence", IntegerType(), nullable=False),
    StructField("x", DoubleType(), nullable=False),
    StructField("y", DoubleType(), nullable=False),
    StructField("width", DoubleType(), nullable=False),
    StructField("height", DoubleType(), nullable=False),
    StructField("is_violation", BooleanType(), nullable=False),
    StructField("event_date", StringType(), nullable=False),      # YYYY-MM-DD partition
])


# ============================================================================
# Registry
# ============================================================================

SILVER_TABLE_SCHEMAS: dict[str, StructType] = {
    "assets": ASSETS_SCHEMA,
    "cameras": CAMERAS_SCHEMA,
    "sensor_telemetry": SENSOR_TELEMETRY_SCHEMA,
    "inspections": INSPECTIONS_SCHEMA,
    "incidents": INCIDENTS_SCHEMA,
    "image_metadata": IMAGE_METADATA_SCHEMA,
    "operator_feedback": OPERATOR_FEEDBACK_SCHEMA,
    "cv_detections": CV_DETECTIONS_SCHEMA,
}
