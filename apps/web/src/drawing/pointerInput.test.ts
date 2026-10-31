import { describe, expect, it } from "vitest";
import { isCompatiblePoint, normalizedCanvasPoint } from "./pointerInput";

describe("pointer input", () => {
  const canvas = { getBoundingClientRect: () => new DOMRect(10, 20, 200, 100) } as unknown as HTMLCanvasElement;
  it("normalizes mouse, pen, and touch-compatible pointer coordinates", () => {
    expect(normalizedCanvasPoint({ clientX: 110, clientY: 70 }, canvas)).toEqual({ x: .5, y: .5 });
    expect(normalizedCanvasPoint({ clientX: 9, clientY: 70 }, canvas)).toBeNull();
    expect(normalizedCanvasPoint({ clientX: Number.NaN, clientY: 70 }, canvas)).toBeNull();
  });
  it("rejects incompatible jumps without interpolating across a stroke", () => {
    expect(isCompatiblePoint({ x: .1, y: .1 }, { x: .2, y: .2 })).toBe(true);
    expect(isCompatiblePoint({ x: .1, y: .1 }, { x: .9, y: .9 })).toBe(false);
  });
});
