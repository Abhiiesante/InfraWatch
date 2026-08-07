# InfraWatch V1.1 System Architecture

This document outlines the high-level architecture of InfraWatch V1.1, which introduces a hybrid Control Plane (Node.js/PostgreSQL) + Intelligence Plane (Databricks Lakehouse) design.

## High-Level Architecture

```mermaid
flowchart TD
    subgraph Edge
        Sensors[IoT Sensors]
        Cameras[CCTV/PTZ Cameras]
        Drones[Drones]
    end

    subgraph Control_Plane[Control Plane: Operational Backend (Node.js)]
        API[Express API]
        Workers[BullMQ Workers]
        PG[(PostgreSQL)]
        Redis[(Redis)]
        UI[React Frontend]
        
        API <--> PG
        API <--> Redis
        Workers <--> Redis
        Workers <--> PG
        UI <--> API
    end

    subgraph Intelligence_Plane[Intelligence Plane: Data Platform (Databricks)]
        Ingestion[Data Ingestion Framework]
        Lakehouse[(Delta Lakehouse)]
        FeatureStore[Unity Catalog Features]
        ModelRegistry[MLflow Registry]
        Serving[Model Serving Endpoints]
        LLM[RAG & LLM Agents]
        
        Ingestion --> Lakehouse
        Lakehouse <--> FeatureStore
        FeatureStore --> LLM
    end

    %% Interactions
    Sensors -->|Telemetry Stream| Ingestion
    Cameras -->|Frame Extraction| Ingestion
    API -->|Data Sync| Ingestion
    Serving -->|Predictions| API
    LLM -->|Copilot Insights| API
```

## Core Principles

1. **Transactional vs. Analytical separation:** PostgreSQL is the source of truth for transactions (user accounts, incident status). Databricks is the source of truth for analytics, ML features, and heavy aggregations.
2. **Canonical Data Contracts:** Data flows from the Control Plane to the Intelligence Plane via strictly versioned Pydantic models.
3. **No Credential Leaks:** Secrets like camera RTSP passwords are NEVER synced to the analytical plane.
4. **Environment Isolation:** Both Node.js and Databricks must support strict `dev`, `staging`, and `prod` isolation, including segregated Unity Catalogs.
