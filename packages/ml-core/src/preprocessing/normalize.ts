import { assertDrawing, type Drawing, type Point2D } from "@airdraw/contracts";

export const PREPROCESS_SIZE = 32;
export const PREPROCESS_MARGIN = 0.125;
export const MIN_INK_LENGTH = 1e-4;

export interface NormalizedPoint { readonly x: number; readonly y: number; }
export interface NormalizedSegment { readonly from: NormalizedPoint; readonly to: NormalizedPoint; }
export interface NormalizedDrawing {
  readonly segments: readonly NormalizedSegment[];
  readonly sourceBounds: Readonly<{ minX: number; minY: number; maxX: number; maxY: number }>;
}

export type NormalizeResult =
  | { readonly kind: "empty"; readonly reason: "no-ink" | "too-short" }
  | { readonly kind: "ready"; readonly drawing: NormalizedDrawing };

/**
 * Fits only the currently visible, non-degenerate stroke segments into the
 * classifier grid. Coordinates are expressed in pixel-center space [0, 31].
 */
export function normalize(drawing: Drawing): NormalizeResult {
  assertDrawing(drawing);
  if (drawing.strokes.length === 0) return { kind: "empty", reason: "no-ink" };

  const sourceSegments: Array<{ from: Point2D; to: Point2D }> = [];
  let hasPoint = false;
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const stroke of drawing.strokes) {
    for (let index = 1; index < stroke.points.length; index += 1) {
      const from = stroke.points[index - 1]!;
      const to = stroke.points[index]!;
      hasPoint = true;
      if (Math.hypot(to.x - from.x, to.y - from.y) < MIN_INK_LENGTH) continue;
      sourceSegments.push({ from, to });
      minX = Math.min(minX, from.x, to.x);
      minY = Math.min(minY, from.y, to.y);
      maxX = Math.max(maxX, from.x, to.x);
      maxY = Math.max(maxY, from.y, to.y);
    }
    if (stroke.points.length > 0) hasPoint = true;
  }
  if (!hasPoint) return { kind: "empty", reason: "no-ink" };
  if (sourceSegments.length === 0) return { kind: "empty", reason: "too-short" };

  const sourceBounds = { minX, minY, maxX, maxY };
  const span = Math.max(maxX - minX, maxY - minY);
  // All retained segments have measurable length, so span is safely positive.
  const scale = (PREPROCESS_SIZE - 1) / (span * (1 + PREPROCESS_MARGIN * 2));
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const targetCenter = (PREPROCESS_SIZE - 1) / 2;
  const project = (point: Point2D): NormalizedPoint => ({
    x: (point.x - centerX) * scale + targetCenter,
    y: (point.y - centerY) * scale + targetCenter,
  });

  return {
    kind: "ready",
    drawing: { segments: sourceSegments.map(({ from, to }) => ({ from: project(from), to: project(to) })), sourceBounds },
  };
}
