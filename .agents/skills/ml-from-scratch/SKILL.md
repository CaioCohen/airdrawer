---
name: ml-from-scratch
description: Use when implementing, debugging, testing, or reviewing the AirDraw CNN, tensors, layers, gradients, losses, optimizer, preprocessing, model serialization, or browser inference.
---

# ML From Scratch — AirDraw

## Goal
Implement a correct, testable, framework-free CNN in TypeScript for classifying circle, square, and triangle drawings.

## Sources of truth
1. Read `docs/SPEC.md`, especially sections 9, 11, 12, 14 and 17 (or `SPEC_AirDraw_Shape_Classifier.md` if that is the actual location).
2. Inspect relevant code in `references/discipline-1` (CNN) and `references/discipline-2` (stable softmax and cross-entropy), if present. Adapt concepts; verify correctness instead of copying blindly.
3. Follow existing repository interfaces and tests unless the spec explicitly requires a change.

## Workflow
1. Identify the mathematical operation, input/output shapes, parameter shapes and gradient shapes before editing code.
2. Keep `packages/ml-core` independent of React, DOM, Node-only APIs and ML frameworks. Use TypeScript and `Float32Array`.
3. Use grayscale tensors of shape `[1, 32, 32]` and the fixed class order `circle=0`, `square=1`, `triangle=2`.
4. Implement explicit forward/backward operations for Conv2D, ReLU, MaxPool2D, Dense, and stable softmax cross-entropy; use the project's own Adam implementation.
5. Keep training and browser inference mathematically equivalent. Reuse the same deterministic rasterization and preprocessing code; never use future stroke points when preprocessing partial drawings.
6. Validate shape checks, finite values, and numerical stability. On errors, fail with informative messages rather than silently producing invalid predictions.
7. Add or update focused Vitest tests: known-value forward cases, gradient checking by finite differences, softmax with extreme logits, and a tiny-dataset overfit test.
8. Verify model export/import consistency: identical input should produce equivalent logits/probabilities before and after serialization.
9. Run the relevant tests and report exactly what was executed and what passed or failed.

## Constraints
- Do not use TensorFlow, TensorFlow.js, PyTorch, Keras, ONNX Runtime, pretrained shape classifiers, or an external classification API.
- MediaPipe is permitted only for **hand landmark detection**, not shape classification.
- Do not reuse the cat-vs-dog trained weights. Initialize a new model and train it on the AirDraw dataset.
- A change is not complete if gradients or inference/export compatibility are unverified; explicitly identify any tests you could not run.

## Expected output
Summarize files changed, tensor/contracts affected, verification evidence, and remaining limitations.