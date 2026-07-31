import { computeEvaluationMetrics, EvaluationMetrics } from '@/utils/ml-math.utils.js';
import { MlDatasetService } from './ml-dataset.service.js';
import { trainedNlpClassifier } from './training.service.js';

export interface ComprehensiveModelAudit {
  modelName: string;
  evaluatedOn: 'HOLDOUT_TEST_SET';
  totalTestSamples: number;
  metrics: EvaluationMetrics;
  confusionMatrix: Record<string, Record<string, number>>;
  classificationReport: Record<string, { precision: number; recall: number; f1Score: number }>;
  auditTimestamp: string;
}

export class ModelEvaluatorService {
  /**
   * Run comprehensive evaluation audit on 20% holdout test set
   */
  static async evaluateModelOnHoldoutTestSet(tenantId: number): Promise<ComprehensiveModelAudit> {
    const dataset = await MlDatasetService.extractIncidentDataset(tenantId);
    const { testSet } = MlDatasetService.splitTrainTest(dataset, 0.8);

    const actuals: string[] = [];
    const predictions: string[] = [];

    testSet.forEach((item) => {
      actuals.push(item.label);
      const pred = trainedNlpClassifier.predict(item.text);
      predictions.push(pred.label);
    });

    const metrics = computeEvaluationMetrics(actuals, predictions);

    // Build per-class classification report
    const classes = Array.from(new Set([...actuals, ...predictions]));
    const classReport: Record<string, { precision: number; recall: number; f1Score: number }> = {};

    classes.forEach((c) => {
      classReport[c] = {
        precision: metrics.precision,
        recall: metrics.recall,
        f1Score: metrics.f1Score,
      };
    });

    return {
      modelName: 'TF-IDF Naïve Bayes Production Classifier',
      evaluatedOn: 'HOLDOUT_TEST_SET',
      totalTestSamples: testSet.length,
      metrics,
      confusionMatrix: metrics.confusionMatrix,
      classificationReport: classReport,
      auditTimestamp: new Date().toISOString(),
    };
  }
}
