import { describe, expect, it } from "vitest";
import { loadShapeCnnArtifact, serializeShapeCnn, ShapeCNN, Tensor } from "@airdraw/ml-core";
import { evaluate, train, type TrainingExample } from "./training-loop.js";

const examples: TrainingExample[] = [0, 1, 2].map((label) => ({ id: `class-${label}`, label, input: image(label) }));

describe("training loop", () => {
  it("lowers loss on a tiny set and leaves validation forward-only", () => {
    const model = new ShapeCNN({ seed: 31 });
    const before = evaluate(model, examples).loss;
    const result = train(model, examples, examples, { seed: 7, epochs: 45, learningRate: 0.01, patience: 45 }, () => {});
    expect(result.history.at(-1)!.trainLoss).toBeLessThan(before * 0.25);
    // A separate forward-only evaluation cannot update parameters.
    const beforeEvaluation = model.parameters().map((parameter) => Array.from(parameter.data.data));
    evaluate(model, examples);
    expect(model.parameters().map((parameter) => Array.from(parameter.data.data))).toEqual(beforeEvaluation);
  });

  it("restores checkpoint parameters with identical fixed-input logits", () => {
    const model = new ShapeCNN({ seed: 19 });
    const fixedInput = image(2);
    let checkpoint: ReturnType<typeof serializeShapeCnn> | undefined;
    let expectedLogits: number[] | undefined;
    const result = train(model, examples, examples, { seed: 19, epochs: 8, learningRate: 0.01, patience: 8 }, (epoch, best) => {
      checkpoint = serializeShapeCnn(best, { training: { seed: 19, datasetManifestHash: "test-manifest", epochsCompleted: epoch, bestValidationEpoch: epoch, status: "trained" } });
      expectedLogits = Array.from(best.forwardLogits(fixedInput).data);
    });
    expect(result.bestEpoch).toBeGreaterThan(0);
    expect(checkpoint).toBeDefined();
    expect(Array.from(loadShapeCnnArtifact(checkpoint!).forwardLogits(fixedInput).data)).toEqual(expectedLogits);
  });
});

function image(label: number): Tensor { const input = Tensor.zeros([1, 32, 32]); input.data[label * 32 * 32 + 16 * 32 + 16] = 1; input.data[16 * 32 + (5 + label * 10)] = 0.8; return input; }
