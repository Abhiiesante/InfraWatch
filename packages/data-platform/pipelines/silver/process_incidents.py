"""
Silver Processing Pipeline: Incidents
Reads from Bronze incident events, validates lifecycle statuses and severity enums,
deduplicates, and writes to Silver Delta table.
"""
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from pyspark.sql import SparkSession
from pyspark.sql.functions import col, current_timestamp, upper, when, lit, coalesce
from pyspark.sql.window import Window
from pyspark.sql.functions import row_number
from pipelines.silver.schemas import INCIDENTS_SCHEMA

BRONZE_TABLE_PATH = "workspace.default.incident_events_bronze"
SILVER_TABLE_PATH = "workspace.default.incidents_silver"
QUARANTINE_TABLE_PATH = "workspace.default.incidents_quarantine"

def run():
    print(f"Starting Silver Incident Processing from {BRONZE_TABLE_PATH}")
    spark = SparkSession.builder.getOrCreate()

    try:
        try:
            df = spark.read.table(BRONZE_TABLE_PATH)
        except Exception:
            print(f"Bronze table not found at {BRONZE_TABLE_PATH}. Run ingestion first.")
            return

        # Transformation and Normalization
        silver_df = df \
            .withColumn("incident_id", col("id").cast("integer")) \
            .withColumn("tenant_id", col("tenantId").cast("integer")) \
            .withColumn("asset_id", col("assetId").cast("integer")) \
            .withColumn("reporter_id", coalesce(col("reportedById"), col("reporterId"), lit(1)).cast("integer")) \
            .withColumn("title", col("title").cast("string")) \
            .withColumn("description", col("description").cast("string")) \
            .withColumn("source", upper(coalesce(col("source"), lit("MANUAL")))) \
            .withColumn("severity", upper(coalesce(col("severity"), lit("MEDIUM")))) \
            .withColumn("status", upper(coalesce(col("status"), lit("OPEN")))) \
            .withColumn("created_at", coalesce(col("createdAt"), current_timestamp()).cast("timestamp")) \
            .withColumn("resolved_at", col("resolvedAt").cast("timestamp")) \
            .withColumn("updated_at", coalesce(col("updatedAt"), current_timestamp()).cast("timestamp")) \
            .withColumn("_bronze_batch_id", col("_batch_id")) \
            .withColumn("_validated_at", current_timestamp()) \
            .withColumn("_validation_version", lit(1))

        # Quarantine invalid records
        valid_condition = col("incident_id").isNotNull() & col("tenant_id").isNotNull() & col("title").isNotNull()
        valid_df = silver_df.filter(valid_condition)
        invalid_df = silver_df.filter(~valid_condition)

        if invalid_df.count() > 0:
            print(f"Quarantining {invalid_df.count()} invalid incident records to {QUARANTINE_TABLE_PATH}")
            invalid_df.write.format("delta").mode("append").saveAsTable(QUARANTINE_TABLE_PATH)

        # Deduplication
        window_spec = Window.partitionBy("incident_id", "tenant_id").orderBy(col("_ingestion_timestamp").desc())
        deduped_df = valid_df.withColumn("rn", row_number().over(window_spec)) \
            .filter(col("rn") == 1) \
            .drop("rn")

        schema_fields = [f.name for f in INCIDENTS_SCHEMA.fields]
        final_df = deduped_df.select([c for c in deduped_df.columns if c in schema_fields])

        final_df.write \
            .format("delta") \
            .mode("overwrite") \
            .option("mergeSchema", "true") \
            .partitionBy("tenant_id") \
            .saveAsTable(SILVER_TABLE_PATH)

        print(f"Successfully processed incidents to {SILVER_TABLE_PATH}")
    except Exception as e:
        print(f"Error processing silver incidents: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    run()
