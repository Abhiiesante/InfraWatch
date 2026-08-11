/**
 * Vision Model Stub
 *
 * This module provides a SIMULATED stand-in for a real computer vision
 * inference service. It does NOT perform any actual image analysis —
 * no pixel data is read, no edge detection is computed, no chromaticity
 * is measured. All outputs are randomly sampled and clearly marked
 * as simulated.
 *
 * To connect a real inference endpoint, set the VISION_MODEL_ENDPOINT
 * environment variable (e.g., a Roboflow, Vertex AI, or custom model
 * serving URL). When set, this module delegates to the real endpoint
 * and returns genuine inference results.
 */

import logger from '@/utils/logger.js';

export interface DetectedVisualAnomaly {
  label: 'SURFACE_OXIDE_CORROSION' | 'LATTICE_ARCH_BOLT_SHIFT' | 'HIGH_TEMP_THERMAL_HOTSPOT' | 'STRUCTURAL_MICRO_CRACK';
  confidence: number;
  bbox: [number, number, number, number]; // [x, y, width, height]
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  simulated: boolean;
}

export interface VisionFrameAnalysisResult {
  imageWidth: number;
  imageHeight: number;
  hasAnomaly: boolean;
  overallConfidence: number;
  detections: DetectedVisualAnomaly[];
  analyzedAt: string;
  simulated: boolean;
  simulationReason?: string;
}

const ANOMALY_LABELS: DetectedVisualAnomaly['label'][] = [
  'SURFACE_OXIDE_CORROSION',
  'LATTICE_ARCH_BOLT_SHIFT',
  'HIGH_TEMP_THERMAL_HOTSPOT',
  'STRUCTURAL_MICRO_CRACK',
];

const SEVERITIES: DetectedVisualAnomaly['severity'][] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

/**
 * Calls a real vision model inference endpoint.
 */
async function callRealEndpoint(endpoint: string, imageInput: string | Buffer): Promise<VisionFrameAnalysisResult> {
  const body = typeof imageInput === 'string'
    ? JSON.stringify({ image_base64: imageInput })
    : imageInput;

  const contentType = typeof imageInput === 'string'
    ? 'application/json'
    : 'application/octet-stream';

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': contentType },
    body,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Vision model endpoint error: ${response.status} ${errText}`);
  }

  const data: any = await response.json();

  // Normalize external response to our interface
  return {
    imageWidth: data.imageWidth || data.width || 1280,
    imageHeight: data.imageHeight || data.height || 720,
    hasAnomaly: Array.isArray(data.detections) && data.detections.length > 0,
    overallConfidence: data.overallConfidence || data.confidence || 0,
    detections: (data.detections || []).map((d: any) => ({
      label: d.label || d.class_name || 'STRUCTURAL_MICRO_CRACK',
      confidence: d.confidence || 0,
      bbox: d.bbox || [0, 0, 0, 0],
      severity: d.severity || 'MEDIUM',
      simulated: false,
    })),
    analyzedAt: new Date().toISOString(),
    simulated: false,
  };
}

/**
 * Generates a simulated (fake) analysis result. All values are randomly
 * sampled with no relationship to the input image content whatsoever.
 */
function generateSimulatedResult(): VisionFrameAnalysisResult {
  const detections: DetectedVisualAnomaly[] = [];

  // ~40% chance of finding an anomaly in any given frame
  if (Math.random() < 0.4) {
    const count = Math.random() < 0.7 ? 1 : 2;
    for (let i = 0; i < count; i++) {
      detections.push({
        label: ANOMALY_LABELS[Math.floor(Math.random() * ANOMALY_LABELS.length)],
        confidence: Math.round((70 + Math.random() * 25) * 10) / 10,
        bbox: [
          Math.floor(Math.random() * 800) + 100,
          Math.floor(Math.random() * 400) + 50,
          Math.floor(Math.random() * 200) + 100,
          Math.floor(Math.random() * 150) + 80,
        ],
        severity: SEVERITIES[Math.floor(Math.random() * SEVERITIES.length)],
        simulated: true,
      });
    }
  }

  const hasAnomaly = detections.length > 0;

  return {
    imageWidth: 1280,
    imageHeight: 720,
    hasAnomaly,
    overallConfidence: hasAnomaly
      ? Math.max(...detections.map(d => d.confidence))
      : 0,
    detections,
    analyzedAt: new Date().toISOString(),
    simulated: true,
    simulationReason: 'VISION_MODEL_ENDPOINT not configured. Set this env var to connect a real inference service.',
  };
}

export class VisionModelEngine {
  /**
   * Analyze an image frame. Delegates to a real endpoint if
   * VISION_MODEL_ENDPOINT is set; otherwise returns a clearly
   * marked simulated result.
   */
  static async analyzeFrame(imageInput: string | Buffer): Promise<VisionFrameAnalysisResult> {
    const endpoint = process.env.VISION_MODEL_ENDPOINT;

    if (endpoint) {
      try {
        logger.info(`[VisionModel] Calling real inference endpoint: ${endpoint}`);
        return await callRealEndpoint(endpoint, imageInput);
      } catch (err) {
        logger.error(`[VisionModel] Real endpoint failed, returning error: ${err}`);
        throw err; // Don't silently fall back to fake data
      }
    }

    logger.debug('[VisionModel] No VISION_MODEL_ENDPOINT configured — returning SIMULATED result');
    return generateSimulatedResult();
  }
}
