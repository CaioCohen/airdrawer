import type { Point2D } from "@airdraw/contracts";
import type { HandLandmark } from "./HandTracker";

export interface CoordinateMapperOptions {
  readonly mirrored?: boolean;
  readonly objectFit?: "cover" | "contain";
}

export interface MappingViewport {
  readonly sourceWidth: number;
  readonly sourceHeight: number;
  readonly viewportWidth: number;
  readonly viewportHeight: number;
}

/** Maps MediaPipe's source-video coordinates into the visible camera crop. */
export class CoordinateMapper {
  private readonly mirrored: boolean;
  private readonly objectFit: "cover" | "contain";

  constructor({ mirrored = true, objectFit = "cover" }: CoordinateMapperOptions = {}) {
    this.mirrored = mirrored;
    this.objectFit = objectFit;
  }

  mapIndexTip(landmarks: readonly HandLandmark[] | null, viewport: MappingViewport): Point2D | null {
    return this.mapPoint(landmarks?.[8], viewport);
  }

  mapPoint(point: HandLandmark | undefined, viewport: MappingViewport): Point2D | null {
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y) || point.x < 0 || point.x > 1 || point.y < 0 || point.y > 1) return null;
    const { sourceWidth, sourceHeight, viewportWidth, viewportHeight } = viewport;
    if (![sourceWidth, sourceHeight, viewportWidth, viewportHeight].every((value) => Number.isFinite(value) && value > 0)) return null;
    const scale = this.objectFit === "cover"
      ? Math.max(viewportWidth / sourceWidth, viewportHeight / sourceHeight)
      : Math.min(viewportWidth / sourceWidth, viewportHeight / sourceHeight);
    const renderedWidth = sourceWidth * scale;
    const renderedHeight = sourceHeight * scale;
    let x = (point.x * renderedWidth - (renderedWidth - viewportWidth) / 2) / viewportWidth;
    let y = (point.y * renderedHeight - (renderedHeight - viewportHeight) / 2) / viewportHeight;
    if (x < 0 || x > 1 || y < 0 || y > 1) return null;
    // Arithmetic around a crop boundary can produce a tiny positive/negative
    // residue; normalized storage should retain exact board extremes.
    x = Math.abs(x) < 1e-12 ? 0 : Math.abs(1 - x) < 1e-12 ? 1 : x;
    y = Math.abs(y) < 1e-12 ? 0 : Math.abs(1 - y) < 1e-12 ? 1 : y;
    if (this.mirrored) x = 1 - x;
    return { x, y };
  }
}
