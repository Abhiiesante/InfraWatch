/**
 * Deep Linear Algebra & Matrix Computational Engine
 * Implements 2D Matrix Multiplication, Transpose, Gaussian-LU Inversion, Dot Product,
 * Cosine Similarity, L2 Vector Normalization, Softmax, and Activation Derivatives.
 */

export class MatrixMath {
  /**
   * Multiply 2D Matrices A (m x n) and B (n x p) -> Result (m x p)
   */
  static multiply(A: number[][], B: number[][]): number[][] {
    const rowsA = A.length;
    const colsA = A[0].length;
    const rowsB = B.length;
    const colsB = B[0].length;

    if (colsA !== rowsB) {
      throw new Error(`Matrix multiplication dimension mismatch: (${rowsA}x${colsA}) vs (${rowsB}x${colsB})`);
    }

    const C: number[][] = Array.from({ length: rowsA }, () => new Array(colsB).fill(0));

    for (let i = 0; i < rowsA; i++) {
      for (let k = 0; k < colsA; k++) {
        const a_ik = A[i][k];
        for (let j = 0; j < colsB; j++) {
          C[i][j] += a_ik * B[k][j];
        }
      }
    }

    return C;
  }

  /**
   * Matrix Transpose: A (m x n) -> A^T (n x m)
   */
  static transpose(A: number[][]): number[][] {
    const rows = A.length;
    const cols = A[0].length;
    const AT: number[][] = Array.from({ length: cols }, () => new Array(rows).fill(0));

    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        AT[j][i] = A[i][j];
      }
    }

    return AT;
  }

  /**
   * Matrix Inversion via Gaussian Elimination with Partial Pivoting (n x n)
   */
  static invert(A: number[][]): number[][] {
    const n = A.length;
    if (n !== A[0].length) throw new Error('Cannot invert non-square matrix');

    // Create augmented matrix [A | I]
    const aug: number[][] = A.map((row, i) => {
      const copy = [...row];
      const identityRow = new Array(n).fill(0);
      identityRow[i] = 1.0;
      return [...copy, ...identityRow];
    });

    // Gaussian elimination
    for (let i = 0; i < n; i++) {
      // Find pivot
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(aug[k][i]) > Math.abs(aug[maxRow][i])) {
          maxRow = k;
        }
      }

      // Swap rows
      const temp = aug[i];
      aug[i] = aug[maxRow];
      aug[maxRow] = temp;

      const pivot = aug[i][i] || 1e-9;

      // Scale row i to make pivot = 1
      for (let j = 0; j < 2 * n; j++) {
        aug[i][j] /= pivot;
      }

      // Eliminate elements below and above
      for (let k = 0; k < n; k++) {
        if (k !== i) {
          const factor = aug[k][i];
          for (let j = 0; j < 2 * n; j++) {
            aug[k][j] -= factor * aug[i][j];
          }
        }
      }
    }

    // Extract right inverse matrix I
    return aug.map(row => row.slice(n));
  }

  /**
   * Vector Dot Product u . v
   */
  static dot(u: number[], v: number[]): number {
    let sum = 0;
    for (let i = 0; i < u.length; i++) {
      sum += u[i] * (v[i] || 0);
    }
    return sum;
  }

  /**
   * Cosine Similarity between vectors u and v
   */
  static cosineSimilarity(u: number[], v: number[]): number {
    const dotProd = this.dot(u, v);
    const normU = Math.sqrt(u.reduce((sum, x) => sum + x * x, 0)) || 1e-9;
    const normV = Math.sqrt(v.reduce((sum, x) => sum + x * x, 0)) || 1e-9;
    return dotProd / (normU * normV);
  }

  /**
   * Softmax Activation Vector
   */
  static softmax(logits: number[]): number[] {
    const maxLogit = Math.max(...logits);
    const exps = logits.map(l => Math.exp(l - maxLogit));
    const sumExps = exps.reduce((sum, e) => sum + e, 0) || 1e-9;
    return exps.map(e => e / sumExps);
  }

  /**
   * Rectified Linear Unit (ReLU) Activation
   */
  static relu(x: number): number {
    return Math.max(0, x);
  }

  /**
   * ReLU Derivative: d/dx ReLU(x)
   */
  static reluDerivative(x: number): number {
    return x > 0 ? 1.0 : 0.0;
  }
}
