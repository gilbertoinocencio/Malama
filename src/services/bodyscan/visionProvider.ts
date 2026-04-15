/**
 * Abstract vision provider interface.
 *
 * All real-time pose estimation logic flows through this contract.
 * Swapping MediaPipe for ML Kit (Capacitor migration) only requires
 * a new class that satisfies IVisionProvider — no component changes needed.
 */

/** Normalized landmark (x, y ∈ [0,1]; z is relative depth). */
export interface PoseLandmark {
  x: number;
  y: number;
  z: number;
  visibility?: number; // 0–1 confidence from the model
}

/** Raw output of a single pose inference pass. */
export interface PoseResult {
  /** 33 landmarks in MediaPipe order (indices match LANDMARK_INDEX). */
  landmarks: PoseLandmark[];
  /** Overall confidence for this pose (0–1). */
  confidence: number;
}

/** Result of analysing one video frame. */
export interface FrameAnalysis {
  poseDetected: boolean;
  result?: PoseResult;
  /** Performance.now() timestamp when the frame was processed. */
  timestamp: number;
}

/**
 * IVisionProvider — the only seam that changes during a Capacitor + ML Kit migration.
 *
 * Usage:
 *   const provider: IVisionProvider = new MediaPipeProvider();
 *   await provider.initialize();
 *   const frame = await provider.analyzeFrame(videoEl);
 */
export interface IVisionProvider {
  /** Async init: loads model + WASM. Call once before analyzeFrame(). */
  initialize(): Promise<void>;
  /** Returns true once initialize() has resolved successfully. */
  isReady(): boolean;
  /** Run inference on the current video frame. Non-blocking (returns the latest result). */
  analyzeFrame(videoElement: HTMLVideoElement): Promise<FrameAnalysis>;
  /** Release GPU / WASM resources. */
  destroy(): void;
}

/**
 * Canonical landmark indices (MediaPipe Pose 33-point model).
 * Use these constants instead of magic numbers throughout the codebase.
 */
export const LANDMARK_INDEX = {
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  MOUTH_LEFT: 9,
  MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
} as const;
