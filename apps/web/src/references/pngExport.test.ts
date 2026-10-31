import { describe, expect, it } from "vitest";
import { reserveDownloadFilename, resolvePngExportMode } from "./pngExport";

describe("PNG export mode", () => {
  it("uses the local server only during development and download in production", () => {
    expect(resolvePngExportMode(undefined, true)).toBe("local-server");
    expect(resolvePngExportMode(undefined, false)).toBe("download");
    expect(() => resolvePngExportMode("local-server", false)).toThrow(/só pode ser usado/);
    expect(() => resolvePngExportMode("unexpected", true)).toThrow(/deve ser/);
  });

  it("reserves an independent increasing download name for each label", () => {
    window.localStorage.clear();
    expect(reserveDownloadFilename(window.localStorage, "circle")).toBe("circle-1.png");
    expect(reserveDownloadFilename(window.localStorage, "circle")).toBe("circle-2.png");
    expect(reserveDownloadFilename(window.localStorage, "triangle")).toBe("triangle-1.png");
  });
});
