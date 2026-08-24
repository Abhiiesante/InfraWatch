/**
 * Genuine MEVA, Industrial Drone & Multi-Dataset Video Ingestion Runner
 *
 * Pulls authentic video files from verified AWS Open Data S3 keys (s3://mevadata-public-01),
 * direct YouTube industrial drone inspection streams via yt-dlp, and local field recordings.
 * Automatically remuxes H.264 streams to web-compatible MP4 containers, persists artifacts
 * via the StorageAdapter, and executes the 5-Agent Video Inspection Pipeline.
 *
 * Usage:
 *   npx tsx src/scripts/ingest-meva-sample.ts --all-drones
 *   npx tsx src/scripts/ingest-meva-sample.ts --clip youtube-construction-drone-01
 *   npx tsx src/scripts/ingest-meva-sample.ts --clip youtube-plant-tower-flyover-02
 *   npx tsx src/scripts/ingest-meva-sample.ts --clip youtube-substation-drone-03
 *   npx tsx src/scripts/ingest-meva-sample.ts --clip youtube-warehouse-inspection-04
 *   npx tsx src/scripts/ingest-meva-sample.ts --clip youtube-oilgas-pipeline-05
 *   npx tsx src/scripts/ingest-meva-sample.ts --reset-db --all-drones
 */

import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { exec } from 'child_process';
import { promisify } from 'util';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import prisma from '../lib/prisma.js';
import { StorageFactory } from '../services/storage/storage.adapter.js';
import { VideoPipelineOrchestrator } from '../services/agents/video-pipeline.orchestrator.js';
import logger from '../utils/logger.js';

const execAsync = promisify(exec);
const ffmpegPath = ffmpegInstaller.path;

export interface DatasetEntry {
  id: string;
  name: string;
  datasetName: 'MEVA' | 'VIRAT' | 'OPEN_CV_BENCHMARK' | 'LOCAL_FIELD';
  sourceType: 'FIXED_CAMERA' | 'WALKTHROUGH' | 'DRONE' | 'FIELD_RECORDING';
  category: string;
  license: string;
  description: string;
  url: string;
  localFallback: string;
  isAvi?: boolean;
  isYouTube?: boolean;
}

export const DATASET_CATALOG: DatasetEntry[] = [
  {
    id: 'youtube-construction-drone-01',
    name: 'Industrial_Site_Demolition_Drone_Aerial_1080p.mp4',
    datasetName: 'LOCAL_FIELD',
    sourceType: 'DRONE',
    category: 'Industrial Facility & Demolition Drone Inspection Flight',
    license: 'YouTube Public Inspection Stream',
    description: 'High-definition 1080p aerial drone inspection over an active industrial demolition and construction site.',
    url: 'https://youtu.be/x84WM1lGCtM',
    localFallback: 'drone_demolition.mp4',
    isYouTube: true,
  },
  {
    id: 'youtube-plant-tower-flyover-02',
    name: 'Industrial_Plant_Tower_Inspection_Drone_Flyover.mp4',
    datasetName: 'LOCAL_FIELD',
    sourceType: 'DRONE',
    category: 'Heavy Industrial Plant & Tower Top Level Drone Inspection',
    license: 'YouTube Public Inspection Stream',
    description: 'Autonomous close-range drone flyover inspecting top-level industrial processing towers and structural framing.',
    url: 'https://youtu.be/YINXZFV_wsw',
    localFallback: 'plant_tower_flyover.mp4',
    isYouTube: true,
  },
  {
    id: 'youtube-substation-drone-03',
    name: 'Electrical_Substation_HighVoltage_Drone_Inspection.mp4',
    datasetName: 'LOCAL_FIELD',
    sourceType: 'DRONE',
    category: 'Electrical Substation & High-Voltage Grid Drone Monitoring',
    license: 'YouTube Public Inspection Stream',
    description: 'High-voltage electrical substation inspection analyzing transformers, switchgear, and perimeter enclosures.',
    url: 'https://youtu.be/MOIaOaQvJMM',
    localFallback: 'substation_inspection.mp4',
    isYouTube: true,
  },
  {
    id: 'youtube-warehouse-inspection-04',
    name: 'Logistics_Warehouse_Autonomous_Drone_Scan.mp4',
    datasetName: 'LOCAL_FIELD',
    sourceType: 'DRONE',
    category: 'Logistics Warehouse & High-Bay Racking Autonomous Scan',
    license: 'YouTube Public Inspection Stream',
    description: 'Indoor autonomous drone scanning high-bay warehouse aisles, inventory structures, and logistics corridors.',
    url: 'https://youtu.be/lp0q0o9T88g',
    localFallback: 'warehouse_drone_scan.mp4',
    isYouTube: true,
  },
  {
    id: 'youtube-oilgas-pipeline-05',
    name: 'Oil_Gas_Refinery_Pipeline_Drone_Survey.mp4',
    datasetName: 'LOCAL_FIELD',
    sourceType: 'DRONE',
    category: 'Refinery, Pipeline Corridor & Heavy Energy Infrastructure Survey',
    license: 'YouTube Public Inspection Stream',
    description: 'Aerial drone LiDAR & visual inspection survey across oil & gas industrial pipeline infrastructure.',
    url: 'https://youtu.be/gn2KUpwuMP4',
    localFallback: 'oilgas_pipeline_survey.mp4',
    isYouTube: true,
  },
  {
    id: 'meva-g474-school-perimeter',
    name: 'MEVA_School_Perimeter_Activity_G474.mp4',
    datasetName: 'MEVA',
    sourceType: 'FIXED_CAMERA',
    category: 'MEVA AWS Open Data (Camera G474 — Facility Perimeter & Walkway)',
    license: 'Creative Commons Attribution 4.0 International (CC-BY 4.0)',
    description: 'Genuine MEVA Open Data from AWS S3 (drops-123-r13) — Stationary surveillance of facility exterior.',
    url: 'https://mevadata-public-01.s3.amazonaws.com/drops-123-r13/2018-03-05/09/2018-03-05.09-50-00.09-55-00.school.G474.r13.avi',
    localFallback: 'meva_g474_sample.avi',
    isAvi: true,
  },
  {
    id: 'meva-g339-perimeter-gate',
    name: 'MEVA_Facility_Perimeter_Gate_G339.mp4',
    datasetName: 'MEVA',
    sourceType: 'FIXED_CAMERA',
    category: 'MEVA AWS Open Data (Camera G339 — Ingress Gate & Security Perimeter)',
    license: 'Creative Commons Attribution 4.0 International (CC-BY 4.0)',
    description: 'Genuine MEVA Open Data from AWS S3 (drops-123-r13) — Access-controlled gate and vehicle approach.',
    url: 'https://mevadata-public-01.s3.amazonaws.com/drops-123-r13/2018-03-05/09/2018-03-05.09-49-41.09-50-01.school.G339.r13.avi',
    localFallback: 'meva_g339_sample.avi',
    isAvi: true,
  },
  {
    id: 'meva-g424-exterior-sweep',
    name: 'MEVA_Logistics_Exterior_Sweep_G424.mp4',
    datasetName: 'MEVA',
    sourceType: 'FIXED_CAMERA',
    category: 'MEVA AWS Open Data (Camera G424 — Logistics Bay & Yard Sweep)',
    license: 'Creative Commons Attribution 4.0 International (CC-BY 4.0)',
    description: 'Genuine MEVA Open Data from AWS S3 (drops-123-r13) — Wide-angle sweep of active logistics corridor.',
    url: 'https://mevadata-public-01.s3.amazonaws.com/drops-123-r13/2018-03-05/09/2018-03-05.09-49-44.09-50-00.school.G424.r13.avi',
    localFallback: 'meva_g424_sample.avi',
    isAvi: true,
  },
];

async function downloadFile(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    const client = url.startsWith('https') ? https : http;

    client.get(url, (response) => {
      if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        return downloadFile(response.headers.location, destPath).then(resolve).catch(reject);
      }

      if (response.statusCode !== 200) {
        return reject(new Error(`HTTP status ${response.statusCode} from ${url}`));
      }

      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

/**
 * Downloads a video from YouTube or online video hosting via yt-dlp.
 */
async function downloadYouTubeVideo(youtubeUrl: string, stagingDir: string, baseName: string): Promise<string> {
  const prefix = `yt-${Date.now()}-${baseName.replace(/\.mp4$/, '')}`;
  const templatePath = path.join(stagingDir, `${prefix}.%(ext)s`);
  const cmd = `python -m yt_dlp -f "bv*[ext=mp4]/b[ext=mp4]/best" --no-warnings -o "${templatePath}" "${youtubeUrl}"`;
  logger.info(`[YouTubeIngest] Downloading industrial stream from: ${youtubeUrl}...`);
  await execAsync(cmd, { timeout: 180000 });

  const files = fs.readdirSync(stagingDir).filter((f) => f.startsWith(prefix));
  const chosenFile = files.find((f) => f.endsWith('.mp4')) || files[0];
  if (!chosenFile) {
    throw new Error(`Failed to locate downloaded YouTube file for ${youtubeUrl}`);
  }
  return path.join(stagingDir, chosenFile);
}

/**
 * Fast container remux from AVI to MP4 for native browser playback without re-encoding.
 */
async function remuxAviToMp4(aviPath: string, mp4Path: string): Promise<void> {
  const cmd = `"${ffmpegPath}" -y -i "${aviPath}" -c:v copy -movflags faststart "${mp4Path}"`;
  logger.info(`[MediaRemuxer] Remuxing AVI stream to web-optimized MP4...`);
  await execAsync(cmd, { timeout: 60000 });
}

/**
 * Concatenates multiple video clips with ffmpeg to create a single continuous reel.
 */
async function buildContinuousReel(sourcePaths: string[], outputPath: string): Promise<void> {
  const listFilePath = path.resolve('uploads', 'staging', `concat_list_${Date.now()}.txt`);
  const listContent = sourcePaths.map((p) => `file '${p.replace(/\\/g, '/')}'`).join('\n');
  fs.writeFileSync(listFilePath, listContent);

  const concatCmd = `"${ffmpegPath}" -y -f concat -safe 0 -i "${listFilePath}" -c copy "${outputPath}"`;
  logger.info(`[ReelBuilder] Concatenating ${sourcePaths.length} clips into continuous reel...`);
  await execAsync(concatCmd, { timeout: 120000 });

  try {
    fs.unlinkSync(listFilePath);
  } catch {}
}

interface IngestOptions {
  tenantId: number;
  adminUserId: number;
  targetAssetId: number;
  stagingDir: string;
  concatCount?: number;
}

async function ingestSingleEntry(entry: DatasetEntry, opts: IngestOptions) {
  console.log(`\n========================================================================`);
  console.log(`📥 INGESTING DATASET: [${entry.datasetName}] "${entry.name}"`);
  console.log(`   Category: ${entry.category}`);
  console.log(`   License:  ${entry.license}`);
  console.log(`   URL:      ${entry.url}`);
  console.log(`========================================================================`);

  let stagedFilePath: string;
  let fileName = entry.name;
  const sourceType = entry.sourceType;

  if (entry.isYouTube) {
    console.log(`   🚁 Downloading Drone Inspection from YouTube: ${entry.url}...`);
    stagedFilePath = await downloadYouTubeVideo(entry.url, opts.stagingDir, entry.name);
  } else {
    const rawStagedPath = path.join(opts.stagingDir, `raw-${Date.now()}-${path.basename(entry.url)}`);
    const convertedMp4Path = path.join(opts.stagingDir, `converted-${Date.now()}-${entry.name}`);

    console.log(`   🌐 Fetching clip from URL: ${entry.url}`);
    await downloadFile(entry.url, rawStagedPath);

    if (entry.isAvi || rawStagedPath.endsWith('.avi')) {
      console.log(`   ⚙️ Remuxing AVI video container to native MP4 for browser streaming...`);
      await remuxAviToMp4(rawStagedPath, convertedMp4Path);
      stagedFilePath = convertedMp4Path;
    } else {
      stagedFilePath = rawStagedPath;
    }
  }

  const concatCount = opts.concatCount || 1;
  if (concatCount > 1) {
    console.log(`\n🎞️ Building ${concatCount}x continuous inspection reel...`);
    const reelName = `Continuous_Inspection_Reel_${concatCount}x_${Date.now()}.mp4`;
    const continuousReelPath = path.join(opts.stagingDir, reelName);
    const repeatClips = Array(concatCount).fill(stagedFilePath);
    await buildContinuousReel(repeatClips, continuousReelPath);
    stagedFilePath = continuousReelPath;
    fileName = reelName;
  }

  const stats = fs.statSync(stagedFilePath);
  console.log(`✅ Staged video file (${(stats.size / (1024 * 1024)).toFixed(2)} MB)`);

  const storageAdapter = StorageFactory.getAdapter();
  const persistResult = await storageAdapter.persist(stagedFilePath, fileName, 'video/mp4');
  console.log(`💾 Persisted to Storage Backend with key: "${persistResult.storageKey}"`);
  console.log(`   Accessible File URL: "${persistResult.fileUrl}"`);

  const inspectionVideo = await prisma.inspectionVideo.create({
    data: {
      tenantId: opts.tenantId,
      assetId: opts.targetAssetId,
      uploadedById: opts.adminUserId,
      fileName,
      fileUrl: persistResult.fileUrl,
      fileSizeBytes: BigInt(persistResult.fileSizeBytes),
      storageKey: persistResult.storageKey,
      sourceType,
      status: 'PENDING',
      targetFrameBudget: concatCount > 1 ? 45 : 25,
    },
  });
  console.log(`📝 Created InspectionVideo record #${inspectionVideo.id} in Postgres.`);

  console.log(`\n⚙️ Executing 5-Agent Video Inspection Pipeline for Video #${inspectionVideo.id}...`);
  const result = await VideoPipelineOrchestrator.runPipeline(
    inspectionVideo.id,
    opts.tenantId,
    persistResult.storageKey,
    { targetFrameBudget: concatCount > 1 ? 45 : 25 }
  );

  if (!result.success) {
    throw new Error(`Pipeline execution failed: ${result.error}`);
  }

  const finalVideo = await prisma.inspectionVideo.findUnique({
    where: { id: inspectionVideo.id },
    include: { findings: true, asset: true },
  });

  console.log(`\n🎉 PIPELINE COMPLETED FOR VIDEO #${finalVideo?.id}`);
  console.log(`   File Name:       ${finalVideo?.fileName}`);
  console.log(`   Duration:        ${finalVideo?.durationSeconds}s`);
  console.log(`   Findings Count:  ${finalVideo?.findings.length} findings localized`);
  console.log(`   Media URL:       ${finalVideo?.fileUrl}`);
  return finalVideo;
}

async function runVideoIngestion() {
  console.log('\n========================================================================');
  console.log('🚀 InfraWatch — Industrial Drone & Video Fleet Ingestion Runner');
  console.log('========================================================================\n');

  try {
    const args = process.argv.slice(2);
    let localFilePath: string | null = null;
    let youtubeUrl: string | null = null;
    let clipId: string | null = null;
    let concatCount = 0;
    const shouldResetDb = args.includes('--reset-db');
    const shouldRunAllDrones = args.includes('--all-drones') || args.includes('--all');

    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--local' && args[i + 1]) localFilePath = path.resolve(args[i + 1]);
      if ((args[i] === '--youtube' || args[i] === '--url') && args[i + 1]) youtubeUrl = args[i + 1];
      if (args[i] === '--clip' && args[i + 1]) clipId = args[i + 1];
      if (args[i] === '--concat' && args[i + 1]) concatCount = parseInt(args[i + 1], 10) || 2;
    }

    const org = await prisma.organization.findFirst({
      include: {
        users: { where: { role: 'ADMIN' }, take: 1 },
        assets: { take: 5 },
      },
    });

    if (!org || !org.users[0]) {
      throw new Error('Database is unseeded. Please ensure the backend database is seeded.');
    }

    const tenantId = org.id;
    const adminUser = org.users[0];

    if (shouldResetDb) {
      console.log('🧹 Purging older test video records from database...');
      await prisma.videoFinding.deleteMany({ where: { tenantId } });
      await prisma.inspectionVideo.deleteMany({ where: { tenantId } });
      console.log('✅ Cleaned up old video records.');
    }

    let targetAsset = org.assets.find((a) =>
      a.name.toLowerCase().includes('demolition') ||
      a.name.toLowerCase().includes('industrial') ||
      a.name.toLowerCase().includes('construction') ||
      a.name.toLowerCase().includes('warehouse') ||
      a.name.toLowerCase().includes('logistics') ||
      a.name.toLowerCase().includes('facility')
    );

    if (!targetAsset) {
      const assetType = await prisma.assetType.findFirst();
      targetAsset = await prisma.asset.create({
        data: {
          tenantId,
          assetTypeId: assetType ? assetType.id : 1,
          createdById: adminUser.id,
          name: 'Industrial Facility & Infrastructure Zone',
          address: '8800 Industrial Parkway, Heavy Infrastructure Sector',
          status: 'ACTIVE',
          healthScore: 88,
        },
      });
      console.log(`📦 Created Target Asset: "${targetAsset.name}" (ID #${targetAsset.id})`);
    } else {
      console.log(`🏢 Selected Target Asset: "${targetAsset.name}" (ID #${targetAsset.id})`);
    }

    const stagingDir = path.resolve('uploads', 'staging');
    if (!fs.existsSync(stagingDir)) {
      fs.mkdirSync(stagingDir, { recursive: true });
    }

    const ingestOpts: IngestOptions = {
      tenantId,
      adminUserId: adminUser.id,
      targetAssetId: targetAsset.id,
      stagingDir,
      concatCount,
    };

    if (shouldRunAllDrones) {
      const droneEntries = DATASET_CATALOG.filter((c) => c.isYouTube || c.sourceType === 'DRONE');
      console.log(`\n🚀 Ingesting Batch of ${droneEntries.length} Industrial Drone Inspection Videos...\n`);
      for (const entry of droneEntries) {
        await ingestSingleEntry(entry, ingestOpts);
      }
      console.log('\n========================================================================');
      console.log(`🎉 ALL ${droneEntries.length} DRONE INSPECTIONS INGESTED & SYNCHRONIZED SUCCESSFULLY`);
      console.log('========================================================================\n');
      return;
    }

    if (youtubeUrl) {
      const customEntry: DatasetEntry = {
        id: `custom-youtube-${Date.now()}`,
        name: `Drone_Aerial_Inspection_${Date.now()}.mp4`,
        datasetName: 'LOCAL_FIELD',
        sourceType: 'DRONE',
        category: 'Custom Industrial Drone Inspection Flight',
        license: 'Public Video Stream',
        description: `Direct YouTube stream ingestion from: ${youtubeUrl}`,
        url: youtubeUrl,
        localFallback: '',
        isYouTube: true,
      };
      await ingestSingleEntry(customEntry, ingestOpts);
      return;
    }

    if (localFilePath && fs.existsSync(localFilePath)) {
      const fileName = path.basename(localFilePath);
      const customEntry: DatasetEntry = {
        id: `custom-local-${Date.now()}`,
        name: fileName,
        datasetName: 'LOCAL_FIELD',
        sourceType: 'FIELD_RECORDING',
        category: 'Local Field Recording Inspection',
        license: 'Internal Fleet Stream',
        description: `Local inspection video file from: ${localFilePath}`,
        url: `file://${localFilePath}`,
        localFallback: fileName,
        isAvi: fileName.endsWith('.avi'),
      };
      await ingestSingleEntry(customEntry, ingestOpts);
      return;
    }

    const selectedClip =
      (clipId && DATASET_CATALOG.find((c) => c.id === clipId || c.name.toLowerCase().includes(clipId.toLowerCase()))) ||
      DATASET_CATALOG[0];

    await ingestSingleEntry(selectedClip, ingestOpts);
  } catch (err: any) {
    console.error(`\n❌ Error during video ingestion test: ${err.message}\n`, err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runVideoIngestion();
