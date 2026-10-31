import type { ShapeLabel } from "@airdraw/contracts";

export type PngExportMode = "local-server" | "download";
const DOWNLOAD_SEQUENCE_KEY = "airdraw.png-download-sequence.v1";

export function resolvePngExportMode(value: string | undefined, isDevelopment: boolean): PngExportMode {
  const mode = value ?? (isDevelopment ? "local-server" : "download");
  if (mode !== "local-server" && mode !== "download") throw new Error("VITE_PNG_EXPORT_MODE deve ser local-server ou download.");
  if (!isDevelopment && mode === "local-server") throw new Error("VITE_PNG_EXPORT_MODE=local-server só pode ser usado durante pnpm dev.");
  return mode;
}

export const pngExportMode = resolvePngExportMode(import.meta.env.VITE_PNG_EXPORT_MODE, import.meta.env.DEV);

export function reserveDownloadFilename(storage: Storage, label: ShapeLabel): string {
  let sequence: Partial<Record<ShapeLabel, number>> = {};
  try {
    const stored: unknown = JSON.parse(storage.getItem(DOWNLOAD_SEQUENCE_KEY) ?? "{}");
    if (typeof stored === "object" && stored !== null && !Array.isArray(stored)) sequence = stored as Partial<Record<ShapeLabel, number>>;
  } catch { /* Corrupt local state is safely reset below. */ }
  const current = sequence[label];
  const next = Number.isSafeInteger(current) && current! >= 0 ? current! + 1 : 1;
  storage.setItem(DOWNLOAD_SEQUENCE_KEY, JSON.stringify({ ...sequence, [label]: next }));
  return `${label}-${next}.png`;
}
