import prisma from '@/lib/prisma.js';
import { WeibullReliabilityModel } from '@/utils/ml-math.utils.js';
import { KalmanFilterRulEngine } from '@/utils/kalman-filter.utils.js';

export class PredictionService {
  /**
   * Calculates predictive failure probability and asset health score
   * using Weibull Distribution Hazard Rate & Telemetry Z-score deviation.
   * Auto-schedules preventive inspections if failure probability > 70%.
   */
  static async analyzeAsset(tenantId: number, assetId: number) {
    const asset = await prisma.asset.findFirst({
      where: { id: assetId, tenantId },
      include: {
        incidents: true,
        inspections: true,
        cameras: true,
        telemetryReadings: {
          orderBy: { timestamp: 'desc' },
          take: 20,
        },
      },
    });

    if (!asset) throw new Error('Asset not found');

    const incidentCount = asset.incidents.length;
    const unresolvedIncidents = asset.incidents.filter((i: any) => i.status !== 'CLOSED' && i.status !== 'RESOLVED').length;

    // Calculate asset age in operating days
    const createdTime = new Date(asset.createdAt).getTime();
    const assetAgeDays = Math.max(5, Math.floor((Date.now() - createdTime) / (1000 * 60 * 60 * 24)));

    // Calculate Telemetry Z-Score Variance
    let telemetryZScore = 0.0;
    if (asset.telemetryReadings.length >= 3) {
      const values = asset.telemetryReadings.map(r => Number(r.value));
      const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
      const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
      const stdDev = Math.sqrt(variance) || 0.001;
      const latestVal = values[0];
      telemetryZScore = (latestVal - mean) / stdDev;
    }

    // Compute Weibull Reliability & Health Score
    const { healthScore, failureProbability, hazardRate } = WeibullReliabilityModel.computeCompositeHealthScore(
      assetAgeDays,
      unresolvedIncidents,
      incidentCount,
      telemetryZScore,
      2.4, // Weibull Shape Parameter Beta
      180  // Weibull Scale Parameter Eta (Characteristic Life)
    );

    const confidence = Number((91.5 - Math.min(10, Math.abs(telemetryZScore) * 1.2)).toFixed(1));

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 14);

    let recommendedAction = 'Routine inspection recommended within 30 days.';
    if (failureProbability > 70) {
      recommendedAction = `URGENT WEIBULL HAZARD (Rate: ${hazardRate}/day): High failure risk within 14 days. Immediate physical inspection & thermal sweep required.`;
    } else if (failureProbability > 40) {
      recommendedAction = `MODERATE DEGRADATION RISK: Schedule preventive maintenance within 14 days. Z-score variance: ${telemetryZScore.toFixed(2)}`;
    }

    // Update asset health score in DB
    await prisma.asset.update({
      where: { id: assetId },
      data: {
        healthScore,
        lastPredictionAt: new Date(),
      },
    });

    // Auto-schedule preventive inspection if risk > 70%
    let autoInspectionId = null;
    if (failureProbability > 70) {
      const inspector = await prisma.user.findFirst({
        where: { tenantId, role: 'INSPECTOR', isActive: true },
      });

      if (inspector) {
        const inspection = await prisma.inspection.create({
          data: {
            tenantId,
            assetId,
            inspectorId: inspector.id,
            scheduledDate: new Date(),
            status: 'SCHEDULED',
            isPredictive: true,
            notes: `[AUTO-SCHEDULED BY WEIBULL ML ENGINE] High failure probability (${failureProbability}%, Hazard Rate: ${hazardRate}). Action: ${recommendedAction}`,
          },
        });
        autoInspectionId = inspection.id;
      }
    }

    // Save prediction record
    // Compute Kalman Filter Remaining Useful Life (RUL) Forecast
    const baseDamage = Math.max(5, 100 - healthScore);
    const readings = asset.telemetryReadings.length > 0
      ? asset.telemetryReadings.map(r => Number(r.value))
      : [
          Math.max(5, baseDamage * 0.4),
          Math.max(8, baseDamage * 0.6),
          Math.max(12, baseDamage * 0.8),
          baseDamage,
        ];
    const kalmanRul = KalmanFilterRulEngine.estimateRul(readings, 7, 85.0);

    // Save prediction record
    return prisma.assetPrediction.create({
      data: {
        tenantId,
        assetId,
        failureProbability,
        predictedFailureDate: futureDate,
        recommendedAction,
        confidence,
        status: 'ACTIVE',
        autoScheduledInspectionId: autoInspectionId,
        analysisData: {
          healthScore,
          failureProbability,
          hazardRate,
          weibullBeta: 2.4,
          weibullEtaDays: 180,
          assetAgeDays,
          telemetryZScore: Number(telemetryZScore.toFixed(2)),
          incidentCount,
          unresolvedIncidents,
          kalmanRul,
        } as any,
      },
    });
  }

  static async getPredictions(tenantId: number, skip = 0, take = 20) {
    const [predictions, total] = await Promise.all([
      prisma.assetPrediction.findMany({
        where: { tenantId },
        include: {
          asset: {
            include: { assetType: true },
          },
        },
        orderBy: { failureProbability: 'desc' },
        skip,
        take,
      }),
      prisma.assetPrediction.count({ where: { tenantId } }),
    ]);

    return { predictions, total };
  }

  static async getInfrastructureHealthScore(tenantId: number) {
    const assets = await prisma.asset.findMany({
      where: { tenantId, deletedAt: null },
      select: { healthScore: true },
    });

    if (assets.length === 0) return { overallHealth: 100, assetCount: 0, atRiskCount: 0 };

    const totalHealth = assets.reduce((sum: number, a: any) => sum + (a.healthScore || 100), 0);
    const overallHealth = Math.round(totalHealth / assets.length);
    const atRiskCount = assets.filter((a: any) => (a.healthScore || 100) < 60).length;

    return {
      overallHealth,
      assetCount: assets.length,
      atRiskCount,
    };
  }
}
