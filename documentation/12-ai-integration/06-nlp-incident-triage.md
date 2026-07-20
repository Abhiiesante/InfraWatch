# NLP Incident Triage (Future V1.1)

> **IEKB Section:** 13 — AI Integration  
> **Document:** 06-nlp-incident-triage.md  
> **Last Updated:** 2026-07-16  
> **Owner:** AI Lead  
> **Status:** Proposed (Not Implemented in V0)

---

## Table of Contents

1. [Overview](#overview)
2. [Data Structuring (V0 Preparation)](#data-structuring-v0-preparation)
3. [The Triage Workflow](#the-triage-workflow)
4. [Related Documents](#related-documents)

---

## Overview

When field workers report incidents, they often provide unstructured text (e.g., "The fan belt on the AC unit on roof 3 is screaming and smells like burning rubber"). In V0, a human Manager must read this, classify it as "HVAC", set the priority to "P1 - High", and assign it to the correct team.

In V1.1, we will use Natural Language Processing (NLP) / LLMs to automatically triage incoming reports to reduce Manager fatigue.

---

## Data Structuring (V0 Preparation)

To fine-tune a model to categorize text according to a specific tenant's organizational structure, we need labeled training data.

Every manual Incident created and triaged by a Manager in V0 acts as a perfect training pair:
- **Input Feature:** `title` + `description`
- **Target Labels:** `categoryId`, `priority`, `assignedUserId`

---

## The Triage Workflow

1. A field worker submits an Incident via the frontend app.
2. The Node.js Express API receives the request.
3. *Synchronously*, the API calls the LLM / NLP inference endpoint with the text description.
4. The LLM returns a structured JSON prediction.
5. The API saves the Incident to the database, marking the AI-predicted fields as "Suggested".
6. In the UI, the Manager sees the AI's suggestions highlighted (e.g., "AI suggests: Priority P1"). The Manager can click a single button to accept all suggestions, or manually override them.
7. Manual overrides are fed back into the training data loop to improve the model.

---

## Related Documents

- **Architecture:** [ML Pipeline Architecture](./01-ml-pipeline-architecture.md)
- **Roadmap:** [AI Roadmap](./00-ai-roadmap.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
