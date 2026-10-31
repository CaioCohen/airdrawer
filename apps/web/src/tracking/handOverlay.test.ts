import { describe, expect, it, vi } from "vitest";
import { drawHandOverlay } from "./handOverlay";
import type { HandLandmark } from "./HandTracker";

const landmarks = Array.from({ length: 21 }, (_, index) => ({ x: index / 25, y: index / 30 })) satisfies HandLandmark[];

function contextFixture() {
  return { save: vi.fn(), restore: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(), fill: vi.fn(), arc: vi.fn() } as unknown as CanvasRenderingContext2D;
}

describe("drawHandOverlay", () => {
  it("renders landmarks and the index cursor only while a hand is present", () => {
    const context = contextFixture(); const canvas = { width: 400, height: 300 } as HTMLCanvasElement;
    drawHandOverlay(context, canvas, { state: "detected", landmarks });
    expect(context.arc).toHaveBeenCalledTimes(22);
    expect(context.moveTo).toHaveBeenCalledTimes(21);
    const noHand = contextFixture();
    drawHandOverlay(noHand, canvas, { state: "not-detected", landmarks: null });
    expect(noHand.arc).not.toHaveBeenCalled();
  });
});
