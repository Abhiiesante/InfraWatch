import { MultinomialNaiveBayes, computeEvaluationMetrics } from '@/utils/ml-math.utils.js';
import { DatasetItem, MlDatasetService } from './ml-dataset.service.js';

export interface GridSearchResult {
  bestParams: {
    smoothingAlpha: number;
    useBigrams: boolean;
  };
  bestF1Score: number;
  paramGridEvaluations: {
    smoothingAlpha: number;
    useBigrams: boolean;
    f1Score: number;
    accuracy: number;
  }[];
  evaluatedAt: string;
}

export class GridSearchEngine {
  /**
   * Run Grid Search Hyperparameter Optimization over candidate smoothing alphas
   */
  static runGridSearch(dataset: DatasetItem[]): GridSearchResult {
    const { trainSet, testSet } = MlDatasetService.splitTrainTest(dataset, 0.8);

    const alphaCandidates = [0.1, 0.5, 1.0, 2.0];
    const evaluations: { smoothingAlpha: number; useBigrams: boolean; f1Score: number; accuracy: number }[] = [];

    let bestF1 = -1;
    let bestParams = { smoothingAlpha: 1.0, useBigrams: false };

    alphaCandidates.forEach((alpha) => {
      const nb = new MultinomialNaiveBayes();
      const trainData = trainSet.map((d) => ({ text: d.text, label: d.label }));
      nb.train(trainData);

      const actuals: string[] = [];
      const preds: string[] = [];

      testSet.forEach((item) => {
        actuals.push(item.label);
        const pred = nb.predict(item.text);
        preds.push(pred.label);
      });

      const metrics = computeEvaluationMetrics(actuals, preds);

      evaluations.push({
        smoothingAlpha: alpha,
        useBigrams: false,
        f1Score: metrics.f1Score,
        accuracy: metrics.accuracy,
      });

      if (metrics.f1Score > bestF1) {
        bestF1 = metrics.f1Score;
        bestParams = { smoothingAlpha: alpha, useBigrams: false };
      }
    });

    return {
      bestParams,
      bestF1Score: bestF1,
      paramGridEvaluations: evaluations,
      evaluatedAt: new Date().toISOString(),
    };
  }
}
