import { assertDrawing, assertNormalizedPoint, type Drawing, type Point2D, withStrokes } from "@airdraw/contracts";

const EMPTY_DRAWING: Drawing = { revision: 0, strokes: [] };

/** Owns the interaction session while exposing immutable Drawing snapshots. */
export class StrokeController {
  private drawing: Drawing;
  private activeStrokeId: string | null = null;
  private nextStrokeId = 1;
  private readonly usedIds = new Set<string>();

  public constructor(initialDrawing: Drawing = EMPTY_DRAWING) {
    assertDrawing(initialDrawing);
    this.drawing = initialDrawing;
    for (const stroke of initialDrawing.strokes) this.usedIds.add(stroke.id);
  }
  public getDrawing(): Drawing { return this.drawing; }
  /** Replaces the visible drawing after a validated local-reference import. */
  public replaceDrawing(drawing: Drawing): Drawing {
    assertDrawing(drawing);
    this.activeStrokeId = null;
    this.drawing = drawing;
    this.usedIds.clear();
    for (const stroke of drawing.strokes) this.usedIds.add(stroke.id);
    return this.drawing;
  }
  public isDrawing(): boolean { return this.activeStrokeId !== null; }

  public begin(point: Point2D): Drawing {
    assertNormalizedPoint(point);
    if (this.activeStrokeId !== null) this.end();
    let id = `stroke-${this.nextStrokeId++}`;
    while (this.usedIds.has(id)) id = `stroke-${this.nextStrokeId++}`;
    this.usedIds.add(id);
    this.activeStrokeId = id;
    this.drawing = withStrokes(this.drawing, [...this.drawing.strokes, { id, points: [point] }]);
    return this.drawing;
  }

  public add(point: Point2D): Drawing {
    assertNormalizedPoint(point);
    if (this.activeStrokeId === null) return this.drawing;
    const index = this.drawing.strokes.length - 1;
    const active = this.drawing.strokes[index];
    if (!active || active.id !== this.activeStrokeId) return this.drawing;
    const previous = active.points.at(-1);
    if (previous?.x === point.x && previous.y === point.y) return this.drawing;
    const strokes = [...this.drawing.strokes];
    strokes[index] = { ...active, points: [...active.points, point] };
    this.drawing = withStrokes(this.drawing, strokes);
    return this.drawing;
  }

  /** Ends the current interaction without changing visible ink. */
  public end(): Drawing { this.activeStrokeId = null; return this.drawing; }
  public undo(): Drawing {
    this.activeStrokeId = null;
    if (this.drawing.strokes.length === 0) return this.drawing;
    this.drawing = withStrokes(this.drawing, this.drawing.strokes.slice(0, -1));
    return this.drawing;
  }
  public clear(): Drawing {
    this.activeStrokeId = null;
    if (this.drawing.strokes.length === 0) return this.drawing;
    this.drawing = withStrokes(this.drawing, []);
    return this.drawing;
  }
}
