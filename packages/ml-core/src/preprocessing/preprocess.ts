import type { Drawing, PreprocessResult } from "@airdraw/contracts";
import { normalize } from "./normalize.js";
import { rasterize } from "./rasterize.js";

/** Bump this whenever normalization or rasterization semantics change. */
export const PREPROCESS_VERSION = "1.0.0";

/** Pure, isomorphic Drawing-to-[1,32,32] preprocessing used by training and browsers. */
export function preprocessDrawing(drawing: Drawing): PreprocessResult {
  const normalized = normalize(drawing);
  if (normalized.kind === "empty") return normalized;
  const tensor = rasterize(normalized.drawing.segments);
  let ink = 0;
  for (let index = 0; index < tensor.length; index += 1) {
    const value = tensor[index]!;
    if (!Number.isFinite(value) || value < 0 || value > 1) throw new Error(`Preprocessing produced invalid tensor value ${value} at ${index}.`);
    ink += value;
  }
  if (ink === 0) return { kind: "empty", reason: "too-short" };
  return { kind: "ready", tensor, width: 32, height: 32, inkFraction: ink / tensor.length };
}
