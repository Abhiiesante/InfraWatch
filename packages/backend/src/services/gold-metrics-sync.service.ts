import fs from 'fs/promises';
import path from 'path';
import prisma from '../lib/prisma.js';
import logger from '../utils/logger.js';

/**
 * GoldMetricsSyncService
 * 
 * Reads raw CV detection JSON files from the local fallback storage,
 * aggregates them into hourly safety metrics, and upserts into the
 * CVSafetyMetricGold table. This closes the "Local Fallback Loop" —
 * raw events from the CV Daemon flow through local storage, get
 * aggregated by this service, and feed the dashboard charts.
 */
export class GoldMetricsSyncService {
  private static readonly RAW_CV_BASE = path.join(
    process.cwd(), '..', 'data-platform', 'Volumes', 'workspace', 'default', 'infrawatch_raw', 'cv_events'
  );

  /**
   * Scans the local CV events directory and aggregates detections
   * into hourly buckets per camera.
   */
  static async syncLocalCVToGold(): Promise<{ processed: number; aggregated: number }> {
    let processed = 0;
    let aggregated = 0;

    try {
      // Check if raw CV events directory exists
      await fs.access(this.RAW_CV_BASE);
    } catch {
      logger.debug('[GoldSync] No local CV events directory found. Nothing to sync.');
      return { processed: 0, aggregated: 0 };
    }

    try {
      // Walk date directories (e.g., 2026-08-13/)
      const dateDirs = await fs.readdir(this.RAW_CV_BASE);

      for (const dateDir of dateDirs) {
        const datePath = path.join(this.RAW_CV_BASE, dateDir);
        const stat = await fs.stat(datePath);
        if (!stat.isDirectory()) continue;

        const files = await fs.readdir(datePath);
        const jsonFiles = files.filter(f => f.endsWith('.json'));

        // Accumulator: key = `${cameraId}_${hourBucket}`, value = { detections, violations, amrs }
        const buckets = new Map<string, {
          cameraId: number;
          hourStart: Date;
          totalDetections: number;
          zoneViolations: number;
          maxActiveAMRs: number;
        }>();

        for (const file of jsonFiles) {
          try {
            const content = await fs.readFile(path.join(datePath, file), 'utf-8');
            const event = JSON.parse(content);

            const cameraId = Number(event.camera_id);
            if (!cameraId) continue;

            const eventTime = new Date(event.timestamp || event._ingestion_event_time);
            if (isNaN(eventTime.getTime())) continue;

            // Create hourly bucket key
            const hourStart = new Date(eventTime);
            hourStart.setMinutes(0, 0, 0);
            const bucketKey = `${cameraId}_${hourStart.toISOString()}`;

            const existing = buckets.get(bucketKey) || {
              cameraId,
              hourStart,
              totalDetections: 0,
              zoneViolations: 0,
              maxActiveAMRs: 0,
            };

            // Count detections
            const detections = event.detections || [];
            existing.totalDetections += detections.length;
            existing.zoneViolations += detections.filter(
              (d: any) => d.isViolation === true
            ).length;
            
            // Count AMRs (max per event)
            const amrCount = detections.filter(
              (d: any) => ['FORKLIFT', 'AMR', 'VEHICLE'].includes(String(d.label).toUpperCase())
            ).length;
            existing.maxActiveAMRs = Math.max(existing.maxActiveAMRs, amrCount);

            buckets.set(bucketKey, existing);
            processed++;
          } catch (err) {
            // Skip malformed files
            continue;
          }
        }

        // Upsert aggregated metrics into the Gold table
        for (const bucket of buckets.values()) {
          try {
            // Find tenant from camera
            const camera = await prisma.camera.findUnique({
              where: { id: bucket.cameraId },
              select: { tenantId: true },
            });
            if (!camera) continue;

            // Check if a metric already exists for this hour/camera
            const existing = await prisma.cVSafetyMetricGold.findFirst({
              where: {
                cameraId: bucket.cameraId,
                timestamp: bucket.hourStart,
              },
            });

            if (existing) {
              await prisma.cVSafetyMetricGold.update({
                where: { id: existing.id },
                data: {
                  totalDetections: existing.totalDetections + bucket.totalDetections,
                  zoneViolations: existing.zoneViolations + bucket.zoneViolations,
                  maxActiveAMRs: Math.max(existing.maxActiveAMRs, bucket.maxActiveAMRs),
                },
              });
            } else {
              await prisma.cVSafetyMetricGold.create({
                data: {
                  tenantId: camera.tenantId,
                  cameraId: bucket.cameraId,
                  timestamp: bucket.hourStart,
                  totalDetections: bucket.totalDetections,
                  zoneViolations: bucket.zoneViolations,
                  maxActiveAMRs: bucket.maxActiveAMRs,
                },
              });
            }
            aggregated++;
          } catch (err) {
            logger.error(`[GoldSync] Failed to upsert metric: ${err}`);
          }
        }
      }

      logger.info(`[GoldSync] Processed ${processed} raw CV events → ${aggregated} gold metric buckets.`);
    } catch (err) {
      logger.error(`[GoldSync] Sync failed: ${err}`);
    }

    return { processed, aggregated };
  }

  /**
   * Also aggregate from AnomalyDetection records already in DB
   * (for when CV events were written directly to DB via cv-daemon).
   */
  static async syncAnomalyDetectionsToGold(): Promise<{ aggregated: number }> {
    let aggregated = 0;

    try {
      // Get all anomaly detections from the last 24 hours
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const anomalies = await prisma.anomalyDetection.findMany({
        where: { createdAt: { gte: since } },
        select: {
          tenantId: true,
          cameraId: true,
          detections: true,
          confidence: true,
          createdAt: true,
        },
      });

      // Bucket by camera + hour
      const buckets = new Map<string, {
        tenantId: number;
        cameraId: number;
        hourStart: Date;
        totalDetections: number;
        zoneViolations: number;
      }>();

      for (const anomaly of anomalies) {
        if (!anomaly.cameraId) continue;
        
        const hourStart = new Date(anomaly.createdAt);
        hourStart.setMinutes(0, 0, 0);
        const key = `${anomaly.cameraId}_${hourStart.toISOString()}`;

        const existing = buckets.get(key) || {
          tenantId: anomaly.tenantId,
          cameraId: anomaly.cameraId,
          hourStart,
          totalDetections: 0,
          zoneViolations: 0,
        };

        const dets = anomaly.detections as any[];
        if (Array.isArray(dets)) {
          existing.totalDetections += dets.length;
          existing.zoneViolations += dets.filter(
            (d: any) => d.severity === 'CRITICAL' || d.label?.includes('VIOLATION')
          ).length;
        } else {
          existing.totalDetections += 1;
          existing.zoneViolations += 1;
        }

        buckets.set(key, existing);
      }

      for (const bucket of buckets.values()) {
        try {
          const existingMetric = await prisma.cVSafetyMetricGold.findFirst({
            where: {
              cameraId: bucket.cameraId,
              timestamp: bucket.hourStart,
            },
          });

          if (existingMetric) {
            // Only update if our new data is larger (idempotent)
            if (bucket.totalDetections > existingMetric.totalDetections) {
              await prisma.cVSafetyMetricGold.update({
                where: { id: existingMetric.id },
                data: {
                  totalDetections: bucket.totalDetections,
                  zoneViolations: bucket.zoneViolations,
                },
              });
            }
          } else {
            await prisma.cVSafetyMetricGold.create({
              data: {
                tenantId: bucket.tenantId,
                cameraId: bucket.cameraId,
                timestamp: bucket.hourStart,
                totalDetections: bucket.totalDetections,
                zoneViolations: bucket.zoneViolations,
                maxActiveAMRs: 0,
              },
            });
          }
          aggregated++;
        } catch (err) {
          logger.error(`[GoldSync] Failed to upsert anomaly metric: ${err}`);
        }
      }

      logger.info(`[GoldSync] Aggregated ${aggregated} anomaly detection buckets into Gold metrics.`);
    } catch (err) {
      logger.error(`[GoldSync] Anomaly sync failed: ${err}`);
    }

    return { aggregated };
  }
}
