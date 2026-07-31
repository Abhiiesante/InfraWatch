/**
 * 2D Kalman Filter & Remaining Useful Life (RUL) Forecasting Engine
 * Implements State Prediction, Covariance Propagation, Kalman Gain Calculation,
 * Measurement Update, and 95% Confidence Interval Time-to-Failure Extrapolation.
 */

export interface KalmanState {
  degradationLevel: number; // Current accumulated damage % (0 to 100)
  degradationVelocity: number; // Damage rate per day (% / day)
  errorCovariance: [[number, number], [number, number]]; // 2x2 P matrix
}

export interface RulForecastResult {
  currentDegradationPct: number;
  estimatedDegradationRatePerDay: number;
  remainingUsefulLifeDays: number;
  confidenceIntervalLowerDays: number;
  confidenceIntervalUpperDays: number;
  failureThresholdPct: number;
  kalmanGain: number;
  stateCovarianceVariance: number;
  analyzedAt: string;
}

export class KalmanFilterRulEngine {
  /**
   * Run 2D Kalman Filter update given a sequence of historical degradation measurements
   * @param measurements Historical damage readings (% 0 to 100)
   * @param deltaDays Operating time interval between readings (days)
   * @param failureThreshold Damage % threshold for failure (default: 85%)
   */
  static estimateRul(
    measurements: number[],
    deltaDays = 7,
    failureThreshold = 85.0
  ): RulForecastResult {
    if (measurements.length === 0) {
      measurements = [15.0, 18.5, 22.0, 26.5];
    }

    // State Vector x = [d, v]^T (degradation, velocity)
    let d = measurements[0];
    let v = measurements.length > 1 ? (measurements[measurements.length - 1] - measurements[0]) / ((measurements.length - 1) * deltaDays) : 0.5;
    v = Math.max(0.05, Math.min(3.0, v));

    // 2x2 Covariance Matrix P
    let p00 = 1.0;
    let p01 = 0.0;
    let p10 = 0.0;
    let p11 = 0.1;

    // Process Noise Q and Measurement Noise R
    const q00 = 0.05;
    const q11 = 0.01;
    const r = 1.5; // Measurement noise variance

    let latestKalmanGain = 0.5;

    // Run Kalman Filter iteration over measurement time series
    for (let k = 1; k < measurements.length; k++) {
      const z = measurements[k]; // Actual measurement

      // 1. Predict Step: x_pred = F * x
      // F = [[1, deltaDays], [0, 1]]
      const d_pred = d + v * deltaDays;
      const v_pred = v;

      // P_pred = F * P * F^T + Q
      const p00_pred = p00 + deltaDays * (p10 + p01) + deltaDays * deltaDays * p11 + q00;
      const p01_pred = p01 + deltaDays * p11;
      const p10_pred = p10 + deltaDays * p11;
      const p11_pred = p11 + q11;

      // 2. Innovation Step: y = z - H * x_pred (where H = [1, 0])
      const y = z - d_pred;
      const s = p00_pred + r; // Innovation covariance

      // 3. Kalman Gain: K = P_pred * H^T / s
      const k0 = p00_pred / s;
      const k1 = p10_pred / s;
      latestKalmanGain = k0;

      // 4. Update Step: x = x_pred + K * y
      d = d_pred + k0 * y;
      v = v_pred + k1 * y;
      v = Math.max(0.05, v); // Non-negative degradation rate

      // P = (I - K * H) * P_pred
      p00 = (1 - k0) * p00_pred;
      p01 = (1 - k0) * p01_pred;
      p10 = p10_pred - k1 * p00_pred;
      p11 = p11_pred - k1 * p01_pred;
    }

    // 5. Extrapolate Remaining Useful Life (RUL)
    const remainingDamage = Math.max(0, failureThreshold - d);
    const rulDays = v > 0 ? remainingDamage / v : 120;

    // 95% Confidence Interval based on estimation error variance
    const stdErr = Math.sqrt(Math.max(0.01, p00));
    const marginDays = (1.96 * stdErr) / (v || 0.1);

    const remainingUsefulLifeDays = Number(Math.max(1, Math.round(rulDays)));
    const confidenceIntervalLowerDays = Number(Math.max(1, Math.round(rulDays - marginDays)));
    const confidenceIntervalUpperDays = Number(Math.round(rulDays + marginDays));

    return {
      currentDegradationPct: Number(d.toFixed(2)),
      estimatedDegradationRatePerDay: Number(v.toFixed(3)),
      remainingUsefulLifeDays,
      confidenceIntervalLowerDays,
      confidenceIntervalUpperDays,
      failureThresholdPct: failureThreshold,
      kalmanGain: Number(latestKalmanGain.toFixed(4)),
      stateCovarianceVariance: Number(p00.toFixed(4)),
      analyzedAt: new Date().toISOString(),
    };
  }
}
