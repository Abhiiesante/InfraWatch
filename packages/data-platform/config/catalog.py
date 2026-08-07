"""
InfraWatch Data Platform — Unity Catalog Configuration

Environment-aware catalog and schema naming. Never hardcode catalog/schema names
in notebooks or pipeline code — always import from this module.

Usage:
    from config.catalog import get_catalog_config
    cfg = get_catalog_config()  # auto-detects environment
    print(cfg.catalog)          # e.g. "infrawatch_dev"
    print(cfg.bronze_schema)    # e.g. "infrawatch_dev.bronze"
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class Environment(str, Enum):
    """Supported deployment environments."""
    DEV = "dev"
    TEST = "test"
    STAGING = "staging"
    PROD = "prod"


@dataclass(frozen=True)
class CatalogConfig:
    """Unity Catalog naming convention for a given environment.

    All analytical tables live under:
        infrawatch_<env>.<schema>.<table>

    Schemas:
        bronze      — minimally transformed source data
        silver      — validated, deduplicated, standardized
        gold        — business-ready aggregations
        features    — ML feature tables
        ml          — model artifacts, predictions, experiments
        ai          — LLM/RAG tables (documents, embeddings, requests)
        monitoring  — pipeline observability, data quality, model drift
    """
    environment: Environment
    catalog_prefix: str = "infrawatch"

    # --- Derived names (computed, not stored) ---

    @property
    def catalog(self) -> str:
        return f"{self.catalog_prefix}_{self.environment.value}"

    # Schema qualified names
    @property
    def bronze_schema(self) -> str:
        return f"{self.catalog}.bronze"

    @property
    def silver_schema(self) -> str:
        return f"{self.catalog}.silver"

    @property
    def gold_schema(self) -> str:
        return f"{self.catalog}.gold"

    @property
    def features_schema(self) -> str:
        return f"{self.catalog}.features"

    @property
    def ml_schema(self) -> str:
        return f"{self.catalog}.ml"

    @property
    def ai_schema(self) -> str:
        return f"{self.catalog}.ai"

    @property
    def monitoring_schema(self) -> str:
        return f"{self.catalog}.monitoring"

    # --- Table helpers ---

    def bronze_table(self, table_name: str) -> str:
        """Fully qualified bronze table name."""
        return f"{self.bronze_schema}.{table_name}"

    def silver_table(self, table_name: str) -> str:
        """Fully qualified silver table name."""
        return f"{self.silver_schema}.{table_name}"

    def gold_table(self, table_name: str) -> str:
        """Fully qualified gold table name."""
        return f"{self.gold_schema}.{table_name}"

    def features_table(self, table_name: str) -> str:
        """Fully qualified features table name."""
        return f"{self.features_schema}.{table_name}"

    def ml_table(self, table_name: str) -> str:
        """Fully qualified ML table name."""
        return f"{self.ml_schema}.{table_name}"

    def ai_table(self, table_name: str) -> str:
        """Fully qualified AI table name."""
        return f"{self.ai_schema}.{table_name}"

    def monitoring_table(self, table_name: str) -> str:
        """Fully qualified monitoring table name."""
        return f"{self.monitoring_schema}.{table_name}"

    # --- Checkpoint paths ---

    def checkpoint_path(self, pipeline_name: str) -> str:
        """Checkpoint location for streaming/incremental pipelines."""
        return f"/Volumes/{self.catalog}/checkpoints/{pipeline_name}"

    # --- Schema creation DDL ---

    def get_schema_ddl(self) -> list[str]:
        """Return CREATE SCHEMA statements for all schemas."""
        schemas = ["bronze", "silver", "gold", "features", "ml", "ai", "monitoring"]
        statements = [f"CREATE CATALOG IF NOT EXISTS {self.catalog}"]
        for schema in schemas:
            statements.append(
                f"CREATE SCHEMA IF NOT EXISTS {self.catalog}.{schema} "
                f"COMMENT 'InfraWatch {schema} layer — {self.environment.value} environment'"
            )
        return statements


def _detect_environment() -> Environment:
    """Detect environment from INFRAWATCH_ENV or DATABRICKS_ENV env vars."""
    env_str = os.environ.get("INFRAWATCH_ENV") or os.environ.get("DATABRICKS_ENV") or "dev"
    try:
        return Environment(env_str.lower())
    except ValueError:
        valid = ", ".join(e.value for e in Environment)
        raise ValueError(
            f"Invalid environment '{env_str}'. Must be one of: {valid}"
        )


def get_catalog_config(environment: Optional[Environment] = None) -> CatalogConfig:
    """Get Unity Catalog configuration for the given (or auto-detected) environment.

    Args:
        environment: Explicit environment. If None, auto-detects from env vars.

    Returns:
        CatalogConfig instance.
    """
    if environment is None:
        environment = _detect_environment()
    return CatalogConfig(environment=environment)
