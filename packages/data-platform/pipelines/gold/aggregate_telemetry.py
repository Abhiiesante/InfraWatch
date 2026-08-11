"""
Gold Aggregation Pipeline: Telemetry
Reads from Silver, computes daily aggregates per asset, and writes to Gold Delta.
"""
import os
import sys

# Add the package root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from pyspark.sql import SparkSession
from pyspark.sql.functions import col, count, sum as spark_sum, avg, max as spark_max, when, round
from pipelines.gold.schemas import ASSET_DAILY_METRICS_SCHEMA

SILVER_TABLE_PATH = "workspace.default.sensor_telemetry_silver"
GOLD_TABLE_PATH = "workspace.default.asset_daily_metrics_gold"

def run():
    print(f"Starting Gold Telemetry Aggregation from {SILVER_TABLE_PATH}")
    
    spark = SparkSession.builder.getOrCreate()

    try:
        try:
            df = spark.read.table(SILVER_TABLE_PATH)
        except Exception:
            print(f"Silver table not found at {SILVER_TABLE_PATH}. Run processing first.")
            return

        # Aggregation Logic
        gold_df = df.groupBy("asset_id", "tenant_id", "event_date") \
            .agg(
                count("*").alias("total_readings"),
                spark_sum(col("is_anomaly").cast("integer")).alias("anomaly_readings"),
                avg(when(col("sensor_type").like("%TEMP%"), col("value"))).alias("avg_temperature"),
                spark_max(when(col("sensor_type").like("%TEMP%"), col("value"))).alias("max_temperature")
            ) \
            .withColumn("anomaly_rate", round(col("anomaly_readings") / col("total_readings"), 4)) \
            .withColumnRenamed("event_date", "metric_date")

        print("Writing to Gold Delta table...")
        
        # In a real environment, we would use MERGE INTO (upsert) for Gold tables.
        # For simplicity in local execution, we use append with partitionOverwriteMode
        spark.conf.set("spark.sql.sources.partitionOverwriteMode", "dynamic")
        
        # Ensure schema fields align before saving
        schema_fields = [f.name for f in ASSET_DAILY_METRICS_SCHEMA.fields]
        # Add missing columns as nulls if any exist in schema but not dataframe
        for field in schema_fields:
            if field not in gold_df.columns:
                gold_df = gold_df.withColumn(field, lit(None))
                
        final_df = gold_df.select([c for c in schema_fields])

        final_df.write \
            .format("delta") \
            .mode("overwrite") \
            .option("mergeSchema", "true") \
            .partitionBy("tenant_id") \
            .saveAsTable(GOLD_TABLE_PATH)
            
        print(f"Successfully processed to {GOLD_TABLE_PATH}")
    except Exception as e:
        print(f"Error processing gold telemetry: {e}")
        import traceback
        traceback.print_exc()
        raise e

if __name__ == "__main__":
    from pyspark.sql.functions import lit
    run()
