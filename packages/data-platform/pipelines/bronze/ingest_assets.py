"""
Bronze Ingestion Pipeline: Assets
Reads raw asset JSON from landing zone and losslessly appends to Bronze Delta table.
"""
import os
import sys
import uuid
import datetime

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from pyspark.sql import SparkSession
from pyspark.sql.functions import current_timestamp, lit, input_file_name, udf, to_json, struct
from pyspark.sql.types import StringType
from pipelines.bronze.schemas import ASSET_EVENTS_SCHEMA

DATA_LAKE_PATH = os.environ.get("DATA_LAKE_PATH", "/Volumes")
RAW_DATA_PATH = f"{DATA_LAKE_PATH}/workspace/default/infrawatch_raw/assets/*/*.json"
BRONZE_TABLE_PATH = "workspace.default.asset_events_bronze"

def generate_hash(record: str) -> str:
    import hashlib
    if record is None:
        return ""
    return hashlib.sha256(record.encode("utf-8")).hexdigest()

hash_udf = udf(generate_hash, StringType())
uuid_udf = udf(lambda: str(uuid.uuid4()), StringType())
date_udf = udf(lambda: datetime.datetime.now().strftime("%Y-%m-%d"), StringType())

def run():
    print(f"Starting Bronze Asset Ingestion from {RAW_DATA_PATH}")
    spark = SparkSession.builder.getOrCreate()

    try:
        import glob
        if not glob.glob(RAW_DATA_PATH):
            print(f"No raw asset files found in {RAW_DATA_PATH}. Skipping Bronze asset ingestion.")
            return

        df = spark.read.json(RAW_DATA_PATH)

        enriched_df = df \
            .withColumn("_ingestion_timestamp", current_timestamp()) \
            .withColumn("_source", lit("operational_db")) \
            .withColumn("_source_file", input_file_name()) \
            .withColumn("_batch_id", uuid_udf()) \
            .withColumn("_record_hash", hash_udf(to_json(struct([df[x] for x in df.columns])))) \
            .withColumn("_schema_version", lit(1)) \
            .withColumn("_ingestion_date", date_udf())

        enriched_df.write \
            .format("delta") \
            .mode("append") \
            .option("mergeSchema", "true") \
            .partitionBy("_ingestion_date") \
            .saveAsTable(BRONZE_TABLE_PATH)

        print(f"Successfully ingested assets to {BRONZE_TABLE_PATH}")
    except Exception as e:
        print(f"Error processing bronze assets: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    run()
