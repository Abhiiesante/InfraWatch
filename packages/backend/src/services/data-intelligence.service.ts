import prisma from '@/lib/prisma.js';
import logger from '@/utils/logger.js';


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
    try {
      const host = process.env.DATABRICKS_HOST;
      const token = process.env.DATABRICKS_TOKEN;

      if (!host || !token) {
        logger.warn('[DataIntelligence] Databricks credentials not configured, skipping asset sync.');
        return { success: false, reason: 'DATABRICKS_NOT_CONFIGURED' };
      }

      const asset = await prisma.asset.findFirst({ where: { id: assetId, tenantId } });
      if (!asset) return { success: false, reason: 'ASSET_NOT_FOUND' };

      const date = new Date().toISOString().split('T')[0];
      const filename = `${Date.now()}-${assetId}-${Math.random().toString(36).substring(7)}.json`;
      const fullPath = `/Volumes/workspace/default/infrawatch_raw/assets/${date}/${filename}`;

      const payload = JSON.stringify({
        ...asset,
        _ingestion_event_time: new Date().toISOString(),
      }) + '\n';

      const response = await fetch(`${host}/api/2.0/fs/files${fullPath}?overwrite=true`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/octet-stream' },
        body: payload,
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Databricks API Error: ${response.status} ${err}`);
      }

      logger.debug(`[DataIntelligence] Asset landed in Databricks UC Volume: ${fullPath}`);
      return { success: true, syncedAt: new Date() };
    } catch (error) {
      logger.error(`[DataIntelligence] Failed to sync asset to data platform: ${error}`);
      return { success: false, reason: String(error) };
    }
  }

  /**
   * Emits an incident event to the data platform for LLM analysis or ML retraining.
   */
  static async syncIncidentToDataPlatform(tenantId: number, incidentId: number) {
    try {
      const host = process.env.DATABRICKS_HOST;
      const token = process.env.DATABRICKS_TOKEN;

      if (!host || !token) {
        logger.warn('[DataIntelligence] Databricks credentials not configured, skipping incident sync.');
        return { success: false, reason: 'DATABRICKS_NOT_CONFIGURED' };
      }

      const incident = await prisma.incident.findFirst({ where: { id: incidentId, tenantId } });
      if (!incident) return { success: false, reason: 'INCIDENT_NOT_FOUND' };

      const date = new Date().toISOString().split('T')[0];
      const filename = `${Date.now()}-${incidentId}-${Math.random().toString(36).substring(7)}.json`;
      const fullPath = `/Volumes/workspace/default/infrawatch_raw/incidents/${date}/${filename}`;

      const payload = JSON.stringify({
        ...incident,
        _ingestion_event_time: new Date().toISOString(),
      }) + '\n';

      const response = await fetch(`${host}/api/2.0/fs/files${fullPath}?overwrite=true`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/octet-stream' },
        body: payload,
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Databricks API Error: ${response.status} ${err}`);
      }

      logger.debug(`[DataIntelligence] Incident landed in Databricks UC Volume: ${fullPath}`);
      return { success: true, syncedAt: new Date() };
    } catch (error) {
      logger.error(`[DataIntelligence] Failed to sync incident to data platform: ${error}`);
      return { success: false, reason: String(error) };
    }
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
    logger.info(`[DataIntelligence] Computing risk score for asset ${assetId} (tenant ${tenantId})...`);

    try {
      // Count open HIGH/CRITICAL incidents on this asset
      const criticalIncidents = await prisma.incident.count({
        where: { tenantId, assetId, status: { in: ['OPEN', 'IN_PROGRESS'] }, severity: { in: ['HIGH', 'CRITICAL'] } },
      });

      // Count unreviewed anomaly detections
      const pendingAnomalies = await prisma.anomalyDetection.count({
        where: { tenantId, camera: { assetId }, status: 'PENDING_REVIEW' },
      });

      // Count failed inspections in last 90 days
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const failedInspections = await prisma.inspection.count({
        where: { tenantId, assetId, status: 'FAILED', completedAt: { gte: ninetyDaysAgo } },
      });

      // Weighted risk computation
      const riskScore = Math.min(100, Math.round(
        criticalIncidents * 25 + pendingAnomalies * 10 + failedInspections * 15
      ));

      let riskLevel: string;
      if (riskScore === 0) riskLevel = 'LOW';
      else if (riskScore < 25) riskLevel = 'MODERATE';
      else if (riskScore < 60) riskLevel = 'HIGH';
      else riskLevel = 'CRITICAL';

      const topRiskFactor =
        criticalIncidents > 0 ? `${criticalIncidents} open critical incident(s)` :
        pendingAnomalies > 0 ? `${pendingAnomalies} unreviewed anomaly detection(s)` :
        failedInspections > 0 ? `${failedInspections} failed inspection(s) in 90d` :
        null;

      return {
        riskScore,
        riskLevel,
        failureProbability_7d: riskScore > 0 ? Math.round(riskScore * 0.7) / 100 : null,
        topRiskFactor,
        computedFrom: { criticalIncidents, pendingAnomalies, failedInspections },
      };
    } catch (error) {
      logger.error(`[DataIntelligence] Failed to compute risk score: ${error}`);
      return {
        riskScore: 0,
        riskLevel: 'NOT_COMPUTED',
        failureProbability_7d: null,
        topRiskFactor: null,
      };
    }
  }
}
