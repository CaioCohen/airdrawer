import { describe, expect, it } from "vitest";
import { StrokeController } from "../drawing/StrokeController";
import type { HandLandmark } from "./HandTracker";
import { AirDrawingController } from "./AirDrawingController";

function hand(x: number, y: number, ratio: number): HandLandmark[] {
  const points = Array.from({ length: 21 }, () => ({ x: .5, y: .5 }));
  points[0] = { x: .4, y: .5 }; points[9] = { x: .8, y: .5 };
  points[4] = { x: .4, y: .3 }; points[8] = { x, y };
  // Preserve the requested cursor while putting the thumb at the ratio distance.
  points[4] = { x: x - ratio * .4, y };
  return points;
}
const viewport = { sourceWidth: 400, sourceHeight: 300, viewportWidth: 400, viewportHeight: 300 };

describe("AirDrawingController", () => {
  it("feeds the shared controller and never bridges a lost hand to its return", () => {
    const strokes = new StrokeController();
    const air = new AirDrawingController(strokes, { smoothingAlpha: 1 });
    air.update(hand(.8, .2, .2), viewport);
    air.update(hand(.7, .25, .2), viewport);
    air.update(null, viewport);
    air.update(hand(.2, .8, .2), viewport);
    air.update(hand(.15, .8, .2), viewport);
    const drawing = strokes.getDrawing();
    expect(drawing.strokes).toHaveLength(2);
    expect(drawing.strokes.map((stroke) => stroke.points.length)).toEqual([2, 2]);
    expect(drawing.strokes[0].points.at(-1)).not.toEqual(drawing.strokes[1].points[0]);
  });

  it("moves a cursor while hovering without creating ink", () => {
    const strokes = new StrokeController();
    const update = new AirDrawingController(strokes, { smoothingAlpha: 1 }).update(hand(.7, .3, .5), viewport);
    expect(update.cursor).toEqual({ x: .30000000000000004, y: .3 });
    expect(strokes.getDrawing().strokes).toHaveLength(0);
  });

  it("rejects an abrupt landmark jump within an active stroke", () => {
    const strokes = new StrokeController();
    const air = new AirDrawingController(strokes, { smoothingAlpha: 1, maxJump: .2 });
    air.update(hand(.7, .3, .2), viewport);
    air.update(hand(.1, .9, .2), viewport);
    expect(strokes.getDrawing().strokes[0].points).toHaveLength(1);
  });
});
