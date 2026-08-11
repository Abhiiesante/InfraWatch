import prisma from '@/lib/prisma.js';
import { notificationService } from './notification.service.js';
import { DataIntelligenceService } from './data-intelligence.service.js';

export class TelemetryService {
  async ingestReading(
    tenantId: number,
    data: {
      assetId: number;
      sensorType: string;
      value: number;
      unit: string;
    },
  ) {
    // Check against sensor rules for threshold breaches
    const rules = await prisma.sensorRule.findMany({
      where: {
        tenantId,
        sensorType: data.sensorType,
        isActive: true,
        OR: [{ assetId: data.assetId }, { assetId: null }],
      },
    });

    let isAnomaly = false;
    for (const rule of rules) {
      const min = rule.minThreshold ? Number(rule.minThreshold) : null;
      const max = rule.maxThreshold ? Number(rule.maxThreshold) : null;

      if ((min !== null && data.value < min) || (max !== null && data.value > max)) {
        isAnomaly = true;

        // Auto-create alert notification
        const asset = await prisma.asset.findUnique({ where: { id: data.assetId } });
        await notificationService.notifyTenantUsers(
          tenantId,
          'ALERT',
          `Sensor Threshold Breached: ${data.sensorType}`,
          `Asset ${asset?.name || data.assetId} reported ${data.value}${data.unit} (Rule threshold: ${min ?? '-'} to ${max ?? '+'})`,
          'ASSET',
          data.assetId,
        );
        break;
      }
    }

    const reading = await prisma.telemetryReading.create({
      data: {
        tenantId,
        assetId: data.assetId,
        sensorType: data.sensorType,
        value: data.value,
        unit: data.unit,
        isAnomaly,
      },
    });

    // Fire-and-forget sync to the analytical data platform
    DataIntelligenceService.syncTelemetryToDataPlatform({
      tenantId,
      assetId: data.assetId,
      sensorType: data.sensorType,
      value: data.value,
      unit: data.unit,
      isAnomaly,
      timestamp: reading.timestamp
    }).catch(err => {
      // Log but don't fail the operational request
      console.error('Failed to sync telemetry to data platform', err);
    });

    return reading;
  }

  async getAssetTelemetry(tenantId: number, assetId: number, limit = 50) {
    return prisma.telemetryReading.findMany({
      where: { tenantId, assetId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }

  async listRules(tenantId: number) {
    return prisma.sensorRule.findMany({
      where: { tenantId },
      include: { asset: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createRule(
    tenantId: number,
    data: {
      assetId?: number;
      sensorType: string;
      minThreshold?: number;
      maxThreshold?: number;
      action?: string;
    },
  ) {
    return prisma.sensorRule.create({
      data: {
        tenantId,
        assetId: data.assetId,
        sensorType: data.sensorType,
        minThreshold: data.minThreshold,
        maxThreshold: data.maxThreshold,
        action: data.action || 'ALERT',
        isActive: true,
      },
    });
  }
}

export const telemetryService = new TelemetryService();
