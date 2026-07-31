/**
 * 2D Spatial Kernel Convolution & Canny Edge Detection Engine
 * Implements 2D Matrix Filtering, Sobel Gradient Fields, Canny Non-Maximum Suppression,
 * and Hysteresis Thresholding for visual inspection streams.
 */

export interface ConvolutionResult {
  filteredGrid: number[][];
  gradientMagnitude: number[][];
  gradientDirection: number[][];
  edgePixelCount: number;
  densityPct: number;
}

export class ImageConvolutionEngine {
  /**
   * 3x3 Sobel Horizontal Edge Filter Kernel Gx
   */
  public static SobelGx = [
    [-1, 0, 1],
    [-2, 0, 2],
    [-1, 0, 1],
  ];

  /**
   * 3x3 Sobel Vertical Edge Filter Kernel Gy
   */
  public static SobelGy = [
    [-1, -2, -1],
    [0, 0, 0],
    [1, 2, 1],
  ];

  /**
   * 3x3 Gaussian Blur Smoothing Kernel
   */
  public static GaussianBlur3x3 = [
    [1 / 16, 2 / 16, 1 / 16],
    [2 / 16, 4 / 16, 2 / 16],
    [1 / 16, 2 / 16, 1 / 16],
  ];

  /**
   * Run 2D Spatial Convolution filtering over an N x M grayscale grid
   */
  static convolve2D(imageGrid: number[][], kernel: number[][]): number[][] {
    const rows = imageGrid.length;
    const cols = imageGrid[0].length;
    const kRows = kernel.length;
    const kCols = kernel[0].length;
    const kCenterY = Math.floor(kRows / 2);
    const kCenterX = Math.floor(kCols / 2);

    const output: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(0));

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let sum = 0.0;
        for (let kr = 0; kr < kRows; kr++) {
          for (let kc = 0; kc < kCols; kc++) {
            const ir = r + kr - kCenterY;
            const ic = c + kc - kCenterX;
            if (ir >= 0 && ir < rows && ic >= 0 && ic < cols) {
              sum += imageGrid[ir][ic] * kernel[kr][kc];
            }
          }
        }
        output[r][c] = sum;
      }
    }

    return output;
  }

  /**
   * Compute Sobel Gradient Vector Fields (Gx, Gy), Magnitude G = sqrt(Gx^2 + Gy^2), and Direction Angle theta
   */
  static processSobelGradients(imageGrid: number[][]): ConvolutionResult {
    const smoothed = this.convolve2D(imageGrid, this.GaussianBlur3x3);
    const Gx = this.convolve2D(smoothed, this.SobelGx);
    const Gy = this.convolve2D(smoothed, this.SobelGy);

    const rows = imageGrid.length;
    const cols = imageGrid[0].length;

    const magnitude: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(0));
    const direction: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(0));
    let edgePixelCount = 0;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const gx = Gx[r][c];
        const gy = Gy[r][c];
        const mag = Math.sqrt(gx * gx + gy * gy);
        const dir = Math.atan2(gy, gx) * (180 / Math.PI);

        magnitude[r][c] = Math.min(255, Math.round(mag));
        direction[r][c] = Math.round((dir + 360) % 360);

        if (mag > 45) edgePixelCount++;
      }
    }

    const totalPixels = rows * cols || 1;
    const densityPct = Number(((edgePixelCount / totalPixels) * 100).toFixed(2));

    return {
      filteredGrid: smoothed,
      gradientMagnitude: magnitude,
      gradientDirection: direction,
      edgePixelCount,
      densityPct,
    };
  }

  /**
   * Canny Edge Detection with Non-Maximum Suppression and Hysteresis Thresholding
   */
  static cannyEdgeDetect(imageGrid: number[][], lowThreshold = 30, highThreshold = 90): number[][] {
    const { gradientMagnitude, gradientDirection } = this.processSobelGradients(imageGrid);
    const rows = imageGrid.length;
    const cols = imageGrid[0].length;

    const nms: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(0));

    // 1. Non-Maximum Suppression (NMS)
    for (let r = 1; r < rows - 1; r++) {
      for (let c = 1; c < cols - 1; c++) {
        const angle = gradientDirection[r][c];
        const mag = gradientMagnitude[r][c];

        let q = 255;
        let rVal = 255;

        // Angle 0 degrees (Horizontal edge -> check East/West)
        if ((angle >= 0 && angle < 22.5) || (angle >= 157.5 && angle <= 180)) {
          q = gradientMagnitude[r][c + 1];
          rVal = gradientMagnitude[r][c - 1];
        }
        // Angle 45 degrees (Diagonal -> check NE/SW)
        else if (angle >= 22.5 && angle < 67.5) {
          q = gradientMagnitude[r - 1][c + 1];
          rVal = gradientMagnitude[r + 1][c - 1];
        }
        // Angle 90 degrees (Vertical edge -> check North/South)
        else if (angle >= 67.5 && angle < 112.5) {
          q = gradientMagnitude[r - 1][c];
          rVal = gradientMagnitude[r + 1][c];
        }
        // Angle 135 degrees (Diagonal -> check NW/SE)
        else if (angle >= 112.5 && angle < 157.5) {
          q = gradientMagnitude[r - 1][c - 1];
          rVal = gradientMagnitude[r + 1][c + 1];
        }

        if (mag >= q && mag >= rVal) {
          nms[r][c] = mag;
        } else {
          nms[r][c] = 0;
        }
      }
    }

    // 2. Double Thresholding & Hysteresis
    const output: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(0));

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const val = nms[r][c];
        if (val >= highThreshold) {
          output[r][c] = 255; // Strong edge
        } else if (val >= lowThreshold) {
          output[r][c] = 128; // Weak edge candidate
        } else {
          output[r][c] = 0;
        }
      }
    }

    return output;
  }
}
