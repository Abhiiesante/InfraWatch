"""
Master Lakehouse Pipeline Orchestrator
Simulates a Databricks Job that runs Bronze -> Silver -> Gold across all domains:
- Telemetry & IoT
- Computer Vision Events
- Assets & Metadata
- Cameras (with credential scrubbing)
- Incidents & Triage
- Inspections & Compliance
"""
import sys
import os

os.environ["SPARK_SUBMIT_OPTS"] = "-Djava.net.preferIPv4Stack=true"
os.environ["_JAVA_OPTIONS"] = "-Djava.net.preferIPv4Stack=true"
os.environ["HADOOP_HOME"] = os.path.abspath(os.path.join(os.path.dirname(__file__), "../hadoop"))
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

# Bronze imports
from bronze.ingest_telemetry import run as run_bronze_telemetry
from bronze.ingest_cv_events import run as run_bronze_cv
from bronze.ingest_assets import run as run_bronze_assets
from bronze.ingest_cameras import run as run_bronze_cameras
from bronze.ingest_incidents import run as run_bronze_incidents
from bronze.ingest_inspections import run as run_bronze_inspections
from bronze.ingest_image_metadata import run as run_bronze_image_metadata

# Silver imports
from silver.process_telemetry import run as run_silver_telemetry
from silver.process_cv_events import run as run_silver_cv
from silver.process_assets import run as run_silver_assets
from silver.process_cameras import run as run_silver_cameras
from silver.process_incidents import run as run_silver_incidents
from silver.process_inspections import run as run_silver_inspections
from silver.process_image_metadata import run as run_silver_image_metadata

# Gold imports
from gold.aggregate_telemetry import run as run_gold_telemetry
from gold.aggregate_cv_metrics import run as run_gold_cv
from gold.aggregate_asset_health import run as run_gold_asset_health
from gold.aggregate_incident_metrics import run as run_gold_incident_metrics
from gold.aggregate_inspection_compliance import run as run_gold_inspection_compliance

def run_pipeline():
    print("="*60)
    print("STARTING FULL LAKEHOUSE PIPELINE (BRONZE -> SILVER -> GOLD)")
    print("="*60)
    
    print("\n[1/3] Executing Bronze Ingestion across all domains...")
    run_bronze_telemetry()
    run_bronze_cv()
    run_bronze_assets()
    run_bronze_cameras()
    run_bronze_incidents()
    run_bronze_inspections()
    run_bronze_image_metadata()
    
    print("\n[2/3] Executing Silver Cleansing & Standardization...")
    run_silver_telemetry()
    run_silver_cv()
    run_silver_assets()
    run_silver_cameras()
    run_silver_incidents()
    run_silver_inspections()
    run_silver_image_metadata()
    
    print("\n[3/3] Executing Gold Business Aggregations...")
    run_gold_telemetry()
    run_gold_cv()
    run_gold_asset_health()
    run_gold_incident_metrics()
    run_gold_inspection_compliance()
    
    print("\n" + "="*60)
    print("FULL LAKEHOUSE PIPELINE COMPLETED SUCCESSFULLY")
    print("="*60)

if __name__ == "__main__":
    run_pipeline()
