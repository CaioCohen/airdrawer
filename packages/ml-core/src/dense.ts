import { Parameter } from "./parameters.js";
import { heNormal, SeededRandom } from "./random.js";
import { Tensor } from "./tensor.js";

/**
 * Fully connected affine layer for one example.
 *
 * `weights[o, i]` connects input feature `i` to output feature `o`, so
 * `output[o] = bias[o] + sum_i(weights[o, i] * input[i])`.
 */
export class Dense {
  public readonly weights: Tensor;
  public readonly bias: Tensor;
  public gradWeights: Tensor;
  public gradBias: Tensor;
  private lastInput: Tensor | undefined;
  private readonly name: string;

  public constructor(
    public readonly inFeatures: number,
    public readonly outFeatures: number,
    options: { seed?: number; name?: string } = {},
  ) {
    positive("inFeatures", inFeatures);
    positive("outFeatures", outFeatures);
    this.name = options.name ?? "dense";
    this.weights = heNormal([outFeatures, inFeatures], inFeatures, new SeededRandom(options.seed ?? 42));
    this.bias = Tensor.zeros([outFeatures]);
    this.gradWeights = Tensor.zeros(this.weights.shape);
    this.gradBias = Tensor.zeros(this.bias.shape);
  }

  public forward(input: Tensor): Tensor {
    if (input.rank !== 1 || input.shape[0] !== this.inFeatures) {
      throw new Error(`Dense.forward expects shape [${this.inFeatures}], received [${input.shape}].`);
    }
    input.assertFinite("Dense.forward input");
    const output = Tensor.zeros([this.outFeatures]);
    for (let outputIndex = 0; outputIndex < this.outFeatures; outputIndex += 1) {
      let sum = this.bias.get(outputIndex);
      for (let inputIndex = 0; inputIndex < this.inFeatures; inputIndex += 1) {
        sum += this.weights.get(outputIndex, inputIndex) * input.get(inputIndex);
      }
      output.set(sum, outputIndex);
    }
    this.lastInput = input;
    return output;
  }

  public backward(gradOutput: Tensor): Tensor {
    if (!this.lastInput) throw new Error("Dense.backward requires a preceding forward call.");
    if (gradOutput.rank !== 1 || gradOutput.shape[0] !== this.outFeatures) {
      throw new Error(`Dense.backward expects gradient shape [${this.outFeatures}], received [${gradOutput.shape}].`);
    }
    gradOutput.assertFinite("Dense.backward gradient");
    this.gradWeights = Tensor.zeros(this.weights.shape);
    this.gradBias = Tensor.zeros(this.bias.shape);
    const gradInput = Tensor.zeros([this.inFeatures]);
    for (let outputIndex = 0; outputIndex < this.outFeatures; outputIndex += 1) {
      const gradient = gradOutput.get(outputIndex);
      this.gradBias.set(gradient, outputIndex);
      for (let inputIndex = 0; inputIndex < this.inFeatures; inputIndex += 1) {
        this.gradWeights.set(this.lastInput.get(inputIndex) * gradient, outputIndex, inputIndex);
        gradInput.set(
          gradInput.get(inputIndex) + this.weights.get(outputIndex, inputIndex) * gradient,
          inputIndex,
        );
      }
    }
    return gradInput;
  }

  public parameters(): readonly Parameter[] {
    return [
      { name: `${this.name}.weight`, data: this.weights, grad: this.gradWeights },
      { name: `${this.name}.bias`, data: this.bias, grad: this.gradBias },
    ];
  }
}

function positive(name: string, value: number): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive safe integer, received ${value}.`);
  }
}
