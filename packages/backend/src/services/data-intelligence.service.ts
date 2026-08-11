import prisma from '@/lib/prisma.js';
import logger from '@/utils/logger.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * DataIntelligenceService
 * 
 * Acts as the bridge between the Node.js operational control plane
 * and the Databricks analytical intelligence plane (Lakehouse).
 */
export class DataIntelligenceService {
  
  /**
   * Emits an asset creation/update event to the data platform.
   * In a production setup, this would publish to Kafka/EventHubs 
   * or write a JSON record to cloud storage for Databricks Auto Loader.
   */
  static async syncAssetToDataPlatform(tenantId: number, assetId: number) {
    logger.info(`[DataIntelligence] Syncing asset ${assetId} for tenant ${tenantId} to data platform...`);
    // Future implementation (Phase 3: Ingestion)
    return { success: true, syncedAt: new Date() };
  }

  /**
   * Emits an incident event to the data platform for LLM analysis or ML retraining.
   */
  static async syncIncidentToDataPlatform(tenantId: number, incidentId: number) {
    logger.info(`[DataIntelligence] Syncing incident ${incidentId} for tenant ${tenantId} to data platform...`);
    // Future implementation (Phase 3: Ingestion)
    return { success: true, syncedAt: new Date() };
  }

  /**
   * Simulates Cloud Object Storage landing zone (e.g., S3/ADLS).
   * Appends raw telemetry payload to a Unity Catalog Volume.
   */
  static async syncTelemetryToDataPlatform(data: any) {
    try {
      const date = new Date().toISOString().split('T')[0];
      const filename = `${Date.now()}-${data.assetId || 'unknown'}-${Math.random().toString(36).substring(7)}.json`;
      
      const host = process.env.DATABRICKS_HOST;
      const token = process.env.DATABRICKS_TOKEN;
      
      if (!host || !token) {
        logger.warn('[DataIntelligence] Databricks credentials not configured, skipping telemetry sync.');
        return { success: false };
      }

      const volumePath = `/Volumes/workspace/default/infrawatch_raw/telemetry/${date}`;
      const fullPath = `${volumePath}/${filename}`;
      
      const payload = JSON.stringify({
        ...data,
        _ingestion_event_time: new Date().toISOString()
      }) + '\n';

      // Ensure directory exists (Volumes API creates parent dirs automatically on file upload)
      // Upload using REST API
      const response = await fetch(`${host}/api/2.0/fs/files${fullPath}?overwrite=true`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/octet-stream',
        },
        body: payload
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Databricks API Error: ${response.status} ${err}`);
      }
      
      logger.debug(`[DataIntelligence] Telemetry landed in Databricks UC Volume: ${fullPath}`);
      return { success: true };
    } catch (error) {
      logger.error(`[DataIntelligence] Failed to sync telemetry to data platform: ${error}`);
      return { success: false };
    }
  }

  static async syncCVToDataPlatform(data: any) {
    try {
      const date = new Date().toISOString().split('T')[0];
      const filename = `${Date.now()}-${data.camera_id || 'unknown'}-${Math.random().toString(36).substring(7)}.json`;
      
      const host = process.env.DATABRICKS_HOST;
      const token = process.env.DATABRICKS_TOKEN;
      
      if (!host || !token) {
        logger.warn('[DataIntelligence] Databricks credentials not configured, skipping CV sync.');
        return { success: false };
      }

      const volumePath = `/Volumes/workspace/default/infrawatch_raw/cv_events/${date}`;
      const fullPath = `${volumePath}/${filename}`;
      
      const payload = JSON.stringify({
        ...data,
        _ingestion_event_time: new Date().toISOString()
      }) + '\n';

      const response = await fetch(`${host}/api/2.0/fs/files${fullPath}?overwrite=true`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/octet-stream',
        },
        body: payload
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Databricks API Error: ${response.status} ${err}`);
      }
      
      logger.debug(`[DataIntelligence] CV Event landed in Databricks UC Volume: ${fullPath}`);
      return { success: true };
    } catch (error) {
      logger.error(`[DataIntelligence] Failed to sync CV to data platform: ${error}`);
      return { success: false };
    }
  }

  /**
   * Registers a prediction made by a model (served from Databricks or MLflow).
   */
  static async registerPrediction(tenantId: number, predictionData: {
    assetId?: number;
    cameraId?: number;
    modelVersionId: number;
    predictionType: string;
    label: string;
    confidence: number;
    occurredAt: Date;
    metadata?: any;
    sourceUri?: string;
  }) {
    logger.info(`[DataIntelligence] Registering prediction for tenant ${tenantId}...`);
    
    return prisma.aIPrediction.create({
      data: {
        tenantId,
        assetId: predictionData.assetId,
        cameraId: predictionData.cameraId,
        modelVersionId: predictionData.modelVersionId,
        predictionType: predictionData.predictionType,
        label: predictionData.label,
        confidence: predictionData.confidence,
        occurredAt: predictionData.occurredAt,
        metadata: predictionData.metadata || {},
        sourceUri: predictionData.sourceUri,
      }
    });
  }

  /**
   * Queries the Lakehouse (Gold layer) for the latest asset risk score.
   * In the future, this will connect to Databricks SQL Warehouse or Feature Store.
   */
  static async fetchAssetRiskScore(tenantId: number, assetId: number) {
    logger.info(`[DataIntelligence] Fetching risk score for asset ${assetId} (tenant ${tenantId})...`);
    // Future implementation (Phase 8: Downstream integration)
    return {
      riskScore: 0,
      riskLevel: 'UNKNOWN',
      failureProbability_7d: null,
      topRiskFactor: null,
    };
  }
}
