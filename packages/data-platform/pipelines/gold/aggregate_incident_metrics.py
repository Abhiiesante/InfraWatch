"""
Gold Aggregation Pipeline: Incident MTTR & Severity Metrics
Computes mean time to resolution (MTTR), resolution rates, and open severity totals by tenant.
"""
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from pyspark.sql import SparkSession
from pyspark.sql.functions import col, current_timestamp, count, when, avg, coalesce, lit, to_date

SILVER_INCIDENTS = "workspace.default.incidents_silver"
GOLD_INCIDENT_METRICS = "workspace.default.incident_metrics_gold"

def run():
    print(f"Starting Gold Incident Metrics Aggregation...")
    spark = SparkSession.builder.getOrCreate()

    try:
        try:
            incidents_df = spark.read.table(SILVER_INCIDENTS)
        except Exception:
            print(f"Silver incidents table not found at {SILVER_INCIDENTS}. Skipping Gold incident metrics aggregation.")
            return

        # Calculate resolution duration in hours where resolved_at is present
        duration_hours = (col("resolved_at").cast("long") - col("created_at").cast("long")) / 3600.0

        with_duration = incidents_df.withColumn(
            "resolution_duration_hours",
            when(col("resolved_at").isNotNull(), duration_hours).otherwise(None)
        )

        gold_df = with_duration.groupBy("tenant_id").agg(
            count("*").alias("total_incidents"),
            count(when(col("status").isin("OPEN", "IN_PROGRESS"), 1)).alias("open_incidents"),
            count(when(col("status") == "RESOLVED", 1)).alias("resolved_incidents"),
            count(when(col("severity") == "CRITICAL", 1)).alias("critical_incidents"),
            count(when(col("severity") == "HIGH", 1)).alias("high_incidents"),
            coalesce(avg("resolution_duration_hours"), lit(0.0)).alias("mttr_hours")
        ).withColumn("last_aggregated_at", current_timestamp())

        gold_df.write \
            .format("delta") \
            .mode("overwrite") \
            .option("mergeSchema", "true") \
            .saveAsTable(GOLD_INCIDENT_METRICS)

        print(f"Successfully aggregated incident metrics to {GOLD_INCIDENT_METRICS}")
    except Exception as e:
        print(f"Error aggregating gold incident metrics: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    run()
