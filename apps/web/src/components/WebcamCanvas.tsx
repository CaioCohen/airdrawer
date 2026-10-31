import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from "react";
import { useCanvasResize } from "../canvas/useCanvasResize";
import { useCamera, type CameraState } from "../hooks/useCamera";
import { useHandTracking, type HandTrackingVisualState } from "../hooks/useHandTracking";
import type { HandTrackingResult } from "../tracking/HandTracker";

export type CameraVisualState = CameraState;
export interface WebcamCanvasHandle { start: () => Promise<void>; stop: () => void; }
const messages: Record<CameraVisualState, string> = { off: "Câmera desligada", starting: "Iniciando câmera", active: "Câmera ativa", error: "Erro na câmera" };

export const WebcamCanvas = forwardRef<WebcamCanvasHandle, { onCameraChange: (state: CameraVisualState) => void; onHandChange: (state: HandTrackingVisualState) => void; onHandFrame?: (result: HandTrackingResult, video: HTMLVideoElement, canvas: HTMLCanvasElement) => void }>(function WebcamCanvas({ onCameraChange, onHandChange, onHandFrame }, ref) {
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const hand = useHandTracking(onHandFrame);
  const camera = useCamera(canvas, true, hand.onVideoFrame);
  const ignoreResize = useCallback(() => undefined, []);
  useCanvasResize(canvas, ignoreResize);
  useImperativeHandle(ref, () => ({ start: camera.start, stop: () => { hand.stop(); camera.stop(); } }), [camera.start, camera.stop, hand.stop]);
  useEffect(() => onCameraChange(camera.state), [camera.state, onCameraChange]);
  useEffect(() => onHandChange(hand.state), [hand.state, onHandChange]);
  useEffect(() => { if (camera.state !== "active") hand.stop(); }, [camera.state, hand.stop]);
  return <section className="canvas-panel" aria-label="Painel da webcam"><div className="canvas-frame webcam-frame">
    <canvas ref={setCanvas} aria-label="Prévia da webcam" data-canvas-role="webcam" />
    <video ref={camera.videoRef} autoPlay muted playsInline hidden aria-hidden="true" tabIndex={-1} />
    {camera.state !== "active" && <div className="canvas-overlay" aria-live="polite"><strong>{messages[camera.state]}</strong><span>{camera.error ?? "Mão não detectada"}</span></div>}
    {camera.state === "active" && <span className="tracking-status" aria-live="polite">{hand.state === "detected" ? "Mão detectada" : hand.state === "initializing" ? "Iniciando rastreamento" : hand.state === "error" ? "Erro no rastreamento — reinicie a câmera" : "Mão não detectada"}</span>}
  </div><p className="canvas-caption">Webcam e indicadores de rastreamento</p></section>;
});
