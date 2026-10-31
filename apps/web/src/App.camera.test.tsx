import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";

function streamFixture() {
  const track = { stop: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() } as unknown as MediaStreamTrack;
  return { stream: { getTracks: () => [track] } as unknown as MediaStream, track };
}

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

function mockCanvas() {
  const context = { save: vi.fn(), clearRect: vi.fn(), translate: vi.fn(), scale: vi.fn(), drawImage: vi.fn(), restore: vi.fn() };
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context as unknown as CanvasRenderingContext2D);
}

describe("camera controls", () => {
  it("requests the specified stream only after starting and releases it when stopped", async () => {
    const { stream, track } = streamFixture();
    const getUserMedia = vi.fn().mockResolvedValue(stream);
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia } });
    Object.defineProperty(HTMLMediaElement.prototype, "play", { configurable: true, value: vi.fn().mockResolvedValue(undefined) });
    mockCanvas();
    vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    const { unmount } = render(<App />);
    expect(getUserMedia).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Iniciar câmera" }));
    await waitFor(() => expect(getUserMedia).toHaveBeenCalledWith({ audio: false, video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30 } } }));
    fireEvent.loadedMetadata(document.querySelector("video")!);
    await waitFor(() => expect(screen.getByText("Câmera: ativa")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Parar câmera" }));
    expect(track.stop).toHaveBeenCalledOnce();
    expect(cancelAnimationFrame).toHaveBeenCalledWith(1);
    unmount();
    expect(track.stop).toHaveBeenCalledOnce();
  });

  it("shows a usable permission error and leaves mouse drawing available", async () => {
    const denied = new DOMException("denied", "NotAllowedError");
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: vi.fn().mockRejectedValue(denied) } });
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Iniciar câmera" }));
    await waitFor(() => expect(screen.getByText(/Permissão para a câmera foi negada/)).toBeTruthy());
    expect((screen.getByRole("button", { name: "Modo: Mouse" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("distinguishes an unavailable camera from a permission denial", async () => {
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: vi.fn().mockRejectedValue(new DOMException("missing", "NotFoundError")) } });
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Iniciar câmera" }));
    await waitFor(() => expect(screen.getByText(/Nenhuma câmera foi encontrada/)).toBeTruthy());
  });

  it("explains when another application has occupied the camera", async () => {
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: vi.fn().mockRejectedValue(new DOMException("busy", "NotReadableError")) } });
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Iniciar câmera" }));
    await waitFor(() => expect(screen.getByText(/câmera está ocupada ou indisponível/i)).toBeTruthy());
  });

  it("releases a stream that resolves after the component was unmounted", async () => {
    let resolveRequest!: (stream: MediaStream) => void;
    const request = new Promise<MediaStream>((resolve) => { resolveRequest = resolve; });
    const { stream, track } = streamFixture();
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: vi.fn().mockReturnValue(request) } });
    const { unmount } = render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Iniciar câmera" }));
    unmount();
    resolveRequest(stream);
    await waitFor(() => expect(track.stop).toHaveBeenCalledOnce());
  });

  it("stops an active stream when the application unmounts", async () => {
    const { stream, track } = streamFixture();
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: vi.fn().mockResolvedValue(stream) } });
    Object.defineProperty(HTMLMediaElement.prototype, "play", { configurable: true, value: vi.fn().mockResolvedValue(undefined) });
    mockCanvas();
    vi.stubGlobal("requestAnimationFrame", vi.fn(() => 7));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    const { unmount } = render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Iniciar câmera" }));
    await waitFor(() => expect(document.querySelector("video")?.srcObject).toBe(stream));
    fireEvent.loadedMetadata(document.querySelector("video")!);
    await waitFor(() => expect(screen.getByText("Câmera: ativa")).toBeTruthy());
    unmount();
    expect(track.stop).toHaveBeenCalledOnce();
    expect(cancelAnimationFrame).toHaveBeenCalledWith(7);
  });

  it("keeps the camera loop alive and resizes its backing canvas during an active stream", async () => {
    const { stream } = streamFixture();
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: vi.fn().mockResolvedValue(stream) } });
    Object.defineProperty(HTMLMediaElement.prototype, "play", { configurable: true, value: vi.fn().mockResolvedValue(undefined) });
    mockCanvas();
    let nextFrame: FrameRequestCallback | undefined;
    vi.stubGlobal("requestAnimationFrame", vi.fn((callback: FrameRequestCallback) => { nextFrame = callback; return 9; }));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    render(<App />);
    const preview = screen.getByLabelText("Prévia da webcam") as HTMLCanvasElement;
    let width = 320;
    vi.spyOn(preview, "getBoundingClientRect").mockImplementation(() => ({ x: 0, y: 0, width, height: 240, top: 0, right: width, bottom: 240, left: 0, toJSON: () => ({}) }));
    fireEvent.click(screen.getByRole("button", { name: "Iniciar câmera" }));
    await waitFor(() => expect(document.querySelector("video")?.srcObject).toBe(stream));
    fireEvent.loadedMetadata(document.querySelector("video")!);
    await waitFor(() => expect(screen.getByText("Câmera: ativa")).toBeTruthy());
    expect(preview.width).toBe(320);
    width = 480;
    nextFrame?.(16);
    expect(preview.width).toBe(480);
  });
});
