---
name: hand-drawing-integration
description: Use when implementing, debugging, testing, or reviewing webcam capture, MediaPipe landmarks, pinch gestures, coordinate mapping, whiteboard strokes, prediction scheduling, or real-time UI behavior in AirDraw.
---

# Hand Drawing Integration — AirDraw

## Goal
Turn webcam hand landmarks into stable drawing strokes while preserving a responsive browser UI and continuous shape predictions.

## Sources of truth
- Read `docs/SPEC.md`, especially sections 6, 7, 8, 9, 12 and 17 (or the equivalent spec path).
- Keep webcam/tracking code in `apps/web`; consume the public API of `packages/ml-core` for preprocessing and inference.

## Workflow
1. Use `getUserMedia()` for the camera and `@mediapipe/tasks-vision` Hand Landmarker to obtain hand landmarks. Request permission explicitly; handle rejection, no camera, lost tracking and cleanup.
2. Derive pinch from landmarks `4` (thumb tip) and `8` (index tip), normalized by a hand-scale estimate such as landmarks `0` and `9`; never use a fixed pixel distance as the only threshold.
3. Implement pinch hysteresis and explicit states `NO_HAND`, `HOVER`, and `DRAWING`. Treat ratios `0.25` to start and `0.35` to stop as initial tunable values, not universal constants.
4. Store drawing points normalized to `[0,1]` coordinates and preserve stroke boundaries. Releasing pinch or losing the hand ends the stroke; never connect separated strokes with artificial segments.
5. Mirror webcam preview and coordinate mapping consistently, including aspect-ratio crop, resize and device pixel ratio; do not rely on a CSS flip alone.
6. Smooth cursor movement lightly, reject non-finite points and large jumps, and avoid rounding away square/triangle corners.
7. Render camera and whiteboard on separate visible canvas elements. Keep frequent frame updates out of unnecessary React state updates.
8. Call the shared stroke-to-tensor preprocessing only when the drawing changes. Throttle initial prediction scheduling to about 5–10 Hz; prefer a Web Worker and avoid accumulating prediction backlogs.
9. Tag prediction requests/results with a drawing revision and ignore stale responses after clear/undo. Display three probabilities and `Ainda não sei` when evidence is insufficient or confidence criteria are not met.
10. Add unit tests using simulated landmarks for hysteresis, state transitions, coordinates/mirroring, stroke interruption, and stale predictions; include browser integration checks for permission errors and canvas behavior.

## Constraints
- MediaPipe recognizes hands, **not** geometric shapes; the AirDraw CNN must perform shape classification.
- Do not store or upload webcam footage. Persist drawing samples only with a clear user action and consent.
- Keep hand tracking, gesture logic, rendering, and ML inference as separate responsibilities.

## Expected output
Describe observable UI behavior, edge cases exercised, test results, and any measured frame/inference performance (never estimates presented as measurements).