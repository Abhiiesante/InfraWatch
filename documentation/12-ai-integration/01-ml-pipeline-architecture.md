# ML Pipeline Architecture (Future V1.1)

> **IEKB Section:** 13 — AI Integration  
> **Document:** 01-ml-pipeline-architecture.md  
> **Last Updated:** 2026-07-16  
> **Owner:** AI Lead  
> **Status:** Proposed (Not Implemented in V0)

---

## Table of Contents

1. [Overview](#overview)
2. [Data Ingestion (ETL)](#data-ingestion-etl)
3. [Model Serving (Inference)](#model-serving-inference)
4. [Asynchronous Inference Workflow](#asynchronous-inference-workflow)
5. [Related Documents](#related-documents)

---

## Overview

Integrating Machine Learning models into a traditional Node.js/PostgreSQL SaaS architecture requires separating the heavy, GPU-bound inference workloads from the fast, CPU-bound HTTP APIs.

For V1.1+, we will introduce a dedicated **ML Pipeline** built around Python and AWS SageMaker (or a dedicated GPU ECS Cluster).

---

## Data Ingestion (ETL)

To train predictive models, we need historical data. 

We will not run analytical training queries against the production RDS database. Instead:
1. **Change Data Capture (CDC):** We will use AWS DMS (Database Migration Service) or Debezium to stream logical replication events from the PostgreSQL RDS.
2. **Data Lake:** These events will stream into an S3-based Data Lake (e.g., using Apache Hudi or Iceberg).
3. **Training:** SageMaker training jobs will pull data exclusively from the S3 Data Lake, ensuring zero performance impact on the live SaaS application.

---

## Model Serving (Inference)

Node.js is not suited for loading PyTorch or TensorFlow tensors. 

We will deploy a separate microservice: **The Inference Engine**.
- **Stack:** Python, FastAPI, PyTorch.
- **Hosting:** AWS ECS (with GPU instances) or AWS SageMaker Endpoints.
- **Communication:** The Node.js Express API communicates with the Python Inference Engine via internal HTTP APIs or gRPC.

---

## Asynchronous Inference Workflow

Because ML inference (especially Computer Vision) can take seconds to process, it must never block the main Express HTTP thread.

**Workflow:**
1. User uploads an inspection image to S3.
2. Express API creates an `ImageProcessingJob` in the PostgreSQL database and enqueues a job in BullMQ.
3. The Node.js BullMQ Worker picks up the job.
4. The Node.js Worker makes an HTTP request to the Python Inference Engine: `POST http://inference-svc/predict { "s3_url": "..." }`.
5. The Python Inference Engine downloads the image from S3, runs the YOLO model, and returns the bounding boxes.
6. The Node.js Worker updates the database with the anomaly data and sends a WebSocket notification to the frontend.

---

## Related Documents

- **Strategy:** [AI Roadmap](./00-ai-roadmap.md)
- **Features:** [Anomaly Detection](./02-anomaly-detection.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
