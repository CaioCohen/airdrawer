import type { HandLandmark } from "./HandTracker";

export type PinchState = "NO_HAND" | "HOVER" | "DRAWING";

export interface PinchUpdate {
  readonly state: PinchState;
  readonly previousState: PinchState;
  readonly ratio: number | null;
}

export interface PinchDetectorOptions {
  readonly startRatio?: number;
  readonly endRatio?: number;
}

const distance = (a: HandLandmark, b: HandLandmark) => Math.hypot(a.x - b.x, a.y - b.y);

/**
 * Gesture state is deliberately independent from rendering and drawing.  The
 * two thresholds implement hysteresis so jitter close to a closed pinch does
 * not repeatedly split a stroke.
 */
export class PinchDetector {
  private state: PinchState = "NO_HAND";
  private readonly startRatio: number;
  private readonly endRatio: number;

  constructor({ startRatio = 0.25, endRatio = 0.35 }: PinchDetectorOptions = {}) {
    if (!Number.isFinite(startRatio) || !Number.isFinite(endRatio) || startRatio <= 0 || endRatio < startRatio) {
      throw new RangeError("Pinch thresholds must be finite, positive, and ordered.");
    }
    this.startRatio = startRatio;
    this.endRatio = endRatio;
  }

  get currentState(): PinchState { return this.state; }

  update(landmarks: readonly HandLandmark[] | null): PinchUpdate {
    const previousState = this.state;
    const ratio = this.pinchRatio(landmarks);
    if (ratio === null) this.state = "NO_HAND";
    else if (this.state === "NO_HAND") this.state = ratio <= this.startRatio ? "DRAWING" : "HOVER";
    else if (this.state === "HOVER" && ratio <= this.startRatio) this.state = "DRAWING";
    else if (this.state === "DRAWING" && ratio >= this.endRatio) this.state = "HOVER";
    return { state: this.state, previousState, ratio };
  }

  reset(): void { this.state = "NO_HAND"; }

  private pinchRatio(landmarks: readonly HandLandmark[] | null): number | null {
    if (!landmarks || landmarks.length <= 9) return null;
    const [thumb, index, wrist, middle] = [landmarks[4], landmarks[8], landmarks[0], landmarks[9]];
    if (![thumb, index, wrist, middle].every((point) => point && Number.isFinite(point.x) && Number.isFinite(point.y))) return null;
    return distance(thumb, index) / Math.max(distance(wrist, middle), 1e-6);
  }
}
