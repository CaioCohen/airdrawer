/**
 * Conceptually informed by the D1/D2 course Tensor examples. This independent
 * version uses Float32 storage and validates public indexing and shapes.
 */
export class Tensor {
  public readonly shape: readonly number[];
  public readonly strides: readonly number[];
  public readonly data: Float32Array;

  public constructor(data: Float32Array, shape: readonly number[]) {
    this.shape = validateShape(shape);
    this.strides = makeStrides(this.shape);
    const size = tensorSize(this.shape);
    if (data.length !== size) throw new Error(`Tensor data length ${data.length} does not match shape [${this.shape}] (size ${size}).`);
    this.data = data;
    this.assertFinite();
  }
  public static zeros(shape: readonly number[]): Tensor { return new Tensor(new Float32Array(tensorSize(shape)), shape); }
  public static from(values: readonly number[], shape: readonly number[]): Tensor { return new Tensor(new Float32Array(values), shape); }
  public static fromMatrix(matrix: readonly (readonly number[])[]): Tensor {
    if (matrix.length === 0 || matrix[0] === undefined || matrix[0].length === 0) throw new Error("Tensor.fromMatrix requires a non-empty matrix with at least one column.");
    const columns = matrix[0].length;
    if (matrix.some((row) => row.length !== columns)) throw new Error("Tensor.fromMatrix requires rows with equal lengths.");
    return Tensor.from(matrix.flat(), [matrix.length, columns]);
  }
  public get rank(): number { return this.shape.length; }
  public get size(): number { return this.data.length; }
  public get(...indices: number[]): number { return this.data[this.offset(indices)]!; }
  public set(value: number, ...indices: number[]): void {
    if (!Number.isFinite(value)) throw new Error(`Tensor.set requires a finite value, received ${value}.`);
    const stored = Math.fround(value);
    if (!Number.isFinite(stored)) throw new Error(`Tensor.set value ${value} overflows Float32 storage.`);
    this.data[this.offset(indices)] = stored;
  }
  public clone(): Tensor { return new Tensor(this.data.slice(), this.shape); }
  public reshape(shape: readonly number[]): Tensor {
    const next = validateShape(shape);
    if (tensorSize(next) !== this.size) throw new Error(`Cannot reshape [${this.shape}] (size ${this.size}) to [${next}] (size ${tensorSize(next)}).`);
    return new Tensor(this.data.slice(), next);
  }
  public map(fn: (value: number, offset: number) => number): Tensor {
    const next = new Float32Array(this.size);
    for (let i = 0; i < this.size; i += 1) {
      const value = fn(this.data[i]!, i);
      if (!Number.isFinite(value)) throw new Error(`Tensor.map produced non-finite value at offset ${i}: ${value}.`);
      next[i] = value;
    }
    return new Tensor(next, this.shape);
  }
  public assertFinite(context = "Tensor"): void {
    for (let i = 0; i < this.size; i += 1) if (!Number.isFinite(this.data[i]!)) throw new Error(`${context} contains a non-finite value at offset ${i}: ${this.data[i]}.`);
  }
  private offset(indices: readonly number[]): number {
    if (indices.length !== this.rank) throw new Error(`Tensor with shape [${this.shape}] requires exactly ${this.rank} indices; received ${indices.length}.`);
    let offset = 0;
    for (let dimension = 0; dimension < this.rank; dimension += 1) {
      const index = indices[dimension]!; const length = this.shape[dimension]!;
      if (!Number.isInteger(index) || index < 0 || index >= length) throw new Error(`Index ${index} is out of bounds for dimension ${dimension} with size ${length} in shape [${this.shape}].`);
      offset += index * this.strides[dimension]!;
    }
    return offset;
  }
}
export function tensorSize(shape: readonly number[]): number { return validateShape(shape).reduce((size, dimension) => size * dimension, 1); }
function validateShape(shape: readonly number[]): number[] {
  if (shape.length === 0) throw new Error("Tensor shape must have at least one dimension.");
  const copy = Array.from(shape);
  for (const dimension of copy) if (!Number.isSafeInteger(dimension) || dimension <= 0) throw new Error(`Tensor dimensions must be positive safe integers; received [${copy}].`);
  if (!Number.isSafeInteger(copy.reduce((total, dimension) => total * dimension, 1))) throw new Error(`Tensor shape [${copy}] is too large.`);
  return copy;
}
function makeStrides(shape: readonly number[]): number[] {
  const strides = new Array<number>(shape.length); let stride = 1;
  for (let i = shape.length - 1; i >= 0; i -= 1) { strides[i] = stride; stride *= shape[i]!; }
  return strides;
}
