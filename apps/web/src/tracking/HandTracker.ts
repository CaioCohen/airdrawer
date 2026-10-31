export type HandLandmark = Readonly<{ x: number; y: number; z?: number }>;
export type TrackingState = "detected" | "not-detected";

export interface HandTrackingResult {
  readonly state: TrackingState;
  readonly landmarks: readonly HandLandmark[] | null;
}

export interface HandLandmarkerInstance {
  detectForVideo(video: HTMLVideoElement, timestampMs: number): { landmarks: HandLandmark[][] };
  close(): void;
}

export type HandLandmarkerFactory = () => Promise<HandLandmarkerInstance>;

const WASM_ROOT = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm";
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

async function createMediaPipeLandmarker(): Promise<HandLandmarkerInstance> {
  const { FilesetResolver, HandLandmarker } = await import("@mediapipe/tasks-vision");
  const fileset = await FilesetResolver.forVisionTasks(WASM_ROOT);
  return HandLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: MODEL_URL },
    runningMode: "VIDEO",
    numHands: 1,
  });
}

/**
 * Browser-local wrapper around MediaPipe. It keeps only the latest ephemeral
 * result so a canvas can be repainted between video frames; it never retains
 * video frames or sends landmarks anywhere.
 */
export class HandTracker {
  private detector: HandLandmarkerInstance | null = null;
  private initialization: Promise<void> | null = null;
  private lastVideoTime = -1;
  private lastTimestamp = -1;
  private lifecycle = 0;
  private lastResult: HandTrackingResult = { state: "not-detected", landmarks: null };

  constructor(private readonly createDetector: HandLandmarkerFactory = createMediaPipeLandmarker) {}

  get isReady(): boolean { return this.detector !== null; }

  initialize(): Promise<void> {
    if (this.detector) return Promise.resolve();
    if (!this.initialization) {
      const lifecycle = this.lifecycle;
      this.initialization = this.createDetector().then((detector) => {
        if (lifecycle !== this.lifecycle) { detector.close(); return; }
        this.detector = detector;
      }).catch((error: unknown) => {
        this.initialization = null;
        throw error;
      });
    }
    return this.initialization;
  }

  detect(video: HTMLVideoElement, timestampMs: number): HandTrackingResult | null {
    if (!this.detector) return null;
    // currentTime identifies decoded frames. Avoid calling the synchronous API
    // twice when requestAnimationFrame runs faster than the video source.
    if (video.currentTime === this.lastVideoTime) return this.lastResult;
    const timestamp = Math.max(timestampMs, this.lastTimestamp + 0.001);
    const detected = this.detector.detectForVideo(video, timestamp);
    this.lastVideoTime = video.currentTime;
    this.lastTimestamp = timestamp;
    const landmarks = detected.landmarks[0] ?? null;
    this.lastResult = landmarks?.length === 21
      ? { state: "detected", landmarks }
      : { state: "not-detected", landmarks: null };
    return this.lastResult;
  }

  close(): void {
    this.lifecycle += 1;
    this.detector?.close();
    this.detector = null;
    this.initialization = null;
    this.lastVideoTime = -1;
    this.lastTimestamp = -1;
    this.lastResult = { state: "not-detected", landmarks: null };
  }
}
