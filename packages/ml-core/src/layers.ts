import { Parameter } from "./parameters.js";
import { heNormal, SeededRandom } from "./random.js";
import { Tensor } from "./tensor.js";

/** Adapted conceptually from D1's explicit loops, with Float32 and full stride support. */
export class Conv2D {
  public readonly weights: Tensor; public readonly bias: Tensor;
  public gradWeights: Tensor; public gradBias: Tensor;
  private lastInput: Tensor | undefined; private lastOutputShape: readonly number[] | undefined;
  private readonly stride: number; private readonly padding: number; private readonly name: string;
  public constructor(public readonly inChannels: number, public readonly outChannels: number, public readonly kernelSize: number, options: { stride?: number; padding?: number; seed?: number; name?: string } = {}) {
    positive("inChannels", inChannels); positive("outChannels", outChannels); positive("kernelSize", kernelSize);
    this.stride = options.stride ?? 1; this.padding = options.padding ?? 0; positive("stride", this.stride);
    if (!Number.isSafeInteger(this.padding) || this.padding < 0) throw new Error(`padding must be a non-negative safe integer, received ${this.padding}.`);
    this.name = options.name ?? "conv";
    this.weights = heNormal([outChannels, inChannels, kernelSize, kernelSize], inChannels * kernelSize * kernelSize, new SeededRandom(options.seed ?? 42));
    this.bias = Tensor.zeros([outChannels]); this.gradWeights = Tensor.zeros(this.weights.shape); this.gradBias = Tensor.zeros(this.bias.shape);
  }
  public forward(input: Tensor): Tensor {
    if (input.rank !== 3 || input.shape[0] !== this.inChannels) throw new Error(`Conv2D.forward expects shape [${this.inChannels},H,W], received [${input.shape}].`);
    const [, height, width] = input.shape; const outHeight = size(height!, this.kernelSize, this.stride, this.padding, "height"); const outWidth = size(width!, this.kernelSize, this.stride, this.padding, "width");
    const output = Tensor.zeros([this.outChannels, outHeight, outWidth]);
    for (let oc = 0; oc < this.outChannels; oc += 1) for (let oy = 0; oy < outHeight; oy += 1) for (let ox = 0; ox < outWidth; ox += 1) {
      let sum = this.bias.get(oc);
      for (let ic = 0; ic < this.inChannels; ic += 1) for (let ky = 0; ky < this.kernelSize; ky += 1) for (let kx = 0; kx < this.kernelSize; kx += 1) {
        const y = oy * this.stride + ky - this.padding; const x = ox * this.stride + kx - this.padding;
        if (y >= 0 && y < height! && x >= 0 && x < width!) sum += input.get(ic, y, x) * this.weights.get(oc, ic, ky, kx);
      }
      output.set(sum, oc, oy, ox);
    }
    this.lastInput = input; this.lastOutputShape = output.shape; return output;
  }
  public backward(gradOutput: Tensor): Tensor {
    if (!this.lastInput || !this.lastOutputShape) throw new Error("Conv2D.backward requires a preceding forward call.");
    if (!sameShape(gradOutput.shape, this.lastOutputShape)) throw new Error(`Conv2D.backward expected gradient shape [${this.lastOutputShape}], received [${gradOutput.shape}].`);
    gradOutput.assertFinite("Conv2D.backward gradient"); const input = this.lastInput; const [, height, width] = input.shape;
    this.gradWeights = Tensor.zeros(this.weights.shape); this.gradBias = Tensor.zeros(this.bias.shape); const gradInput = Tensor.zeros(input.shape); const [, outHeight, outWidth] = gradOutput.shape;
    for (let oc = 0; oc < this.outChannels; oc += 1) for (let oy = 0; oy < outHeight!; oy += 1) for (let ox = 0; ox < outWidth!; ox += 1) {
      const g = gradOutput.get(oc, oy, ox); this.gradBias.set(this.gradBias.get(oc) + g, oc);
      for (let ic = 0; ic < this.inChannels; ic += 1) for (let ky = 0; ky < this.kernelSize; ky += 1) for (let kx = 0; kx < this.kernelSize; kx += 1) {
        const y = oy * this.stride + ky - this.padding; const x = ox * this.stride + kx - this.padding;
        if (y >= 0 && y < height! && x >= 0 && x < width!) {
          this.gradWeights.set(this.gradWeights.get(oc, ic, ky, kx) + input.get(ic, y, x) * g, oc, ic, ky, kx);
          gradInput.set(gradInput.get(ic, y, x) + this.weights.get(oc, ic, ky, kx) * g, ic, y, x);
        }
      }
    }
    return gradInput;
  }
  public parameters(): readonly Parameter[] { return [{ name: `${this.name}.weight`, data: this.weights, grad: this.gradWeights }, { name: `${this.name}.bias`, data: this.bias, grad: this.gradBias }]; }
}

export class MaxPool2D {
  private argmax: Array<[number, number, number]> | undefined; private inputShape: readonly number[] | undefined; private outputShape: readonly number[] | undefined; private readonly stride: number;
  public constructor(private readonly poolSize = 2, stride?: number) { positive("poolSize", poolSize); this.stride = stride ?? poolSize; positive("stride", this.stride); }
  public forward(input: Tensor): Tensor {
    if (input.rank !== 3) throw new Error(`MaxPool2D.forward expects [C,H,W], received [${input.shape}].`);
    const [channels, height, width] = input.shape; const outHeight = size(height!, this.poolSize, this.stride, 0, "height"); const outWidth = size(width!, this.poolSize, this.stride, 0, "width"); const output = Tensor.zeros([channels!, outHeight, outWidth]); this.argmax = [];
    for (let c = 0; c < channels!; c += 1) for (let oy = 0; oy < outHeight; oy += 1) for (let ox = 0; ox < outWidth; ox += 1) {
      let max = -Infinity; let maxY = 0; let maxX = 0;
      for (let py = 0; py < this.poolSize; py += 1) for (let px = 0; px < this.poolSize; px += 1) { const y = oy * this.stride + py; const x = ox * this.stride + px; const candidate = input.get(c, y, x); if (candidate > max) { max = candidate; maxY = y; maxX = x; } }
      output.set(max, c, oy, ox); this.argmax.push([c, maxY, maxX]);
    }
    this.inputShape = input.shape; this.outputShape = output.shape; return output;
  }
  public backward(gradOutput: Tensor): Tensor {
    if (!this.argmax || !this.inputShape || !this.outputShape) throw new Error("MaxPool2D.backward requires a preceding forward call.");
    if (!sameShape(gradOutput.shape, this.outputShape)) throw new Error(`MaxPool2D.backward expected gradient shape [${this.outputShape}], received [${gradOutput.shape}].`);
    const gradInput = Tensor.zeros(this.inputShape); let index = 0;
    for (let c = 0; c < gradOutput.shape[0]!; c += 1) for (let y = 0; y < gradOutput.shape[1]!; y += 1) for (let x = 0; x < gradOutput.shape[2]!; x += 1) { const [wc, wy, wx] = this.argmax[index++]!; gradInput.set(gradInput.get(wc, wy, wx) + gradOutput.get(c, y, x), wc, wy, wx); }
    return gradInput;
  }
}
export class ReLU {
  private lastInput: Tensor | undefined;
  public forward(input: Tensor): Tensor { this.lastInput = input; return input.map((value) => Math.max(0, value)); }
  public backward(gradOutput: Tensor): Tensor { if (!this.lastInput) throw new Error("ReLU.backward requires a preceding forward call."); if (!sameShape(gradOutput.shape, this.lastInput.shape)) throw new Error(`ReLU.backward expected gradient shape [${this.lastInput.shape}], received [${gradOutput.shape}].`); return gradOutput.map((g, i) => this.lastInput!.data[i]! > 0 ? g : 0); }
}
function positive(name: string, value: number): void { if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`${name} must be a positive safe integer, received ${value}.`); }
function size(input: number, kernel: number, stride: number, padding: number, axis: string): number { const output = Math.floor((input + 2 * padding - kernel) / stride) + 1; if (output <= 0) throw new Error(`Invalid ${axis}: input ${input}, kernel ${kernel}, padding ${padding}, stride ${stride} produce output size ${output}.`); return output; }
function sameShape(a: readonly number[], b: readonly number[]): boolean { return a.length === b.length && a.every((value, i) => value === b[i]); }
