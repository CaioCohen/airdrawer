import { SHAPE_LABELS, type Drawing } from "@airdraw/contracts";
import { useCallback, useRef, useState } from "react";
import { Toolbar } from "./components/Toolbar";
import { WebcamCanvas, type CameraVisualState, type WebcamCanvasHandle } from "./components/WebcamCanvas";
import type { HandTrackingVisualState } from "./hooks/useHandTracking";
import { WhiteboardCanvas } from "./components/WhiteboardCanvas";
import type { WhiteboardCanvasHandle } from "./components/WhiteboardCanvas";
import { StrokeController } from "./drawing/StrokeController";
import { ReferencePanel } from "./references/ReferencePanel";
import { AirDrawingController } from "./tracking/AirDrawingController";
import type { HandTrackingResult } from "./tracking/HandTracker";

export function App() {
  const controller = useRef(new StrokeController()).current;
  const airDrawing = useRef(new AirDrawingController(controller)).current;
  const camera = useRef<WebcamCanvasHandle>(null);
  const whiteboard = useRef<WhiteboardCanvasHandle>(null);
  const [drawing, setDrawing] = useState<Drawing>(controller.getDrawing());
  const [mode, setMode] = useState<"mouse" | "camera">("mouse");
  const [cameraState, setCameraState] = useState<CameraVisualState>("off");
  const [handState, setHandState] = useState<HandTrackingVisualState>("not-detected");
  const updateDrawing = (next: Drawing) => setDrawing(next);
  const handLabel = handState === "detected" ? "detectada" : handState === "initializing" ? "inicializando" : handState === "error" ? "erro no rastreamento" : "não detectada";
  const onHandFrame = useCallback((result: HandTrackingResult, video: HTMLVideoElement, canvas: HTMLCanvasElement) => {
    if (mode !== "camera") return;
    const update = airDrawing.update(result.landmarks, {
      sourceWidth: video.videoWidth || canvas.width,
      sourceHeight: video.videoHeight || canvas.height,
      viewportWidth: canvas.width,
      viewportHeight: canvas.height,
    });
    // Cursor and ink are painted through the canvas handle.  Do not make the
    // React tree reconcile on every decoded frame or landmark point.
    whiteboard.current?.setCameraCursor(update.cursor);
    if (update.drawingChanged) whiteboard.current?.renderDrawing(update.drawing);
    if (airDrawing.isDrawingTransition()) setDrawing(update.drawing);
  }, [airDrawing, mode]);
  const onCameraChange = useCallback((next: CameraVisualState) => {
    setCameraState(next);
    if (next !== "active") { updateDrawing(airDrawing.stop()); whiteboard.current?.setCameraCursor(null); }
  }, [airDrawing]);
  const changeMode = () => {
    if (mode === "camera") { updateDrawing(airDrawing.stop()); whiteboard.current?.setCameraCursor(null); }
    setMode(mode === "mouse" ? "camera" : "mouse");
  };
  return <main><header className="app-header"><div><h1>AirDraw</h1><p>Desenhe formas no ar</p></div><div className="status-area" aria-label="Status atual"><span>Câmera: {cameraState === "active" ? "ativa" : cameraState === "starting" ? "iniciando" : "desligada"}</span><span>Mão: {handLabel}</span></div></header>
    <section aria-label="Área de desenho" className="canvases">
      <WebcamCanvas ref={camera} onCameraChange={onCameraChange} onHandChange={setHandState} onHandFrame={onHandFrame} />
      <WhiteboardCanvas ref={whiteboard} drawing={drawing} mode={mode} controller={controller} onDrawingChange={updateDrawing} />
    </section>
    <section aria-label="Predição" className="prediction"><h2>Predição</h2><p>Ainda não sei — aguardando desenho.</p><ul>{SHAPE_LABELS.map((label) => <li key={label}>{label}: —</li>)}</ul></section>
    <Toolbar canUndo={drawing.strokes.length > 0} canClear={drawing.strokes.length > 0} mode={mode} cameraState={cameraState} onUndo={() => updateDrawing(controller.undo())} onClear={() => updateDrawing(controller.clear())} onToggleMode={changeMode} onStartCamera={() => { void camera.current?.start(); }} onStopCamera={() => { updateDrawing(airDrawing.stop()); whiteboard.current?.setCameraCursor(null); camera.current?.stop(); }} />
    <ReferencePanel drawing={drawing} mode={mode} onLoad={(reference) => updateDrawing(controller.replaceDrawing(reference.drawing))} exportPng={() => whiteboard.current?.exportPng() ?? Promise.resolve(null)} />
  </main>;
}
