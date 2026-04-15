/**
 * MediaPipe Pose Landmarker implementation of IVisionProvider.
 *
 * WASM + model files are loaded from CDN so Vite never tries to bundle them.
 * This avoids both Vite/WASM bundling issues and Safari iOS 16+ restrictions.
 *
 * Swap note: to migrate to ML Kit on Capacitor, create a new class that
 * implements IVisionProvider and wire it up in BodyScanCamera.tsx — nothing
 * else needs to change.
 */

import {
  PoseLandmarker,
  FilesetResolver,
  type PoseLandmarkerResult,
} from '@mediapipe/tasks-vision';

import type { IVisionProvider, FrameAnalysis, PoseLandmark } from './visionProvider';

// CDN base for WASM + model — avoids Vite bundling issues and works in Safari iOS 16+
const WASM_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.34/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task';

export class MediaPipeProvider implements IVisionProvider {
  private landmarker: PoseLandmarker | null = null;
  private ready = false;
  private lastTimestamp = -1;

  async initialize(): Promise<void> {
    try {
      const vision = await FilesetResolver.forVisionTasks(WASM_CDN);

      this.landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: MODEL_URL,
          // CPU delegate is more reliable across Safari iOS 16+ than GPU
          delegate: 'CPU',
        },
        runningMode: 'VIDEO',
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      this.ready = true;
    } catch (err) {
      console.error('[MediaPipeProvider] initialize failed:', err);
      throw err;
    }
  }

  isReady(): boolean {
    return this.ready;
  }

  async analyzeFrame(videoElement: HTMLVideoElement): Promise<FrameAnalysis> {
    if (!this.landmarker || !this.ready) {
      return { poseDetected: false, timestamp: performance.now() };
    }

    const now = performance.now();

    // MediaPipe VIDEO mode requires strictly increasing timestamps
    if (now <= this.lastTimestamp) {
      return { poseDetected: false, timestamp: now };
    }
    this.lastTimestamp = now;

    let mpResult: PoseLandmarkerResult;
    try {
      mpResult = this.landmarker.detectForVideo(videoElement, now);
    } catch {
      return { poseDetected: false, timestamp: now };
    }

    if (!mpResult.landmarks || mpResult.landmarks.length === 0) {
      return { poseDetected: false, timestamp: now };
    }

    const raw = mpResult.landmarks[0];
    const landmarks: PoseLandmark[] = raw.map((lm) => ({
      x: lm.x,
      y: lm.y,
      z: lm.z,
      visibility: lm.visibility ?? 0,
    }));

    // Derive overall confidence from key-landmark visibility average
    const keyIndices = [0, 11, 12, 23, 24, 27, 28];
    const confidence =
      keyIndices.reduce((sum, i) => sum + (landmarks[i]?.visibility ?? 0), 0) /
      keyIndices.length;

    return {
      poseDetected: true,
      result: { landmarks, confidence },
      timestamp: now,
    };
  }

  destroy(): void {
    try {
      this.landmarker?.close();
    } catch {
      // ignore
    }
    this.landmarker = null;
    this.ready = false;
  }
}
