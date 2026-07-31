import { MatrixMath } from './matrix-math.engine.js';

export interface NeuralLayer {
  weights: number[][]; // (inDim x outDim)
  biases: number[]; // (outDim)
  mWeights: number[][]; // Adam 1st moment for weights
  vWeights: number[][]; // Adam 2nd moment for weights
  mBiases: number[]; // Adam 1st moment for biases
  vBiases: number[]; // Adam 2nd moment for biases
}

export interface TrainingEpochRecord {
  epoch: number;
  loss: number;
  accuracy: number;
}

export class NeuralNetworkEngine {
  public layer1: NeuralLayer; // Input -> Hidden
  public layer2: NeuralLayer; // Hidden -> Output
  public inputDim: number;
  public hiddenDim: number;
  public outputDim: number;
  public classLabels: string[];

  constructor(inputDim = 10, hiddenDim = 16, outputDim = 4, labels = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']) {
    this.inputDim = inputDim;
    this.hiddenDim = hiddenDim;
    this.outputDim = outputDim;
    this.classLabels = labels;

    // Xavier/Glorot Normal Weight Initialization
    this.layer1 = this.initLayer(inputDim, hiddenDim);
    this.layer2 = this.initLayer(hiddenDim, outputDim);
  }

  private initLayer(inDim: number, outDim: number): NeuralLayer {
    const scale = Math.sqrt(2.0 / inDim);
    const weights: number[][] = Array.from({ length: inDim }, () =>
      Array.from({ length: outDim }, () => (Math.random() * 2 - 1) * scale)
    );
    const biases: number[] = new Array(outDim).fill(0.01);

    const mWeights = Array.from({ length: inDim }, () => new Array(outDim).fill(0.0));
    const vWeights = Array.from({ length: inDim }, () => new Array(outDim).fill(0.0));
    const mBiases = new Array(outDim).fill(0.0);
    const vBiases = new Array(outDim).fill(0.0);

    return { weights, biases, mWeights, vWeights, mBiases, vBiases };
  }

  /**
   * Forward Pass: Input Vector -> Hidden (ReLU) -> Output (Softmax)
   */
  forward(x: number[]): { hiddenLinear: number[]; hiddenActivated: number[]; outputLogits: number[]; outputProbs: number[] } {
    // 1. Layer 1 Linear: z1 = x * W1 + b1
    const hiddenLinear: number[] = new Array(this.hiddenDim).fill(0.0);
    for (let j = 0; j < this.hiddenDim; j++) {
      let sum = this.layer1.biases[j];
      for (let i = 0; i < this.inputDim; i++) {
        sum += (x[i] || 0) * this.layer1.weights[i][j];
      }
      hiddenLinear[j] = sum;
    }

    // ReLU Activation: a1 = max(0, z1)
    const hiddenActivated = hiddenLinear.map(z => MatrixMath.relu(z));

    // 2. Layer 2 Linear: z2 = a1 * W2 + b2
    const outputLogits: number[] = new Array(this.outputDim).fill(0.0);
    for (let k = 0; k < this.outputDim; k++) {
      let sum = this.layer2.biases[k];
      for (let j = 0; j < this.hiddenDim; j++) {
        sum += hiddenActivated[j] * this.layer2.weights[j][k];
      }
      outputLogits[k] = sum;
    }

    // Softmax Output Activation
    const outputProbs = MatrixMath.softmax(outputLogits);

    return { hiddenLinear, hiddenActivated, outputLogits, outputProbs };
  }

  /**
   * Train Neural Network over dataset using Analytical Backpropagation and Adam Optimizer
   */
  trainEpoch(
    dataset: { features: number[]; labelIndex: number }[],
    learningRate = 0.005,
    beta1 = 0.9,
    beta2 = 0.999,
    t = 1
  ): TrainingEpochRecord {
    let totalLoss = 0.0;
    let correctCount = 0;

    dataset.forEach(({ features, labelIndex }) => {
      // 1. Forward Pass
      const { hiddenLinear, hiddenActivated, outputProbs } = this.forward(features);

      // Categorical Cross-Entropy Loss: L = -log(probs[target])
      const targetProb = Math.max(1e-9, outputProbs[labelIndex]);
      totalLoss += -Math.log(targetProb);

      // Prediction accuracy check
      const predictedLabelIdx = outputProbs.indexOf(Math.max(...outputProbs));
      if (predictedLabelIdx === labelIndex) correctCount++;

      // 2. Backpropagation Step
      // Output gradient dL/dz2 = outputProbs - targetOneHot
      const dZ2: number[] = [...outputProbs];
      dZ2[labelIndex] -= 1.0;

      // Layer 2 Weight & Bias Gradients
      const dW2: number[][] = Array.from({ length: this.hiddenDim }, () => new Array(this.outputDim).fill(0.0));
      for (let j = 0; j < this.hiddenDim; j++) {
        for (let k = 0; k < this.outputDim; k++) {
          dW2[j][k] = hiddenActivated[j] * dZ2[k];
        }
      }
      const dB2 = dZ2;

      // Backpropagate to Hidden Layer 1: dL/da1 = dZ2 * W2^T
      const dA1: number[] = new Array(this.hiddenDim).fill(0.0);
      for (let j = 0; j < this.hiddenDim; j++) {
        for (let k = 0; k < this.outputDim; k++) {
          dA1[j] += dZ2[k] * this.layer2.weights[j][k];
        }
      }

      // dL/dz1 = dA1 * reluDerivative(z1)
      const dZ1: number[] = hiddenLinear.map((z, j) => dA1[j] * MatrixMath.reluDerivative(z));

      // Layer 1 Weight & Bias Gradients
      const dW1: number[][] = Array.from({ length: this.inputDim }, () => new Array(this.hiddenDim).fill(0.0));
      for (let i = 0; i < this.inputDim; i++) {
        for (let j = 0; j < this.hiddenDim; j++) {
          dW1[i][j] = (features[i] || 0) * dZ1[j];
        }
      }
      const dB1 = dZ1;

      // 3. Apply Adam Optimizer Update to Layer 2 & Layer 1
      this.updateLayerAdam(this.layer2, dW2, dB2, learningRate, beta1, beta2, t);
      this.updateLayerAdam(this.layer1, dW1, dB1, learningRate, beta1, beta2, t);
    });

    const avgLoss = totalLoss / (dataset.length || 1);
    const accuracy = correctCount / (dataset.length || 1);

    return {
      epoch: t,
      loss: Number(avgLoss.toFixed(4)),
      accuracy: Number(accuracy.toFixed(4)),
    };
  }

  /**
   * Adam Weight & Bias Optimizer Update Step
   */
  private updateLayerAdam(
    layer: NeuralLayer,
    dW: number[][],
    dB: number[],
    lr: number,
    beta1: number,
    beta2: number,
    t: number
  ) {
    const eps = 1e-8;

    // Update weights
    for (let i = 0; i < dW.length; i++) {
      for (let j = 0; j < dW[0].length; j++) {
        const grad = dW[i][j];
        layer.mWeights[i][j] = beta1 * layer.mWeights[i][j] + (1 - beta1) * grad;
        layer.vWeights[i][j] = beta2 * layer.vWeights[i][j] + (1 - beta2) * grad * grad;

        const mHat = layer.mWeights[i][j] / (1 - Math.pow(beta1, t));
        const vHat = layer.vWeights[i][j] / (1 - Math.pow(beta2, t));

        layer.weights[i][j] -= (lr * mHat) / (Math.sqrt(vHat) + eps);
      }
    }

    // Update biases
    for (let j = 0; j < dB.length; j++) {
      const grad = dB[j];
      layer.mBiases[j] = beta1 * layer.mBiases[j] + (1 - beta1) * grad;
      layer.vBiases[j] = beta2 * layer.vBiases[j] + (1 - beta2) * grad * grad;

      const mHat = layer.mBiases[j] / (1 - Math.pow(beta1, t));
      const vHat = layer.vBiases[j] / (1 - Math.pow(beta2, t));

      layer.biases[j] -= (lr * mHat) / (Math.sqrt(vHat) + eps);
    }
  }

  /**
   * Run inference on input vector
   */
  predict(features: number[]): { predictedLabel: string; confidence: number; classProbabilities: Record<string, number> } {
    const { outputProbs } = this.forward(features);
    const maxIndex = outputProbs.indexOf(Math.max(...outputProbs));
    const predictedLabel = this.classLabels[maxIndex] || 'MEDIUM';
    const confidence = Number((outputProbs[maxIndex] * 100).toFixed(1));

    const classProbabilities: Record<string, number> = {};
    this.classLabels.forEach((label, idx) => {
      classProbabilities[label] = Number(outputProbs[idx].toFixed(4));
    });

    return { predictedLabel, confidence, classProbabilities };
  }
}
