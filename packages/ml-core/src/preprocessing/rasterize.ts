import { PREPROCESS_SIZE, type NormalizedSegment } from "./normalize.js";

export const RASTER_SUPERSAMPLE = 2;
export const STROKE_RADIUS = 1.25;

/** Rasterizes each supplied segment independently; callers must never join strokes. */
export function rasterize(segments: readonly NormalizedSegment[]): Float32Array {
  const output = new Float32Array(PREPROCESS_SIZE * PREPROCESS_SIZE);
  for (let y = 0; y < PREPROCESS_SIZE; y += 1) {
    for (let x = 0; x < PREPROCESS_SIZE; x += 1) {
      let coveredSamples = 0;
      for (let sampleY = 0; sampleY < RASTER_SUPERSAMPLE; sampleY += 1) {
        for (let sampleX = 0; sampleX < RASTER_SUPERSAMPLE; sampleX += 1) {
          const px = x - 0.5 + (sampleX + 0.5) / RASTER_SUPERSAMPLE;
          const py = y - 0.5 + (sampleY + 0.5) / RASTER_SUPERSAMPLE;
          if (segments.some((segment) => distanceToSegment(px, py, segment) <= STROKE_RADIUS)) coveredSamples += 1;
        }
      }
      output[y * PREPROCESS_SIZE + x] = coveredSamples / (RASTER_SUPERSAMPLE * RASTER_SUPERSAMPLE);
    }
  }
  return output;
}

function distanceToSegment(x: number, y: number, segment: NormalizedSegment): number {
  const dx = segment.to.x - segment.from.x;
  const dy = segment.to.y - segment.from.y;
  const lengthSquared = dx * dx + dy * dy;
  const projection = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((x - segment.from.x) * dx + (y - segment.from.y) * dy) / lengthSquared));
  return Math.hypot(x - (segment.from.x + projection * dx), y - (segment.from.y + projection * dy));
}
