import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { ReferencePanel } from "./references/ReferencePanel";
afterEach(() => { cleanup(); vi.restoreAllMocks(); window.localStorage.clear(); });
describe("initial screen", () => { it("renders two canvases", () => { render(<App />); expect(screen.getByLabelText("Prévia da webcam").tagName).toBe("CANVAS"); expect(screen.getByLabelText("Lousa de desenho").tagName).toBe("CANVAS"); }); });

describe("reference saving", () => {
  it("requires ink and explicit confirmation before enabling local save", () => {
    const drawing = { revision: 1, strokes: [{ id: "stroke-1", points: [{ x: .1, y: .1 }] }] };
    const { rerender } = render(<ReferencePanel drawing={{ revision: 0, strokes: [] }} mode="mouse" onLoad={() => undefined} exportPng={async () => null} />);
    const save = screen.getByRole("button", { name: "Salvar localmente" }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    rerender(<ReferencePanel drawing={drawing} mode="mouse" onLoad={() => undefined} exportPng={async () => null} />);
    expect(save.disabled).toBe(true);
    fireEvent.click(screen.getByLabelText(/Confirmo que quero salvar os traços/));
    expect(save.disabled).toBe(false);
  });
});
