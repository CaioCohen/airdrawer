import { describe, expect, it } from "vitest";
import { REFERENCE_STORAGE_KEY, createReference, loadReferences, parseReference, saveReferences } from "./referenceStore";

const drawing = { revision: 3, strokes: [{ id: "stroke-1", points: [{ x: 0.1, y: 0.2 }, { x: 0.8, y: 0.9 }] }] };

describe("drawing references", () => {
  it("round-trips a versioned drawing reference without media fields", () => {
    const reference = createReference(drawing, "triangle", "mouse", "2026-01-02T03:04:05.000Z");
    expect(parseReference(JSON.stringify(reference))).toEqual(reference);
    expect(JSON.stringify(reference)).not.toMatch(/video|frame|landmark/i);
  });

  it("rejects unsupported fields, labels and non-finite points", () => {
    expect(() => parseReference(JSON.stringify({ ...createReference(drawing, "circle", "camera"), video: "forbidden" }))).toThrow(/campos não permitidos/);
    expect(() => parseReference(JSON.stringify({ ...createReference(drawing, "circle", "camera"), label: "hexagon" }))).toThrow(/rótulo/);
    expect(() => parseReference('{"schemaVersion":1,"kind":"airdraw-reference","createdAt":"2026-01-02T03:04:05.000Z","inputMode":"mouse","logicalSize":{"width":1,"height":1},"drawing":{"revision":1,"strokes":[{"id":"a","points":[{"x":null,"y":0}]}]}}')).toThrow(/pontos/);
  });

  it("keeps local references independent from a cleared drawing", () => {
    const storage = window.localStorage; storage.clear();
    const reference = createReference(drawing, "square", "mouse");
    saveReferences(storage, [reference]);
    expect(loadReferences(storage)).toEqual([reference]);
    expect(storage.getItem(REFERENCE_STORAGE_KEY)).toContain("square");
  });
});
