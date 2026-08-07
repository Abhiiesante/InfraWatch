# InfraWatch V1.1 Data Architecture (Medallion Lakehouse)

The Databricks Intelligence Plane implements a strict Medallion architecture inside Unity Catalog.

## Unity Catalog Environment Setup

All environments (`dev`, `staging`, `prod`) maintain fully isolated catalogs. Schemas follow a standard structure.

```text
Catalog: infrawatch_{env}

Schemas:
├── bronze       (Minimally transformed source data, full history)
├── silver       (Validated, deduplicated, standardized operational data)
├── gold         (Business-ready aggregations, risk scores, ML ready)
├── features     (ML Feature Store tables)
├── ml           (Model outputs, predictions, training logs)
├── ai           (RAG document embeddings, LLM audit logs)
└── monitoring   (Data quality metrics, model drift tracking)
```

## Data Flow (The Medallion Journey)

### 1. Ingestion → Bronze
- **Tools**: Databricks Auto Loader, Structured Streaming.
- **Process**: Raw JSON/CSV files or streaming Kafka/EventHubs events are appended directly to Bronze.
- **Metadata**: Technical columns are added (`_ingestion_timestamp`, `_source`, `_batch_id`, `_record_hash`).
- **Validation**: None. Bad data is preserved here for replayability.

### 2. Bronze → Silver
- **Tools**: Databricks DLT (Delta Live Tables) or PySpark jobs.
- **Process**: Data is validated against Pydantic Data Contracts. Deduplication occurs based on primary keys (e.g., `event_id`).
- **Transformations**: Timestamps converted to UTC, units standardized (e.g., all temps to °C), nulls handled.
- **Quarantine**: Records failing validation are written to quarantine tables, not dropped.

### 3. Silver → Gold
- **Tools**: Databricks SQL or PySpark batch jobs.
- **Process**: Aggregations and complex joins are performed to build business-level entities.
- **Outputs**: Dashboard-ready tables (`gold.asset_health`, `gold.sensor_hourly_metrics`) and tables ready for ML consumption.
