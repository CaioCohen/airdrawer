import { describe, expect, it } from "vitest";
import { fractionReport, summarizePredictions } from "./evaluation-metrics.js";

describe("evaluation metrics", () => {
  it("computes a 3x3 confusion matrix and abstention independently", () => {
    const result = summarizePredictions([
      { id: "circle", label: 0, probabilities: [0.8, 0.1, 0.1] },
      { id: "square", label: 1, probabilities: [0.4, 0.35, 0.25] },
      { id: "triangle", label: 2, probabilities: [0.1, 0.2, 0.7] },
    ]);
    expect(result.accuracy).toBe(2 / 3);
    expect(result.confusionMatrix).toEqual([[1, 0, 0], [1, 0, 0], [0, 0, 1]]);
    expect(result.accepted).toBe(2);
    expect(result.abstentionRate).toBe(1 / 3);
    expect(result.acceptedAccuracy).toBe(1);
    expect(result.perClass.square.recall).toBe(0);
  });

  it("records missing prefix data as unavailable", () => {
    expect(fractionReport([{ id: "complete", label: 0, probabilities: [1, 0, 0], visibleFraction: 1 }])).toMatchObject({ status: "unavailable", observedFractions: [1] });
  });
});
