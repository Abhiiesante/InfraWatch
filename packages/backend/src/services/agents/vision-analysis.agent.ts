import fs from 'fs';
import prisma from '@/lib/prisma.js';
import { VisionModelEngine } from '../vision-model.engine.js';
import { ExtractedFrame } from './video-ingestion.agent.js';
import logger from '@/utils/logger.js';

export interface RawFindingItem {
  frameIndex: number;
  timestampSeconds: number;
  frameImageUrl: string;
  defectType: string;
  confidence: number;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  bbox: [number, number, number, number];
  rawPrediction: any;
}

export class VisionAnalysisAgent {
  /**
   * Run computer vision inference across extracted video frames.
   */
  static async analyzeFrames(
    videoId: number,
    tenantId: number,
    frames: ExtractedFrame[],
    onProgress?: (processed: number, total: number) => void
  ): Promise<{ findingsCount: number; findings: any[] }> {
    logger.info(`[VisionAnalysisAgent] Analyzing ${frames.length} frames for video #${videoId}...`);

    await prisma.inspectionVideo.update({
      where: { id: videoId },
      data: { status: 'ANALYZING' },
    });

    const rawFindings: RawFindingItem[] = [];
    const positiveFrameIndices = new Set<number>();

    // Process frames with bounded concurrency to respect inference rate limits
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      try {
        const analysis = await VisionModelEngine.analyzeFrame(frame.base64);

        if (analysis.detections && analysis.detections.length > 0) {
          positiveFrameIndices.add(frame.frameIndex);

          for (const det of analysis.detections) {
            rawFindings.push({
              frameIndex: frame.frameIndex,
              timestampSeconds: frame.timestampSeconds,
              frameImageUrl: frame.relativeUrl,
              defectType: det.label,
              confidence: det.confidence,
              severity: det.severity,
              bbox: det.bbox,
              rawPrediction: det,
            });
          }
        }
      } catch (err) {
        logger.warn(`[VisionAnalysisAgent] Frame ${frame.frameIndex} inference error: ${err}`);
      }

      if (onProgress) {
        onProgress(i + 1, frames.length);
      }
    }

    logger.info(`[VisionAnalysisAgent] Detected ${rawFindings.length} raw detections across ${positiveFrameIndices.size} positive frames.`);

    // Deduplicate consecutive findings:
    // If consecutive frames detect the same defect class with high overlap, group them into the peak-confidence finding
    const deduplicatedFindings = this.deduplicateFindings(rawFindings);

    logger.info(`[VisionAnalysisAgent] Deduplicated to ${deduplicatedFindings.length} distinct video findings.`);

    // Persist findings to database
    const savedFindings: any[] = [];
    for (const finding of deduplicatedFindings) {
      const created = await prisma.videoFinding.create({
        data: {
          tenantId,
          videoId,
          frameIndex: finding.frameIndex,
          frameTimestamp: finding.timestampSeconds,
          frameImageUrl: finding.frameImageUrl,
          defectType: finding.defectType,
          confidence: finding.confidence,
          severity: finding.severity,
          bbox: finding.bbox,
          rawPrediction: finding.rawPrediction,
          status: 'PENDING_REVIEW',
        },
      });
      savedFindings.push(created);
    }

    // Retention Cleanup: Remove extracted frame files that have NO positive findings to save disk space
    for (const frame of frames) {
      if (!positiveFrameIndices.has(frame.frameIndex)) {
        try {
          if (fs.existsSync(frame.filePath)) {
            fs.unlinkSync(frame.filePath);
          }
        } catch {
          // ignore cleanup errors
        }
      }
    }

    return {
      findingsCount: savedFindings.length,
      findings: savedFindings,
    };
  }

  /**
   * Deduplicate findings across temporal proximity (within 3 seconds for same defect class).
   */
  private static deduplicateFindings(findings: RawFindingItem[]): RawFindingItem[] {
    if (findings.length <= 1) return findings;

    const clusters: RawFindingItem[][] = [];

    for (const item of findings) {
      // Find matching cluster with same defect class within 3 seconds
      const existingCluster = clusters.find((cluster) => {
        const leader = cluster[0];
        return (
          leader.defectType === item.defectType &&
          Math.abs(leader.timestampSeconds - item.timestampSeconds) <= 3.0
        );
      });

      if (existingCluster) {
        existingCluster.push(item);
      } else {
        clusters.push([item]);
      }
    }

    // For each cluster, pick the frame with highest confidence
    return clusters.map((cluster) => {
      cluster.sort((a, b) => b.confidence - a.confidence);
      return cluster[0];
    });
  }
}
