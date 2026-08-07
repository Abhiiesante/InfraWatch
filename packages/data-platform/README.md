# InfraWatch Data Platform

The analytical intelligence plane for InfraWatch — data ingestion, medallion lakehouse architecture, feature engineering, ML/CV model training, LLM/RAG intelligence, and model serving.

## Architecture

```
PostgreSQL (Transactional)  ←→  Node.js Backend (Control Plane)
                                       ↕
Databricks (Analytical/ML)  ←→  Data Platform (Intelligence Plane)
```

## Package Structure

```
packages/data-platform/
├── config/              # Unity Catalog, pipeline parameters, environment config
├── contracts/           # Canonical data contracts (Pydantic schemas)
├── ingestion/           # Data ingestion framework (batch, streaming, Auto Loader)
├── pipelines/
│   ├── bronze/          # Minimally transformed source data
│   ├── silver/          # Validated, deduplicated, standardized
│   └── gold/            # Business-ready aggregations
├── quality/             # Data quality framework and quarantine
├── features/            # Feature engineering (Unity Catalog feature tables)
├── ml/
│   ├── anomaly_detection/   # Z-score, IQR, Isolation Forest baselines
│   ├── predictive_maintenance/  # Tabular failure prediction
│   ├── computer_vision/     # Frame processing, VisionModelAdapter
│   └── severity/            # Incident severity models
├── llm/
│   ├── rag/             # Retrieval-augmented generation
│   └── evaluation/      # LLM evaluation datasets
├── serving/             # Model inference service abstraction
├── monitoring/          # Model monitoring, drift, observability
├── common/              # Shared utilities
├── tests/               # All tests
├── notebooks/           # Thin orchestration notebooks
├── jobs/                # Databricks job definitions
└── resources/           # Databricks Asset Bundle resources
```

## Setup

```bash
cd packages/data-platform
pip install -e ".[dev]"
```

## Running Tests

```bash
cd packages/data-platform
python -m pytest tests/ -v
```

## Environment

Configuration is environment-aware. Set `INFRAWATCH_ENV` to one of:
- `dev` (default)
- `test`
- `staging`
- `prod`

All catalog and schema names are derived from centralized configuration — never hardcoded.
