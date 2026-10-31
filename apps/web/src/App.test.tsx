import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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

  it("exports the board PNG through the local server with the selected label", async () => {
    const drawing = { revision: 1, strokes: [{ id: "stroke-1", points: [{ x: .1, y: .1 }] }] };
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ filename: "triangle-4.png" }) });
    vi.stubGlobal("fetch", fetchMock);
    render(<ReferencePanel drawing={drawing} mode="camera" onLoad={() => undefined} exportPng={async () => new Blob(["png"], { type: "image/png" })} />);
    fireEvent.change(screen.getByLabelText("Rótulo"), { target: { value: "triangle" } });
    fireEvent.click(screen.getByRole("button", { name: "Exportar PNG da lousa" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(fetchMock).toHaveBeenCalledWith("/api/export-whiteboard-png", expect.objectContaining({ method: "POST", headers: expect.objectContaining({ "X-AirDraw-Label": "triangle" }) }));
    expect(screen.getByRole("status").textContent).toContain("docs/images/triangle-4.png");
  });
});
