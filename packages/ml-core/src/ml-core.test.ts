import { describe, expect, it } from "vitest";
import { Adam, Conv2D, Dense, MaxPool2D, ReLU, SHAPE_CNN_PARAMETER_COUNT, SeededRandom, ShapeCNN, SoftmaxCrossEntropy, Tensor, heNormal, loadShapeCnnArtifact, preprocessDrawing, serializeShapeCnn, softmax, tensorToAscii, validateShapeCnnArtifact } from "./index.js";
import type { Drawing } from "@airdraw/contracts";

const close = (actual: number, expected: number, tolerance = 1e-5) => expect(actual).toBeCloseTo(expected, Math.max(0, Math.floor(-Math.log10(tolerance))));

describe("Tensor", () => {
  it("uses validated row-major strides, clones, reshapes, and rejects invalid access", () => {
    const tensor = Tensor.from([1, 2, 3, 4, 5, 6], [2, 3]);
    expect(tensor.strides).toEqual([3, 1]); expect(tensor.get(1, 2)).toBe(6); expect(tensor.reshape([3, 2]).get(2, 1)).toBe(6);
    const clone = tensor.clone(); clone.set(99, 0, 0); expect(tensor.get(0, 0)).toBe(1);
    expect(() => tensor.get(0)).toThrow("exactly 2"); expect(() => tensor.get(2, 0)).toThrow("out of bounds"); expect(() => Tensor.from([1, Number.NaN], [2])).toThrow("non-finite");
  });
});
describe("layers", () => {
  it("computes convolution forward and backward known values", () => {
    const conv = new Conv2D(1, 1, 2, { seed: 9, name: "known" });
    conv.weights.data.set([1, 0, 0, -1]); conv.bias.data[0] = 1;
    const output = conv.forward(Tensor.from([1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 3, 3]));
    expect(Array.from(output.data)).toEqual([-3, -3, -3, -3]);
    const inputGrad = conv.backward(Tensor.from([1, 1, 1, 1], [1, 2, 2]));
    expect(Array.from(conv.gradWeights.data)).toEqual([12, 16, 24, 28]); expect(conv.gradBias.get(0)).toBe(4); expect(Array.from(inputGrad.data)).toEqual([1, 1, 0, 1, 0, -1, 0, -1, -1]);
  });
  it("agrees with finite differences for convolution weights (tolerance 2e-3 for Float32)", () => {
    const conv = new Conv2D(1, 1, 2, { seed: 1 }); const input = Tensor.from([0.2, -0.1, 0.3, 0.7, -0.4, 0.5, -0.2, 0.6, 0.1], [1, 3, 3]);
    conv.weights.data.set([0.1, -0.2, 0.3, 0.4]); const upstream = Tensor.from([0.5, -0.4, 0.2, 0.1], [1, 2, 2]); conv.forward(input); conv.backward(upstream);
    const epsilon = 1e-3;
    for (let index = 0; index < conv.weights.size; index += 1) {
      const original = conv.weights.data[index]!; conv.weights.data[index] = original + epsilon; const plus = dot(conv.forward(input), upstream); conv.weights.data[index] = original - epsilon; const minus = dot(conv.forward(input), upstream); conv.weights.data[index] = original;
      expect(Math.abs((plus - minus) / (2 * epsilon) - conv.gradWeights.data[index]!)).toBeLessThan(2e-3);
    }
  });
  it("routes max-pool ties to the first row-major maximum and gates ReLU gradients", () => {
    const pool = new MaxPool2D(2); expect(Array.from(pool.forward(Tensor.from([5, 5, 1, 0], [1, 2, 2])).data)).toEqual([5]); expect(Array.from(pool.backward(Tensor.from([3], [1, 1, 1])).data)).toEqual([3, 0, 0, 0]);
    const relu = new ReLU(); expect(Array.from(relu.forward(Tensor.from([-1, 0, 2], [3])).data)).toEqual([0, 0, 2]); expect(Array.from(relu.backward(Tensor.from([4, 4, 4], [3])).data)).toEqual([0, 0, 4]);
  });
  it("computes dense forward and backward using weights[outFeature, inFeature]", () => {
    const dense = new Dense(2, 3, { seed: 1, name: "known" });
    dense.weights.data.set([1, 2, -1, 3, 0.5, -2]); dense.bias.data.set([0.5, -1, 2]);
    const output = dense.forward(Tensor.from([4, -2], [2]));
    expect(Array.from(output.data)).toEqual([0.5, -11, 8]);
    const inputGradient = dense.backward(Tensor.from([2, -3, 4], [3]));
    expect(Array.from(dense.gradWeights.data)).toEqual([8, -4, -12, 6, 16, -8]);
    expect(Array.from(dense.gradBias.data)).toEqual([2, -3, 4]);
    expect(Array.from(inputGradient.data)).toEqual([7, -13]);
    expect(() => dense.forward(Tensor.zeros([1, 2]))).toThrow("expects shape [2]");
    expect(() => dense.backward(Tensor.zeros([2]))).toThrow("expects gradient shape [3]");
  });
  it("agrees with finite differences for dense weights and input", () => {
    const dense = new Dense(2, 2, { seed: 1 }); dense.weights.data.set([0.2, -0.3, 0.4, 0.5]); dense.bias.data.set([0.1, -0.2]);
    const input = Tensor.from([0.6, -0.7], [2]); const upstream = Tensor.from([0.8, -0.9], [2]); dense.forward(input); const inputGradient = dense.backward(upstream); const epsilon = 1e-3;
    for (let index = 0; index < dense.weights.size; index += 1) {
      const original = dense.weights.data[index]!; dense.weights.data[index] = original + epsilon; const plus = dot(dense.forward(input), upstream); dense.weights.data[index] = original - epsilon; const minus = dot(dense.forward(input), upstream); dense.weights.data[index] = original;
      expect(Math.abs((plus - minus) / (2 * epsilon) - dense.gradWeights.data[index]!)).toBeLessThan(2e-3);
    }
    for (let index = 0; index < input.size; index += 1) {
      const original = input.data[index]!; input.data[index] = original + epsilon; const plus = dot(dense.forward(input), upstream); input.data[index] = original - epsilon; const minus = dot(dense.forward(input), upstream); input.data[index] = original;
      expect(Math.abs((plus - minus) / (2 * epsilon) - inputGradient.data[index]!)).toBeLessThan(2e-3);
    }
  });
});
describe("softmax categorical cross-entropy", () => {
  it("is finite and normalized for extreme logits", () => {
    const probabilities = softmax(Tensor.from([100, 0, -100], [3]));
    expect(probabilities.data.every(Number.isFinite)).toBe(true); close(probabilities.data.reduce((sum, value) => sum + value, 0), 1, 1e-6); expect(probabilities.get(0)).toBeGreaterThan(0.99999);
    expect(new SoftmaxCrossEntropy().forward(Tensor.from([100, 0, -100], [3]), 2)).toBeCloseTo(200, 6);
  });
  it("returns softmax minus one-hot for every AirDraw class id", () => {
    const logits = Tensor.from([1, 2, 3], [3]); const probabilities = softmax(logits);
    for (const target of [0, 1, 2]) {
      const loss = new SoftmaxCrossEntropy(); loss.forward(logits, target); const gradient = loss.backward();
      for (let index = 0; index < 3; index += 1) close(gradient.get(index), probabilities.get(index) - (index === target ? 1 : 0), 1e-6);
    }
  });
  it("lowers loss when the correct logit rises and validates its contract", () => {
    const loss = new SoftmaxCrossEntropy(); const before = loss.forward(Tensor.from([0, 0, 0], [3]), 2); const after = loss.forward(Tensor.from([0, 0, 3], [3]), 2); expect(after).toBeLessThan(before);
    expect(() => softmax(Tensor.zeros([2]))).toThrow("shape [3]"); expect(() => loss.forward(Tensor.zeros([3]), 3)).toThrow("class id"); expect(() => loss.backward()).not.toThrow();
  });
});
describe("initialization and Adam", () => {
  it("is seeded and applies independent named updates", () => {
    expect(Array.from(heNormal([4], 2, new SeededRandom(42)).data)).toEqual(Array.from(heNormal([4], 2, new SeededRandom(42)).data));
    const one = Tensor.from([1], [1]); const two = Tensor.from([10], [1]); const adam = new Adam(0.1); adam.step([{ name: "one", data: one, grad: Tensor.from([1], [1]) }, { name: "two", data: two, grad: Tensor.from([-2], [1]) }]); close(one.get(0), 0.9, 1e-5); close(two.get(0), 10.1, 1e-5);
    const badGradient = Tensor.zeros([1]); badGradient.data[0] = Number.POSITIVE_INFINITY;
    expect(() => adam.step([{ name: "bad", data: one, grad: badGradient }])).toThrow("non-finite");
  });
});
describe("ShapeCNN", () => {
  it("maps a grayscale 32x32 image to three finite logits and probabilities", () => {
    const model = new ShapeCNN({ seed: 7 });
    const image = Tensor.zeros([1, 32, 32]);
    const logits = model.forwardLogits(image);
    const probabilities = model.probabilities(logits);
    expect(logits.shape).toEqual([3]);
    expect(probabilities.shape).toEqual([3]);
    expect(Array.from(logits.data).every(Number.isFinite)).toBe(true);
    close(probabilities.data.reduce((sum, value) => sum + value, 0), 1, 1e-6);
    expect(model.parameterCount()).toBe(SHAPE_CNN_PARAMETER_COUNT);
    expect(model.parameters().map((parameter) => parameter.name)).toEqual([
      "conv1.weight", "conv1.bias", "conv2.weight", "conv2.bias",
      "dense1.weight", "dense1.bias", "output.weight", "output.bias",
    ]);
    expect(() => model.forward(Tensor.zeros([3, 32, 32]))).toThrow("shape [1,32,32]");
  });

  it("backpropagates categorical and explicit logits gradients through every layer", () => {
    const model = new ShapeCNN({ seed: 8 });
    const image = Tensor.zeros([1, 32, 32]); image.data[16 * 32 + 16] = 1;
    model.forward(image);
    const loss = model.backward(2);
    expect(loss).toBeGreaterThan(0);
    for (const parameter of model.parameters()) {
      expect(parameter.grad.shape).toEqual(parameter.data.shape);
      expect(Array.from(parameter.grad.data).every(Number.isFinite)).toBe(true);
    }
    model.forward(image);
    const inputGradient = model.backwardFromLogitGradient(Tensor.from([0.2, -0.1, -0.1], [3]));
    expect(inputGradient.shape).toEqual([1, 32, 32]);
    expect(Array.from(inputGradient.data).every(Number.isFinite)).toBe(true);
  });

  it("deterministically overfits three distinct synthetic drawings", () => {
    const model = new ShapeCNN({ seed: 31 }); const optimizer = new Adam(0.01);
    const examples = [0, 1, 2].map((label) => ({ label, input: syntheticImage(label) }));
    let initialLoss = 0;
    for (const example of examples) { model.forward(example.input); initialLoss += model.backward(example.label); }
    for (let epoch = 0; epoch < 90; epoch += 1) for (const example of examples) {
      model.forward(example.input); model.backward(example.label); optimizer.step(model.parameters());
    }
    let finalLoss = 0; let correct = 0;
    for (const example of examples) {
      const logits = model.forward(example.input); finalLoss += new SoftmaxCrossEntropy().forward(logits, example.label);
      const prediction = logits.data.reduce((best, value, index, values) => value > values[best]! ? index : best, 0);
      if (prediction === example.label) correct += 1;
    }
    expect(finalLoss).toBeLessThan(initialLoss * 0.2);
    expect(correct).toBe(3);
  });
});
describe("ShapeCNN artifact", () => {
  const metadata = { seed: 19, datasetManifestHash: "fixture:not-trained", epochsCompleted: 0, bestValidationEpoch: 0, status: "untrained-fixture" as const };
  const fixture = () => serializeShapeCnn(new ShapeCNN({ seed: 19 }), { training: metadata });

  it("round-trips a non-trained fixture with equivalent logits and probabilities", () => {
    const original = new ShapeCNN({ seed: 19 });
    const reloaded = loadShapeCnnArtifact(serializeShapeCnn(original, { training: metadata }));
    const input = syntheticImage(2);
    expect(Array.from(reloaded.forwardLogits(input).data)).toEqual(Array.from(original.forwardLogits(input).data));
    expect(Array.from(reloaded.forwardProbabilities(input).data)).toEqual(Array.from(original.forwardProbabilities(input).data));
  });

  it.each([
    ["checksum", (artifact: Record<string, unknown>) => { (artifact.parameters as Record<string, number[]>)["conv1.bias"]![0] += .001; }, "checksumSha256"],
    ["schema", (artifact: Record<string, unknown>) => { artifact.schemaVersion = 2; }, "schemaVersion"],
    ["class order", (artifact: Record<string, unknown>) => { artifact.classNames = ["square", "circle", "triangle"]; }, "classNames"],
    ["architecture", (artifact: Record<string, unknown>) => { (artifact.architecture as Record<string, unknown>).denseUnits = 31; }, "architecture.denseUnits"],
    ["missing parameter", (artifact: Record<string, unknown>) => { delete (artifact.parameters as Record<string, unknown>)["conv1.weight"]; }, "missing parameter"],
    ["wrong parameter length", (artifact: Record<string, unknown>) => { (artifact.parameters as Record<string, number[]>)["conv1.bias"] = [0]; }, "length"],
    ["non-finite parameter", (artifact: Record<string, unknown>) => { (artifact.parameters as Record<string, number[]>)["conv1.bias"]![0] = Number.NaN; }, "non-finite"],
  ])("rejects corrupted %s", (_name, corrupt, message) => {
    const artifact = structuredClone(fixture()) as unknown as Record<string, unknown>;
    corrupt(artifact);
    expect(() => validateShapeCnnArtifact(artifact)).toThrow(message);
    expect(() => loadShapeCnnArtifact(artifact)).toThrow(message);
  });
});
describe("Drawing preprocessing", () => {
  it("returns empty states for empty and degenerate drawings", () => {
    expect(preprocessDrawing({ revision: 0, strokes: [] })).toEqual({ kind: "empty", reason: "no-ink" });
    expect(preprocessDrawing(drawing([{ id: "dot", points: [[.5, .5]] }]))).toEqual({ kind: "empty", reason: "too-short" });
    expect(preprocessDrawing(drawing([{ id: "flat", points: [[.5, .5], [.5, .5]] }]))).toEqual({ kind: "empty", reason: "too-short" });
  });
  it("keeps disconnected strokes disconnected", () => {
    const result = ready(preprocessDrawing(drawing([{ id: "left", points: [[.1, .5], [.3, .5]] }, { id: "right", points: [[.7, .5], [.9, .5]] }])));
    const middle = result.tensor[16 * 32 + 16]!;
    expect(middle).toBe(0);
    expect(result.inkFraction).toBeGreaterThan(0);
  });
  it("is finite, bounded, and handles normalized-canvas limits", () => {
    const result = ready(preprocessDrawing(drawing([{ id: "edges", points: [[0, 0], [1, 0], [1, 1]] }])));
    expect(result.tensor).toHaveLength(1024); expect(result.width).toBe(32); expect(result.height).toBe(32);
    expect(result.tensor.every((value) => Number.isFinite(value) && value >= 0 && value <= 1)).toBe(true);
    expect(() => preprocessDrawing({ revision: 0, strokes: [{ id: "bad", points: [{ x: Number.NaN, y: 0 }] }] })).toThrow(RangeError);
    expect(() => preprocessDrawing({ revision: 0, strokes: [{ id: "bad", points: [{ x: -0.01, y: 0 }] }] })).toThrow(RangeError);
  });
  it("is invariant to uniform translation and scale", () => {
    const base = ready(preprocessDrawing(drawing([{ id: "shape", points: [[.2, .2], [.5, .7], [.8, .2]] }])));
    const translatedScaled = ready(preprocessDrawing(drawing([{ id: "shape", points: [[.3, .3], [.45, .55], [.6, .3]] }])));
    expect(Array.from(translatedScaled.tensor)).toEqual(Array.from(base.tensor));
  });
  it("is deterministic byte-for-byte and uses the same pure path in Node and browser callers", () => {
    const fixture = drawing([{ id: "a", points: [[.1, .2], [.8, .3], [.4, .9]] }, { id: "b", points: [[.2, .7], [.3, .8]] }]);
    const nodeTensor = ready(preprocessDrawing(fixture)).tensor;
    const browserTensor = ready(preprocessDrawing(fixture)).tensor;
    expect(Array.from(new Uint8Array(nodeTensor.buffer))).toEqual(Array.from(new Uint8Array(browserTensor.buffer)));
    expect(tensorToAscii(nodeTensor).split("\n")).toHaveLength(32);
  });
});
function drawing(strokes: ReadonlyArray<{ id: string; points: ReadonlyArray<readonly [number, number]> }>): Drawing {
  return { revision: 1, strokes: strokes.map((stroke) => ({ id: stroke.id, points: stroke.points.map(([x, y]) => ({ x, y })) })) };
}
function ready(result: ReturnType<typeof preprocessDrawing>): Extract<ReturnType<typeof preprocessDrawing>, { kind: "ready" }> {
  if (result.kind !== "ready") throw new Error(`Expected ready preprocessing result, received ${result.kind}.`);
  return result;
}
function dot(left: Tensor, right: Tensor): number { return left.data.reduce((sum, value, index) => sum + value * right.data[index]!, 0); }
function syntheticImage(label: number): Tensor {
  const image = Tensor.zeros([1, 32, 32]);
  if (label === 0) for (let y = 8; y < 24; y += 1) image.set(1, 0, y, 8);
  if (label === 1) for (let x = 8; x < 24; x += 1) image.set(1, 0, 8, x);
  if (label === 2) for (let index = 0; index < 16; index += 1) image.set(1, 0, 8 + index, 8 + index);
  return image;
}
