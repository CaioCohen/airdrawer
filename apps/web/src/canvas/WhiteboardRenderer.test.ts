import { describe, expect, it, vi } from "vitest";
import type { Drawing } from "@airdraw/contracts";
import { renderWhiteboard } from "./WhiteboardRenderer";
function context() { return { setTransform: vi.fn(), clearRect: vi.fn(), fillRect: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), arc: vi.fn(), fill: vi.fn(), stroke: vi.fn(), lineWidth: 0 } as unknown as CanvasRenderingContext2D; }
const drawing: Drawing = { revision: 2, strokes: [{ id: "first", points: [{ x: .1, y: .2 }, { x: .3, y: .4 }] }, { id: "second", points: [{ x: .8, y: .7 }, { x: .9, y: .6 }] }] };
describe("renderWhiteboard", () => { it("redraws the same normalized Drawing after resize without joining strokes", () => {
  const first = context(); const second = context();
  renderWhiteboard(first, drawing, { cssWidth: 400, cssHeight: 300, pixelWidth: 400, pixelHeight: 300, devicePixelRatio: 1 });
  renderWhiteboard(second, drawing, { cssWidth: 800, cssHeight: 600, pixelWidth: 1600, pixelHeight: 1200, devicePixelRatio: 2 });
  expect(first.beginPath).toHaveBeenCalledTimes(2); expect(second.beginPath).toHaveBeenCalledTimes(2);
  expect(second.moveTo).toHaveBeenNthCalledWith(1, 80, 120); expect(second.moveTo).toHaveBeenNthCalledWith(2, 640, 420);
  expect(second.lineTo).not.toHaveBeenCalledWith(640, 420); expect(second.setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 0, 0);
}); });
