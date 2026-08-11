import prisma from '@/lib/prisma.js';
import { VisionModelEngine, VisionFrameAnalysisResult } from './vision-model.engine.js';

export class AnomalyService {
  static async getAnomalies(tenantId: number, status?: string, skip = 0, take = 20) {
    const where: any = { tenantId };
    if (status) {
      where.status = status;
    }

    const [anomalies, total] = await Promise.all([
      prisma.anomalyDetection.findMany({
        where,
        include: {
          camera: {
            include: { asset: true },
          },
          reviewer: true,
          incident: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.anomalyDetection.count({ where }),
    ]);

    return { anomalies, total };
  }

  static async getAnomalyById(tenantId: number, id: number) {
    return prisma.anomalyDetection.findFirst({
      where: { id, tenantId },
      include: {
        camera: {
          include: { asset: true },
        },
        reviewer: true,
        incident: true,
      },
    });
  }

  static async confirmAnomaly(tenantId: number, id: number, reviewerId: number) {
    const anomaly = await prisma.anomalyDetection.findFirst({
      where: { id, tenantId },
      include: { camera: true },
    });

    if (!anomaly) throw new Error('Anomaly not found');
    if (anomaly.status !== 'PENDING_REVIEW') throw new Error('Anomaly already reviewed');

    const detections: any = anomaly.detections || [];
    const mainLabel = detections[0]?.label || 'Automated Hazard';

    const incident = await prisma.incident.create({
      data: {
        tenantId,
        assetId: anomaly.camera.assetId,
        reporterId: reviewerId,
        title: `[AI Flagged] ${mainLabel} detected on ${anomaly.camera.name}`,
        description: `Computer vision model flagged anomaly with ${anomaly.confidence}% confidence. Source frame: ${anomaly.imageUrl}`,
        severity: Number(anomaly.confidence) > 85 ? 'HIGH' : 'MEDIUM',
        status: 'OPEN',
        attachmentUrls: [anomaly.imageUrl],
        aiSuggestedSeverity: Number(anomaly.confidence) > 85 ? 'HIGH' : 'MEDIUM',
        aiSuggestedCategory: mainLabel,
        aiConfidence: anomaly.confidence,
        aiTriagedAt: new Date(),
      },
    });

    return prisma.anomalyDetection.update({
      where: { id },
      data: {
        status: 'CONFIRMED',
        reviewedById: reviewerId,
        reviewedAt: new Date(),
        incidentId: incident.id,
      },
    });
  }

  static async dismissAnomaly(tenantId: number, id: number, reviewerId: number) {
    return prisma.anomalyDetection.updateMany({
      where: { id, tenantId, status: 'PENDING_REVIEW' },
      data: {
        status: 'DISMISSED',
        reviewedById: reviewerId,
        reviewedAt: new Date(),
      },
    });
  }

  /**
   * Analyze Image Frame using Vision Model Engine
   */
  static async analyzeFrameAndSave(tenantId: number, cameraId: number, imageInput: string): Promise<any> {
    const analysis: VisionFrameAnalysisResult = await VisionModelEngine.analyzeFrame(imageInput);

    if (!analysis.hasAnomaly) {
      return { hasAnomaly: false, simulated: analysis.simulated, message: 'Frame verified clear of structural anomalies' };
    }

    return prisma.anomalyDetection.create({
      data: {
        tenantId,
        cameraId,
        imageUrl: imageInput.startsWith('http') || imageInput.startsWith('/images') ? imageInput : '/images/bandra_sealink_inspection.png',
        detections: analysis.detections as any,
        confidence: analysis.overallConfidence,
        status: 'PENDING_REVIEW',
        metadata: {
          simulated: analysis.simulated,
          simulationReason: analysis.simulationReason || null,
        },
      },
    });
  }
}
