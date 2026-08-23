import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import prisma from '@/lib/prisma.js';
import logger from '@/utils/logger.js';

const execAsync = promisify(exec);
const ffmpegPath = ffmpegInstaller.path;

export interface ExtractedFrame {
  frameIndex: number;
  timestampSeconds: number;
  filePath: string;
  relativeUrl: string;
  base64: string;
}

export interface IngestionResult {
  videoId: number;
  durationSeconds: number;
  frameCount: number;
  samplingIntervalSeconds: number;
  samplingFps: number;
  frames: ExtractedFrame[];
}

export class VideoIngestionAgent {
  /**
   * Probe video duration in seconds using ffmpeg.
   */
  static async probeDuration(videoFilePath: string): Promise<number> {
    try {
      const cmd = `"${ffmpegPath}" -i "${videoFilePath}" 2>&1`;
      const { stdout, stderr } = await execAsync(cmd).catch((err) => ({ stdout: err.stdout || '', stderr: err.stderr || '' }));
      const output = `${stdout}\n${stderr}`;
      
      // Match Duration: 00:01:23.45
      const match = output.match(/Duration:\s*(\d{2}):(\d{2}):(\d{2}\.\d+)/);
      if (match) {
        const hours = parseFloat(match[1]);
        const minutes = parseFloat(match[2]);
        const seconds = parseFloat(match[3]);
        return +(hours * 3600 + minutes * 60 + seconds).toFixed(2);
      }
    } catch (err) {
      logger.warn(`[VideoIngestionAgent] Duration probe failed: ${err}`);
    }
    // Default fallback duration: 30 seconds
    return 30.0;
  }

  /**
   * Ingest and extract frames based on target budget.
   */
  static async ingestVideo(
    videoId: number,
    tenantId: number,
    videoFilePath: string,
    options: { targetFrameBudget?: number; outputDirRoot?: string } = {}
  ): Promise<IngestionResult> {
    logger.info(`[VideoIngestionAgent] Ingesting video #${videoId} (Tenant ${tenantId})...`);

    // 1. Validate file exists
    if (!fs.existsSync(videoFilePath)) {
      throw new Error(`Video file not found at: ${videoFilePath}`);
    }

    const targetBudget = Math.max(10, Math.min(150, options.targetFrameBudget || 45));
    const durationSeconds = await this.probeDuration(videoFilePath);
    
    // Dynamic sampling: bounded frame budget
    // interval = max(0.5s, duration / targetBudget)
    const intervalSeconds = +(Math.max(0.5, durationSeconds / targetBudget)).toFixed(2);
    const samplingFps = +(1 / intervalSeconds).toFixed(3);

    logger.info(`[VideoIngestionAgent] Video #${videoId}: Duration=${durationSeconds}s, Budget=${targetBudget} frames, Interval=${intervalSeconds}s (FPS: ${samplingFps})`);

    // 2. Prepare output directory
    const baseDir = options.outputDirRoot || path.resolve('uploads');
    const framesDir = path.join(baseDir, 'frames', String(videoId));
    if (!fs.existsSync(framesDir)) {
      fs.mkdirSync(framesDir, { recursive: true });
    }

    // 3. Extract frames using ffmpeg
    const outputPattern = path.join(framesDir, 'frame_%04d.jpg');
    // Using fps filter for clean extraction at desired interval
    const extractCmd = `"${ffmpegPath}" -y -i "${videoFilePath}" -vf "fps=1/${intervalSeconds}" -q:v 2 "${outputPattern}"`;
    
    logger.info(`[VideoIngestionAgent] Executing ffmpeg frame extraction...`);
    await execAsync(extractCmd, { timeout: 60000 });

    // 4. Read extracted frames
    const frameFiles = fs.readdirSync(framesDir)
      .filter((f) => f.startsWith('frame_') && f.endsWith('.jpg'))
      .sort();

    const frames: ExtractedFrame[] = [];
    for (let i = 0; i < frameFiles.length; i++) {
      const fileName = frameFiles[i];
      const filePath = path.join(framesDir, fileName);
      const timestampSeconds = +(i * intervalSeconds).toFixed(2);
      const buffer = fs.readFileSync(filePath);
      const base64 = buffer.toString('base64');
      const relativeUrl = `/uploads/frames/${videoId}/${fileName}`;

      frames.push({
        frameIndex: i + 1,
        timestampSeconds,
        filePath,
        relativeUrl,
        base64,
      });
    }

    logger.info(`[VideoIngestionAgent] Successfully extracted ${frames.length} frames for video #${videoId}.`);

    // 5. Update database record
    await prisma.inspectionVideo.update({
      where: { id: videoId },
      data: {
        status: 'EXTRACTING',
        durationSeconds,
        frameCount: frames.length,
        samplingRateFps: samplingFps,
        targetFrameBudget: targetBudget,
      },
    });

    return {
      videoId,
      durationSeconds,
      frameCount: frames.length,
      samplingIntervalSeconds: intervalSeconds,
      samplingFps,
      frames,
    };
  }
}
