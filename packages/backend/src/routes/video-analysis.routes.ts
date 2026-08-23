import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import prisma from '@/lib/prisma.js';
import { authMiddleware } from '@/middleware/auth.js';
import { StorageFactory } from '@/services/storage/storage.adapter.js';
import { VideoPipelineOrchestrator } from '@/services/agents/video-pipeline.orchestrator.js';
import logger from '@/utils/logger.js';

const router = Router();
router.use(authMiddleware);

// Configure multer storage for short-lived staging folder
const stagingDir = path.resolve('uploads', 'staging');
if (!fs.existsSync(stagingDir)) {
  fs.mkdirSync(stagingDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, stagingDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname).toLowerCase() || '.mp4';
    cb(null, `staging-${uniqueSuffix}${ext}`);
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
 * @desc Upload inspection video to staging, persist via StorageAdapter, and trigger pipeline.
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

    // 1. Persist staged file to final backend via StorageAdapter
    const storageAdapter = StorageFactory.getAdapter();
    const persistResult = await storageAdapter.persist(
      req.file.path,
      req.file.originalname,
      req.file.mimetype
    );

    // 2. Create database record
    const video = await prisma.inspectionVideo.create({
      data: {
        tenantId,
        assetId: parsedAssetId,
        inspectionId: !isNaN(parsedInspectionId as any) ? parsedInspectionId : null,
        uploadedById: userId,
        fileName: req.file.originalname,
        fileUrl: persistResult.fileUrl,
        fileSizeBytes: BigInt(persistResult.fileSizeBytes),
        storageKey: persistResult.storageKey,
        sourceType: sourceType || 'UPLOAD',
        status: 'PENDING',
        targetFrameBudget: budget,
      },
      include: {
        asset: { select: { id: true, name: true } },
      },
    });

    // 3. Fire asynchronous agent pipeline in background using storageKey
    VideoPipelineOrchestrator.runPipeline(video.id, tenantId, persistResult.storageKey, {
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
 * @desc Re-run the analysis pipeline on an existing uploaded video using its storageKey.
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

    if (video.rawVideoDeleted) {
      res.status(400).json({ error: 'Raw video footage has been purged per retention lifecycle policy' });
      return;
    }

    const storageKey = video.storageKey || `local:${video.fileUrl.replace(/^\/uploads\//, '')}`;
    const budget = targetFrameBudget ? parseInt(targetFrameBudget, 10) : Number(video.targetFrameBudget) || 45;

    // Reset status and remove previous findings
    await prisma.videoFinding.deleteMany({ where: { videoId: id } });
    await prisma.inspectionVideo.update({
      where: { id },
      data: { status: 'PENDING', summary: null, targetFrameBudget: budget },
    });

    // Re-trigger pipeline
    VideoPipelineOrchestrator.runPipeline(id, tenantId, storageKey, {
      targetFrameBudget: budget,
    }).catch((err) => {
      logger.error(`[VideoAnalysisRoute] Re-analysis failed for video #${id}: ${err}`);
    });

    res.json({ message: 'Video re-analysis queued successfully', videoId: id });
  } catch (error) {
    next(error);
  }
});

/**
 * @route DELETE /api/video-analysis/:id
 * @desc Delete inspection video record and purge stored video file via StorageAdapter.
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.tenantId!;
    const id = parseInt(req.params.id, 10);

    const video = await prisma.inspectionVideo.findFirst({
      where: { id, tenantId },
    });

    if (!video) {
      res.status(404).json({ error: 'Inspection video not found' });
      return;
    }

    // Purge file from storage backend if present
    if (video.storageKey) {
      const adapter = StorageFactory.getAdapterForStorageKey(video.storageKey);
      await adapter.delete(video.storageKey).catch((err) => {
        logger.warn(`[VideoAnalysisRoute] Storage deletion warning for ${video.storageKey}: ${err}`);
      });
    }

    await prisma.inspectionVideo.delete({ where: { id } });

    res.json({ message: 'Inspection video and storage assets deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
