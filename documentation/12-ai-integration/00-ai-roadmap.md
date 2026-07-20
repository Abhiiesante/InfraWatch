# AI Integration Roadmap (V1.1+)

> **IEKB Section:** 13 — AI Integration  
> **Document:** 00-ai-roadmap.md  
> **Last Updated:** 2026-07-16  
> **Owner:** Product Owner / AI Lead  
> **Status:** Approved

---

## Table of Contents

1. [Overview](#overview)
2. [V0 vs V1.1 Strategy](#v0-vs-v11-strategy)
3. [Phased Rollout Plan](#phased-rollout-plan)
4. [Related Documents](#related-documents)

---

## Overview

InfraWatch is fundamentally an infrastructure data platform. While the V0 architecture is purely deterministic (CRUD, simple scheduled jobs, manual inspections), the ultimate vision for InfraWatch relies heavily on Artificial Intelligence to automate anomaly detection, predictive maintenance, and incident triage.

This roadmap outlines how AI features will be introduced into the system starting in version V1.1, building upon the solid data foundation established in V0.

---

## V0 vs V1.1 Strategy

**V0 (Current): The Data Foundation**
- Focus: Build a reliable, secure, multi-tenant platform that *collects* high-quality data.
- AI Usage: **Zero.** No automated categorization, no computer vision. Humans perform all inspections and manually raise incidents.

**V1.1 (Next Phase): The Intelligence Layer**
- Focus: Leverage the historical data collected in V0 to train models and introduce AI-assisted workflows.
- AI Usage: "Human-in-the-loop" (HITL) AI. The AI suggests categories, detects potential anomalies in camera feeds, and drafts reports, but a human must always approve the final action.

---

## Phased Rollout Plan

### Phase 1: NLP Incident Triage (v1.1)
When a user manually reports an incident, they type a free-text description ("Water is leaking from the main valve"). We will use an LLM (e.g., OpenAI or a self-hosted LLaMA model) to automatically suggest the `Incident Category`, `Priority`, and `Assigned Department`.

### Phase 2: Computer Vision Anomaly Detection (v1.2)
We will introduce a background worker that processes frames from the registered `Camera` streams. Using custom-trained object detection models (e.g., YOLO), the system will flag potential anomalies (rust, leaks, unauthorized personnel) and generate a "Draft Incident" for human review.

### Phase 3: Predictive Maintenance (v2.0)
By analyzing historical inspection data, failure rates, and environmental metadata, time-series forecasting models will predict when an `Asset` is likely to fail, automatically scheduling preventative `Inspection`s before a failure occurs.

---

## Related Documents

- **Architecture:** [ML Pipeline Architecture](./01-ml-pipeline-architecture.md)
- **Features:** [Anomaly Detection](./02-anomaly-detection.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
