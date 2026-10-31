import type { Point2D } from "@airdraw/contracts";

/** Converts CSS-pixel input into Drawing's normalized coordinate system. */
export function normalizedCanvasPoint(event: Pick<PointerEvent, "clientX" | "clientY">, canvas: HTMLCanvasElement): Point2D | null {
  const bounds = canvas.getBoundingClientRect();
  if (bounds.width <= 0 || bounds.height <= 0) return null;
  const point = { x: (event.clientX - bounds.left) / bounds.width, y: (event.clientY - bounds.top) / bounds.height };
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y) || point.x < 0 || point.x > 1 || point.y < 0 || point.y > 1) return null;
  return point;
}

export function isCompatiblePoint(previous: Point2D | null, next: Point2D, maxDistance = 0.3): boolean {
  return !previous || Math.hypot(next.x - previous.x, next.y - previous.y) <= maxDistance;
}
