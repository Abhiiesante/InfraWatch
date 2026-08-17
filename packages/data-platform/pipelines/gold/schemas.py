"""
Gold Layer Table Schemas

Gold contains business-ready operational intelligence powering
the InfraWatch dashboard and downstream ML feature engineering.
"""

from __future__ import annotations

from pyspark.sql.types import (
    DecimalType,
    IntegerType,
    StringType,
    StructField,
    StructType,
    TimestampType,
    DoubleType,
)


# ============================================================================
# gold.asset_health
#
# One row per asset. Refreshed periodically from silver + ML predictions.
# ============================================================================

ASSET_HEALTH_SCHEMA = StructType([
    StructField("asset_id", IntegerType(), nullable=False),
    StructField("tenant_id", IntegerType(), nullable=False),
    StructField("asset_type", StringType(), nullable=False),
    StructField("name", StringType(), nullable=False),
    StructField("status", StringType(), nullable=False),
    StructField("health_score", IntegerType(), nullable=False),          # 0-100
    StructField("risk_score", IntegerType(), nullable=False),            # 0-100
    StructField("risk_level", StringType(), nullable=False),             # LOW, MODERATE, HIGH, CRITICAL
    StructField("open_incident_count", IntegerType(), nullable=False),
    StructField("critical_incident_count", IntegerType(), nullable=False),
    StructField("days_since_inspection", IntegerType(), nullable=True),
    StructField("sensor_anomaly_count", IntegerType(), nullable=False),
    StructField("vision_anomaly_count", IntegerType(), nullable=False),
    StructField("predicted_failure_probability", DoubleType(), nullable=True),
    StructField("last_updated", TimestampType(), nullable=False),
])


# ============================================================================
# gold.asset_daily_metrics
#
# One row per (asset, date). Aggregated from silver.sensor_telemetry.
# ============================================================================

ASSET_DAILY_METRICS_SCHEMA = StructType([
    StructField("asset_id", IntegerType(), nullable=False),
    StructField("tenant_id", IntegerType(), nullable=False),
    StructField("metric_date", StringType(), nullable=False),            # YYYY-MM-DD
    StructField("total_readings", IntegerType(), nullable=False),
    StructField("anomaly_readings", IntegerType(), nullable=False),
    StructField("anomaly_rate", DoubleType(), nullable=False),
    StructField("avg_temperature", DoubleType(), nullable=True),
    StructField("max_temperature", DoubleType(), nullable=True),
    StructField("avg_vibration", DoubleType(), nullable=True),
    StructField("max_vibration", DoubleType(), nullable=True),
    StructField("avg_voltage", DoubleType(), nullable=True),
    StructField("incident_count", IntegerType(), nullable=False),
    StructField("last_updated", TimestampType(), nullable=False),
])


# ============================================================================
# gold.sensor_hourly_metrics
#
# One row per (asset, sensor_type, hour). Time-series aggregation.
# ============================================================================

SENSOR_HOURLY_METRICS_SCHEMA = StructType([
    StructField("asset_id", IntegerType(), nullable=False),
    StructField("tenant_id", IntegerType(), nullable=False),
    StructField("sensor_type", StringType(), nullable=False),
    StructField("hour_start", TimestampType(), nullable=False),
    StructField("reading_count", IntegerType(), nullable=False),
    StructField("mean_value", DoubleType(), nullable=False),
    StructField("min_value", DoubleType(), nullable=False),
    StructField("max_value", DoubleType(), nullable=False),
    StructField("std_value", DoubleType(), nullable=True),
    StructField("unit", StringType(), nullable=False),
    StructField("anomaly_count", IntegerType(), nullable=False),
])


# ============================================================================
# gold.incident_summary
#
# One row per (tenant, severity, status, source). Dashboard aggregation.
# ============================================================================

INCIDENT_SUMMARY_SCHEMA = StructType([
    StructField("tenant_id", IntegerType(), nullable=False),
    StructField("severity", StringType(), nullable=False),
    StructField("status", StringType(), nullable=False),
    StructField("source", StringType(), nullable=False),
    StructField("incident_count", IntegerType(), nullable=False),
    StructField("avg_resolution_hours", DoubleType(), nullable=True),
    StructField("p95_resolution_hours", DoubleType(), nullable=True),
    StructField("last_updated", TimestampType(), nullable=False),
])


# ============================================================================
# gold.inspection_compliance
#
# One row per (tenant, asset). Compliance tracking.
# ============================================================================

INSPECTION_COMPLIANCE_SCHEMA = StructType([
    StructField("asset_id", IntegerType(), nullable=False),
    StructField("tenant_id", IntegerType(), nullable=False),
    StructField("total_scheduled", IntegerType(), nullable=False),
    StructField("total_completed", IntegerType(), nullable=False),
    StructField("completion_rate", DoubleType(), nullable=False),
    StructField("overdue_count", IntegerType(), nullable=False),
    StructField("days_since_last_inspection", IntegerType(), nullable=True),
    StructField("last_inspection_status", StringType(), nullable=True),
    StructField("last_updated", TimestampType(), nullable=False),
])


# ============================================================================
# gold.camera_health
#
# One row per camera. Operational health.
# ============================================================================

CAMERA_HEALTH_SCHEMA = StructType([
    StructField("camera_id", IntegerType(), nullable=False),
    StructField("tenant_id", IntegerType(), nullable=False),
    StructField("asset_id", IntegerType(), nullable=False),
    StructField("status", StringType(), nullable=False),
    StructField("frames_captured_24h", IntegerType(), nullable=False),
    StructField("detections_24h", IntegerType(), nullable=False),
    StructField("last_frame_timestamp", TimestampType(), nullable=True),
    StructField("uptime_pct_7d", DoubleType(), nullable=True),
    StructField("last_updated", TimestampType(), nullable=False),
])


# ============================================================================
# gold.asset_risk_score
#
# Separate from asset_health — focused on ML-derived risk assessment.
# ============================================================================

ASSET_RISK_SCORE_SCHEMA = StructType([
    StructField("asset_id", IntegerType(), nullable=False),
    StructField("tenant_id", IntegerType(), nullable=False),
    StructField("risk_score", IntegerType(), nullable=False),            # 0-100
    StructField("risk_level", StringType(), nullable=False),             # LOW, MODERATE, HIGH, CRITICAL
    StructField("failure_probability_7d", DoubleType(), nullable=True),
    StructField("failure_probability_30d", DoubleType(), nullable=True),
    StructField("top_risk_factor", StringType(), nullable=True),
    StructField("model_name", StringType(), nullable=True),
    StructField("model_version", StringType(), nullable=True),
    StructField("scored_at", TimestampType(), nullable=False),
])


# ============================================================================
# gold.maintenance_candidates
#
# Assets recommended for proactive maintenance.
# ============================================================================

MAINTENANCE_CANDIDATES_SCHEMA = StructType([
    StructField("asset_id", IntegerType(), nullable=False),
    StructField("tenant_id", IntegerType(), nullable=False),
    StructField("asset_name", StringType(), nullable=False),
    StructField("asset_type", StringType(), nullable=False),
    StructField("health_score", IntegerType(), nullable=False),
    StructField("risk_score", IntegerType(), nullable=False),
    StructField("failure_probability", DoubleType(), nullable=True),
    StructField("recommended_action", StringType(), nullable=True),
    StructField("urgency", StringType(), nullable=False),                # ROUTINE, SOON, URGENT, IMMEDIATE
    StructField("last_inspection_date", StringType(), nullable=True),
    StructField("open_work_orders", IntegerType(), nullable=False),
    StructField("generated_at", TimestampType(), nullable=False),
])


# ============================================================================
# gold.model_detection_summary
#
# Aggregated ML/CV detection metrics per (model, tenant, date).
# ============================================================================

MODEL_DETECTION_SUMMARY_SCHEMA = StructType([
    StructField("tenant_id", IntegerType(), nullable=False),
    StructField("model_name", StringType(), nullable=False),
    StructField("model_version", StringType(), nullable=False),
    StructField("detection_date", StringType(), nullable=False),
    StructField("total_predictions", IntegerType(), nullable=False),
    StructField("positive_predictions", IntegerType(), nullable=False),
    StructField("avg_confidence", DoubleType(), nullable=True),
    StructField("confirmed_count", IntegerType(), nullable=False),
    StructField("dismissed_count", IntegerType(), nullable=False),
    StructField("pending_review_count", IntegerType(), nullable=False),
    StructField("precision_estimate", DoubleType(), nullable=True),
    StructField("last_updated", TimestampType(), nullable=False),
])


# ============================================================================
# gold.cv_hourly_safety_metrics
# ============================================================================

CV_HOURLY_SAFETY_METRICS_SCHEMA = StructType([
    StructField("camera_id", IntegerType(), nullable=False),
    StructField("tenant_id", IntegerType(), nullable=False),
    StructField("hour_start", TimestampType(), nullable=False),
    StructField("total_detections", IntegerType(), nullable=False),
    StructField("zone_violations", IntegerType(), nullable=False),
    StructField("max_active_amrs", IntegerType(), nullable=False),
    StructField("last_updated", TimestampType(), nullable=False),
])

# ============================================================================
# Registry
# ============================================================================

GOLD_TABLE_SCHEMAS: dict[str, StructType] = {
    "asset_health": ASSET_HEALTH_SCHEMA,
    "asset_daily_metrics": ASSET_DAILY_METRICS_SCHEMA,
    "sensor_hourly_metrics": SENSOR_HOURLY_METRICS_SCHEMA,
    "incident_summary": INCIDENT_SUMMARY_SCHEMA,
    "inspection_compliance": INSPECTION_COMPLIANCE_SCHEMA,
    "camera_health": CAMERA_HEALTH_SCHEMA,
    "asset_risk_score": ASSET_RISK_SCORE_SCHEMA,
    "maintenance_candidates": MAINTENANCE_CANDIDATES_SCHEMA,
    "model_detection_summary": MODEL_DETECTION_SUMMARY_SCHEMA,
    "cv_hourly_safety_metrics": CV_HOURLY_SAFETY_METRICS_SCHEMA,
}
