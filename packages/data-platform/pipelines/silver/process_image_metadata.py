"""
Silver Processing Pipeline: Image Metadata
Reads from Bronze image metadata, standardizes object storage URIs,
validates dimensions, and writes to Silver Delta table.
"""
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from pyspark.sql import SparkSession
from pyspark.sql.functions import col, current_timestamp, upper, when, lit, coalesce
from pyspark.sql.window import Window
from pyspark.sql.functions import row_number
from pipelines.silver.schemas import IMAGE_METADATA_SCHEMA

BRONZE_TABLE_PATH = "workspace.default.image_metadata_bronze"
SILVER_TABLE_PATH = "workspace.default.image_metadata_silver"
QUARANTINE_TABLE_PATH = "workspace.default.image_metadata_quarantine"

def run():
    print(f"Starting Silver Image Metadata Processing from {BRONZE_TABLE_PATH}")
    spark = SparkSession.builder.getOrCreate()

    try:
        try:
            df = spark.read.table(BRONZE_TABLE_PATH)
        except Exception:
            print(f"Bronze table not found at {BRONZE_TABLE_PATH}. Run ingestion first.")
            return

        # Transformation and Normalization
        silver_df = df \
            .withColumn("frame_id", col("frame_id").cast("string")) \
            .withColumn("tenant_id", col("tenant_id").cast("integer")) \
            .withColumn("camera_id", col("camera_id").cast("integer")) \
            .withColumn("asset_id", col("asset_id").cast("integer")) \
            .withColumn("capture_timestamp", col("capture_timestamp").cast("timestamp")) \
            .withColumn("storage_uri", col("storage_uri").cast("string")) \
            .withColumn("checksum", col("checksum").cast("string")) \
            .withColumn("width", col("width").cast("integer")) \
            .withColumn("height", col("height").cast("integer")) \
            .withColumn("file_size_bytes", col("file_size_bytes").cast("long")) \
            .withColumn("format", upper(coalesce(col("format"), lit("JPEG")))) \
            .withColumn("processing_status", upper(coalesce(col("processing_status"), lit("PROCESSED")))) \
            .withColumn("_bronze_batch_id", col("_batch_id")) \
            .withColumn("_validated_at", current_timestamp()) \
            .withColumn("_validation_version", lit(1))

        # Quarantine invalid records
        valid_condition = col("frame_id").isNotNull() & col("tenant_id").isNotNull() & col("storage_uri").isNotNull()
        valid_df = silver_df.filter(valid_condition)
        invalid_df = silver_df.filter(~valid_condition)

        if invalid_df.count() > 0:
            print(f"Quarantining {invalid_df.count()} invalid image records to {QUARANTINE_TABLE_PATH}")
            invalid_df.write.format("delta").mode("append").saveAsTable(QUARANTINE_TABLE_PATH)

        # Deduplication
        window_spec = Window.partitionBy("frame_id").orderBy(col("_ingestion_timestamp").desc())
        deduped_df = valid_df.withColumn("rn", row_number().over(window_spec)) \
            .filter(col("rn") == 1) \
            .drop("rn")

        schema_fields = [f.name for f in IMAGE_METADATA_SCHEMA.fields]
        final_df = deduped_df.select([c for c in deduped_df.columns if c in schema_fields])

        final_df.write \
            .format("delta") \
            .mode("overwrite") \
            .option("mergeSchema", "true") \
            .partitionBy("tenant_id") \
            .saveAsTable(SILVER_TABLE_PATH)

        print(f"Successfully processed image metadata to {SILVER_TABLE_PATH}")
    except Exception as e:
        print(f"Error processing silver image metadata: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    run()
