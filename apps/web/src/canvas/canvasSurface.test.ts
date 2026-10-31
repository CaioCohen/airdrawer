import { describe, expect, it } from "vitest";
import { resizeCanvasToDisplaySize } from "./canvasSurface";

describe("resizeCanvasToDisplaySize", () => {
  it("keeps CSS dimensions while sizing its backing store for DPR 2", () => {
    const canvas = { width: 0, height: 0, getBoundingClientRect: () => ({ width: 320, height: 240 }) } as unknown as HTMLCanvasElement;
    expect(resizeCanvasToDisplaySize(canvas, 2)).toEqual({ cssWidth: 320, cssHeight: 240, pixelWidth: 640, pixelHeight: 480, devicePixelRatio: 2 });
    expect([canvas.width, canvas.height]).toEqual([640, 480]);
  });
});
