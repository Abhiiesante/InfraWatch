"""
Silver Processing Pipeline: CV Events
Reads from Bronze, explodes the detections array, cleanses, deduplicates, and writes to Silver Delta.
"""
import os
import sys
import uuid
import datetime

# Add the package root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from pyspark.sql import SparkSession
from pyspark.sql.functions import col, current_timestamp, upper, lit, udf, explode, coalesce
from pyspark.sql.types import StringType
from pipelines.silver.schemas import CV_DETECTIONS_SCHEMA

BRONZE_TABLE_PATH = "workspace.default.cv_events_bronze"
SILVER_TABLE_PATH = "workspace.default.cv_detections_silver"

uuid_udf = udf(lambda: str(uuid.uuid4()), StringType())

def run():
    print(f"Starting Silver CV Detections Processing from {BRONZE_TABLE_PATH}")
    
    spark = SparkSession.builder.getOrCreate()

    try:
        try:
            df = spark.read.table(BRONZE_TABLE_PATH)
        except Exception:
            print(f"Bronze table not found at {BRONZE_TABLE_PATH}. Run CV ingestion first.")
            return

        # Explode the detections array so each bounding box is its own row
        exploded_df = df.withColumn("detection", explode(col("detections")))

        # Assuming tenant_id = 1 for now (since backend cv-daemon payload doesn't include it yet)
        silver_df = exploded_df \
            .withColumn("detection_id", coalesce(col("detection.id"), uuid_udf())) \
            .withColumn("camera_id", col("camera_id").cast("integer")) \
            .withColumn("tenant_id", lit(1).cast("integer")) \
            .withColumn("event_timestamp", col("timestamp").cast("timestamp")) \
            .withColumn("model_name", col("model")) \
            .withColumn("label", upper(col("detection.label"))) \
            .withColumn("confidence", col("detection.conf").cast("integer")) \
            .withColumn("x", col("detection.x").cast("double")) \
            .withColumn("y", col("detection.y").cast("double")) \
            .withColumn("width", col("detection.w").cast("double")) \
            .withColumn("height", col("detection.h").cast("double")) \
            .withColumn("is_violation", col("detection.isViolation").cast("boolean")) \
            .withColumn("event_date", col("_ingestion_date")) \
            .withColumn("_validated_at", current_timestamp()) \
            .withColumn("_validation_version", lit(1)) \
            .withColumn("_bronze_batch_id", col("_batch_id"))

        # Deduplication (Keep latest reading per camera/detection_id)
        from pyspark.sql.window import Window
        from pyspark.sql.functions import row_number
        
        windowSpec = Window.partitionBy("camera_id", "detection_id").orderBy(col("event_timestamp").desc())
        
        deduped_df = silver_df.withColumn("rn", row_number().over(windowSpec)) \
            .filter(col("rn") == 1) \
            .drop("rn")

        schema_fields = [f.name for f in CV_DETECTIONS_SCHEMA.fields]
        final_df = deduped_df.select([c for c in deduped_df.columns if c in schema_fields])

        print("Writing to Silver CV Detections Delta table...")
        
        final_df.write \
            .format("delta") \
            .mode("append") \
            .option("mergeSchema", "true") \
            .partitionBy("tenant_id", "event_date") \
            .saveAsTable(SILVER_TABLE_PATH)
            
        print(f"Successfully processed CV events to {SILVER_TABLE_PATH}")
    except Exception as e:
        print(f"Error processing silver cv events: {e}")
        import traceback
        traceback.print_exc()
        raise e

if __name__ == "__main__":
    run()
