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

import type { IVisionProvider, FrameAnalysis, PoseLandmark, SegMask } from './visionProvider';

// Local bundled assets — work 100% offline, faster cold start, no network dependency.
// import.meta.env.BASE_URL is '/' by default; in the packaged app the WebView serves from
// https://localhost/ (Android) or capacitor://localhost/ (iOS), so '/mediapipe/...' resolves
// directly from the bundle inside the APK/IPA.
const LOCAL_WASM  = `${import.meta.env.BASE_URL}mediapipe/wasm`;
const LOCAL_MODEL = `${import.meta.env.BASE_URL}mediapipe/pose_landmarker_lite.task`;

// CDN fallback — used ONLY if the local assets fail to load (defensive; keeps the feature
// working even if a bundled asset path ever breaks).
const CDN_WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.34/wasm';
const CDN_MODEL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task';

export class MediaPipeProvider implements IVisionProvider {
  private landmarker: PoseLandmarker | null = null;
  private ready = false;
  private lastTimestamp = -1;

  async initialize(): Promise<void> {
    // Local-first: try bundled assets, fall back to CDN only if they fail.
    try {
      await this._createFrom(LOCAL_WASM, LOCAL_MODEL);
      this.ready = true;
    } catch (localErr) {
      console.warn('[MediaPipeProvider] local assets failed, falling back to CDN:', localErr);
      try {
        await this._createFrom(CDN_WASM, CDN_MODEL);
        this.ready = true;
      } catch (cdnErr) {
        console.error('[MediaPipeProvider] initialize failed (local + CDN):', cdnErr);
        throw cdnErr;
      }
    }
  }

  /** Create the PoseLandmarker from a given WASM directory + model path. */
  private async _createFrom(wasmPath: string, modelPath: string): Promise<void> {
    const vision = await FilesetResolver.forVisionTasks(wasmPath);
    this.landmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: modelPath,
        // CPU delegate is more reliable across Safari iOS 16+ than GPU
        delegate: 'CPU',
      },
      runningMode: 'VIDEO',
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
      // Person silhouette — measured directly for true widths/depths (see SegMask).
      outputSegmentationMasks: true,
    });
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

    // Copy the segmentation mask out of MediaPipe's recycled buffer, then free it.
    let mask: SegMask | undefined;
    const mpMask = mpResult.segmentationMasks?.[0];
    if (mpMask) {
      try {
        const src = mpMask.getAsFloat32Array();
        mask = { data: new Float32Array(src), width: mpMask.width, height: mpMask.height };
      } catch {
        /* mask unavailable this frame — measurements fall back to BMI depth ratios */
      } finally {
        mpMask.close();
      }
    }

    return {
      poseDetected: true,
      result: { landmarks, confidence, mask },
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
