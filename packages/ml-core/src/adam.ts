import { Parameter } from "./parameters.js";
import { Tensor } from "./tensor.js";
/** Adam with state isolated by stable parameter name, based on the D1 optimizer concept. */
export class Adam {
  private readonly firstMoment = new Map<string, Tensor>(); private readonly secondMoment = new Map<string, Tensor>(); private stepCount = 0;
  public constructor(private readonly learningRate: number, private readonly beta1 = 0.9, private readonly beta2 = 0.999, private readonly epsilon = 1e-8) {
    if (!(learningRate > 0) || !Number.isFinite(learningRate)) throw new Error(`Adam learningRate must be finite and positive, received ${learningRate}.`);
    if (!(beta1 >= 0 && beta1 < 1) || !(beta2 >= 0 && beta2 < 1)) throw new Error("Adam beta1 and beta2 must be in [0, 1).");
    if (!(epsilon > 0) || !Number.isFinite(epsilon)) throw new Error(`Adam epsilon must be finite and positive, received ${epsilon}.`);
  }
  public step(parameters: readonly Parameter[]): void {
    const names = new Set<string>();
    for (const parameter of parameters) {
      if (!parameter.name || names.has(parameter.name)) throw new Error(`Adam requires unique non-empty parameter names; invalid name '${parameter.name}'.`); names.add(parameter.name);
      if (!sameShape(parameter.data.shape, parameter.grad.shape)) throw new Error(`Adam parameter '${parameter.name}' data shape [${parameter.data.shape}] differs from gradient shape [${parameter.grad.shape}].`);
      parameter.data.assertFinite(`Adam parameter '${parameter.name}'`); parameter.grad.assertFinite(`Adam gradient '${parameter.name}'`);
    }
    this.stepCount += 1;
    for (const parameter of parameters) {
      let m = this.firstMoment.get(parameter.name); let v = this.secondMoment.get(parameter.name);
      if (!m || !v) { m = Tensor.zeros(parameter.data.shape); v = Tensor.zeros(parameter.data.shape); this.firstMoment.set(parameter.name, m); this.secondMoment.set(parameter.name, v); }
      if (!sameShape(m.shape, parameter.data.shape)) throw new Error(`Adam state for '${parameter.name}' has incompatible shape [${m.shape}].`);
      for (let i = 0; i < parameter.data.size; i += 1) {
        const g = parameter.grad.data[i]!; const nextM = this.beta1 * m.data[i]! + (1 - this.beta1) * g; const nextV = this.beta2 * v.data[i]! + (1 - this.beta2) * g * g;
        const next = parameter.data.data[i]! - this.learningRate * (nextM / (1 - this.beta1 ** this.stepCount)) / (Math.sqrt(nextV / (1 - this.beta2 ** this.stepCount)) + this.epsilon);
        const storedM = Math.fround(nextM); const storedV = Math.fround(nextV); const storedParameter = Math.fround(next);
        if (!Number.isFinite(storedM) || !Number.isFinite(storedV) || !Number.isFinite(storedParameter)) throw new Error(`Adam update for '${parameter.name}' became non-finite at offset ${i}.`);
        m.data[i] = storedM; v.data[i] = storedV; parameter.data.data[i] = storedParameter;
      }
    }
  }
}
function sameShape(a: readonly number[], b: readonly number[]): boolean { return a.length === b.length && a.every((value, i) => value === b[i]); }
