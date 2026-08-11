import os
from databricks.sdk import WorkspaceClient
from databricks.sdk.service.catalog import VolumeType

os.environ["DATABRICKS_HOST"] = "https://dbc-d63137cc-7407.cloud.databricks.com/"
os.environ["DATABRICKS_TOKEN"] = "dapib1b1b670fbff2cf86fd3cbf6f1086145"

w = WorkspaceClient()
try:
    volume = w.volumes.create(
        catalog_name="workspace",
        schema_name="default",
        name="infrawatch_raw",
        volume_type=VolumeType.MANAGED
    )
    print(f"Created volume: {volume.name}")
except Exception as e:
    print(f"Error or already exists: {e}")
