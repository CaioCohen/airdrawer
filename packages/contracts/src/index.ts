/** Fixed, serialized order used by training, model artifacts, and the browser. */
export const SHAPE_LABELS = ["circle", "square", "triangle"] as const;
export type ShapeLabel = (typeof SHAPE_LABELS)[number];
export const SHAPE_LABEL_IDS: Readonly<Record<ShapeLabel, number>> = {
  circle: 0,
  square: 1,
  triangle: 2,
};

export interface Point2D { readonly x: number; readonly y: number; }
export interface Stroke { readonly id: string; readonly points: readonly Point2D[]; }
export interface Drawing {
  /** Monotonically increases whenever visible strokes change. */
  readonly revision: number;
  readonly strokes: readonly Stroke[];
}
export interface PreprocessResult {
  readonly tensor: Float32Array;
  readonly shape: readonly [1, 32, 32];
  readonly hasInk: boolean;
}

export function assertNormalizedPoint(point: Point2D): asserts point is Point2D {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y) || point.x < 0 || point.x > 1 || point.y < 0 || point.y > 1) {
    throw new RangeError("Drawing points must be finite coordinates in the [0, 1] interval.");
  }
}

export function assertDrawing(drawing: Drawing): asserts drawing is Drawing {
  if (!Number.isSafeInteger(drawing.revision) || drawing.revision < 0) {
    throw new RangeError("Drawing revision must be a non-negative safe integer.");
  }
  for (const stroke of drawing.strokes) {
    if (!stroke.id) throw new TypeError("Every stroke requires a stable id.");
    for (const point of stroke.points) assertNormalizedPoint(point);
  }
}

/** Returns a new immutable drawing after a visual mutation. */
export function withStrokes(drawing: Drawing, strokes: readonly Stroke[]): Drawing {
  assertDrawing(drawing);
  const next: Drawing = { revision: drawing.revision + 1, strokes };
  assertDrawing(next);
  return next;
}
