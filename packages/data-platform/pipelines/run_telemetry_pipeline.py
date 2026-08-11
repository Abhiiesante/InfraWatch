"""
Telemetry Pipeline Orchestrator
Simulates a Databricks Job that runs Bronze -> Silver -> Gold sequentially.
"""
import sys
import os

os.environ["SPARK_SUBMIT_OPTS"] = "-Djava.net.preferIPv4Stack=true"
os.environ["_JAVA_OPTIONS"] = "-Djava.net.preferIPv4Stack=true"
os.environ["HADOOP_HOME"] = os.path.abspath(os.path.join(os.path.dirname(__file__), "../hadoop"))
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from bronze.ingest_telemetry import run as run_bronze
from silver.process_telemetry import run as run_silver
from gold.aggregate_telemetry import run as run_gold

def run_pipeline():
    print("="*50)
    print("STARTING TELEMETRY PIPELINE (BRONZE -> SILVER -> GOLD)")
    print("="*50)
    
    print("\n[1/3] Executing Bronze Ingestion...")
    run_bronze()
    
    print("\n[2/3] Executing Silver Processing...")
    run_silver()
    
    print("\n[3/3] Executing Gold Aggregation...")
    run_gold()
    
    print("\n" + "="*50)
    print("TELEMETRY PIPELINE COMPLETED SUCCESSFULLY")
    print("="*50)

if __name__ == "__main__":
    run_pipeline()
