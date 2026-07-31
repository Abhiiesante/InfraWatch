import { NeuralNetworkEngine, TrainingEpochRecord } from './neural-network.engine.js';
import { ModelStorageService } from '../services/model-storage.service.js';

export interface BackgroundTrainingResult {
  modelName: string;
  totalEpochs: number;
  finalLoss: number;
  finalAccuracy: number;
  epochHistory: TrainingEpochRecord[];
  savedWeightsPath: string;
  completedAt: string;
}

export class ModelWorkerPipeline {
  /**
   * Run background multi-epoch training worker pipeline for Neural Network Classifier
   */
  static async runNeuralNetworkTrainingPipeline(
    modelName = 'deep_neural_classifier',
    maxEpochs = 10,
    learningRate = 0.005
  ): Promise<BackgroundTrainingResult> {
    const nn = new NeuralNetworkEngine(10, 16, 4, ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']);

    // Synthetic training dataset for deep neural network initialization
    const dataset: { features: number[]; labelIndex: number }[] = [
      { features: [0.9, 0.8, 0.95, 0.9, 0.85, 0.9, 0.88, 0.92, 0.94, 0.9], labelIndex: 0 }, // CRITICAL
      { features: [0.85, 0.75, 0.9, 0.88, 0.82, 0.87, 0.84, 0.89, 0.91, 0.86], labelIndex: 0 }, // CRITICAL
      { features: [0.6, 0.5, 0.65, 0.58, 0.55, 0.62, 0.59, 0.61, 0.64, 0.57], labelIndex: 1 }, // HIGH
      { features: [0.55, 0.48, 0.6, 0.52, 0.5, 0.58, 0.54, 0.56, 0.59, 0.51], labelIndex: 1 }, // HIGH
      { features: [0.3, 0.25, 0.35, 0.28, 0.22, 0.31, 0.29, 0.32, 0.34, 0.27], labelIndex: 2 }, // MEDIUM
      { features: [0.1, 0.05, 0.15, 0.08, 0.02, 0.11, 0.09, 0.12, 0.14, 0.07], labelIndex: 3 }, // LOW
    ];

    const epochHistory: TrainingEpochRecord[] = [];

    // Execute Epoch Loop
    for (let epoch = 1; epoch <= maxEpochs; epoch++) {
      const record = nn.trainEpoch(dataset, learningRate, 0.9, 0.999, epoch);
      epochHistory.push(record);
    }

    const lastRecord = epochHistory[epochHistory.length - 1];

    // Serialize trained neural network weights to disk
    const savedMeta = await ModelStorageService.saveModelWeights(
      modelName,
      {
        layer1: { weights: nn.layer1.weights, biases: nn.layer1.biases },
        layer2: { weights: nn.layer2.weights, biases: nn.layer2.biases },
        classLabels: nn.classLabels,
      },
      { finalLoss: lastRecord.loss, finalAccuracy: lastRecord.accuracy },
      { inputDim: 10, hiddenDim: 16, outputDim: 4, learningRate, maxEpochs },
      'v3.0-deep-neural'
    );

    return {
      modelName,
      totalEpochs: maxEpochs,
      finalLoss: lastRecord.loss,
      finalAccuracy: lastRecord.accuracy,
      epochHistory,
      savedWeightsPath: savedMeta.filePath,
      completedAt: new Date().toISOString(),
    };
  }
}
