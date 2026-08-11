"""
Bronze Ingestion Pipeline: Telemetry
Reads raw JSON from the landing zone and losslessly writes it to a Bronze Delta table.
"""
import os
import sys
import uuid
import datetime

# Add the package root to sys.path so 'pipelines' module can be found
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from pyspark.sql import SparkSession
from pyspark.sql.functions import current_timestamp, lit, input_file_name, udf, to_json, struct
from pyspark.sql.types import StringType
from pipelines.bronze.schemas import SENSOR_TELEMETRY_SCHEMA

# Configure paths
RAW_DATA_PATH = "/Volumes/workspace/default/infrawatch_raw/telemetry/*/*.json"
BRONZE_TABLE_PATH = "workspace.default.sensor_telemetry_bronze"

def generate_hash(record: str) -> str:
    import hashlib
    if record is None:
        return ""
    return hashlib.sha256(record.encode("utf-8")).hexdigest()

hash_udf = udf(generate_hash, StringType())
uuid_udf = udf(lambda: str(uuid.uuid4()), StringType())
date_udf = udf(lambda: datetime.datetime.now().strftime("%Y-%m-%d"), StringType())

def run():
    print(f"Starting Bronze Telemetry Ingestion from {RAW_DATA_PATH}")
    
    # In Databricks Serverless Job, spark session is automatically available or created this way
    spark = SparkSession.builder.getOrCreate()

    try:
        # Check if any files exist to avoid path not found error
        import glob
        if not glob.glob(RAW_DATA_PATH):
            print(f"No raw files found in {RAW_DATA_PATH}. Skipping Bronze ingestion.")
            return

        df = spark.read \
            .schema(SENSOR_TELEMETRY_SCHEMA) \
            .json(RAW_DATA_PATH)

        # Append standard bronze metadata
        enriched_df = df \
            .withColumn("_ingestion_timestamp", current_timestamp()) \
            .withColumn("_source", lit("operational_db")) \
            .withColumn("_source_file", input_file_name()) \
            .withColumn("_batch_id", uuid_udf()) \
            .withColumn("_record_hash", hash_udf(to_json(struct([df[x] for x in df.columns])))) \
            .withColumn("_schema_version", lit(1)) \
            .withColumn("_ingestion_date", date_udf())

        print("Writing to Bronze Delta table...")
        
        enriched_df.write \
            .format("delta") \
            .mode("append") \
            .option("mergeSchema", "true") \
            .partitionBy("_ingestion_date") \
            .saveAsTable(BRONZE_TABLE_PATH)
            
        print(f"Successfully ingested telemetry to {BRONZE_TABLE_PATH}")
    except Exception as e:
        print(f"Error processing bronze telemetry: {e}")
        import traceback
        traceback.print_exc()
        raise e

if __name__ == "__main__":
    run()
