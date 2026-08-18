"""
Gold Aggregation Pipeline: Inspection Compliance & Completion Rates
Computes on-time completion rates, scheduled vs overdue audits, and inspector workload metrics.
"""
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from pyspark.sql import SparkSession
from pyspark.sql.functions import col, current_timestamp, count, when, avg, coalesce, lit

SILVER_INSPECTIONS = "workspace.default.inspections_silver"
GOLD_INSPECTION_COMPLIANCE = "workspace.default.inspection_compliance_gold"

def run():
    print(f"Starting Gold Inspection Compliance Aggregation...")
    spark = SparkSession.builder.getOrCreate()

    try:
        try:
            insp_df = spark.read.table(SILVER_INSPECTIONS)
        except Exception:
            print(f"Silver inspections table not found at {SILVER_INSPECTIONS}. Skipping Gold inspection aggregation.")
            return

        gold_df = insp_df.groupBy("tenant_id").agg(
            count("*").alias("total_inspections"),
            count(when(col("status") == "COMPLETED", 1)).alias("completed_inspections"),
            count(when(col("status") == "SCHEDULED", 1)).alias("scheduled_inspections"),
            count(when(col("status") == "OVERDUE", 1)).alias("overdue_inspections"),
            count(when(col("status") == "IN_PROGRESS", 1)).alias("in_progress_inspections")
        ).withColumn(
            "compliance_rate",
            when(col("total_inspections") > 0, (col("completed_inspections") / col("total_inspections")) * 100.0).otherwise(100.0)
        ).withColumn("last_aggregated_at", current_timestamp())

        gold_df.write \
            .format("delta") \
            .mode("overwrite") \
            .option("mergeSchema", "true") \
            .saveAsTable(GOLD_INSPECTION_COMPLIANCE)

        print(f"Successfully aggregated inspection compliance to {GOLD_INSPECTION_COMPLIANCE}")
    except Exception as e:
        print(f"Error aggregating gold inspection compliance: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    run()
