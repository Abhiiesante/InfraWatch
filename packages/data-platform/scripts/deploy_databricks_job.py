import os
import requests
import json

HOST = "https://dbc-d63137cc-7407.cloud.databricks.com"
TOKEN = "dapib1b1b670fbff2cf86fd3cbf6f1086145"

headers = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

def create_job():
    url = f"{HOST}/api/2.1/jobs/create"
    
    payload = {
        "name": "InfraWatch Telemetry Pipeline (Serverless)",
        "tasks": [
            {
                "task_key": "bronze_ingestion",
                "spark_python_task": {
                    "python_file": "/Shared/infrawatch/pipelines/bronze/ingest_telemetry.py"
                },
                "environment_key": "default"
            },
            {
                "task_key": "silver_processing",
                "depends_on": [{"task_key": "bronze_ingestion"}],
                "spark_python_task": {
                    "python_file": "/Shared/infrawatch/pipelines/silver/process_telemetry.py"
                },
                "environment_key": "default"
            },
            {
                "task_key": "gold_aggregation",
                "depends_on": [{"task_key": "silver_processing"}],
                "spark_python_task": {
                    "python_file": "/Shared/infrawatch/pipelines/gold/aggregate_telemetry.py"
                },
                "environment_key": "default"
            }
        ],
        "environments": [
            {
                "environment_key": "default",
                "spec": {
                    "environment_version": "5"
                }
            }
        ],
        "performance_target": "PERFORMANCE_OPTIMIZED"
    }
    
    print("Creating job...")
    response = requests.post(url, headers=headers, json=payload)
    if response.status_code == 200:
        print(f"Job created successfully! ID: {response.json()['job_id']}")
    else:
        print(f"Failed to create job: {response.text}")

if __name__ == "__main__":
    create_job()
