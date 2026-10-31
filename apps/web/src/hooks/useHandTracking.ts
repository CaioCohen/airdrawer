import { useCallback, useEffect, useRef, useState } from "react";
import { drawHandOverlay } from "../tracking/handOverlay";
import { HandTracker, type HandTrackingResult, type TrackingState } from "../tracking/HandTracker";

export type HandTrackingVisualState = "initializing" | TrackingState | "error";

export function useHandTracking(onResult?: (result: HandTrackingResult, video: HTMLVideoElement, canvas: HTMLCanvasElement) => void) {
  const tracker = useRef<HandTracker | null>(null);
  const initializing = useRef(false);
  const stateRef = useRef<HandTrackingVisualState>("not-detected");
  const lastGestureFrame = useRef(-1);
  const [state, setState] = useState<HandTrackingVisualState>("not-detected");
  const setTrackingState = useCallback((next: HandTrackingVisualState) => {
    if (stateRef.current !== next) { stateRef.current = next; setState(next); }
  }, []);
  const onVideoFrame = useCallback((video: HTMLVideoElement, canvas: HTMLCanvasElement, context: CanvasRenderingContext2D) => {
    if (!tracker.current) tracker.current = new HandTracker();
    const current = tracker.current;
    if (!initializing.current && !current.isReady) {
      // The first frame starts initialization. Detection begins on a later frame.
      initializing.current = true; setTrackingState("initializing");
      void current.initialize().then(() => { initializing.current = false; setTrackingState("not-detected"); }).catch(() => { initializing.current = false; setTrackingState("error"); });
      return;
    }
    if (initializing.current || stateRef.current === "error") return;
    const result = current.detect(video, performance.now());
    if (!result) return;
    setTrackingState(result.state);
    drawHandOverlay(context, canvas, result, true);
    // Rendering may run faster than decoded frames. Gesture updates must not
    // manufacture extra EMA points from the same MediaPipe result.
    if (lastGestureFrame.current !== video.currentTime) {
      lastGestureFrame.current = video.currentTime;
      onResult?.(result, video, canvas);
    }
  }, [onResult, setTrackingState]);
  const stop = useCallback(() => { tracker.current?.close(); tracker.current = null; initializing.current = false; lastGestureFrame.current = -1; setTrackingState("not-detected"); }, [setTrackingState]);
  useEffect(() => stop, [stop]);
  return { state, onVideoFrame, stop };
}
