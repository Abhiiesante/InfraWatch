# Continuous Computer Vision (Cameras)

> **IEKB Section:** 13 — AI Integration  
> **Document:** 05-computer-vision-cameras.md  
> **Last Updated:** 2026-07-16  
> **Owner:** AI Lead  
> **Status:** Proposed (Not Implemented in V0)

---

## Table of Contents

1. [Overview](#overview)
2. [Bandwidth & Compute Challenges](#bandwidth--compute-challenges)
3. [The Frame Sampling Approach](#the-frame-sampling-approach)
4. [Edge AI (Future Consideration)](#edge-ai-future-consideration)
5. [Related Documents](#related-documents)

---

## Overview

In V0, the `Camera` entity is essentially a dumb metadata record (ID, Name, RTSP Stream URL, Heartbeat status). Users can click a link in the frontend to view the live RTSP stream using a third-party player, but the backend does not process the video feed.

In V1.2 (aligned with the Anomaly Detection rollout), we aim to process these camera streams continuously to detect hazards (e.g., smoke, fire, unauthorized entry) in real-time.

---

## Bandwidth & Compute Challenges

Streaming dozens of 1080p 30FPS video feeds from a remote industrial site to an AWS cloud backend requires massive internet bandwidth (often unavailable at remote sites) and would require thousands of dollars in cloud GPU compute to process every frame.

---

## The Frame Sampling Approach

Instead of processing 30 frames per second, we will implement a low-frequency frame sampling strategy.

1. **The Poller:** A dedicated lightweight container (or an edge gateway device at the customer site) connects to the local RTSP stream.
2. **Sampling:** Every 10 seconds, it extracts a single JPEG frame.
3. **Upload:** It uploads this lightweight JPEG to the `infrawatch-assets` S3 bucket.
4. **Inference:** The upload triggers the standard [Anomaly Detection Pipeline](./02-anomaly-detection.md).

This reduces the processing requirement from 1,800 frames per minute down to 6 frames per minute per camera, making cloud-based Computer Vision economically viable.

---

## Edge AI (Future Consideration)

If near-instantaneous detection is required (e.g., detecting a falling worker), a 10-second polling interval is insufficient. 

In future iterations (V2.5+), we may explore **Edge AI**. Instead of sending frames to AWS, a specialized physical gateway device (e.g., Nvidia Jetson) is installed at the customer's site. The ML model runs locally on the edge device processing 30FPS. If an anomaly is detected, the Edge device makes a lightweight JSON HTTP `POST` request to the InfraWatch cloud API to trigger the alarm.

---

## Related Documents

- **Architecture:** [ML Pipeline Architecture](./01-ml-pipeline-architecture.md)
- **Features:** [Anomaly Detection](./02-anomaly-detection.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
