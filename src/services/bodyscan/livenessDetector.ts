/**
 * Active liveness detection via a single reliable gesture:
 *   → raise right arm above the right shoulder.
 *
 * Why this gesture?
 *   - Right wrist (lm[16]) vs. right shoulder (lm[12]) is unambiguous in 2D.
 *   - No depth information needed.
 *   - Works reliably across webcams and lighting conditions.
 *   - Avoids trunk-rotation gestures which are imprecise without depth cameras.
 *
 * Algorithm:
 *   1. Accumulate landmark frames into a rolling buffer.
 *   2. Require the wrist to be ABOVE the shoulder (lower y value) in at least
 *      MIN_FRAMES_DETECTED out of the last BUFFER_SIZE frames.
 *   3. Also require the wrist to have moved enough (delta > MOVEMENT_THRESHOLD)
 *      to prove it's not a static photo.
 */

import type { PoseLandmark } from './visionProvider';
import { LANDMARK_INDEX as LM } from './visionProvider';

// ─── Config ───────────────────────────────────────────────────────────────────

/** How many consecutive frames to keep in the detection window. */
const BUFFER_SIZE = 10;

/**
 * How many frames within the buffer must show the wrist above the shoulder.
 * 7/10 tolerates brief occlusions or tracking jitter.
 */
const MIN_FRAMES_DETECTED = 7;

/**
 * Minimum vertical movement of the wrist across the buffer (normalised units)
 * to confirm it's a real gesture and not a static pose.
 */
const MOVEMENT_THRESHOLD = 0.05;

// ─── State ────────────────────────────────────────────────────────────────────

interface FrameSnapshot {
  wristY: number;
  shoulderY: number;
}

/**
 * Stateful liveness detector.
 * Create one instance per scan session and call `addFrame()` each inference tick.
 */
export class LivenessDetector {
  private buffer: FrameSnapshot[] = [];
  private _validated = false;

  /** Feed a new landmark set. Returns true the first time liveness is confirmed. */
  addFrame(landmarks: PoseLandmark[]): boolean {
    if (this._validated) return true;

    const wrist = landmarks[LM.RIGHT_WRIST];
    const shoulder = landmarks[LM.RIGHT_SHOULDER];

    if (!wrist || !shoulder) return false;
    if ((wrist.visibility ?? 0) < 0.3 || (shoulder.visibility ?? 0) < 0.3) return false;

    this.buffer.push({ wristY: wrist.y, shoulderY: shoulder.y });
    if (this.buffer.length > BUFFER_SIZE) this.buffer.shift();

    if (this.buffer.length < BUFFER_SIZE) return false;

    // Check 1: wrist above shoulder in MIN_FRAMES_DETECTED frames
    const framesAbove = this.buffer.filter(
      (f) => f.wristY < f.shoulderY - 0.02 // 2% margin to avoid noise at shoulder level
    ).length;

    if (framesAbove < MIN_FRAMES_DETECTED) return false;

    // Check 2: wrist actually moved (not a photo / static frame)
    const wristYValues = this.buffer.map((f) => f.wristY);
    const movement = Math.max(...wristYValues) - Math.min(...wristYValues);

    if (movement < MOVEMENT_THRESHOLD) return false;

    this._validated = true;
    return true;
  }

  get validated(): boolean {
    return this._validated;
  }

  /** How close to validation the user is (0–1), for progress UI. */
  get progress(): number {
    if (this._validated) return 1;
    if (this.buffer.length < BUFFER_SIZE) return 0;

    const framesAbove = this.buffer.filter(
      (f) => f.wristY < f.shoulderY - 0.02
    ).length;
    return framesAbove / MIN_FRAMES_DETECTED;
  }

  reset(): void {
    this.buffer = [];
    this._validated = false;
  }
}

// ─── Stability detector ───────────────────────────────────────────────────────

/**
 * Detects whether the user has held a stable pose for `requiredMs` milliseconds.
 *
 * Stability = low variance in key landmark positions across recent frames.
 */
export class StabilityDetector {
  private readonly requiredMs: number;
  /** Timestamps at which the user was in a stable position. */
  private stableStart: number | null = null;

  constructor(requiredMs = 2000) {
    this.requiredMs = requiredMs;
  }

  /**
   * Call every inference tick.
   *
   * @param landmarks Current landmarks
   * @param prevLandmarks Landmarks from the previous frame (pass null for first frame)
   * @param now performance.now() timestamp
   * @returns true when the pose has been held for `requiredMs`
   */
  addFrame(
    landmarks: PoseLandmark[],
    prevLandmarks: PoseLandmark[] | null,
    now: number
  ): boolean {
    if (!prevLandmarks) {
      this.stableStart = null;
      return false;
    }

    const isStable = this._checkStability(landmarks, prevLandmarks);

    if (isStable) {
      if (this.stableStart === null) this.stableStart = now;
      return now - this.stableStart >= this.requiredMs;
    } else {
      this.stableStart = null;
      return false;
    }
  }

  /** 0–1 progress toward stability threshold. */
  get progress(): number {
    if (this.stableStart === null) return 0;
    return Math.min(1, (performance.now() - this.stableStart) / this.requiredMs);
  }

  reset(): void {
    this.stableStart = null;
  }

  private _checkStability(
    curr: PoseLandmark[],
    prev: PoseLandmark[]
  ): boolean {
    // Check variance of 5 key landmarks
    const keyIndices = [
      LM.NOSE,
      LM.LEFT_SHOULDER,
      LM.RIGHT_SHOULDER,
      LM.LEFT_HIP,
      LM.RIGHT_HIP,
    ];

    const THRESHOLD = 0.015; // normalised units (~1.5% of frame width/height)

    for (const i of keyIndices) {
      const c = curr[i];
      const p = prev[i];
      if (!c || !p) return false;
      if (Math.abs(c.x - p.x) > THRESHOLD || Math.abs(c.y - p.y) > THRESHOLD) {
        return false;
      }
    }

    return true;
  }
}
