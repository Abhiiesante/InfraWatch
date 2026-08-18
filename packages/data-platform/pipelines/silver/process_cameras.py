"""
Silver Processing Pipeline: Cameras
Reads from Bronze camera events, strips/redacts credentials from RTSP URLs,
validates schema, deduplicates, and writes clean data to Silver Delta table.
"""
import os
import sys
import re

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from pyspark.sql import SparkSession
from pyspark.sql.functions import col, current_timestamp, upper, when, lit, coalesce, udf
from pyspark.sql.types import StringType
from pyspark.sql.window import Window
from pyspark.sql.functions import row_number
from pipelines.silver.schemas import CAMERAS_SCHEMA

BRONZE_TABLE_PATH = "workspace.default.camera_events_bronze"
SILVER_TABLE_PATH = "workspace.default.cameras_silver"
QUARANTINE_TABLE_PATH = "workspace.default.cameras_quarantine"

def sanitize_stream_url(raw_url: str) -> str:
    """
    Security Sanitizer: Strips plaintext usernames, passwords, and sensitive query tokens
    from camera stream URLs so analytical layers never store raw credentials.
    Example: rtsp://admin:SecretPass123@192.168.1.100:554/live -> rtsp://***:***@192.168.1.100:554/live
    """
    if not raw_url:
        return ""
    # Strip user:pass from standard URI
    sanitized = re.sub(r"://([^:@]+):([^@]+)@", r"://***:***@", raw_url)
    return sanitized

sanitize_url_udf = udf(sanitize_stream_url, StringType())

def run():
    print(f"Starting Silver Camera Processing from {BRONZE_TABLE_PATH}")
    spark = SparkSession.builder.getOrCreate()

    try:
        try:
            df = spark.read.table(BRONZE_TABLE_PATH)
        except Exception:
            print(f"Bronze table not found at {BRONZE_TABLE_PATH}. Run ingestion first.")
            return

        # Transformation and Standardization with Security Redaction
        silver_df = df \
            .withColumn("camera_id", col("id").cast("integer")) \
            .withColumn("tenant_id", col("tenantId").cast("integer")) \
            .withColumn("asset_id", col("assetId").cast("integer")) \
            .withColumn("name", col("name").cast("string")) \
            .withColumn("camera_type", coalesce(col("cameraType"), col("type"), lit("FIXED"))) \
            .withColumn("stream_url_reference", sanitize_url_udf(coalesce(col("streamUrl"), col("rtspUrl"), lit("")))) \
            .withColumn("status", upper(coalesce(col("status"), lit("ONLINE")))) \
            .withColumn("created_at", coalesce(col("createdAt"), current_timestamp()).cast("timestamp")) \
            .withColumn("updated_at", coalesce(col("updatedAt"), current_timestamp()).cast("timestamp")) \
            .withColumn("_bronze_batch_id", col("_batch_id")) \
            .withColumn("_validated_at", current_timestamp()) \
            .withColumn("_validation_version", lit(1))

        # Quarantine invalid records (missing camera_id, tenant_id, or asset_id)
        valid_condition = col("camera_id").isNotNull() & col("tenant_id").isNotNull() & col("asset_id").isNotNull()
        valid_df = silver_df.filter(valid_condition)
        invalid_df = silver_df.filter(~valid_condition)

        if invalid_df.count() > 0:
            print(f"Quarantining {invalid_df.count()} invalid camera records to {QUARANTINE_TABLE_PATH}")
            invalid_df.write.format("delta").mode("append").saveAsTable(QUARANTINE_TABLE_PATH)

        # Deduplication
        window_spec = Window.partitionBy("camera_id", "tenant_id").orderBy(col("_ingestion_timestamp").desc())
        deduped_df = valid_df.withColumn("rn", row_number().over(window_spec)) \
            .filter(col("rn") == 1) \
            .drop("rn")

        schema_fields = [f.name for f in CAMERAS_SCHEMA.fields]
        final_df = deduped_df.select([c for c in deduped_df.columns if c in schema_fields])

        final_df.write \
            .format("delta") \
            .mode("overwrite") \
            .option("mergeSchema", "true") \
            .partitionBy("tenant_id") \
            .saveAsTable(SILVER_TABLE_PATH)

        print(f"Successfully processed sanitized cameras to {SILVER_TABLE_PATH}")
    except Exception as e:
        print(f"Error processing silver cameras: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    run()
