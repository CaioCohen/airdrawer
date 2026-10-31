import { describe, expect, it, vi } from "vitest";
import { HandTracker, type HandLandmark } from "./HandTracker";

const hand = Array.from({ length: 21 }, (_, index) => ({ x: index / 25, y: index / 30 })) satisfies HandLandmark[];

describe("HandTracker", () => {
  it("uses VIDEO detection once per decoded frame and reports present/absent hands", async () => {
    const detectForVideo = vi.fn()
      .mockReturnValueOnce({ landmarks: [hand] })
      .mockReturnValueOnce({ landmarks: [] });
    const close = vi.fn();
    const tracker = new HandTracker(async () => ({ detectForVideo, close }));
    await tracker.initialize();
    const video = { currentTime: 1 } as HTMLVideoElement;
    expect(tracker.detect(video, 10)).toMatchObject({ state: "detected", landmarks: hand });
    expect(tracker.detect(video, 11)).toMatchObject({ state: "detected", landmarks: hand });
    expect(detectForVideo).toHaveBeenCalledTimes(1);
    video.currentTime = 2;
    expect(tracker.detect(video, 5)).toEqual({ state: "not-detected", landmarks: null });
    expect(detectForVideo).toHaveBeenLastCalledWith(video, 10.001);
    tracker.close();
    expect(close).toHaveBeenCalledOnce();
  });

  it("shares its initialization promise instead of creating duplicate detectors", async () => {
    let resolveFactory!: (value: { detectForVideo: ReturnType<typeof vi.fn>; close: ReturnType<typeof vi.fn> }) => void;
    const createDetector = vi.fn(() => new Promise<typeof resolveFactory extends (value: infer T) => void ? T : never>((resolve) => { resolveFactory = resolve; }));
    const tracker = new HandTracker(createDetector);
    const first = tracker.initialize(); const second = tracker.initialize();
    expect(createDetector).toHaveBeenCalledOnce();
    resolveFactory({ detectForVideo: vi.fn(), close: vi.fn() });
    await Promise.all([first, second]);
    expect(tracker.isReady).toBe(true);
  });

  it("surfaces an unavailable model to the UI without retaining a failed initialization", async () => {
    const unavailable = new Error("model unavailable");
    const tracker = new HandTracker(async () => { throw unavailable; });
    await expect(tracker.initialize()).rejects.toThrow("model unavailable");
    expect(tracker.isReady).toBe(false);
    await expect(tracker.initialize()).rejects.toThrow("model unavailable");
  });

  it("closes a detector that finishes initialization after tracking was stopped", async () => {
    let resolveFactory!: (value: { detectForVideo: ReturnType<typeof vi.fn>; close: ReturnType<typeof vi.fn> }) => void;
    const tracker = new HandTracker(() => new Promise((resolve) => { resolveFactory = resolve; }));
    const starting = tracker.initialize();
    tracker.close();
    const close = vi.fn();
    resolveFactory({ detectForVideo: vi.fn(), close });
    await starting;
    expect(close).toHaveBeenCalledOnce();
    expect(tracker.isReady).toBe(false);
  });
});
