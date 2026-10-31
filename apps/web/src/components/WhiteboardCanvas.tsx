import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState, type PointerEvent } from "react";
import type { Drawing, Point2D } from "@airdraw/contracts";
import { renderWhiteboard } from "../canvas/WhiteboardRenderer";
import type { CanvasSize } from "../canvas/canvasSurface";
import { useCanvasResize } from "../canvas/useCanvasResize";
import { isCompatiblePoint, normalizedCanvasPoint } from "../drawing/pointerInput";
import type { StrokeController } from "../drawing/StrokeController";

export interface WhiteboardCanvasHandle {
  exportPng(): Promise<Blob | null>;
  /** Paints interaction updates without scheduling a React render for every point. */
  renderDrawing(drawing: Drawing): void;
  setCameraCursor(point: Point2D | null): void;
}
export const WhiteboardCanvas = forwardRef<WhiteboardCanvasHandle, { drawing: Drawing; mode: "mouse" | "camera"; controller: StrokeController; onDrawingChange: (drawing: Drawing) => void }>(function WhiteboardCanvas({ drawing, mode, controller, onDrawingChange }, ref) {
  const size = useRef<CanvasSize | null>(null);
  const activePointerId = useRef<number | null>(null);
  const lastPoint = useRef<Point2D | null>(null);
  const cursor = useRef<HTMLDivElement | null>(null);
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const renderDrawing = useCallback((next: Drawing) => {
    if (!canvas || !size.current) return;
    const context = canvas.getContext("2d");
    if (context) renderWhiteboard(context, next, size.current);
  }, [canvas]);
  const setCursor = useCallback((point: Point2D | null) => {
    if (!cursor.current) return;
    cursor.current.style.visibility = point ? "visible" : "hidden";
    if (point) { cursor.current.style.left = `${point.x * 100}%`; cursor.current.style.top = `${point.y * 100}%`; }
  }, []);
  const onResize = useCallback((nextSize: CanvasSize) => { size.current = nextSize; renderDrawing(controller.getDrawing()); }, [controller, renderDrawing]);
  useCanvasResize(canvas, onResize);
  useImperativeHandle(ref, () => ({
    exportPng: () => new Promise<Blob | null>((resolve) => { if (!canvas) { resolve(null); return; } canvas.toBlob(resolve, "image/png"); }),
    renderDrawing,
    setCameraCursor: setCursor,
  }), [canvas, renderDrawing, setCursor]);
  useEffect(() => {
    renderDrawing(drawing);
  }, [drawing, renderDrawing]);
  const pointFor = (event: PointerEvent<HTMLCanvasElement>) => normalizedCanvasPoint(event.nativeEvent, event.currentTarget);
  const finish = () => {
    if (activePointerId.current === null) return;
    activePointerId.current = null; lastPoint.current = null;
    controller.end(); onDrawingChange(controller.getDrawing());
  };
  const onPointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    if (mode !== "mouse" || !event.isPrimary) return;
    const point = pointFor(event); if (!point) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    activePointerId.current = event.pointerId; lastPoint.current = point; setCursor(point);
    onDrawingChange(controller.begin(point));
  };
  const onPointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    const point = pointFor(event); if (point) setCursor(point);
    if (activePointerId.current !== event.pointerId || !point || !isCompatiblePoint(lastPoint.current, point)) return;
    lastPoint.current = point; renderDrawing(controller.add(point));
  };
  const onPointerUp = (event: PointerEvent<HTMLCanvasElement>) => {
    if (activePointerId.current !== event.pointerId) return;
    finish(); if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  return <section className="canvas-panel" aria-label="Painel da lousa"><div className="canvas-frame whiteboard-frame">
    <canvas ref={setCanvas} aria-label="Lousa de desenho" data-canvas-role="whiteboard" className={mode === "mouse" ? "drawing-surface" : undefined}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={finish} onLostPointerCapture={finish}
      onPointerLeave={() => { if (activePointerId.current === null) setCursor(null); }} />
    <div ref={cursor} className={`tracking-cursor ${mode === "mouse" ? "mouse-cursor" : "camera-cursor"}`} aria-hidden="true" style={{ visibility: "hidden" }} />
    <span className="tracking-status">{mode === "mouse" ? "Cursor pronto" : "Cursor da câmera pronto"}</span>
  </div><p className="canvas-caption">Lousa branca — traço escuro</p></section>;
});
