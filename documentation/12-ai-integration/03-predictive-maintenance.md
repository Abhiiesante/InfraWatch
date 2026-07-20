# Predictive Maintenance (Future V2.0)

> **IEKB Section:** 13 — AI Integration  
> **Document:** 03-predictive-maintenance.md  
> **Last Updated:** 2026-07-16  
> **Owner:** AI Lead  
> **Status:** Proposed (Not Implemented in V0)

---

## Table of Contents

1. [Overview](#overview)
2. [Data Structuring (V0 Preparation)](#data-structuring-v0-preparation)
3. [Time-Series Forecasting](#time-series-forecasting)
4. [Related Documents](#related-documents)

---

## Overview

Predictive Maintenance is the holy grail of physical infrastructure management. Instead of repairing an asset after it breaks (Reactive) or inspecting it on a rigid schedule whether it needs it or not (Preventative), we want to inspect and repair assets *just before* they are statistically likely to fail (Predictive).

This will be introduced in V2.0, as it requires months of historical data collection from V0 and V1 to train accurate models.

---

## Data Structuring (V0 Preparation)

To predict failure, we must establish a baseline of normal operation and a reliable timeline of historical failures.

**How V0 prepares for this:**
1. **Asset Lifecycle Tracking:** The `Asset` model tracks exactly when an asset was commissioned.
2. **Incident History:** Every time a repair is logged, the `Incident` records the exact timestamp, the time-to-resolution, and the category of the failure.
3. **Continuous Metrics:** In V0, we rely on manual Inspections. But as IoT sensors are integrated, we will begin collecting continuous time-series data (temperature, vibration, pressure) tied directly to the `Asset` ID.

---

## Time-Series Forecasting

Once we have sufficient data, we will implement forecasting models (e.g., Prophet, ARIMA, or LSTM neural networks).

**The Workflow:**
1. The model ingests historical failure rates for a specific `AssetType` (e.g., HVAC Units of a specific model).
2. It combines this with the real-time sensor telemetry and environmental data (e.g., weather APIs).
3. If the model determines that the probability of failure within the next 14 days exceeds 75%, it automatically generates a `SCHEDULED` Inspection in the database and alerts a Manager.

By preventing unplanned downtime, InfraWatch shifts from a "record-keeping" tool to an active "cost-saving" engine for the tenant.

---

## Related Documents

- **Strategy:** [AI Roadmap](./00-ai-roadmap.md)
- **Database:** [Database Schema](../01-database/00-schema-design.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
