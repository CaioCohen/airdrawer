import type { Drawing } from "@airdraw/contracts";
import type { CanvasSize } from "./canvasSurface";

/** Renders immutable Drawing data; it never creates, joins, or stores strokes. */
export function renderWhiteboard(context: CanvasRenderingContext2D, drawing: Drawing, size: CanvasSize): void {
  context.setTransform(size.devicePixelRatio, 0, 0, size.devicePixelRatio, 0, 0);
  context.clearRect(0, 0, size.cssWidth, size.cssHeight);
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, size.cssWidth, size.cssHeight);
  context.strokeStyle = "#172033";
  context.fillStyle = "#172033";
  context.lineWidth = 4;
  context.lineCap = "round";
  context.lineJoin = "round";
  for (const stroke of drawing.strokes) {
    if (stroke.points.length === 0) continue;
    const [first, ...rest] = stroke.points;
    context.beginPath();
    context.moveTo(first.x * size.cssWidth, first.y * size.cssHeight);
    for (const point of rest) context.lineTo(point.x * size.cssWidth, point.y * size.cssHeight);
    if (rest.length === 0) {
      context.arc(first.x * size.cssWidth, first.y * size.cssHeight, context.lineWidth / 2, 0, Math.PI * 2);
      context.fill();
    } else context.stroke();
  }
}
