---
name: dataset-and-training
description: Use when generating synthetic shape drawings, creating train/validation/test splits, training the AirDraw CNN, tracking experiments, evaluating partial drawings, or exporting model artifacts.
---

# Dataset and Training — AirDraw

## Goal
Build a reproducible, auditable pipeline that trains the AirDraw classifier from random initialization without data leakage.

## Sources of truth
- Read `docs/SPEC.md`, especially sections 10, 11, 14, 15, 16 and 17 (or the equivalent spec path).
- Use `packages/dataset`, `packages/training`, and the shared `packages/ml-core` preprocessing/model code.
- Inspect the discipline-1 training loop and discipline-2 categorical loss only when the corresponding references exist.

## Workflow
1. Generate stroke **trajectories**, not just ideal final images, for circle, square, and triangle; vary rotation, scale, start point, direction, jitter, speed/sampling, line thickness and imperfect closure without changing the intended class.
2. Create partial examples by truncating a trajectory by **distance traveled**. Begin with fractions `0.25`, `0.40`, `0.60`, `0.80` and `1.00`; ensure partial examples contain only points observed up to that time.
3. Assign every base trajectory a stable `groupId`. Split at group level **before** producing prefixes/augmentations. Keep all derivatives of a `groupId` in the same split. Use stratified 70/15/15 as the initial split.
4. Use seeded PRNGs and persist generation parameters, label mapping, `groupId`, split, prefix fraction, version and seed in a manifest.
5. Run the **same** preprocessing implementation used by browser inference. Do not normalize partial shapes using the final shape's bounding box.
6. Audit counts by class, split and completion fraction. Detect duplicated groups across splits and invalid or empty rasterized samples.
7. Train a newly initialized CNN with the project's own forward, backward and Adam. Use validation for tuning/early stopping; never update on validation or test samples.
8. Record seed, dataset version/hash, architecture, learning rate, epoch/batch strategy, losses and checkpoint selection. Keep training as CLI commands; do not auto-train when the web app launches.
9. Evaluate on held-out test data once the configuration is selected. Report accuracy, per-class precision/recall/F1, confusion matrix and breakdowns by prefix fraction. Include real-test results separately when consented real drawings exist.
10. Export weights together with class order, tensor shape, preprocessing version and metadata. Confirm the exported artifact can be loaded by browser inference.

## Constraints
- Never report invented metrics or claim early prediction is always reliable; short strokes may be ambiguous.
- Never tune on test results or allow augmented siblings to cross splits.
- Keep existing raw datasets and user captures out of version control unless explicitly appropriate and consented.

## Expected output
Provide commands used, artifact paths, dataset counts, evaluation results actually measured, and known limitations. If training was not run, state that explicitly.