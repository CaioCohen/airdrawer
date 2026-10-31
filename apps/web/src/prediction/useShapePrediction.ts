import { loadShapeCnnArtifact, preprocessDrawing, ShapeCNN, Tensor, type Drawing, type ShapeLabel } from "@airdraw/ml-core";
import { useEffect, useMemo, useRef, useState } from "react";

export const PREDICTION_INTERVAL_MS = 125;
export const PREDICTION_TOP_THRESHOLD = 0.65;
export const PREDICTION_MARGIN_THRESHOLD = 0.15;

export type PredictionStatus = "waiting" | "insufficient-ink" | "model-pending" | "model-unavailable" | "model-invalid" | "uncertain" | "ready";
export interface ShapeProbabilities { readonly circle: number; readonly square: number; readonly triangle: number; }
export interface ShapePrediction {
  readonly revision: number;
  readonly status: PredictionStatus;
  readonly probabilities?: ShapeProbabilities;
  readonly label?: ShapeLabel;
}
export interface PredictionModel { predict(tensor: Float32Array): Promise<readonly number[]>; }
export type ModelLoadResult = { readonly kind: "ready"; readonly model: PredictionModel } | { readonly kind: "unavailable" };
export type ModelLoader = () => Promise<ModelLoadResult>;

const unavailableLoader: ModelLoader = async () => ({ kind: "unavailable" });
const labels = ["circle", "square", "triangle"] as const;

/**
 * Schedules at most one model call at a time and retains only the newest
 * request.  It has no React dependency so the worker boundary can replace the
 * runner later without changing concurrency rules.
 */
export class PredictionScheduler {
  private queued: { revision: number; tensor: Float32Array } | undefined;
  private busy = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private lastStart = -Infinity;
  public constructor(private readonly model: PredictionModel, private readonly onResult: (revision: number, values: readonly number[]) => void, private readonly onError: (revision: number) => void, private readonly now: () => number = () => Date.now()) {}
  public schedule(revision: number, tensor: Float32Array): void {
    this.queued = { revision, tensor };
    this.pump();
  }
  public dispose(): void { if (this.timer !== undefined) clearTimeout(this.timer); this.timer = undefined; this.queued = undefined; }
  private pump(): void {
    if (this.busy || !this.queued || this.timer !== undefined) return;
    const wait = Math.max(0, PREDICTION_INTERVAL_MS - (this.now() - this.lastStart));
    if (wait > 0) { this.timer = setTimeout(() => { this.timer = undefined; this.pump(); }, wait); return; }
    const request = this.queued; this.queued = undefined; this.busy = true; this.lastStart = this.now();
    void this.model.predict(request.tensor).then((values) => this.onResult(request.revision, values), () => this.onError(request.revision)).finally(() => { this.busy = false; this.pump(); });
  }
}

/** Use only with a model returned by the validated artifact loader. */
export function createShapeCnnRunner(model: ShapeCNN): PredictionModel {
  return { async predict(data) { return Array.from(model.forwardProbabilities(new Tensor(data.slice(), [1, 32, 32])).data); } };
}

/**
 * Fase 3 can supply a fetcher for its exported JSON artifact. Validation and
 * the model smoke test occur here exactly once per hook mount, before any
 * tensor is sent to the classifier.  This module deliberately supplies no
 * fallback weights.
 */
export function createArtifactModelLoader(loadArtifact: () => Promise<unknown>): ModelLoader {
  return async () => ({ kind: "ready", model: createShapeCnnRunner(loadShapeCnnArtifact(await loadArtifact())) });
}

/** Production loader: network errors and malformed/corrupt JSON are deliberately distinct from drawing state. */
export function loadProductionModel(): ModelLoader {
  return createArtifactModelLoader(async () => {
    const response = await fetch("/models/shape-cnn.v1.json", { cache: "no-cache" });
    if (!response.ok) throw new Error(`Model fetch failed with HTTP ${response.status}.`);
    try { return await response.json(); }
    catch (error) { throw new Error(`Model response is not valid JSON: ${error instanceof Error ? error.message : String(error)}`); }
  });
}

export function useShapePrediction(drawing: Drawing, loadModel: ModelLoader = unavailableLoader): ShapePrediction {
  const revisionRef = useRef(drawing.revision);
  revisionRef.current = drawing.revision;
  const loaderRef = useRef(loadModel);
  const schedulerRef = useRef<PredictionScheduler | undefined>(undefined);
  const [modelState, setModelState] = useState<"pending" | "ready" | "unavailable" | "invalid">("pending");
  const [prediction, setPrediction] = useState<ShapePrediction>({ revision: drawing.revision, status: "waiting" });
  const prepared = useMemo(() => preprocessDrawing(drawing), [drawing]);

  useEffect(() => {
    let live = true;
    void loaderRef.current().then((result) => {
      if (!live) return;
      if (result.kind === "unavailable") { setModelState("unavailable"); return; }
      schedulerRef.current = new PredictionScheduler(result.model, (revision, values) => {
        if (revision !== revisionRef.current) return;
        const next = classify(revision, values);
        if (next) setPrediction(next); else setPrediction({ revision, status: "model-invalid" });
      }, (revision) => { if (revision === revisionRef.current) setPrediction({ revision, status: "model-invalid" }); });
      setModelState("ready");
    }, () => { if (live) setModelState("invalid"); });
    return () => { live = false; schedulerRef.current?.dispose(); schedulerRef.current = undefined; };
  }, []);

  useEffect(() => {
    if (prepared.kind === "empty") { setPrediction({ revision: drawing.revision, status: drawing.strokes.length === 0 ? "waiting" : "insufficient-ink" }); return; }
    if (modelState === "unavailable") { setPrediction({ revision: drawing.revision, status: "model-unavailable" }); return; }
    if (modelState === "invalid") { setPrediction({ revision: drawing.revision, status: "model-invalid" }); return; }
    const scheduler = schedulerRef.current;
    if (!scheduler) { setPrediction({ revision: drawing.revision, status: "model-pending" }); return; }
    setPrediction({ revision: drawing.revision, status: "model-pending" });
    scheduler.schedule(drawing.revision, prepared.tensor);
  }, [drawing.revision, drawing.strokes.length, modelState, prepared]);

  return prediction;
}

function classify(revision: number, values: readonly number[]): ShapePrediction | undefined {
  if (values.length !== 3 || values.some((value) => !Number.isFinite(value) || value < 0 || value > 1)) return undefined;
  const sum = values[0]! + values[1]! + values[2]!;
  if (Math.abs(sum - 1) > 1e-4) return undefined;
  const pairs = values.map((value, index) => ({ value, index })).sort((a, b) => b.value - a.value);
  const probabilities = { circle: values[0]!, square: values[1]!, triangle: values[2]! };
  const confident = pairs[0]!.value >= PREDICTION_TOP_THRESHOLD && pairs[0]!.value - pairs[1]!.value >= PREDICTION_MARGIN_THRESHOLD;
  return confident ? { revision, status: "ready", probabilities, label: labels[pairs[0]!.index]! } : { revision, status: "uncertain", probabilities };
}
