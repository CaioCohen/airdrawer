export interface CanvasSize {
  readonly cssWidth: number;
  readonly cssHeight: number;
  readonly pixelWidth: number;
  readonly pixelHeight: number;
  readonly devicePixelRatio: number;
}

/** Gives a canvas a sharp backing store while keeping its coordinates in CSS pixels. */
export function resizeCanvasToDisplaySize(canvas: HTMLCanvasElement, dpr = window.devicePixelRatio || 1): CanvasSize | null {
  const { width: cssWidth, height: cssHeight } = canvas.getBoundingClientRect();
  if (cssWidth <= 0 || cssHeight <= 0) return null;
  const devicePixelRatio = Math.max(1, dpr);
  const pixelWidth = Math.round(cssWidth * devicePixelRatio);
  const pixelHeight = Math.round(cssHeight * devicePixelRatio);
  if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
  if (canvas.height !== pixelHeight) canvas.height = pixelHeight;
  return { cssWidth, cssHeight, pixelWidth, pixelHeight, devicePixelRatio };
}
