"""
Silver Processing Pipeline: Telemetry
Reads from Bronze, cleanses, deduplicates, validates against schema, and writes to Silver Delta.
"""
import os
import sys
import uuid
import datetime

# Add the package root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from pyspark.sql import SparkSession
from pyspark.sql.functions import col, current_timestamp, upper, when, lit, udf
from pyspark.sql.types import StringType
from pipelines.silver.schemas import SENSOR_TELEMETRY_SCHEMA

BRONZE_TABLE_PATH = "workspace.default.sensor_telemetry_bronze"
SILVER_TABLE_PATH = "workspace.default.sensor_telemetry_silver"

uuid_udf = udf(lambda: str(uuid.uuid4()), StringType())

def run():
    print(f"Starting Silver Telemetry Processing from {BRONZE_TABLE_PATH}")
    
    spark = SparkSession.builder.getOrCreate()

    try:
        # Read from Bronze table
        try:
            df = spark.read.table(BRONZE_TABLE_PATH)
        except Exception:
            print(f"Bronze table not found at {BRONZE_TABLE_PATH}. Run ingestion first.")
            return

        # Transformation and Cleansing
        silver_df = df \
            .withColumn("event_id", uuid_udf()) \
            .withColumn("tenant_id", col("tenantId").cast("integer")) \
            .withColumn("asset_id", col("assetId").cast("integer")) \
            .withColumn("sensor_id", lit(None).cast("string")) \
            .withColumn("sensor_type", upper(col("sensorType"))) \
            .withColumn("event_timestamp", col("timestamp").cast("timestamp")) \
            .withColumn("value", col("value").cast("double")) \
            .withColumn("unit", upper(col("unit"))) \
            .withColumn("quality", when(col("value").isNull(), "BAD").otherwise("GOOD")) \
            .withColumn("is_anomaly", col("isAnomaly").cast("boolean")) \
            .withColumn("event_date", col("_ingestion_date")) \
            .withColumn("_processed_timestamp", current_timestamp()) \
            .withColumn("_bronze_record_hash", col("_record_hash"))

        # Deduplication (Keep latest reading per asset/sensor/timestamp)
        # Using row_number over window
        from pyspark.sql.window import Window
        from pyspark.sql.functions import row_number
        
        windowSpec = Window.partitionBy("asset_id", "sensor_type", "event_timestamp").orderBy(col("_ingestion_timestamp").desc())
        
        deduped_df = silver_df.withColumn("rn", row_number().over(windowSpec)) \
            .filter(col("rn") == 1) \
            .drop("rn")

        # Select only columns present in the Silver schema
        schema_fields = [f.name for f in SENSOR_TELEMETRY_SCHEMA.fields]
        final_df = deduped_df.select([c for c in deduped_df.columns if c in schema_fields])

        print("Writing to Silver Delta table...")
        
        final_df.write \
            .format("delta") \
            .mode("append") \
            .option("mergeSchema", "true") \
            .partitionBy("tenant_id", "event_date") \
            .saveAsTable(SILVER_TABLE_PATH)
            
        print(f"Successfully processed to {SILVER_TABLE_PATH}")
    except Exception as e:
        print(f"Error processing silver telemetry: {e}")
        import traceback
        traceback.print_exc()
        raise e

if __name__ == "__main__":
    run()
