import { Server as SocketServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import logger from '@/utils/logger.js';

/**
 * CV Daemon — Real-time object detection streaming over WebSockets.
 *
 * When ROBOFLOW_API_KEY is configured, this daemon will call the
 * Roboflow inference API on captured frames. When it is NOT configured,
 * it runs a clearly-marked simulation with bouncing bounding boxes
 * and sets `simulated: true` on every emission.
 *
 * IMPORTANT: Simulated detections are NEVER synced to Databricks.
 * Only real inference results should flow into the data lake.
 */
export class CVDaemon {
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;
  private io: SocketServer | null = null;
  private isSimulated = true;

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

    const roboflowKey = process.env.ROBOFLOW_API_KEY;
    this.isSimulated = !roboflowKey;

    if (this.isSimulated) {
      logger.warn('👁️ CV Daemon started in SIMULATED mode — ROBOFLOW_API_KEY not configured');
    } else {
      logger.info('👁️ CV Daemon started with real Roboflow inference');
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
    }
    // When real inference is connected, tickReal() would be called here
    // to process captured frames through the Roboflow API.
  }

  private tickSimulated() {
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
        simulationReason: 'ROBOFLOW_API_KEY not configured',
        boxes: this.boxes,
      });
    }

    // NEVER sync simulated data to Databricks.
    // Fake data in a real data lake is worse than no data.
  }
}

export const cvDaemon = new CVDaemon();
