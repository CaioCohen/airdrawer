import { SHAPE_LABELS, type ShapeLabel } from "@airdraw/contracts";

export const UNCERTAINTY_POLICY = Object.freeze({
  topProbabilityMinimum: 0.65,
  topMarginMinimum: 0.15,
});

export interface EvaluationPrediction {
  readonly id: string;
  readonly label: number;
  readonly probabilities: readonly number[];
  readonly visibleFraction?: number;
}

export interface EvaluationSummary {
  readonly examples: number;
  readonly correct: number;
  readonly accuracy: number;
  readonly accepted: number;
  readonly abstained: number;
  readonly abstentionRate: number;
  readonly acceptedAccuracy: number | null;
  /** Rows are actual labels and columns are predicted labels, in classOrder. */
  readonly confusionMatrix: readonly (readonly number[])[];
  readonly perClass: Readonly<Record<ShapeLabel, {
    readonly support: number; readonly correct: number; readonly accuracy: number;
    readonly precision: number; readonly recall: number; readonly f1: number;
  }>>;
}

export function summarizePredictions(predictions: readonly EvaluationPrediction[], policy = UNCERTAINTY_POLICY): EvaluationSummary {
  if (predictions.length === 0) throw new Error("Cannot summarize an empty evaluation split.");
  const matrix = SHAPE_LABELS.map(() => SHAPE_LABELS.map(() => 0));
  let correct = 0, accepted = 0, acceptedCorrect = 0;
  for (const prediction of predictions) {
    if (!Number.isSafeInteger(prediction.label) || prediction.label < 0 || prediction.label >= SHAPE_LABELS.length) throw new Error(`Invalid label for ${prediction.id}.`);
    if (prediction.probabilities.length !== SHAPE_LABELS.length || prediction.probabilities.some((value) => !Number.isFinite(value) || value < 0)) throw new Error(`Invalid probabilities for ${prediction.id}.`);
    const sum = prediction.probabilities.reduce((total, value) => total + value, 0);
    if (Math.abs(sum - 1) > 1e-5) throw new Error(`Probabilities for ${prediction.id} do not sum to one.`);
    const ranked = prediction.probabilities.map((value, index) => ({ value, index })).sort((a, b) => b.value - a.value || a.index - b.index);
    const predicted = ranked[0]!.index;
    matrix[prediction.label]![predicted]! += 1;
    const isCorrect = predicted === prediction.label;
    if (isCorrect) correct += 1;
    if (ranked[0]!.value >= policy.topProbabilityMinimum && ranked[0]!.value - ranked[1]!.value >= policy.topMarginMinimum) {
      accepted += 1;
      if (isCorrect) acceptedCorrect += 1;
    }
  }
  const perClass = Object.fromEntries(SHAPE_LABELS.map((label, classIndex) => {
    const support = matrix[classIndex]!.reduce((sum, value) => sum + value, 0);
    const tp = matrix[classIndex]![classIndex]!;
    const fp = matrix.reduce((sum, row, actual) => sum + (actual === classIndex ? 0 : row[classIndex]!), 0);
    const fn = support - tp;
    const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
    const recall = support === 0 ? 0 : tp / support;
    const f1 = precision + recall === 0 ? 0 : 2 * precision * recall / (precision + recall);
    return [label, { support, correct: tp, accuracy: support === 0 ? 0 : tp / support, precision, recall, f1 }];
  })) as EvaluationSummary["perClass"];
  return {
    examples: predictions.length, correct, accuracy: correct / predictions.length,
    accepted, abstained: predictions.length - accepted, abstentionRate: (predictions.length - accepted) / predictions.length,
    acceptedAccuracy: accepted === 0 ? null : acceptedCorrect / accepted,
    confusionMatrix: matrix, perClass,
  };
}

/** The supplied raster corpus has no trajectory prefixes; do not fake a curve. */
export function fractionReport(predictions: readonly EvaluationPrediction[]): { readonly status: "available"; readonly values: Readonly<Record<string, EvaluationSummary>> } | { readonly status: "unavailable"; readonly reason: string; readonly observedFractions: readonly number[] } {
  const fractions = [...new Set(predictions.map((prediction) => prediction.visibleFraction).filter((value): value is number => typeof value === "number"))].sort((a, b) => a - b);
  const required = [0.25, 0.4, 0.6, 0.8, 1];
  if (fractions.length < 2 || !required.every((fraction) => fractions.includes(fraction))) {
    return { status: "unavailable", observedFractions: fractions, reason: "The supplied corpus has complete raster images only (visibleFraction=1); no trajectories or partial-prefix samples exist, so fraction metrics are intentionally not fabricated." };
  }
  return { status: "available", values: Object.fromEntries(required.map((fraction) => [String(fraction), summarizePredictions(predictions.filter((prediction) => prediction.visibleFraction === fraction))])) };
}
