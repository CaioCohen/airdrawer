import { useEffect } from "react";
import { resizeCanvasToDisplaySize, type CanvasSize } from "./canvasSurface";

export function useCanvasResize(canvas: HTMLCanvasElement | null, onResize: (size: CanvasSize) => void): void {
  useEffect(() => {
    if (!canvas) return;
    const resize = () => {
      const size = resizeCanvasToDisplaySize(canvas);
      if (size) onResize(size);
    };
    resize();
    const observer = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(resize);
    observer?.observe(canvas);
    window.addEventListener("resize", resize);
    return () => { observer?.disconnect(); window.removeEventListener("resize", resize); };
  }, [canvas, onResize]);
}
