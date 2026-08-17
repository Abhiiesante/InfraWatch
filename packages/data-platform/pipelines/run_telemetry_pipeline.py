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

from bronze.ingest_telemetry import run as run_bronze_telemetry
from silver.process_telemetry import run as run_silver_telemetry
from gold.aggregate_telemetry import run as run_gold_telemetry

from bronze.ingest_cv_events import run as run_bronze_cv
from silver.process_cv_events import run as run_silver_cv
from gold.aggregate_cv_metrics import run as run_gold_cv

def run_pipeline():
    print("="*50)
    print("STARTING DATA PIPELINE (BRONZE -> SILVER -> GOLD)")
    print("="*50)
    
    print("\n[1/3] Executing Bronze Ingestion...")
    run_bronze_telemetry()
    run_bronze_cv()
    
    print("\n[2/3] Executing Silver Processing...")
    run_silver_telemetry()
    run_silver_cv()
    
    print("\n[3/3] Executing Gold Aggregation...")
    run_gold_telemetry()
    run_gold_cv()
    
    print("\n" + "="*50)
    print("DATA PIPELINE COMPLETED SUCCESSFULLY")
    print("="*50)

if __name__ == "__main__":
    run_pipeline()
