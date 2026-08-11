import { Server as SocketServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import logger from '@/utils/logger.js';
import { DataIntelligenceService } from './data-intelligence.service.js';

export class CVDaemon {
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;
  private io: SocketServer | null = null;
  
  // A mock logic state to simulate real CV bounding boxes bouncing around.
  // We use this in the backend to stream to the frontend via WebSockets,
  // representing what an actual Python CV microservice would do.
  private boxes = [
    { id: 'track_1', label: 'AMR', conf: 92, x: 25, y: 70, w: 12, h: 15, dx: 0.8, dy: -0.3, color: '#06B6D4' },
    { id: 'track_2', label: 'AMR', conf: 87, x: 65, y: 75, w: 10, h: 12, dx: -0.8, dy: -0.2, color: '#06B6D4' },
    { id: 'track_3', label: 'PERSON', conf: 74, x: 45, y: 40, w: 6, h: 20, dx: 0.1, dy: 0.1, color: '#EF4444' },
  ];

  attachSocket(server: HttpServer) {
    this.io = new SocketServer(server, {
      cors: { origin: '*' } // Allows React frontend to connect
    });
    
    this.io.on('connection', (socket) => {
      logger.info(`🔌 CV Socket Client connected: ${socket.id}`);
      socket.on('disconnect', () => {
        logger.info(`🔌 CV Socket Client disconnected: ${socket.id}`);
      });
    });
  }

  start(intervalMs = 100) { // Stream at 10fps
    if (this.isRunning) return;
    this.isRunning = true;
    logger.info('👁️ Real-time CV Daemon started');

    this.timer = setInterval(async () => {
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
    // 1. Advance the bounding boxes (simulating real object tracking)
    this.boxes = this.boxes.map(box => {
      let newX = box.x + box.dx;
      let newY = box.y + box.dy;
      let newDx = box.dx;
      let newDy = box.dy;

      if (newX < 5 || newX + box.w > 95) newDx = -box.dx;
      if (newY < 5 || newY + box.h > 95) newDy = -box.dy;

      // Ensure boxes stay strictly within [0, 100] coordinates
      newX = Math.max(0, Math.min(100 - box.w, newX));
      newY = Math.max(0, Math.min(100 - box.h, newY));

      const newConf = Math.round(Math.min(97, Math.max(70, box.conf + (Math.random() - 0.5) * 2)));
      return { ...box, x: newX, y: newY, dx: newDx, dy: newDy, conf: newConf };
    });

    const timestamp = new Date().toISOString();

    // 2. Format as a proper Data Contract (ObjectDetectionEvent)
    const detectionEvent = {
      event_id: `evt_cv_${Date.now()}`,
      tenant_id: 1,
      camera_id: 1, // hardcoded for the demo video stream
      timestamp,
      frame_width: 1920,
      frame_height: 1080,
      detected_objects: this.boxes.map(b => ({
        object_id: b.id,
        class_name: b.label,
        confidence: b.conf / 100.0,
        bbox: {
          x_min: b.x / 100.0,
          y_min: b.y / 100.0,
          x_max: (b.x + b.w) / 100.0,
          y_max: (b.y + b.h) / 100.0
        },
        metadata: { color: b.color }
      }))
    };

    // 3. Emit over WebSockets to React Frontend
    if (this.io) {
      this.io.emit('cv-detections', this.boxes);
    }

    // 4. (Optional) Sync a fraction of frames to Databricks (e.g. 1 frame every 5 seconds)
    // to avoid overloading the Databricks API with 10fps volume writes
    if (Date.now() % 5000 < 100) {
      DataIntelligenceService.syncCVToDataPlatform({
        _type: 'cv_detection_event',
        ...detectionEvent
      }).catch(err => logger.error(`Databricks CV sync failed: ${err}`));
    }
  }
}

export const cvDaemon = new CVDaemon();
