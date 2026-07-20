# Computer Vision: Anomaly Detection (Future V1.2)

> **IEKB Section:** 13 — AI Integration  
> **Document:** 02-anomaly-detection.md  
> **Last Updated:** 2026-07-16  
> **Owner:** AI Lead  
> **Status:** Proposed (Not Implemented in V0)

---

## Table of Contents

1. [Overview](#overview)
2. [Data Structuring (V0 Preparation)](#data-structuring-v0-preparation)
3. [The Detection Workflow](#the-detection-workflow)
4. [Human-in-the-Loop (HITL)](#human-in-the-loop-hitl)
5. [Related Documents](#related-documents)

---

## Overview

A core value proposition of InfraWatch is reducing the manual labor required to inspect infrastructure. In V1.2, we will introduce Computer Vision (CV) models capable of detecting anomalies (e.g., rust, concrete spalling, fluid leaks, missing PPE on workers) automatically from uploaded inspection images or live camera feeds.

---

## Data Structuring (V0 Preparation)

To train an effective object detection model, we need thousands of labeled images. 

**How V0 prepares for this:**
Even though V0 has no AI, every time an Inspector uploads an image during a manual inspection and explicitly creates an `Incident` associated with that image (e.g., "Found rust on pipe"), they are implicitly generating a positive training example. 

By ensuring our V0 database schema strictly links `Image` -> `InspectionItem` -> `Incident`, we are building a proprietary dataset for future model fine-tuning.

---

## The Detection Workflow

1. A new image is uploaded to S3 (via a manual inspection or an automated camera snapshot).
2. The Node.js worker queues an `AnomalyScanJob`.
3. The Python Inference Engine runs the image through a specialized model (e.g., YOLOv8 fine-tuned on industrial infrastructure).
4. The model returns a list of bounding boxes, classification labels (e.g., "RUST", "LEAK"), and confidence scores (e.g., `0.92`).
5. If the confidence score exceeds a tenant-defined threshold, the system generates a **Draft Incident**.

---

## Human-in-the-Loop (HITL)

AI models produce false positives. To maintain trust, the AI is not allowed to dispatch workers or change official asset statuses on its own.

Instead, the AI creates a **Draft Incident** (or an "AI Flag"). 

In the frontend application, a Manager will see a specific "Review Queue". They will be presented with the image, the AI's bounding box highlighting the anomaly, and two buttons:
- **Confirm:** Converts the Draft Incident into a real `OPEN` Incident. This action is fed back into the training pipeline as a *True Positive*.
- **Dismiss:** Deletes the Draft Incident. This action is fed back into the training pipeline as a *False Positive*, helping the model learn.

---

## Related Documents

- **Architecture:** [ML Pipeline Architecture](./01-ml-pipeline-architecture.md)
- **Roadmap:** [AI Roadmap](./00-ai-roadmap.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
