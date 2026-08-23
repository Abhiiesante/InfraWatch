import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import prisma from '@/lib/prisma.js';
import { authMiddleware } from '@/middleware/auth.js';
import { VideoPipelineOrchestrator } from '@/services/agents/video-pipeline.orchestrator.js';
import logger from '@/utils/logger.js';

const router = Router();
router.use(authMiddleware);

// Configure multer storage for video uploads
const uploadsDir = path.resolve('uploads', 'videos');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname).toLowerCase() || '.mp4';
    cb(null, `inspection-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 1024 * 1024 * 500, // 500MB max per video upload
  },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported video format (${ext}). Allowed: ${allowed.join(', ')}`));
    }
  },
});

/**
 * @route POST /api/video-analysis/upload
 * @desc Upload inspection video and trigger the 4-agent analysis pipeline asynchronously.
 */
router.post('/upload', upload.single('video'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.tenantId!;
    const userId = req.userId!;

    if (!req.file) {
      res.status(400).json({ error: 'Video file is required' });
      return;
    }

    const { assetId, inspectionId, targetFrameBudget, sourceType } = req.body;
    const parsedAssetId = parseInt(assetId, 10);

    if (isNaN(parsedAssetId)) {
      res.status(400).json({ error: 'Valid assetId is required' });
      return;
    }

    const parsedInspectionId = inspectionId ? parseInt(inspectionId, 10) : undefined;
    const budget = targetFrameBudget ? parseInt(targetFrameBudget, 10) : 45;

    const fileUrl = `/uploads/videos/${req.file.filename}`;
    const fileSizeBytes = BigInt(req.file.size);

    // Create database record
    const video = await prisma.inspectionVideo.create({
      data: {
        tenantId,
        assetId: parsedAssetId,
        inspectionId: !isNaN(parsedInspectionId as any) ? parsedInspectionId : null,
        uploadedById: userId,
        fileName: req.file.originalname,
        fileUrl,
        fileSizeBytes,
        sourceType: sourceType || 'UPLOAD',
        status: 'PENDING',
        targetFrameBudget: budget,
      },
      include: {
        asset: { select: { id: true, name: true } },
      },
    });

    // Fire asynchronous agent pipeline in background
    const videoFilePath = req.file.path;
    VideoPipelineOrchestrator.runPipeline(video.id, tenantId, videoFilePath, {
      targetFrameBudget: budget,
    }).catch((err) => {
      logger.error(`[VideoAnalysisRoute] Background pipeline failed for video #${video.id}: ${err}`);
    });

    res.status(201).json({
      message: 'Video uploaded and analysis pipeline queued successfully',
      video: {
        ...video,
        fileSizeBytes: video.fileSizeBytes ? video.fileSizeBytes.toString() : null,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/video-analysis
 * @desc List all inspection videos with their findings breakdown.
 */
router.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.tenantId!;
    const { assetId, status, skip = '0', take = '20' } = req.query;

    const where: any = { tenantId };
    if (assetId) where.assetId = parseInt(assetId as string, 10);
    if (status) where.status = status as string;

    const [videos, total] = await Promise.all([
      prisma.inspectionVideo.findMany({
        where,
        skip: parseInt(skip as string, 10),
        take: parseInt(take as string, 10),
        orderBy: { createdAt: 'desc' },
        include: {
          asset: { select: { id: true, name: true, assetType: { select: { name: true } } } },
          uploadedBy: { select: { id: true, name: true, email: true } },
          findings: {
            select: {
              id: true,
              defectType: true,
              confidence: true,
              severity: true,
              frameTimestamp: true,
              status: true,
            },
          },
        },
      }),
      prisma.inspectionVideo.count({ where }),
    ]);

    const serializedVideos = videos.map((v) => ({
      ...v,
      fileSizeBytes: v.fileSizeBytes ? v.fileSizeBytes.toString() : null,
      durationSeconds: v.durationSeconds ? Number(v.durationSeconds) : null,
      samplingRateFps: v.samplingRateFps ? Number(v.samplingRateFps) : null,
    }));

    res.json({ videos: serializedVideos, total, skip: Number(skip), take: Number(take) });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/video-analysis/:id
 * @desc Get detailed inspection video analysis and all findings with frames.
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.tenantId!;
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid video ID' });
      return;
    }

    const video = await prisma.inspectionVideo.findFirst({
      where: { id, tenantId },
      include: {
        asset: { include: { assetType: true } },
        uploadedBy: { select: { id: true, name: true, email: true } },
        inspection: { select: { id: true, scheduledDate: true, status: true } },
        findings: {
          orderBy: { frameTimestamp: 'asc' },
          include: {
            aiEvent: { select: { id: true, status: true, reviews: true } },
          },
        },
      },
    });

    if (!video) {
      res.status(404).json({ error: 'Inspection video not found' });
      return;
    }

    res.json({
      ...video,
      fileSizeBytes: video.fileSizeBytes ? video.fileSizeBytes.toString() : null,
      durationSeconds: video.durationSeconds ? Number(video.durationSeconds) : null,
      samplingRateFps: video.samplingRateFps ? Number(video.samplingRateFps) : null,
      findings: video.findings.map((f) => ({
        ...f,
        confidence: Number(f.confidence),
        frameTimestamp: Number(f.frameTimestamp),
      })),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/video-analysis/:id/reanalyze
 * @desc Re-run the analysis pipeline on an existing uploaded video.
 */
router.post('/:id/reanalyze', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.tenantId!;
    const id = parseInt(req.params.id, 10);
    const { targetFrameBudget } = req.body;

    const video = await prisma.inspectionVideo.findFirst({
      where: { id, tenantId },
    });

    if (!video) {
      res.status(404).json({ error: 'Inspection video not found' });
      return;
    }

    // Resolve local file path
    const localFileName = path.basename(video.fileUrl);
    const videoFilePath = path.resolve('uploads', 'videos', localFileName);

    if (!fs.existsSync(videoFilePath)) {
      res.status(400).json({ error: 'Underlying video file is no longer available on disk' });
      return;
    }

    const budget = targetFrameBudget ? parseInt(targetFrameBudget, 10) : Number(video.targetFrameBudget) || 45;

    // Reset status and remove previous findings
    await prisma.videoFinding.deleteMany({ where: { videoId: id } });
    await prisma.inspectionVideo.update({
      where: { id },
      data: { status: 'PENDING', summary: null, targetFrameBudget: budget },
    });

    // Re-trigger pipeline
    VideoPipelineOrchestrator.runPipeline(id, tenantId, videoFilePath, {
      targetFrameBudget: budget,
    }).catch((err) => {
      logger.error(`[VideoAnalysisRoute] Re-analysis failed for video #${id}: ${err}`);
    });

    res.json({ message: 'Video re-analysis queued successfully', videoId: id });
  } catch (error) {
    next(error);
  }
});

export default router;
