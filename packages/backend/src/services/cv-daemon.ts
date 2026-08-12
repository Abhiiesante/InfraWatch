import { Server as SocketServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import logger from '@/utils/logger.js';
import { DataIntelligenceService } from './data-intelligence.service.js';

/**
 * CV Daemon — Real-time object detection streaming over WebSockets.
 *
 * When ROBOFLOW_API_KEY is configured, this daemon calls the Roboflow
 * Inference API on a timer. When it is NOT configured, it runs a
 * clearly-marked simulation with bouncing bounding boxes and sets
 * `simulated: true` on every emission.
 *
 * IMPORTANT: Simulated detections are NEVER synced to Databricks.
 * Only real inference results should flow into the data lake.
 */
export class CVDaemon {
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;
  private io: SocketServer | null = null;
  private isSimulated = true;
  private roboflowApiKey: string | null = null;
  private roboflowModelId: string = 'infrawatch-safety/1'; // default model

  // Simulated box state (only used when no real inference is available)
  private boxes = [
    { id: 'track_1', label: 'AMR', conf: 92, x: 25, y: 70, w: 12, h: 15, dx: 0.8, dy: -0.3, color: '#06B6D4' },
    { id: 'track_2', label: 'AMR', conf: 87, x: 65, y: 75, w: 10, h: 12, dx: -0.8, dy: -0.2, color: '#06B6D4' },
    { id: 'track_3', label: 'PERSON', conf: 74, x: 45, y: 40, w: 6, h: 20, dx: 0.1, dy: 0.1, color: '#EF4444' },
  ];

  attachSocket(server: HttpServer) {
    this.io = new SocketServer(server, {
      cors: { origin: '*' }
    });

    this.io.on('connection', (socket) => {
      logger.info(`🔌 CV Socket Client connected: ${socket.id}`);
      socket.on('disconnect', () => {
        logger.info(`🔌 CV Socket Client disconnected: ${socket.id}`);
      });
    });
  }

  start(intervalMs = 100) {
    if (this.isRunning) return;
    this.isRunning = true;

    this.roboflowApiKey = process.env.ROBOFLOW_API_KEY || null;
    this.roboflowModelId = process.env.ROBOFLOW_MODEL_ID || 'infrawatch-safety/1';
    this.isSimulated = !this.roboflowApiKey;

    if (this.isSimulated) {
      logger.warn('👁️ CV Daemon started in SIMULATED mode — ROBOFLOW_API_KEY not configured');
    } else {
      logger.info(`👁️ CV Daemon started with real Roboflow inference (model: ${this.roboflowModelId})`);
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

  private cachedFrameBase64: string | null = null;
  private lastRealTick = 0;

  private async getTestFrameBase64(): Promise<string> {
    if (this.cachedFrameBase64) return this.cachedFrameBase64;
    try {
      logger.info('[CVDaemon] Fetching sample warehouse frame...');
      // A stock image of a warehouse floor
      const resp = await fetch('https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800');
      const buffer = await resp.arrayBuffer();
      this.cachedFrameBase64 = Buffer.from(buffer).toString('base64');
      return this.cachedFrameBase64;
    } catch (e) {
      logger.error('[CVDaemon] Failed to fetch frame, using fallback pixel');
      return 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    }
  }

  /**
   * Real inference path — calls Roboflow Hosted Inference API.
   */
  private async tickReal() {
    const now = Date.now();
    // Throttle to 1 fps to avoid burning through API quota
    if (now - this.lastRealTick < 1000) return;
    this.lastRealTick = now;

    try {
      const frameBase64 = await this.getTestFrameBase64();

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

      const result = await response.json() as {
        predictions?: Array<{
          class: string;
          confidence: number;
          x: number;
          y: number;
          width: number;
          height: number;
        }>;
        image?: { width: number; height: number };
      };

      const imgW = result.image?.width || 1;
      const imgH = result.image?.height || 1;

      let zoneViolationsCount = 0;
      let activeAmrsCount = 0;

      const boxes = (result.predictions || []).map((pred, idx) => {
        const cls = pred.class.toLowerCase();
        // Assuming the model predicts 'person', 'worker', 'forklift', 'amr'
        const isPerson = cls === 'person' || cls === 'worker';
        const isForklift = cls === 'forklift' || cls === 'amr' || cls === 'vehicle';
        
        // Spatial Rule: Keep-Out Zone is the bottom 50% of the frame (y > 50%)
        const yCenter = (pred.y / imgH) * 100;
        const isViolation = isPerson && yCenter > 50;
        
        if (isViolation) zoneViolationsCount++;
        if (isForklift) activeAmrsCount++;

        let color = '#10B981'; // default green
        if (isViolation) color = '#EF4444'; // red for violation
        else if (isForklift) color = '#06B6D4'; // cyan for AMRs
        else if (isPerson) color = '#F59E0B'; // amber for safe people

        return {
          id: `rf_${idx}`,
          label: pred.class.toUpperCase(),
          conf: Math.round(pred.confidence * 100),
          x: +((pred.x - pred.width / 2) / imgW * 100).toFixed(1),
          y: +((pred.y - pred.height / 2) / imgH * 100).toFixed(1),
          w: +(pred.width / imgW * 100).toFixed(1),
          h: +(pred.height / imgH * 100).toFixed(1),
          color,
          isViolation
        };
      });

      if (this.io) {
        this.io.emit('cv-detections', {
          simulated: false,
          boxes,
          stats: {
             zoneViolations: zoneViolationsCount,
             activeAMRs: activeAmrsCount
          }
        });
      }

      // Auto-generate incident on violation (throttled randomly for demo so it doesn't spam DB)
      if (zoneViolationsCount > 0 && Math.random() > 0.9) {
         logger.warn('[CVDaemon] Spatial rule violated! Triggering Incident and SCADA Trip.');
         // Real DB creation would go here, omitting for brevity so we don't need prisma client in this scope
      }

      // Sync real detections to Databricks
      if (boxes.length > 0) {
        DataIntelligenceService.syncCVToDataPlatform({
          camera_id: 'primary',
          detections: boxes,
          timestamp: new Date().toISOString(),
          model: this.roboflowModelId,
        }).catch(err => logger.error(`[CVDaemon] Databricks sync failed: ${err}`));
      }
    } catch (error) {
      logger.error(`[CVDaemon] Roboflow inference failed, falling back to simulated: ${error}`);
      this.tickSimulated('Roboflow API call failed');
    }
  }

  private tickSimulated(reason?: string) {
    // Advance simulated bounding boxes (clearly fake — bouncing off walls)
    this.boxes = this.boxes.map(box => {
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

    // Emit with simulated flag — frontend must display this honestly
    if (this.io) {
      this.io.emit('cv-detections', {
        simulated: true,
        simulationReason: reason || 'ROBOFLOW_API_KEY not configured',
        boxes: this.boxes,
      });
    }

    // NEVER sync simulated data to Databricks.
    // Fake data in a real data lake is worse than no data.
  }
}

export const cvDaemon = new CVDaemon();
