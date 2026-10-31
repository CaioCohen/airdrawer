import type { HandLandmark, HandTrackingResult } from "./HandTracker";

const CONNECTIONS: ReadonlyArray<readonly [number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12], [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20], [0, 17],
];

function point(landmark: HandLandmark, canvas: HTMLCanvasElement, mirrored: boolean) {
  return { x: (mirrored ? 1 - landmark.x : landmark.x) * canvas.width, y: landmark.y * canvas.height };
}

/** Draws only transient visualization data on the webcam canvas. */
export function drawHandOverlay(context: CanvasRenderingContext2D, canvas: HTMLCanvasElement, result: HandTrackingResult, mirrored = true): void {
  if (result.state !== "detected" || !result.landmarks) return;
  const landmarks = result.landmarks;
  context.save();
  context.strokeStyle = "#38bdf8";
  context.fillStyle = "#e0f2fe";
  context.lineWidth = Math.max(2, canvas.width / 400);
  for (const [from, to] of CONNECTIONS) {
    const start = point(landmarks[from], canvas, mirrored); const end = point(landmarks[to], canvas, mirrored);
    context.beginPath(); context.moveTo(start.x, start.y); context.lineTo(end.x, end.y); context.stroke();
  }
  for (const landmark of landmarks) {
    const current = point(landmark, canvas, mirrored);
    context.beginPath(); context.arc(current.x, current.y, Math.max(2, canvas.width / 320), 0, Math.PI * 2); context.fill();
  }
  const indexTip = point(landmarks[8], canvas, mirrored);
  context.strokeStyle = "#f97316"; context.lineWidth = Math.max(3, canvas.width / 180);
  context.beginPath(); context.arc(indexTip.x, indexTip.y, Math.max(7, canvas.width / 55), 0, Math.PI * 2); context.stroke();
  context.restore();
}
