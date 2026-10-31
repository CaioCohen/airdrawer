import { describe, expect, it } from "vitest";
import { StrokeController } from "./StrokeController";

describe("StrokeController", () => {
  it("creates separate stable strokes and increments revision only for visible ink", () => {
    const controller = new StrokeController();
    expect(controller.getDrawing()).toEqual({ revision: 0, strokes: [] });
    controller.begin({ x: .1, y: .2 });
    controller.add({ x: .2, y: .3 });
    expect(controller.end().revision).toBe(2);
    controller.begin({ x: .8, y: .7 });
    const drawing = controller.end();
    expect(drawing.revision).toBe(3);
    expect(drawing.strokes.map((stroke) => stroke.id)).toEqual(["stroke-1", "stroke-2"]);
    expect(drawing.strokes.map((stroke) => stroke.points.length)).toEqual([2, 1]);
  });

  it("ends a cancelled interaction without joining a later stroke", () => {
    const controller = new StrokeController();
    controller.begin({ x: .1, y: .1 });
    controller.add({ x: .2, y: .2 });
    controller.end();
    controller.begin({ x: .8, y: .8 });
    const drawing = controller.end();
    expect(drawing.strokes).toHaveLength(2);
    expect(drawing.strokes[0].points.at(-1)).toEqual({ x: .2, y: .2 });
    expect(drawing.strokes[1].points[0]).toEqual({ x: .8, y: .8 });
  });

  it("undoes whole strokes and clears all ink", () => {
    const controller = new StrokeController();
    controller.begin({ x: .1, y: .1 }); controller.end();
    controller.begin({ x: .8, y: .8 }); controller.end();
    expect(controller.undo()).toMatchObject({ revision: 3, strokes: [{ id: "stroke-1" }] });
    expect(controller.clear()).toEqual({ revision: 4, strokes: [] });
    expect(controller.clear().revision).toBe(4);
  });

  it("never reuses an existing id supplied by a saved drawing", () => {
    const controller = new StrokeController({ revision: 4, strokes: [{ id: "stroke-1", points: [{ x: .5, y: .5 }] }] });
    expect(controller.begin({ x: .2, y: .2 }).strokes[1].id).toBe("stroke-2");
  });
});
