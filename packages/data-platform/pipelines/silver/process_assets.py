"""
Silver Processing Pipeline: Assets
Reads from Bronze asset events, validates schema, deduplicates by (asset_id, tenant_id),
and writes clean standardized data to Silver Delta table.
"""
import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from pyspark.sql import SparkSession
from pyspark.sql.functions import col, current_timestamp, upper, when, lit, coalesce
from pyspark.sql.window import Window
from pyspark.sql.functions import row_number
from pipelines.silver.schemas import ASSETS_SCHEMA

BRONZE_TABLE_PATH = "workspace.default.asset_events_bronze"
SILVER_TABLE_PATH = "workspace.default.assets_silver"
QUARANTINE_TABLE_PATH = "workspace.default.assets_quarantine"

def run():
    print(f"Starting Silver Asset Processing from {BRONZE_TABLE_PATH}")
    spark = SparkSession.builder.getOrCreate()

    try:
        try:
            df = spark.read.table(BRONZE_TABLE_PATH)
        except Exception:
            print(f"Bronze table not found at {BRONZE_TABLE_PATH}. Run ingestion first.")
            return

        # Transformation and Standardization
        silver_df = df \
            .withColumn("asset_id", col("id").cast("integer")) \
            .withColumn("tenant_id", col("tenantId").cast("integer")) \
            .withColumn("asset_type", coalesce(col("assetType"), col("type"), lit("GENERAL"))) \
            .withColumn("name", col("name").cast("string")) \
            .withColumn("description", col("description").cast("string")) \
            .withColumn("latitude", col("latitude").cast("decimal(10,8)")) \
            .withColumn("longitude", col("longitude").cast("decimal(11,8)")) \
            .withColumn("address", col("address").cast("string")) \
            .withColumn("status", upper(coalesce(col("status"), lit("ACTIVE")))) \
            .withColumn("health_score", coalesce(col("healthScore"), col("health_score"), lit(100)).cast("integer")) \
            .withColumn("created_at", coalesce(col("createdAt"), current_timestamp()).cast("timestamp")) \
            .withColumn("updated_at", coalesce(col("updatedAt"), current_timestamp()).cast("timestamp")) \
            .withColumn("_bronze_batch_id", col("_batch_id")) \
            .withColumn("_validated_at", current_timestamp()) \
            .withColumn("_validation_version", lit(1))

        # Quarantine invalid records (missing asset_id or tenant_id or empty name)
        valid_condition = col("asset_id").isNotNull() & col("tenant_id").isNotNull() & col("name").isNotNull()
        valid_df = silver_df.filter(valid_condition)
        invalid_df = silver_df.filter(~valid_condition)

        if invalid_df.count() > 0:
            print(f"Quarantining {invalid_df.count()} invalid asset records to {QUARANTINE_TABLE_PATH}")
            invalid_df.write.format("delta").mode("append").saveAsTable(QUARANTINE_TABLE_PATH)

        # Deduplication: Keep latest updated record per asset_id
        window_spec = Window.partitionBy("asset_id", "tenant_id").orderBy(col("_ingestion_timestamp").desc())
        deduped_df = valid_df.withColumn("rn", row_number().over(window_spec)) \
            .filter(col("rn") == 1) \
            .drop("rn")

        # Select only valid schema fields
        schema_fields = [f.name for f in ASSETS_SCHEMA.fields]
        final_df = deduped_df.select([c for c in deduped_df.columns if c in schema_fields])

        final_df.write \
            .format("delta") \
            .mode("overwrite") \
            .option("mergeSchema", "true") \
            .partitionBy("tenant_id") \
            .saveAsTable(SILVER_TABLE_PATH)

        print(f"Successfully processed assets to {SILVER_TABLE_PATH}")
    except Exception as e:
        print(f"Error processing silver assets: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    run()
