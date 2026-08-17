"""
Gold Aggregation Pipeline: CV Metrics
Aggregates silver cv detections into hourly safety metrics per camera.
"""
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from pyspark.sql import SparkSession
from pyspark.sql.functions import col, window, count, max as spark_max, sum as spark_sum, when, current_timestamp
from pipelines.gold.schemas import CV_HOURLY_SAFETY_METRICS_SCHEMA

SILVER_TABLE_PATH = "workspace.default.cv_detections_silver"
GOLD_TABLE_PATH = "workspace.default.cv_hourly_safety_metrics_gold"

def run():
    print(f"Starting Gold CV Metrics Aggregation from {SILVER_TABLE_PATH}")
    
    spark = SparkSession.builder.getOrCreate()

    try:
        try:
            df = spark.read.table(SILVER_TABLE_PATH)
        except Exception:
            print(f"Silver table not found at {SILVER_TABLE_PATH}. Run CV processing first.")
            return

        # Aggregate by camera, tenant, and hour
        # Metrics:
        # - total_detections: count of all detections
        # - zone_violations: count of violations
        # - max_active_amrs: max number of AMRs detected in any single event timestamp within the hour
        # Note: to get max active AMRs per hour, we could group by event_timestamp first, but for simplicity we will just count AMRs per event_timestamp and then max over the hour window.
        
        # Step 1: Count AMRs per event_timestamp
        amr_counts = df.filter(col("label").isin("AMR", "FORKLIFT", "VEHICLE")) \
            .groupBy("camera_id", "tenant_id", "event_timestamp") \
            .agg(count("*").alias("amr_count"))
            
        # Step 2: Join back or just calculate hourly max
        # A simpler approach: window over the hour
        
        hourly_aggs = df \
            .groupBy("camera_id", "tenant_id", window("event_timestamp", "1 hour").alias("hour_window")) \
            .agg(
                count("*").alias("total_detections"),
                spark_sum(col("is_violation").cast("integer")).alias("zone_violations")
            )
            
        hourly_amrs = amr_counts \
            .groupBy("camera_id", "tenant_id", window("event_timestamp", "1 hour").alias("hour_window")) \
            .agg(spark_max("amr_count").alias("max_active_amrs"))
            
        # Join aggregations
        gold_df = hourly_aggs.join(hourly_amrs, ["camera_id", "tenant_id", "hour_window"], "left") \
            .fillna({"max_active_amrs": 0}) \
            .withColumn("hour_start", col("hour_window.start")) \
            .withColumn("last_updated", current_timestamp()) \
            .drop("hour_window")

        schema_fields = [f.name for f in CV_HOURLY_SAFETY_METRICS_SCHEMA.fields]
        final_df = gold_df.select([c for c in gold_df.columns if c in schema_fields])

        print("Writing to Gold CV Metrics Delta table...")
        
        final_df.write \
            .format("delta") \
            .mode("overwrite") \
            .option("mergeSchema", "true") \
            .saveAsTable(GOLD_TABLE_PATH)
            
        print(f"Successfully aggregated CV metrics to {GOLD_TABLE_PATH}")
    except Exception as e:
        print(f"Error aggregating gold cv metrics: {e}")
        import traceback
        traceback.print_exc()
        raise e

if __name__ == "__main__":
    run()
