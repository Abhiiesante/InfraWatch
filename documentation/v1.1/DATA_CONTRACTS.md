# InfraWatch V1.1 Data Contracts

The integration between the Node.js backend and the Databricks intelligence platform is governed by strictly versioned **Data Contracts**.

A Data Contract is a schema definition (implemented via Pydantic in `packages/data-platform/contracts/`) that guarantees the structure and types of data flowing into the Lakehouse.

## Core Principles

1. **Schema Validation**: If an incoming record fails Pydantic validation during the Bronze → Silver pipeline, it is quarantined. It does not crash the pipeline, but it is not promoted to Silver.
2. **Backwards Compatibility**: You may add fields to a contract, but removing or renaming fields requires a major version bump and coordinated deployment across backend and data platform.
3. **No Secrets**: Sensitive operational credentials (like RTSP passwords) are explicitly omitted from the contracts to prevent them from landing in analytical storage.

## Available Contracts

See the `packages/data-platform/contracts/` directory for the Python implementations.

* `AssetMetadata`
* `CameraMetadata`
* `SensorTelemetryEvent`
* `InspectionEvent`
* `IncidentEvent`
* `ImageFrameMetadata`

## Example: IncidentEvent

The V1.1 incident contract introduces the `source` field, which is critical for separating human-reported incidents from ML-generated alerts:

```python
class IncidentSource(str, Enum):
    MANUAL = "MANUAL"             # Human reported via UI
    INSPECTION = "INSPECTION"     # Generated during a manual inspection
    SENSOR = "SENSOR"             # Threshold breach (hardcoded rule)
    ML = "ML"                     # Predictive maintenance tabular model
    VISION_AI = "VISION_AI"       # Computer vision anomaly detection
    LLM_ASSISTED = "LLM_ASSISTED" # Copilot or LLM generated
```
