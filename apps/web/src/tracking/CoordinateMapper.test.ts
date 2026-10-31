import { describe, expect, it } from "vitest";
import { CoordinateMapper } from "./CoordinateMapper";

const tip = (x: number, y: number) => Array.from({ length: 21 }, (_, index) => index === 8 ? { x, y } : { x: .5, y: .5 });
const fourByThree = { sourceWidth: 400, sourceHeight: 300, viewportWidth: 400, viewportHeight: 300 };

describe("CoordinateMapper", () => {
  it("maps centre and all visible extremes, including mirrored x", () => {
    const normal = new CoordinateMapper({ mirrored: false });
    const mirrored = new CoordinateMapper({ mirrored: true });
    expect(normal.mapIndexTip(tip(.5, .5), fourByThree)).toEqual({ x: .5, y: .5 });
    expect(normal.mapIndexTip(tip(0, 0), fourByThree)).toEqual({ x: 0, y: 0 });
    expect(normal.mapIndexTip(tip(1, 0), fourByThree)).toEqual({ x: 1, y: 0 });
    expect(normal.mapIndexTip(tip(0, 1), fourByThree)).toEqual({ x: 0, y: 1 });
    expect(normal.mapIndexTip(tip(1, 1), fourByThree)).toEqual({ x: 1, y: 1 });
    expect(mirrored.mapIndexTip(tip(0, .5), fourByThree)).toEqual({ x: 1, y: .5 });
  });

  it("accounts for a cover crop instead of assuming video and canvas share an aspect ratio", () => {
    const mapper = new CoordinateMapper({ mirrored: false, objectFit: "cover" });
    const viewport = { sourceWidth: 1600, sourceHeight: 900, viewportWidth: 400, viewportHeight: 300 };
    expect(mapper.mapIndexTip(tip(.5, .5), viewport)).toEqual({ x: .5, y: .5 });
    expect(mapper.mapIndexTip(tip(.125, .5), viewport)).toEqual({ x: 0, y: .5 });
    expect(mapper.mapIndexTip(tip(.875, .5), viewport)).toEqual({ x: 1, y: .5 });
    expect(mapper.mapIndexTip(tip(.05, .5), viewport)).toBeNull();
  });
});
