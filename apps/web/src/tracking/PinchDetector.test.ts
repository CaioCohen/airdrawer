import { describe, expect, it } from "vitest";
import type { HandLandmark } from "./HandTracker";
import { PinchDetector } from "./PinchDetector";

function hand(ratio: number): HandLandmark[] {
  const points = Array.from({ length: 21 }, () => ({ x: .5, y: .5 }));
  points[0] = { x: .4, y: .5 }; points[9] = { x: .8, y: .5 };
  points[4] = { x: .4, y: .3 }; points[8] = { x: .4 + ratio * .4, y: .3 };
  return points;
}

describe("PinchDetector", () => {
  it("uses start/end hysteresis and closes immediately when the hand is lost", () => {
    const detector = new PinchDetector();
    expect(detector.update(null).state).toBe("NO_HAND");
    expect(detector.update(hand(.3)).state).toBe("HOVER");
    expect(detector.update(hand(.25)).state).toBe("DRAWING");
    expect(detector.update(hand(.3)).state).toBe("DRAWING");
    expect(detector.update(hand(.35)).state).toBe("HOVER");
    expect(detector.update(hand(.2)).state).toBe("DRAWING");
    expect(detector.update(null)).toMatchObject({ previousState: "DRAWING", state: "NO_HAND", ratio: null });
    expect(detector.update(hand(.3)).state).toBe("HOVER");
  });
});
