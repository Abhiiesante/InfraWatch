import os
os.environ["DATABRICKS_HOST"] = "https://dbc-d63137cc-7407.cloud.databricks.com/"
os.environ["DATABRICKS_TOKEN"] = "dapib1b1b670fbff2cf86fd3cbf6f1086145"

from databricks.connect import DatabricksSession
try:
    spark = DatabricksSession.builder.serverless().getOrCreate()
    df = spark.sql("SELECT 'Serverless Spark is working!' as msg")
    df.show()
except Exception as e:
    print(f"Error connecting to serverless: {e}")
