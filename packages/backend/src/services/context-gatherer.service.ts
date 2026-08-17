import prisma from '@/lib/prisma.js';
import logger from '@/utils/logger.js';

/**
 * Service responsible for aggregating context needed by the LLM Copilot
 * to provide intelligent incident analysis.
 */
export class ContextGathererService {
  /**
   * Gathers all relevant context for a specific incident to inject into an LLM prompt.
   */
  static async gatherIncidentContext(tenantId: number, incidentId: number): Promise<string> {
    logger.info(`[ContextGatherer] Assembling context for incident ${incidentId} (tenant ${tenantId})...`);

    // Fetch the incident and its relations
    const incident: any = await prisma.incident.findFirst({
      where: { id: incidentId, tenantId },
      include: {
        asset: {
          include: {
            assetType: true,
            telemetryReadings: {
              orderBy: { timestamp: 'desc' },
              take: 5, // Get 5 most recent telemetry readings
            },
            inspections: {
              where: { status: 'COMPLETED' },
              orderBy: { completedAt: 'desc' },
              take: 2, // Last 2 inspections
            }
          }
        },
        reporter: {
          select: { name: true, role: true }
        },
        category: true,
        anomaly: {
          include: {
            camera: true
          }
        },
        comments: {
          orderBy: { createdAt: 'asc' },
          include: {
            author: {
              select: { name: true, role: true }
            }
          }
        },
        aiEvent: {
          include: {
            modelVersion: {
              include: {
                model: true
              }
            }
          }
        }
      }
    });

    if (!incident) {
      throw new Error(`Incident ${incidentId} not found`);
    }

    // Assemble the Markdown context payload
    let contextStr = `## INCIDENT DETAILS\n`;
    contextStr += `- **ID:** ${incident.id}\n`;
    contextStr += `- **Title:** ${incident.title}\n`;
    contextStr += `- **Description:** ${incident.description || 'N/A'}\n`;
    contextStr += `- **Source:** ${incident.source}\n`;
    contextStr += `- **Severity:** ${incident.severity}\n`;
    contextStr += `- **Status:** ${incident.status}\n`;
    contextStr += `- **Reported By:** ${incident.reporter.name} (${incident.reporter.role})\n`;
    
    if (incident.category) {
      contextStr += `- **Category:** ${incident.category.name}\n`;
    }

    if (incident.asset) {
      contextStr += `\n## AFFECTED ASSET\n`;
      contextStr += `- **Name:** ${incident.asset.name}\n`;
      contextStr += `- **Type:** ${incident.asset.assetType.name}\n`;
      contextStr += `- **Health Score:** ${incident.asset.healthScore}/100\n`;
      
      if (incident.asset.telemetryReadings.length > 0) {
        contextStr += `\n### Recent Telemetry Readings:\n`;
        incident.asset.telemetryReadings.forEach((r: any) => {
          contextStr += `  - ${r.sensorType}: ${r.value} ${r.unit} (at ${r.timestamp.toISOString()})\n`;
        });
      }

      if (incident.asset.inspections.length > 0) {
        contextStr += `\n### Recent Inspections:\n`;
        incident.asset.inspections.forEach((insp: any) => {
          contextStr += `  - Completed on: ${insp.completedAt?.toISOString()} | Status: ${insp.status} | Findings: ${insp.notes || 'None'}\n`;
        });
      }
    }

    if (incident.aiEvent) {
      contextStr += `\n## AI DETECTION CONTEXT\n`;
      contextStr += `- **AI Event Type:** ${incident.aiEvent.eventType}\n`;
      contextStr += `- **Confidence:** ${incident.aiEvent.aggregateConfidence}%\n`;
      if (incident.aiEvent.modelVersion) {
        contextStr += `- **Model:** ${incident.aiEvent.modelVersion.model.name} (v${incident.aiEvent.modelVersion.version})\n`;
      }
    } else if (incident.anomaly) {
      contextStr += `\n## LEGACY COMPUTER VISION ANOMALY\n`;
      contextStr += `- **Type:** ${incident.anomaly.anomalyType}\n`;
      contextStr += `- **Confidence:** ${incident.anomaly.confidence}%\n`;
      if (incident.anomaly.camera) {
        contextStr += `- **Camera:** ${incident.anomaly.camera.name}\n`;
      }
    }

    if (incident.comments.length > 0) {
      contextStr += `\n## INCIDENT COMMENTS LOG\n`;
      incident.comments.forEach((c: any) => {
        contextStr += `[${c.createdAt.toISOString()}] ${c.author.name} (${c.author.role}): ${c.content}\n`;
      });
    }

    return contextStr;
  }

  /**
   * Gathers all relevant context for a specific inspection to inject into an LLM prompt.
   */
  static async gatherInspectionContext(tenantId: number, inspectionId: number): Promise<string> {
    logger.info(`[ContextGatherer] Assembling context for inspection ${inspectionId} (tenant ${tenantId})...`);

    const inspection: any = await prisma.inspection.findFirst({
      where: { id: inspectionId, tenantId },
      include: {
        asset: {
          include: {
            assetType: true
          }
        },
        inspector: {
          select: { name: true, role: true }
        },
        inspectionImages: true
      }
    });

    if (!inspection) {
      throw new Error(`Inspection ${inspectionId} not found`);
    }

    let contextStr = `## INSPECTION DETAILS\n`;
    contextStr += `- **ID:** ${inspection.id}\n`;
    contextStr += `- **Status:** ${inspection.status}\n`;
    contextStr += `- **Scheduled Date:** ${inspection.scheduledDate.toISOString()}\n`;
    if (inspection.completedAt) {
      contextStr += `- **Completed At:** ${inspection.completedAt.toISOString()}\n`;
    }
    contextStr += `- **Inspector:** ${inspection.inspector.name} (${inspection.inspector.role})\n`;
    contextStr += `- **Notes:** ${inspection.notes || 'No notes provided.'}\n`;

    if (inspection.asset) {
      contextStr += `\n## ASSET UNDER INSPECTION\n`;
      contextStr += `- **Name:** ${inspection.asset.name}\n`;
      contextStr += `- **Type:** ${inspection.asset.assetType.name}\n`;
      contextStr += `- **Health Score:** ${inspection.asset.healthScore}/100\n`;
    }

    if (inspection.inspectionImages && inspection.inspectionImages.length > 0) {
      contextStr += `\n## CAPTURED IMAGES LOG\n`;
      inspection.inspectionImages.forEach((img: any, index: number) => {
        contextStr += `- **Image ${index + 1}:** ${img.caption || 'No caption'}\n`;
      });
    }

    return contextStr;
  }
}
