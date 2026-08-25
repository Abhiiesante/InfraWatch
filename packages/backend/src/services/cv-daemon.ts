import { Server as SocketServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import logger from '@/utils/logger.js';
import { DataIntelligenceService } from './data-intelligence.service.js';
import prisma from '@/lib/prisma.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { VideoPipelineOrchestrator } from './agents/video-pipeline.orchestrator.js';

const execAsync = promisify(exec);
const ffmpegPath = ffmpegInstaller.path;

export type FrameSource = 'live' | 'real_no_frame' | 'simulated';

/**
 * CV Daemon — Real-time object detection streaming over WebSockets.
 *
 * When ROBOFLOW_API_KEY is configured, this daemon fetches live frames from
 * camera stream URLs or client WebRTC pushes and calls the Roboflow Inference API. 
 * When it is NOT configured, it runs a clearly-marked simulation.
 */
export class CVDaemon {
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;
  private io: SocketServer | null = null;
  private isSimulated = true;
  private roboflowApiKey: string | null = null;
  private roboflowModelId: string = 'infrawatch-safety/1';

  // Alert deduplication tracking map: key = `${cameraId}_${violationClass}`, value = lastTriggeredTimestampMs
  private violationCooldowns = new Map<string, number>();

  // Live in-memory frame buffer cache for WebRTC/browser-streamed cameras
  private frameBuffers = new Map<string | number, { buffer: Buffer; timestamp: number }>();

  // Simulated box state (only used when no real inference is available)
  private simulatedBoxes = [
    { id: 'track_1', label: 'AMR', conf: 92, x: 25, y: 70, w: 12, h: 15, dx: 0.8, dy: -0.3, color: '#06B6D4' },
    { id: 'track_2', label: 'AMR', conf: 87, x: 65, y: 75, w: 10, h: 12, dx: -0.8, dy: -0.2, color: '#06B6D4' },
    { id: 'track_3', label: 'PERSON', conf: 74, x: 45, y: 40, w: 6, h: 20, dx: 0.1, dy: 0.1, color: '#EF4444' },
  ];

  attachSocket(server: HttpServer) {
    this.io = new SocketServer(server, {
      cors: { origin: '*', methods: ['GET', 'POST'] },
      transports: ['websocket', 'polling'],
      allowEIO3: true,
    });

    VideoPipelineOrchestrator.setSocketIO(this.io);

    this.io.on('connection', (socket) => {
      logger.info(`🔌 CV Socket Client connected: ${socket.id}`);

      // Allow frontend WebRTC transmitters & local webcams to push live camera frames directly into daemon buffer
      socket.on('cv:push-frame', ({ cameraId, base64Image }: { cameraId: string | number; base64Image: string }) => {
        if (!cameraId || !base64Image) return;
        try {
          const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');
          const buffer = Buffer.from(cleanBase64, 'base64');
          this.frameBuffers.set(cameraId, { buffer, timestamp: Date.now() });
          // Also set numeric equivalent if parsable
          const numId = Number(cameraId);
          if (!isNaN(numId)) {
            this.frameBuffers.set(numId, { buffer, timestamp: Date.now() });
          }
        } catch (err) {
          logger.warn(`[CVDaemon] Failed to parse pushed frame for camera ${cameraId}: ${err}`);
        }
      });

      socket.on('disconnect', () => {
        logger.info(`🔌 CV Socket Client disconnected: ${socket.id}`);
      });
    });
  }

  /**
   * Register a frame directly from HTTP/WebRTC routes
   */
  registerLiveFrame(cameraId: string | number, frameBuffer: Buffer) {
    this.frameBuffers.set(cameraId, { buffer: frameBuffer, timestamp: Date.now() });
    const numId = Number(cameraId);
    if (!isNaN(numId)) {
      this.frameBuffers.set(numId, { buffer: frameBuffer, timestamp: Date.now() });
    }
  }

  start(defaultIntervalMs = 1000) {
    if (this.isRunning) return;
    this.isRunning = true;

    this.roboflowApiKey = process.env.ROBOFLOW_API_KEY || null;
    this.roboflowModelId = process.env.ROBOFLOW_MODEL_ID || 'coco/3';
    this.isSimulated = !this.roboflowApiKey;

    const intervalMs = process.env.CV_INFERENCE_INTERVAL_MS 
      ? parseInt(process.env.CV_INFERENCE_INTERVAL_MS, 10) 
      : (this.isSimulated ? 100 : defaultIntervalMs);

    if (this.isSimulated) {
      logger.warn(`👁️ CV Daemon started in SIMULATED mode — ROBOFLOW_API_KEY not configured. Tick: ${intervalMs}ms`);
    } else {
      logger.info(`👁️ CV Daemon started with REAL Roboflow inference (model: ${this.roboflowModelId}). Tick: ${intervalMs}ms`);
    }

    this.timer = setInterval(() => {
      this.tick();
    }, intervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
    logger.info('👁️ CV Daemon stopped');
  }

  private tick() {
    if (this.isSimulated) {
      this.tickSimulated();
    } else {
      this.tickReal();
    }
  }

  /**
   * Capture a single frame from the video stream URL using ffmpeg.
   */
  private async captureFrameFromStream(streamUrl: string): Promise<Buffer | null> {
    try {
      // Use max_muxing_queue_size to prevent buffer issues, and timeout at 5 seconds
      const cmd = `"${ffmpegPath}" -y -i "${streamUrl}" -vframes 1 -f image2 -c:v mjpeg pipe:1`;
      const { stdout } = await execAsync(cmd, { encoding: 'buffer', timeout: 5000 });
      return stdout as Buffer;
    } catch (err) {
      logger.warn(`[CVDaemon] ffmpeg frame capture failed for ${streamUrl}: ${String(err).split('\n')[0]}`);
      return null;
    }
  }

  /**
   * Real inference path — iterates through cameras, captures frames, calls Roboflow.
   */
  private async tickReal() {
    try {
      // 1. Fetch active cameras
      const cameras = await prisma.camera.findMany({
        where: { 
          status: { not: 'OFFLINE' }
        }
      });

      if (cameras.length === 0) {
        logger.debug('[CVDaemon] No active cameras found.');
        return;
      }

      // 2. Process each camera concurrently
      await Promise.all(cameras.map(async (camera) => {
        const streamUrl = (camera.config as any)?.streamUrl;
        
        // Check for fresh pushed WebRTC buffer (< 5 seconds old)
        let frameBuffer: Buffer | null = null;
        const cached = this.frameBuffers.get(camera.id);
        if (cached && (Date.now() - cached.timestamp < 5000)) {
          frameBuffer = cached.buffer;
        } else if (streamUrl) {
          frameBuffer = await this.captureFrameFromStream(streamUrl);
        }

        // If no frame could be captured, emit real_no_frame state (requirement F1.4)
        if (!frameBuffer) {
          if (this.io) {
            this.io.emit('cv-detections', {
              frameSource: 'real_no_frame' as FrameSource,
              cameraId: camera.id,
              cameraName: camera.name,
              reason: streamUrl ? 'Camera feed unreachable / frame decode failed' : 'No streamUrl configured on camera',
              boxes: [],
              stats: {
                zoneViolations: 0,
                activeAMRs: 0,
                rackUtilization: 0,
                occupiedBays: 0,
                totalBays: 50
              }
            });
          }
          return;
        }

        const frameBase64 = frameBuffer.toString('base64');

        // Call Roboflow
        const response = await fetch(
          `https://detect.roboflow.com/${this.roboflowModelId}?api_key=${this.roboflowApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: frameBase64,
            signal: AbortSignal.timeout(5000),
          }
        );

        if (!response.ok) {
          throw new Error(`Roboflow API ${response.status}: ${await response.text()}`);
        }

        const result = await response.json() as any;
        const imgW = result.image?.width || 1;
        const imgH = result.image?.height || 1;

        let zoneViolationsCount = 0;
        let activeAmrsCount = 0;

        const cameraConfig = (camera.config as any) || {};
        const keepOutZone = cameraConfig.keepOutZone || {
          xMin: 0,
          xMax: 100,
          yMin: 50,
          yMax: 100,
          zoneName: 'Restricted Automated Safety Zone',
          severity: 'CRITICAL',
        };

        const totalRackBays = 50;
        let occupiedBaysCount = 0;

        const boxes = (result.predictions || []).map((pred: any, idx: number) => {
          const cls = (pred.class || '').toLowerCase();
          const isPerson = cls === 'person' || cls === 'worker';
          const isForklift = cls === 'forklift' || cls === 'amr' || cls === 'vehicle' || cls === 'car' || cls === 'truck';
          const isCargo = cls.includes('box') || cls.includes('pallet') || cls.includes('package') || cls.includes('container') || cls.includes('crate');
          
          // Spatial Rule: Read configured keepOutZone bounds (persisted in camera.config)
          const xCenter = (pred.x / imgW) * 100;
          const yCenter = (pred.y / imgH) * 100;
          const inZone = xCenter >= (keepOutZone.xMin ?? 0) &&
                         xCenter <= (keepOutZone.xMax ?? 100) &&
                         yCenter >= (keepOutZone.yMin ?? 50) &&
                         yCenter <= (keepOutZone.yMax ?? 100);
          const isViolation = isPerson && inZone;
          
          if (isViolation) zoneViolationsCount++;
          if (isForklift) activeAmrsCount++;
          if (isCargo || (!inZone && yCenter < (keepOutZone.yMin ?? 50))) {
            occupiedBaysCount++;
          }

          let color = '#10B981'; // green
          if (isViolation) color = '#EF4444'; // red
          else if (isForklift) color = '#06B6D4'; // cyan
          else if (isPerson) color = '#F59E0B'; // amber

          return {
            id: `rf_${camera.id}_${idx}`,
            label: (pred.class || 'OBJECT').toUpperCase(),
            conf: Math.round((pred.confidence || 0) * 100),
            x: +((pred.x - pred.width / 2) / imgW * 100).toFixed(1),
            y: +((pred.y - pred.height / 2) / imgH * 100).toFixed(1),
            w: +(pred.width / imgW * 100).toFixed(1),
            h: +(pred.height / imgH * 100).toFixed(1),
            color,
            isViolation
          };
        });

        const computedRackUtilization = Math.min(100, Math.round((occupiedBaysCount / totalRackBays) * 100));

        // Emit real payload with LIVE status and configured zone parameters
        if (this.io) {
          this.io.emit('cv-detections', {
            frameSource: 'live' as FrameSource,
            cameraId: camera.id,
            cameraName: camera.name,
            keepOutZone,
            boxes,
            stats: {
               zoneViolations: zoneViolationsCount,
               activeAMRs: activeAmrsCount,
               rackUtilization: computedRackUtilization,
               occupiedBays: occupiedBaysCount,
               totalBays: totalRackBays
            }
          });
        }

        // Auto-generate anomaly on violation with 30-second alert deduplication cooldown (Requirement F7.3)
        const cooldownKey = `${camera.id}_ZONE_VIOLATION`;
        const lastAlertTime = this.violationCooldowns.get(cooldownKey) || 0;
        const now = Date.now();

        if (zoneViolationsCount > 0 && (now - lastAlertTime > 30000)) {
           this.violationCooldowns.set(cooldownKey, now);
           logger.warn(`[CVDaemon] Camera ${camera.id}: Spatial rule violated in "${keepOutZone.zoneName}"! Triggering Anomaly.`);
           
           const violations = (result.predictions || []).filter((pred: any) => {
             const cls = (pred.class || '').toLowerCase();
             const isP = cls === 'person' || cls === 'worker';
             const xc = (pred.x / imgW) * 100;
             const yc = (pred.y / imgH) * 100;
             return isP &&
                    xc >= (keepOutZone.xMin ?? 0) &&
                    xc <= (keepOutZone.xMax ?? 100) &&
                    yc >= (keepOutZone.yMin ?? 50) &&
                    yc <= (keepOutZone.yMax ?? 100);
           });

           if (violations.length > 0) {
             const formattedDetections = violations.map((pred: any) => ({
               label: 'RESTRICTED_ZONE_VIOLATION',
               confidence: pred.confidence,
               severity: 'CRITICAL',
               bbox: [
                 pred.x - pred.width / 2, // left
                 pred.y - pred.height / 2, // top
                 pred.width, // w
                 pred.height // h
               ],
               imageWidth: imgW,
               imageHeight: imgH
             }));

             prisma.anomalyDetection.create({
               data: {
                 tenantId: camera.tenantId,
                 cameraId: camera.id,
                 imageUrl: `data:image/jpeg;base64,${frameBase64}`,
                 detections: formattedDetections,
                 confidence: violations[0].confidence,
                 status: 'PENDING_REVIEW'
               }
             }).catch(err => logger.error(`[CVDaemon] Failed to create anomaly: ${err}`));
           }
        }

        // Sync real detections to Databricks
        if (boxes.length > 0) {
          DataIntelligenceService.syncCVToDataPlatform({
            camera_id: String(camera.id),
            detections: boxes,
            timestamp: new Date().toISOString(),
            model: this.roboflowModelId,
          }).catch(err => logger.error(`[CVDaemon] Databricks sync failed for camera ${camera.id}: ${err}`));
        }
      }));

      // Process standalone wireless phone / webcam transmitter frames in frameBuffers
      for (const [key, cached] of this.frameBuffers.entries()) {
        if (Date.now() - cached.timestamp < 5000) {
          const isDbCam = cameras.some(c => String(c.id) === String(key));
          if (!isDbCam) {
            try {
              const frameBase64 = cached.buffer.toString('base64');
              const response = await fetch(
                `https://detect.roboflow.com/${this.roboflowModelId}?api_key=${this.roboflowApiKey}`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                  body: frameBase64,
                  signal: AbortSignal.timeout(5000),
                }
              );
              if (response.ok) {
                const result = await response.json() as any;
                const imgW = result.image?.width || 1;
                const imgH = result.image?.height || 1;
                const boxes = (result.predictions || []).map((pred: any, idx: number) => {
                  const cls = (pred.class || '').toLowerCase();
                  const isPerson = cls === 'person' || cls === 'worker';
                  const isVehicle = cls === 'car' || cls === 'forklift' || cls === 'truck' || cls === 'vehicle';
                  let color = '#10B981';
                  if (isPerson) color = '#F59E0B';
                  else if (isVehicle) color = '#06B6D4';

                  return {
                    id: `rf_wireless_${key}_${idx}`,
                    label: (pred.class || 'OBJECT').toUpperCase(),
                    conf: Math.round((pred.confidence || 0) * 100),
                    x: +((pred.x - pred.width / 2) / imgW * 100).toFixed(1),
                    y: +((pred.y - pred.height / 2) / imgH * 100).toFixed(1),
                    w: +(pred.width / imgW * 100).toFixed(1),
                    h: +(pred.height / imgH * 100).toFixed(1),
                    color,
                    isViolation: false,
                  };
                });

                if (this.io) {
                  this.io.emit('cv-detections', {
                    frameSource: 'live' as FrameSource,
                    cameraId: key,
                    cameraName: `Wireless Mobile CCTV (Device ${key})`,
                    boxes,
                    stats: {
                      zoneViolations: 0,
                      activeAMRs: boxes.filter((b: any) => b.label.includes('VEHICLE') || b.label.includes('CAR')).length,
                    },
                  });
                }
              }
            } catch (err) {
              logger.debug(`[CVDaemon] Standalone wireless inference failed for key ${key}: ${err}`);
            }
          }
        }
      }

    } catch (error) {
      logger.error(`[CVDaemon] Real inference cycle failed: ${error}`);
    }
  }

  private tickSimulated(reason?: string) {
    this.simulatedBoxes = this.simulatedBoxes.map(box => {
      let newX = box.x + box.dx;
      let newY = box.y + box.dy;
      let newDx = box.dx;
      let newDy = box.dy;

      if (newX < 5 || newX + box.w > 95) newDx = -box.dx;
      if (newY < 5 || newY + box.h > 95) newDy = -box.dy;

      newX = Math.max(0, Math.min(100 - box.w, newX));
      newY = Math.max(0, Math.min(100 - box.h, newY));

      const newConf = Math.round(Math.min(97, Math.max(70, box.conf + (Math.random() - 0.5) * 2)));
      return { ...box, x: newX, y: newY, dx: newDx, dy: newDy, conf: newConf };
    });

    const occupiedBaysCount = this.simulatedBoxes.filter(b => b.y < 50).length;
    const totalRackBays = 50;
    const computedRackUtilization = Math.min(100, Math.round((occupiedBaysCount / totalRackBays) * 100));

    if (this.io) {
      this.io.emit('cv-detections', {
        frameSource: 'simulated' as FrameSource,
        simulationReason: reason || 'ROBOFLOW_API_KEY not configured',
        boxes: this.simulatedBoxes,
        stats: {
          zoneViolations: 0,
          activeAMRs: this.simulatedBoxes.filter(b => b.label === 'AMR').length,
          rackUtilization: computedRackUtilization,
          occupiedBays: occupiedBaysCount,
          totalBays: totalRackBays,
        },
      });
    }
  }
}

export const cvDaemon = new CVDaemon();
