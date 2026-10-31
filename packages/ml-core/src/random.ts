import { Tensor } from "./tensor.js";
/** Deterministic PRNG shared by initialization and later training code. */
export class SeededRandom {
  private state: number; private spareNormal: number | undefined;
  public constructor(seed: number) { if (!Number.isSafeInteger(seed)) throw new Error(`PRNG seed must be a safe integer, received ${seed}.`); this.state = seed >>> 0; }
  public next(): number { let value = (this.state += 0x6d2b79f5); value = Math.imul(value ^ (value >>> 15), value | 1); value ^= value + Math.imul(value ^ (value >>> 7), value | 61); return ((value ^ (value >>> 14)) >>> 0) / 4294967296; }
  public normal(): number {
    if (this.spareNormal !== undefined) { const value = this.spareNormal; this.spareNormal = undefined; return value; }
    const radius = Math.sqrt(-2 * Math.log(1 - this.next())); const angle = 2 * Math.PI * (1 - this.next());
    this.spareNormal = radius * Math.sin(angle); return radius * Math.cos(angle);
  }
}
/** He normal initialization for a layer followed by ReLU. */
export function heNormal(shape: readonly number[], fanIn: number, random: SeededRandom): Tensor {
  if (!Number.isSafeInteger(fanIn) || fanIn <= 0) throw new Error(`fanIn must be a positive safe integer, received ${fanIn}.`);
  const values = new Float32Array(shape.reduce((total, dimension) => total * dimension, 1)); const scale = Math.sqrt(2 / fanIn);
  for (let i = 0; i < values.length; i += 1) values[i] = random.normal() * scale;
  return new Tensor(values, shape);
}
