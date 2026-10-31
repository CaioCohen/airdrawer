import { Dense } from "./dense.js";
import { Conv2D, MaxPool2D, ReLU } from "./layers.js";
import type { Parameter } from "./parameters.js";
import { softmax, SoftmaxCrossEntropy } from "./softmax-cross-entropy.js";
import { Tensor } from "./tensor.js";

/** The fixed, grayscale classifier topology used by AirDraw. */
export const SHAPE_CNN_INPUT_SHAPE = [1, 32, 32] as const;
export const SHAPE_CNN_PARAMETER_COUNT = 16_851;

/**
 * A deliberately small CNN for a single `[1, 32, 32]` drawing.
 *
 * `forward` and `forwardLogits` return raw logits. Call `probabilities` (or
 * `forwardProbabilities`) only when normalized class probabilities are needed.
 */
export class ShapeCNN {
  public readonly conv1: Conv2D;
  public readonly relu1 = new ReLU();
  public readonly pool1 = new MaxPool2D(2);
  public readonly conv2: Conv2D;
  public readonly relu2 = new ReLU();
  public readonly pool2 = new MaxPool2D(2);
  public readonly dense1: Dense;
  public readonly relu3 = new ReLU();
  public readonly output: Dense;
  private readonly loss = new SoftmaxCrossEntropy();
  private lastPool2Shape: readonly number[] | undefined;

  public constructor(options: { seed?: number } = {}) {
    const seed = options.seed ?? 42;
    this.conv1 = new Conv2D(1, 4, 3, { padding: 1, seed, name: "conv1" });
    this.conv2 = new Conv2D(4, 8, 3, { padding: 1, seed: seed + 1, name: "conv2" });
    this.dense1 = new Dense(512, 32, { seed: seed + 2, name: "dense1" });
    this.output = new Dense(32, 3, { seed: seed + 3, name: "output" });
  }

  public forward(input: Tensor): Tensor { return this.forwardLogits(input); }

  public forwardLogits(input: Tensor): Tensor {
    assertInput(input);
    let x = this.conv1.forward(input);
    assertShape(x, [4, 32, 32], "conv1 output");
    x = this.relu1.forward(x);
    x = this.pool1.forward(x);
    assertShape(x, [4, 16, 16], "pool1 output");
    x = this.conv2.forward(x);
    assertShape(x, [8, 16, 16], "conv2 output");
    x = this.relu2.forward(x);
    x = this.pool2.forward(x);
    assertShape(x, [8, 8, 8], "pool2 output");
    this.lastPool2Shape = x.shape;
    x = this.dense1.forward(x.reshape([512]));
    assertShape(x, [32], "dense1 output");
    x = this.relu3.forward(x);
    const logits = this.output.forward(x);
    assertShape(logits, [3], "output logits");
    logits.assertFinite("ShapeCNN.forward logits");
    this.cachedLogits = logits;
    return logits;
  }

  public probabilities(logits: Tensor): Tensor { return softmax(logits); }

  public forwardProbabilities(input: Tensor): Tensor {
    return this.probabilities(this.forwardLogits(input));
  }

  /** Computes categorical CE and backpropagates its logits gradient. */
  public backward(targetClass: number): number {
    const logits = this.lastLogits();
    const value = this.loss.forward(logits, targetClass);
    this.backwardFromLogitGradient(this.loss.backward());
    return value;
  }

  /** Backpropagates an externally supplied categorical/logits gradient `[3]`. */
  public backwardFromLogitGradient(gradient: Tensor): Tensor {
    assertShape(gradient, [3], "ShapeCNN logits gradient");
    gradient.assertFinite("ShapeCNN logits gradient");
    if (!this.lastPool2Shape) throw new Error("ShapeCNN.backward requires a preceding forward call.");
    let grad = this.output.backward(gradient);
    grad = this.relu3.backward(grad);
    grad = this.dense1.backward(grad);
    grad = grad.reshape(this.lastPool2Shape);
    grad = this.pool2.backward(grad);
    grad = this.relu2.backward(grad);
    grad = this.conv2.backward(grad);
    grad = this.pool1.backward(grad);
    grad = this.relu1.backward(grad);
    grad = this.conv1.backward(grad);
    grad.assertFinite("ShapeCNN input gradient");
    return grad;
  }

  public parameters(): readonly Parameter[] {
    return [...this.conv1.parameters(), ...this.conv2.parameters(), ...this.dense1.parameters(), ...this.output.parameters()];
  }

  public parameterCount(): number {
    return this.parameters().reduce((total, parameter) => total + parameter.data.size, 0);
  }

  private lastLogits(): Tensor {
    // Dense intentionally owns its cache. Reconstruct logits from that cache is
    // unsafe, therefore retain the latest result at the model boundary instead.
    if (!this.cachedLogits) throw new Error("ShapeCNN.backward requires a preceding forward call.");
    return this.cachedLogits;
  }

  private cachedLogits: Tensor | undefined;
}

function assertInput(input: Tensor): void {
  assertShape(input, SHAPE_CNN_INPUT_SHAPE, "ShapeCNN input");
  input.assertFinite("ShapeCNN input");
}

function assertShape(tensor: Tensor, expected: readonly number[], context: string): void {
  if (tensor.shape.length !== expected.length || tensor.shape.some((value, index) => value !== expected[index])) {
    throw new Error(`${context} must have shape [${expected}], received [${tensor.shape}].`);
  }
}
