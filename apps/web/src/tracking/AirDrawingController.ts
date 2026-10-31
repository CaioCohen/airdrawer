import type { Drawing, Point2D } from "@airdraw/contracts";
import { StrokeController } from "../drawing/StrokeController";
import type { HandLandmark } from "./HandTracker";
import { CoordinateMapper, type MappingViewport } from "./CoordinateMapper";
import { PinchDetector, type PinchState } from "./PinchDetector";

export interface AirDrawingUpdate {
  readonly cursor: Point2D | null;
  readonly pinchState: PinchState;
  readonly drawing: Drawing;
  readonly drawingChanged: boolean;
}

export interface AirDrawingOptions {
  readonly smoothingAlpha?: number;
  readonly maxJump?: number;
}

/** Converts a landmark stream into isolated strokes owned by the shared controller. */
export class AirDrawingController {
  private readonly pinch = new PinchDetector();
  private readonly mapper = new CoordinateMapper({ mirrored: true, objectFit: "cover" });
  private readonly smoothingAlpha: number;
  private readonly maxJump: number;
  private cursor: Point2D | null = null;
  private ownsStroke = false;
  private transition = false;

  constructor(private readonly strokes: StrokeController, { smoothingAlpha = 0.55, maxJump = 0.3 }: AirDrawingOptions = {}) {
    if (!Number.isFinite(smoothingAlpha) || smoothingAlpha <= 0 || smoothingAlpha > 1 || !Number.isFinite(maxJump) || maxJump <= 0) throw new RangeError("Invalid air-drawing smoothing options.");
    this.smoothingAlpha = smoothingAlpha;
    this.maxJump = maxJump;
  }

  update(landmarks: readonly HandLandmark[] | null, viewport: MappingViewport): AirDrawingUpdate {
    this.transition = false;
    const gesture = this.pinch.update(landmarks);
    if (gesture.state === "NO_HAND") {
      const drawingChanged = this.finishStroke();
      this.cursor = null;
      return { cursor: null, pinchState: gesture.state, drawing: this.strokes.getDrawing(), drawingChanged };
    }
    const mapped = this.mapper.mapIndexTip(landmarks, viewport);
    const cursor = mapped ? this.smooth(mapped) : this.cursor;
    let drawingChanged = false;
    if (gesture.state === "DRAWING" && cursor) {
      const before = this.strokes.getDrawing().revision;
      if (!this.ownsStroke) { this.strokes.begin(cursor); this.ownsStroke = true; this.transition = true; }
      else this.strokes.add(cursor);
      drawingChanged = this.strokes.getDrawing().revision !== before;
    } else if (gesture.state === "HOVER") drawingChanged = this.finishStroke();
    return { cursor, pinchState: gesture.state, drawing: this.strokes.getDrawing(), drawingChanged };
  }

  stop(): Drawing {
    this.finishStroke();
    this.pinch.reset();
    this.cursor = null;
    return this.strokes.getDrawing();
  }

  /** True only once per begin/end boundary; point additions stay imperative. */
  isDrawingTransition(): boolean { return this.transition; }

  private smooth(next: Point2D): Point2D | null {
    if (!this.cursor) return this.cursor = next;
    if (Math.hypot(next.x - this.cursor.x, next.y - this.cursor.y) > this.maxJump) return null;
    this.cursor = {
      x: this.smoothingAlpha * next.x + (1 - this.smoothingAlpha) * this.cursor.x,
      y: this.smoothingAlpha * next.y + (1 - this.smoothingAlpha) * this.cursor.y,
    };
    return this.cursor;
  }

  private finishStroke(): boolean {
    if (!this.ownsStroke) return false;
    this.strokes.end();
    this.ownsStroke = false;
    this.transition = true;
    return false;
  }
}
