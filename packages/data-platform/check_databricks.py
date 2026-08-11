import os
from databricks.sdk import WorkspaceClient

# Set up credentials programmatically (can also use env vars)
os.environ["DATABRICKS_HOST"] = "https://dbc-d63137cc-7407.cloud.databricks.com/"
os.environ["DATABRICKS_TOKEN"] = "dapib1b1b670fbff2cf86fd3cbf6f1086145"

w = WorkspaceClient()

print("Available Clusters:")
for c in w.clusters.list():
    print(f"- {c.cluster_name} (ID: {c.cluster_id}, State: {c.state})")

print("\nAvailable Catalogs:")
for cat in w.catalogs.list():
    print(f"- {cat.name}")
    try:
        schemas = w.schemas.list(catalog_name=cat.name)
        for schema in schemas:
            print(f"  - Schema: {schema.name}")
    except Exception as e:
        print(f"  - (Error reading schemas: {e})")
