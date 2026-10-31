import { Tensor } from "./tensor.js";

/** Fixed output order used by the AirDraw classifier. */
export const SHAPE_CLASS_COUNT = 3;

/** Numerically stable probabilities for one AirDraw logit vector `[circle, square, triangle]`. */
export function softmax(logits: Tensor): Tensor {
  assertLogits(logits, "softmax");
  let max = -Infinity;
  for (let index = 0; index < SHAPE_CLASS_COUNT; index += 1) max = Math.max(max, logits.get(index));
  let sumExp = 0;
  for (let index = 0; index < SHAPE_CLASS_COUNT; index += 1) sumExp += Math.exp(logits.get(index) - max);
  if (!Number.isFinite(sumExp) || sumExp <= 0) throw new Error("softmax could not form a finite positive normalizer.");
  const probabilities = Tensor.zeros([SHAPE_CLASS_COUNT]);
  for (let index = 0; index < SHAPE_CLASS_COUNT; index += 1) probabilities.set(Math.exp(logits.get(index) - max) / sumExp, index);
  return probabilities;
}

/**
 * Categorical cross-entropy for one AirDraw example. `forward` consumes raw
 * logits `[3]`; `backward` returns `softmax(logits) - oneHot(target)`.
 */
export class SoftmaxCrossEntropy {
  private probabilities: Tensor | undefined;
  private target: number | undefined;

  public forward(logits: Tensor, target: number): number {
    assertLogits(logits, "SoftmaxCrossEntropy.forward");
    assertTarget(target);
    let max = -Infinity;
    for (let index = 0; index < SHAPE_CLASS_COUNT; index += 1) max = Math.max(max, logits.get(index));
    let sumExp = 0;
    for (let index = 0; index < SHAPE_CLASS_COUNT; index += 1) sumExp += Math.exp(logits.get(index) - max);
    if (!Number.isFinite(sumExp) || sumExp <= 0) throw new Error("SoftmaxCrossEntropy.forward could not form a finite positive normalizer.");
    const logSumExp = max + Math.log(sumExp);
    this.probabilities = softmax(logits);
    this.target = target;
    // Do not compute -log(probability): Float32 probability storage may underflow
    // for extreme but otherwise valid logits.
    return logSumExp - logits.get(target);
  }

  public backward(): Tensor {
    if (!this.probabilities || this.target === undefined) throw new Error("SoftmaxCrossEntropy.backward requires a preceding forward call.");
    const gradient = this.probabilities.clone();
    gradient.set(gradient.get(this.target) - 1, this.target);
    return gradient;
  }
}

function assertLogits(logits: Tensor, context: string): void {
  if (logits.rank !== 1 || logits.shape[0] !== SHAPE_CLASS_COUNT) {
    throw new Error(`${context} expects logits with shape [${SHAPE_CLASS_COUNT}], received [${logits.shape}].`);
  }
  logits.assertFinite(`${context} logits`);
}

function assertTarget(target: number): void {
  if (!Number.isInteger(target) || target < 0 || target >= SHAPE_CLASS_COUNT) {
    throw new Error(`SoftmaxCrossEntropy target must be an integer class id in 0..${SHAPE_CLASS_COUNT - 1}, received ${target}.`);
  }
}
