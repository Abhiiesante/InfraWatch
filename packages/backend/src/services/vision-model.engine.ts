/**
 * Vision Model Engine
 *
 * Connects to Roboflow Computer Vision Inference API or custom VISION_MODEL_ENDPOINT
 * to perform real-time visual inspection, object detection, and hazard identification.
 */

import logger from '@/utils/logger.js';

export interface DetectedVisualAnomaly {
  label: string;
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

/**
 * Calls Roboflow Inference API directly with base64 image data.
 */
async function callRoboflowInference(
  apiKey: string,
  modelId: string,
  imageInput: string | Buffer
): Promise<VisionFrameAnalysisResult> {
  let base64String = '';

  if (Buffer.isBuffer(imageInput)) {
    base64String = imageInput.toString('base64');
  } else if (typeof imageInput === 'string') {
    if (imageInput.startsWith('data:image')) {
      base64String = imageInput.split(',')[1] || '';
    } else if (imageInput.startsWith('http://') || imageInput.startsWith('https://')) {
      const resp = await fetch(imageInput);
      const arr = await resp.arrayBuffer();
      base64String = Buffer.from(arr).toString('base64');
    } else {
      base64String = imageInput;
    }
  }

  const endpoint = `https://detect.roboflow.com/${modelId}?api_key=${apiKey}`;
  logger.info(`[VisionModelEngine] Invoking Roboflow Inference API (${modelId})...`);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: base64String,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Roboflow Inference API error: ${response.status} ${errText}`);
  }

  const result = (await response.json()) as any;
  const imageWidth = result.image?.width || 1280;
  const imageHeight = result.image?.height || 720;
  const rawPredictions = result.predictions || [];

  const detections: DetectedVisualAnomaly[] = rawPredictions.map((pred: any) => {
    const confPercent = Number((pred.confidence * 100).toFixed(1));
    const label = (pred.class || 'HAZARD').toUpperCase().replace(/\s+/g, '_');
    
    // Determine severity based on class and confidence
    let severity: DetectedVisualAnomaly['severity'] = 'MEDIUM';
    if (label.includes('VIOLATION') || label.includes('HAZARD') || confPercent > 85) {
      severity = 'CRITICAL';
    } else if (confPercent > 70) {
      severity = 'HIGH';
    }

    return {
      label,
      confidence: confPercent,
      bbox: [
        Math.round(pred.x - pred.width / 2),
        Math.round(pred.y - pred.height / 2),
        Math.round(pred.width),
        Math.round(pred.height),
      ],
      severity,
      simulated: false,
    };
  });

  const hasAnomaly = detections.length > 0;
  const overallConfidence = hasAnomaly
    ? Math.max(...detections.map(d => d.confidence))
    : 0;

  logger.info(`[VisionModelEngine] Roboflow Inference success: ${detections.length} objects detected.`);

  return {
    imageWidth,
    imageHeight,
    hasAnomaly,
    overallConfidence,
    detections,
    analyzedAt: new Date().toISOString(),
    simulated: false,
  };
}

/**
 * Calls a custom vision model inference endpoint if configured.
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

export class VisionModelEngine {
  /**
   * Analyze an image frame.
   * Priority:
   * 1. Direct Roboflow Inference API (if ROBOFLOW_API_KEY is present)
   * 2. Custom VISION_MODEL_ENDPOINT (if present)
   * 3. Fallback clearly labeled as simulated with reason
   */
  static async analyzeFrame(imageInput: string | Buffer): Promise<VisionFrameAnalysisResult> {
    const roboflowKey = process.env.ROBOFLOW_API_KEY;
    const roboflowModel = process.env.ROBOFLOW_MODEL_ID || 'coco/3';
    const customEndpoint = process.env.VISION_MODEL_ENDPOINT;

    if (roboflowKey) {
      try {
        return await callRoboflowInference(roboflowKey, roboflowModel, imageInput);
      } catch (err) {
        logger.error(`[VisionModelEngine] Roboflow inference failed: ${err}`);
        throw err;
      }
    }

    if (customEndpoint) {
      try {
        logger.info(`[VisionModelEngine] Calling real inference endpoint: ${customEndpoint}`);
        return await callRealEndpoint(customEndpoint, imageInput);
      } catch (err) {
        logger.error(`[VisionModelEngine] Real endpoint failed: ${err}`);
        throw err;
      }
    }

    logger.warn('[VisionModelEngine] No ROBOFLOW_API_KEY or VISION_MODEL_ENDPOINT configured');
    return {
      imageWidth: 1280,
      imageHeight: 720,
      hasAnomaly: false,
      overallConfidence: 0,
      detections: [],
      analyzedAt: new Date().toISOString(),
      simulated: true,
      simulationReason: 'ROBOFLOW_API_KEY not configured in backend environment.',
    };
  }
}
