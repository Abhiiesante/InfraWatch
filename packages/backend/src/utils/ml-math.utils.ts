/**
 * Advanced Machine Learning Math & Statistical Utility Engine
 * Contains TF-IDF Vectorizer, Multinomial Naïve Bayes Classifier, Weibull Hazard Rate Math,
 * Exponentially Weighted Moving Average (EWMA), and Model Evaluation Metrics (F1, Precision, Recall, MAE, RMSE).
 */

// Common English Stop Words
const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren\'t', 'as', 'at',
  'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'can', 'cannot', 'could',
  'did', 'do', 'does', 'doing', 'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had', 'has', 'have',
  'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'i', 'if', 'in', 'into', 'is',
  'it', 'its', 'itself', 'just', 'me', 'more', 'most', 'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once',
  'only', 'or', 'other', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'so', 'some', 'such', 'than',
  'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they', 'this', 'those', 'through',
  'to', 'too', 'under', 'until', 'up', 'very', 'was', 'we', 'were', 'what', 'when', 'where', 'which', 'while', 'who',
  'whom', 'why', 'with', 'would', 'you', 'your', 'yours', 'yourself', 'yourselves'
]);

/**
 * Tokenize and normalize text into clean terms
 */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 2 && !STOP_WORDS.has(token));
}

/**
 * 1. TF-IDF VECTORIZER ENGINE
 */
export class TfIdfVectorizer {
  private vocabulary: Map<string, number> = new Map();
  private idfValues: Map<string, number> = new Map();
  private isFitted = false;

  fit(documents: string[]) {
    const docCount = documents.length;
    const docFreq: Map<string, number> = new Map();

    documents.forEach(doc => {
      const tokens = new Set(tokenize(doc));
      tokens.forEach(token => {
        docFreq.set(token, (docFreq.get(token) || 0) + 1);
      });
    });

    let index = 0;
    docFreq.forEach((freq, token) => {
      this.vocabulary.set(token, index++);
      // Smooth IDF formula: log( (1 + N) / (1 + df) ) + 1
      const idf = Math.log((1 + docCount) / (1 + freq)) + 1;
      this.idfValues.set(token, idf);
    });

    this.isFitted = true;
  }

  transform(text: string): Map<string, number> {
    if (!this.isFitted) throw new Error('Vectorizer must be fitted before transform');
    const tokens = tokenize(text);
    const termFreq: Map<string, number> = new Map();

    tokens.forEach(t => {
      termFreq.set(t, (termFreq.get(t) || 0) + 1);
    });

    const totalTokens = tokens.length || 1;
    const tfIdfMap = new Map<string, number>();

    termFreq.forEach((count, term) => {
      if (this.idfValues.has(term)) {
        const tf = count / totalTokens;
        const idf = this.idfValues.get(term)!;
        tfIdfMap.set(term, tf * idf);
      }
    });

    return tfIdfMap;
  }

  getVocabularySize(): number {
    return this.vocabulary.size;
  }
}

/**
 * 2. MULTINOMIAL NAÏVE BAYES CLASSIFIER
 */
export class MultinomialNaiveBayes {
  private classPriors: Map<string, number> = new Map();
  private featureProbs: Map<string, Map<string, number>> = new Map(); // class -> term -> prob
  private vectorizer: TfIdfVectorizer = new TfIdfVectorizer();
  private classes: string[] = [];
  public isTrained = false;

  train(documents: { text: string; label: string }[]) {
    if (documents.length === 0) return;

    const texts = documents.map(d => d.text);
    this.vectorizer.fit(texts);

    const classCounts: Map<string, number> = new Map();
    const classTermWeights: Map<string, Map<string, number>> = new Map();
    const classTotalWeights: Map<string, number> = new Map();

    documents.forEach(doc => {
      const label = doc.label;
      classCounts.set(label, (classCounts.get(label) || 0) + 1);

      if (!classTermWeights.has(label)) {
        classTermWeights.set(label, new Map());
        classTotalWeights.set(label, 0);
      }

      const termWeights = classTermWeights.get(label)!;
      const tfIdfMap = this.vectorizer.transform(doc.text);

      tfIdfMap.forEach((weight, term) => {
        termWeights.set(term, (termWeights.get(term) || 0) + weight);
        classTotalWeights.set(label, classTotalWeights.get(label)! + weight);
      });
    });

    const totalDocs = documents.length;
    this.classes = Array.from(classCounts.keys());

    // Calculate Priors and Laplace-Smoothed Feature Probabilities
    this.classes.forEach(c => {
      const prior = Math.log((classCounts.get(c)! || 1) / totalDocs);
      this.classPriors.set(c, prior);

      const featureMap = new Map<string, number>();
      const termWeights = classTermWeights.get(c) || new Map();
      const totalWeight = classTotalWeights.get(c) || 1;
      const vocabSize = this.vectorizer.getVocabularySize() || 1;

      // Laplace smoothing constant alpha = 1.0
      const denominator = totalWeight + vocabSize;

      termWeights.forEach((weight, term) => {
        const prob = Math.log((weight + 1.0) / denominator);
        featureMap.set(term, prob);
      });

      this.featureProbs.set(c, featureMap);
    });

    this.isTrained = true;
  }

  predict(text: string): { label: string; confidence: number; classProbabilities: Record<string, number> } {
    if (!this.isTrained || this.classes.length === 0) {
      return { label: 'MEDIUM', confidence: 75.0, classProbabilities: { MEDIUM: 1.0 } };
    }

    const tfIdfMap = this.vectorizer.transform(text);
    const logPosteriors: Record<string, number> = {};

    this.classes.forEach(c => {
      let logProb = this.classPriors.get(c) || 0;
      const featureMap = this.featureProbs.get(c) || new Map();

      tfIdfMap.forEach((weight, term) => {
        if (featureMap.has(term)) {
          const logP = featureMap.get(term)!;
          logProb += (10.0 + logP) * (1.0 + weight * 10.0);
        }
      });

      logPosteriors[c] = logProb;
    });

    // Softmax normalization for confidence probability estimation
    const maxLog = Math.max(...Object.values(logPosteriors));
    const exps: Record<string, number> = {};
    let sumExp = 0;

    Object.keys(logPosteriors).forEach(c => {
      const expVal = Math.exp(logPosteriors[c] - maxLog);
      exps[c] = expVal;
      sumExp += expVal;
    });

    const probabilities: Record<string, number> = {};
    let bestLabel = this.classes[0];
    let bestProb = 0;

    Object.keys(exps).forEach(c => {
      const prob = Number((exps[c] / (sumExp || 1)).toFixed(4));
      probabilities[c] = prob;
      if (prob > bestProb) {
        bestProb = prob;
        bestLabel = c;
      }
    });

    return {
      label: bestLabel,
      confidence: Number((bestProb * 100).toFixed(1)),
      classProbabilities: probabilities,
    };
  }
}

/**
 * 3. WEIBULL DISTRIBUTION HAZARD RATE & RELIABILITY MATHEMATICS
 */
export class WeibullReliabilityModel {
  /**
   * Weibull Hazard Rate: h(x) = (beta / eta) * (x / eta)^(beta - 1)
   * @param x Time / operating age (e.g. days since commissioning)
   * @param beta Shape parameter (beta > 1 implies wear-out degradation)
   * @param eta Scale parameter (characteristic life in days)
   */
  static calculateHazardRate(x: number, beta = 2.4, eta = 180): number {
    if (x <= 0) return 0.001;
    const ratio = x / eta;
    const hazard = (beta / eta) * Math.pow(ratio, beta - 1);
    return Math.min(1.0, Math.max(0.0001, hazard));
  }

  /**
   * Weibull Failure Probability F(x) = 1 - exp(- (x / eta)^beta)
   */
  static calculateFailureProbability(x: number, beta = 2.4, eta = 180): number {
    if (x <= 0) return 0.01;
    const ratio = x / eta;
    const prob = 1.0 - Math.exp(-Math.pow(ratio, beta));
    return Number((Math.min(0.99, Math.max(0.01, prob)) * 100).toFixed(1));
  }

  /**
   * Calculate Health Score from Weibull Reliability Math and EWMA Telemetry Z-scores
   */
  static computeCompositeHealthScore(
    assetAgeDays: number,
    unresolvedIncidents: number,
    totalIncidents: number,
    telemetryZScore: number,
    beta = 2.4,
    eta = 180
  ): { healthScore: number; failureProbability: number; hazardRate: number } {
    const failureProb = this.calculateFailureProbability(assetAgeDays, beta, eta);
    const hazardRate = this.calculateHazardRate(assetAgeDays, beta, eta);

    // Baseline degradation from Weibull curve
    let baseHealth = 100 - failureProb;

    // Penalty for unresolved & total incidents
    baseHealth -= (unresolvedIncidents * 14.0) + (totalIncidents * 3.5);

    // Penalty for telemetry Z-score deviation (e.g. overheating / excessive vibration)
    if (Math.abs(telemetryZScore) > 2.0) {
      baseHealth -= (Math.abs(telemetryZScore) - 2.0) * 12.0;
    }

    const healthScore = Math.max(10, Math.min(100, Math.round(baseHealth)));
    return {
      healthScore,
      failureProbability: Number((100 - healthScore).toFixed(1)),
      hazardRate: Number(hazardRate.toFixed(5)),
    };
  }
}

/**
 * 4. EXPONENTIAL MOVING AVERAGE (EWMA) & Z-SCORE ANOMALY MATH
 */
export function calculateEWMA(readings: number[], alpha = 0.25): number {
  if (readings.length === 0) return 0;
  let ewma = readings[0];
  for (let i = 1; i < readings.length; i++) {
    ewma = alpha * readings[i] + (1 - alpha) * ewma;
  }
  return ewma;
}

export function calculateZScore(value: number, history: number[]): number {
  if (history.length < 2) return 0;
  const mean = history.reduce((sum, v) => sum + v, 0) / history.length;
  const variance = history.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / history.length;
  const stdDev = Math.sqrt(variance) || 0.001;
  return (value - mean) / stdDev;
}

/**
 * 5. MACHINE LEARNING EVALUATION METRICS ENGINE
 */
export interface EvaluationMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  mae: number;
  rmse: number;
  confusionMatrix: Record<string, Record<string, number>>;
}

export function computeEvaluationMetrics(
  actuals: string[],
  predictions: string[],
  actualValues: number[] = [],
  predValues: number[] = []
): EvaluationMetrics {
  const classes = Array.from(new Set([...actuals, ...predictions]));
  const matrix: Record<string, Record<string, number>> = {};

  classes.forEach(c1 => {
    matrix[c1] = {};
    classes.forEach(c2 => {
      matrix[c1][c2] = 0;
    });
  });

  let correct = 0;
  for (let i = 0; i < actuals.length; i++) {
    const act = actuals[i];
    const pred = predictions[i];
    if (matrix[act] && matrix[act][pred] !== undefined) {
      matrix[act][pred]++;
    }
    if (act === pred) correct++;
  }

  const total = actuals.length || 1;
  const accuracy = Number((correct / total).toFixed(4));

  // Compute Macro Precision, Recall, and F1
  let sumPrecision = 0;
  let sumRecall = 0;

  classes.forEach(c => {
    const tp = matrix[c] ? matrix[c][c] || 0 : 0;
    let fp = 0;
    let fn = 0;

    classes.forEach(other => {
      if (other !== c) {
        fp += matrix[other] ? matrix[other][c] || 0 : 0;
        fn += matrix[c] ? matrix[c][other] || 0 : 0;
      }
    });

    const prec = tp + fp > 0 ? tp / (tp + fp) : (tp > 0 ? 1.0 : 0.0);
    const rec = tp + fn > 0 ? tp / (tp + fn) : (tp > 0 ? 1.0 : 0.0);
    sumPrecision += prec;
    sumRecall += rec;
  });

  const macroPrecision = Number((sumPrecision / (classes.length || 1)).toFixed(4));
  const macroRecall = Number((sumRecall / (classes.length || 1)).toFixed(4));
  const f1Score = Number(((2 * macroPrecision * macroRecall) / (macroPrecision + macroRecall || 1)).toFixed(4));

  // Numerical Regression MAE and RMSE
  let mae = 0;
  let rmse = 0;
  if (actualValues.length > 0 && actualValues.length === predValues.length) {
    let absDiffSum = 0;
    let sqDiffSum = 0;
    for (let i = 0; i < actualValues.length; i++) {
      const diff = actualValues[i] - predValues[i];
      absDiffSum += Math.abs(diff);
      sqDiffSum += diff * diff;
    }
    mae = Number((absDiffSum / actualValues.length).toFixed(3));
    rmse = Number((Math.sqrt(sqDiffSum / actualValues.length)).toFixed(3));
  }

  return {
    accuracy,
    precision: macroPrecision,
    recall: macroRecall,
    f1Score,
    mae,
    rmse,
    confusionMatrix: matrix,
  };
}
