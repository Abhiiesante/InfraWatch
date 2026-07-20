# AI Data Privacy & Compliance

> **IEKB Section:** 13 — AI Integration  
> **Document:** 07-data-privacy-ai.md  
> **Last Updated:** 2026-07-16  
> **Owner:** Security Lead  
> **Status:** Approved

---

## Table of Contents

1. [Overview](#overview)
2. [Tenant Data Isolation in ML](#tenant-data-isolation-in-ml)
3. [Third-Party LLM Constraints](#third-party-llm-constraints)
4. [Related Documents](#related-documents)

---

## Overview

When introducing Artificial Intelligence to a multi-tenant B2B SaaS platform, data privacy becomes the primary legal and technical hurdle. Tenants (enterprises) will strictly forbid their proprietary infrastructure data from being used to train models that benefit their competitors.

---

## Tenant Data Isolation in ML

**Policy: Zero Cross-Tenant Training**

Model weights trained on Tenant A's data must NEVER be applied to inference requests for Tenant B. 

**Implementation (Future V1.2+):**
- **Global Base Models:** We will utilize open-source foundational models (e.g., Llama 3, YOLOv8) trained on public datasets.
- **Tenant-Specific LoRA Adapters:** Instead of fine-tuning the massive base model, we will use Low-Rank Adaptation (LoRA). For each tenant, we train a tiny, separate adapter file (a few megabytes) exclusively on their data. 
- During inference, the Python Inference Engine loads the Global Base Model, dynamically applies Tenant A's LoRA adapter, processes the request, and then unloads the adapter. This guarantees mathematical isolation of tenant-specific knowledge.

---

## Third-Party LLM Constraints

If we use a managed LLM provider (like OpenAI or Anthropic) for the [Automated Reporting](./04-automated-reporting.md) feature:

1. **Zero Data Retention Agreements:** We must secure Enterprise API contracts that explicitly state the provider will NOT retain our payload data for longer than 30 days and will NEVER use our data to train their foundational models.
2. **PII Masking:** Before sending an incident description to a third-party LLM, the Node.js API must strip Personally Identifiable Information (PII), such as employee names or specific street addresses, replacing them with tokens (e.g., `[USER_1]`, `[LOCATION_A]`).

---

## Related Documents

- **Architecture:** [ML Pipeline Architecture](./01-ml-pipeline-architecture.md)
- **Security:** [Security Overview](../10-security/00-security-overview.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)

