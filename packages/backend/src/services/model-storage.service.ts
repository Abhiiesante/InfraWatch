import fs from 'fs';
import path from 'path';

export interface SavedModelMetadata {
  modelName: string;
  version: string;
  savedAt: string;
  fileSizeBytes: number;
  filePath: string;
  metrics: Record<string, any>;
  parameters: Record<string, any>;
}

export class ModelStorageService {
  private static storageDir = path.resolve(process.cwd(), 'storage', 'models');

  /**
   * Ensures storage directory exists on disk
   */
  private static ensureStorageDir() {
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }

  /**
   * Save model weights and state configuration to JSON file on disk
   */
  static async saveModelWeights(
    modelName: string,
    weights: Record<string, any>,
    metrics: Record<string, any> = {},
    parameters: Record<string, any> = {},
    version = 'v1.0-production'
  ): Promise<SavedModelMetadata> {
    this.ensureStorageDir();
    const fileName = `${modelName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_weights.json`;
    const filePath = path.join(this.storageDir, fileName);

    const payload = {
      modelName,
      version,
      savedAt: new Date().toISOString(),
      metrics,
      parameters,
      weights,
    };

    const jsonStr = JSON.stringify(payload, null, 2);
    fs.writeFileSync(filePath, jsonStr, 'utf-8');

    const stat = fs.statSync(filePath);
    return {
      modelName,
      version,
      savedAt: payload.savedAt,
      fileSizeBytes: stat.size,
      filePath,
      metrics,
      parameters,
    };
  }

  /**
   * Load trained model weights from JSON file on disk
   */
  static async loadModelWeights(modelName: string): Promise<Record<string, any> | null> {
    this.ensureStorageDir();
    const fileName = `${modelName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_weights.json`;
    const filePath = path.join(this.storageDir, fileName);

    if (!fs.existsSync(filePath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (err) {
      console.warn(`Failed to parse model weights file ${filePath}:`, err);
      return null;
    }
  }

  /**
   * List all saved model files stored on disk
   */
  static async listSavedModels(): Promise<SavedModelMetadata[]> {
    this.ensureStorageDir();
    const files = fs.readdirSync(this.storageDir);
    const models: SavedModelMetadata[] = [];

    files.forEach((file) => {
      if (file.endsWith('.json')) {
        const filePath = path.join(this.storageDir, file);
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          const parsed = JSON.parse(content);
          const stat = fs.statSync(filePath);

          models.push({
            modelName: parsed.modelName || file,
            version: parsed.version || 'v1.0',
            savedAt: parsed.savedAt || stat.mtime.toISOString(),
            fileSizeBytes: stat.size,
            filePath,
            metrics: parsed.metrics || {},
            parameters: parsed.parameters || {},
          });
        } catch {
          // Ignore invalid files
        }
      }
    });

    return models;
  }
}
