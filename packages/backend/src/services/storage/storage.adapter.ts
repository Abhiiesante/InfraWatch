import fs from 'fs';
import path from 'path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import logger from '@/utils/logger.js';

export interface PersistResult {
  storageKey: string;
  fileUrl: string;
  fileSizeBytes: number;
}

export interface ResolvedLocalPath {
  localPath: string;
  cleanup: () => Promise<void> | void;
}

export interface StorageAdapter {
  persist(stagingFilePath: string, originalFileName: string, mimeType?: string): Promise<PersistResult>;
  resolveLocalPath(storageKey: string): Promise<ResolvedLocalPath>;
  delete(storageKey: string): Promise<void>;
  exists(storageKey: string): Promise<boolean>;
}

/**
 * Local Filesystem Storage Adapter
 * Stores files in uploads/videos/ and serves them via static Express endpoint.
 */
export class LocalStorageAdapter implements StorageAdapter {
  private baseDir: string;

  constructor(baseDir?: string) {
    this.baseDir = baseDir || path.resolve('uploads', 'videos');
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  async persist(stagingFilePath: string, originalFileName: string): Promise<PersistResult> {
    if (!fs.existsSync(stagingFilePath)) {
      throw new Error(`Staging file not found: ${stagingFilePath}`);
    }

    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(originalFileName).toLowerCase() || '.mp4';
    const targetFileName = `inspection-${uniqueSuffix}${ext}`;
    const targetFilePath = path.join(this.baseDir, targetFileName);

    // Move staging file to final destination
    fs.copyFileSync(stagingFilePath, targetFilePath);
    try {
      fs.unlinkSync(stagingFilePath);
    } catch {
      // ignore staging unlink error
    }

    const stats = fs.statSync(targetFilePath);
    const storageKey = `local:videos/${targetFileName}`;
    const fileUrl = `/uploads/videos/${targetFileName}`;

    logger.info(`[LocalStorageAdapter] Persisted file to ${storageKey} (${stats.size} bytes)`);

    return {
      storageKey,
      fileUrl,
      fileSizeBytes: stats.size,
    };
  }

  async resolveLocalPath(storageKey: string): Promise<ResolvedLocalPath> {
    const relativePath = storageKey.replace(/^local:/, '');
    const localPath = path.resolve('uploads', relativePath);

    if (!fs.existsSync(localPath)) {
      throw new Error(`Local storage file does not exist on disk: ${localPath}`);
    }

    return {
      localPath,
      cleanup: () => {
        // No-op for permanent local files
      },
    };
  }

  async delete(storageKey: string): Promise<void> {
    const relativePath = storageKey.replace(/^local:/, '');
    const localPath = path.resolve('uploads', relativePath);

    if (fs.existsSync(localPath)) {
      fs.unlinkSync(localPath);
      logger.info(`[LocalStorageAdapter] Deleted file: ${storageKey}`);
    }
  }

  async exists(storageKey: string): Promise<boolean> {
    const relativePath = storageKey.replace(/^local:/, '');
    const localPath = path.resolve('uploads', relativePath);
    return fs.existsSync(localPath);
  }
}

/**
 * Supabase Storage Adapter
 * Uploads files to Supabase Storage bucket and downloads to temp for ffmpeg on demand.
 */
export class SupabaseStorageAdapter implements StorageAdapter {
  private supabase: SupabaseClient;
  private bucket: string;
  private tempDir: string;

  constructor(supabaseUrl: string, supabaseKey: string, bucket = 'inspection-videos') {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.bucket = bucket;
    this.tempDir = path.resolve('uploads', 'temp');
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  async persist(stagingFilePath: string, originalFileName: string, mimeType?: string): Promise<PersistResult> {
    if (!fs.existsSync(stagingFilePath)) {
      throw new Error(`Staging file not found: ${stagingFilePath}`);
    }

    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(originalFileName).toLowerCase() || '.mp4';
    const objectKey = `inspection-${uniqueSuffix}${ext}`;
    const fileBuffer = fs.readFileSync(stagingFilePath);
    const fileSizeBytes = fileBuffer.length;

    logger.info(`[SupabaseStorageAdapter] Uploading ${fileSizeBytes} bytes to bucket "${this.bucket}"...`);

    const { error } = await this.supabase.storage
      .from(this.bucket)
      .upload(objectKey, fileBuffer, {
        contentType: mimeType || 'video/mp4',
        upsert: true,
      });

    if (error) {
      throw new Error(`Supabase Storage upload failed: ${error.message}`);
    }

    // Clean up staging file
    try {
      fs.unlinkSync(stagingFilePath);
    } catch {
      // ignore
    }

    const { data: publicUrlData } = this.supabase.storage.from(this.bucket).getPublicUrl(objectKey);
    const storageKey = `supabase:${this.bucket}/${objectKey}`;
    const fileUrl = publicUrlData.publicUrl || `/uploads/videos/${objectKey}`;

    logger.info(`[SupabaseStorageAdapter] Successfully uploaded: ${storageKey}`);

    return {
      storageKey,
      fileUrl,
      fileSizeBytes,
    };
  }

  async resolveLocalPath(storageKey: string): Promise<ResolvedLocalPath> {
    // Expected key format: supabase:bucket_name/object_key
    const match = storageKey.match(/^supabase:([^/]+)\/(.+)$/);
    if (!match) {
      throw new Error(`Invalid Supabase storageKey format: ${storageKey}`);
    }

    const [, bucket, objectKey] = match;
    logger.info(`[SupabaseStorageAdapter] Downloading ${objectKey} from bucket "${bucket}" for local pipeline processing...`);

    const { data, error } = await this.supabase.storage.from(bucket).download(objectKey);
    if (error || !data) {
      throw new Error(`Failed to download from Supabase Storage (${storageKey}): ${error?.message}`);
    }

    const buffer = Buffer.from(await data.arrayBuffer());
    const tempFileName = `temp-${Date.now()}-${path.basename(objectKey)}`;
    const tempFilePath = path.join(this.tempDir, tempFileName);

    fs.writeFileSync(tempFilePath, buffer);
    logger.info(`[SupabaseStorageAdapter] Downloaded to temp path: ${tempFilePath}`);

    return {
      localPath: tempFilePath,
      cleanup: () => {
        try {
          if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
            logger.info(`[SupabaseStorageAdapter] Cleaned up temp file: ${tempFilePath}`);
          }
        } catch (err) {
          logger.warn(`[SupabaseStorageAdapter] Temp file cleanup error: ${err}`);
        }
      },
    };
  }

  async delete(storageKey: string): Promise<void> {
    const match = storageKey.match(/^supabase:([^/]+)\/(.+)$/);
    if (!match) return;

    const [, bucket, objectKey] = match;
    const { error } = await this.supabase.storage.from(bucket).remove([objectKey]);
    if (error) {
      logger.warn(`[SupabaseStorageAdapter] Delete error for ${storageKey}: ${error.message}`);
    } else {
      logger.info(`[SupabaseStorageAdapter] Deleted object: ${storageKey}`);
    }
  }

  async exists(storageKey: string): Promise<boolean> {
    const match = storageKey.match(/^supabase:([^/]+)\/(.+)$/);
    if (!match) return false;

    const [, bucket, objectKey] = match;
    const { data, error } = await this.supabase.storage.from(bucket).list('', { search: objectKey });
    return !error && Array.isArray(data) && data.length > 0;
  }
}

/**
 * Storage Factory
 * Chooses the appropriate adapter based on environment configuration.
 */
export class StorageFactory {
  private static instance: StorageAdapter;

  static getAdapter(): StorageAdapter {
    if (!this.instance) {
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

      if (supabaseUrl && supabaseKey && supabaseUrl.startsWith('http')) {
        logger.info(`[StorageFactory] Initializing SupabaseStorageAdapter with URL: ${supabaseUrl}`);
        this.instance = new SupabaseStorageAdapter(supabaseUrl, supabaseKey);
      } else {
        logger.info('[StorageFactory] Using LocalStorageAdapter (uploads/videos/)');
        this.instance = new LocalStorageAdapter();
      }
    }
    return this.instance;
  }

  /**
   * Resolve an arbitrary storageKey using the correct adapter.
   */
  static getAdapterForStorageKey(storageKey: string): StorageAdapter {
    if (storageKey.startsWith('supabase:')) {
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
      if (supabaseUrl && supabaseKey) {
        return new SupabaseStorageAdapter(supabaseUrl, supabaseKey);
      }
    }
    return new LocalStorageAdapter();
  }
}
