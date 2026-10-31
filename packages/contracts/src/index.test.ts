import { describe, expect, it } from "vitest";
import { SHAPE_LABELS, SHAPE_LABEL_IDS, assertDrawing, assertNormalizedPoint, withStrokes } from "./index.js";

describe("drawing contracts", () => {
  it("keeps the classifier ids stable", () => {
    expect(SHAPE_LABELS).toEqual(["circle", "square", "triangle"]);
    expect(SHAPE_LABEL_IDS).toEqual({ circle: 0, square: 1, triangle: 2 });
  });
  it("rejects invalid points and revisions", () => {
    expect(() => assertNormalizedPoint({ x: Number.NaN, y: 0 })).toThrow(RangeError);
    expect(() => assertNormalizedPoint({ x: 1.01, y: 0 })).toThrow(RangeError);
    expect(() => assertDrawing({ revision: -1, strokes: [] })).toThrow(RangeError);
  });
  it("increments revision for each visual mutation", () => {
    const drawing = withStrokes({ revision: 4, strokes: [] }, [{ id: "s1", points: [{ x: 0, y: 1 }] }]);
    expect(drawing.revision).toBe(5);
  });
});
