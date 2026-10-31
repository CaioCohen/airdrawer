import { useCallback, useEffect, useRef, useState } from "react";
import { resizeCanvasToDisplaySize } from "../canvas/canvasSurface";

export type CameraState = "off" | "starting" | "active" | "error";
export interface CameraController { readonly state: CameraState; readonly error: string | null; readonly videoRef: (video: HTMLVideoElement | null) => void; start: () => Promise<void>; stop: () => void; }
export const CAMERA_CONSTRAINTS: MediaStreamConstraints = { audio: false, video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30 } } };

function messageFor(error: unknown): string {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") return "Permissão para a câmera foi negada. Você pode continuar no modo mouse.";
  if (name === "NotFoundError") return "Nenhuma câmera foi encontrada. Você pode continuar no modo mouse.";
  if (name === "NotReadableError" || name === "AbortError") return "A câmera está ocupada ou indisponível. Feche outros aplicativos e tente novamente.";
  return "Não foi possível iniciar a câmera. Você pode continuar no modo mouse.";
}

function waitForMetadata(video: HTMLVideoElement): Promise<void> {
  if (video.readyState >= HTMLMediaElement.HAVE_METADATA) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const cleanup = () => { video.removeEventListener("loadedmetadata", loaded); video.removeEventListener("error", failed); };
    const loaded = () => { cleanup(); resolve(); };
    const failed = () => { cleanup(); reject(new Error("Falha ao carregar os metadados do vídeo.")); };
    video.addEventListener("loadedmetadata", loaded, { once: true });
    video.addEventListener("error", failed, { once: true });
  });
}

/** `mirrored` applies only to preview pixels; drawing-coordinate mapping is a later concern. */
export function useCamera(canvas: HTMLCanvasElement | null, mirrored = true, onVideoFrame?: (video: HTMLVideoElement, canvas: HTMLCanvasElement, context: CanvasRenderingContext2D) => void): CameraController {
  const video = useRef<HTMLVideoElement | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const frame = useRef<number | null>(null);
  const generation = useRef(0);
  const trackListeners = useRef<Array<readonly [MediaStreamTrack, () => void]>>([]);
  const [state, setState] = useState<CameraState>("off");
  const [error, setError] = useState<string | null>(null);
  const cancelFrame = useCallback(() => { if (frame.current !== null) cancelAnimationFrame(frame.current); frame.current = null; }, []);
  const stop = useCallback(() => {
    generation.current += 1; cancelFrame();
    for (const [track, listener] of trackListeners.current) track.removeEventListener("ended", listener);
    trackListeners.current = [];
    const active = stream.current; stream.current = null;
    active?.getTracks().forEach((track) => track.stop());
    if (video.current) video.current.srcObject = null;
    setError(null); setState("off");
  }, [cancelFrame]);
  const start = useCallback(async () => {
    if (stream.current || state === "starting" || state === "active") return;
    if (!window.isSecureContext && window.location.hostname !== "localhost") { setError("A câmera requer uma conexão segura (HTTPS). Você pode continuar no modo mouse."); setState("error"); return; }
    if (!navigator.mediaDevices?.getUserMedia) { setError("Este navegador não oferece acesso à câmera. Você pode continuar no modo mouse."); setState("error"); return; }
    const current = generation.current + 1; generation.current = current; setError(null); setState("starting");
    let requested: MediaStream | null = null;
    try {
      requested = await navigator.mediaDevices.getUserMedia(CAMERA_CONSTRAINTS);
      if (generation.current !== current || !video.current) { requested.getTracks().forEach((track) => track.stop()); return; }
      stream.current = requested; video.current.srcObject = requested;
      await waitForMetadata(video.current); await video.current.play();
      if (generation.current !== current || !canvas) { stop(); return; }
      const render = () => {
        const target = canvas; const source = video.current;
        if (generation.current !== current || !source) return;
        resizeCanvasToDisplaySize(target);
        const context = target.getContext("2d");
        if (context) {
          context.save(); context.clearRect(0, 0, target.width, target.height);
          const sourceWidth = source.videoWidth || target.width;
          const sourceHeight = source.videoHeight || target.height;
          const scale = Math.max(target.width / sourceWidth, target.height / sourceHeight);
          const width = sourceWidth * scale; const height = sourceHeight * scale;
          if (mirrored) { context.translate(target.width, 0); context.scale(-1, 1); }
          context.drawImage(source, (target.width - width) / 2, (target.height - height) / 2, width, height);
          context.restore(); onVideoFrame?.(source, target, context);
        }
        frame.current = requestAnimationFrame(render);
      };
      for (const track of requested.getTracks()) {
        const ended = () => { if (generation.current === current) { stop(); setError("A câmera foi desconectada ou interrompida."); setState("error"); } };
        track.addEventListener("ended", ended); trackListeners.current.push([track, ended]);
      }
      render(); setState("active");
    } catch (caught) {
      if (requested) requested.getTracks().forEach((track) => track.stop());
      if (generation.current === current) { cancelFrame(); if (video.current) video.current.srcObject = null; stream.current = null; setError(messageFor(caught)); setState("error"); }
    }
  }, [canvas, cancelFrame, mirrored, onVideoFrame, state, stop]);
  useEffect(() => stop, [stop]);
  return { state, error, videoRef: (element) => { video.current = element; }, start, stop };
}
