import { SHAPE_LABELS } from "@airdraw/contracts";
import { ShapeCNN, SHAPE_CNN_INPUT_SHAPE } from "./shape-cnn.js";
import { Tensor } from "./tensor.js";

/** JSON contract shared by the training CLI and browser loader. */
export const SHAPE_CNN_ARTIFACT_SCHEMA_VERSION = 1 as const;
export const SHAPE_CNN_ARTIFACT_MODEL_VERSION = "shape-cnn-v1" as const;
export const SHAPE_CNN_ARTIFACT_PREPROCESSING_VERSION = "1.0.0" as const;
export const MODEL_SMOKE_TOLERANCE = 1e-5;

export interface ShapeCnnArchitecture {
  readonly inputShape: readonly [1, 32, 32];
  readonly conv1Filters: 4;
  readonly conv2Filters: 8;
  readonly kernelSize: 3;
  readonly denseUnits: 32;
  readonly outputUnits: 3;
}

export interface ShapeCnnTrainingMetadata {
  readonly seed: number;
  readonly datasetManifestHash: string;
  readonly epochsCompleted: number;
  readonly bestValidationEpoch: number;
  /** Fixtures are explicitly not eligible to be shipped as production weights. */
  readonly status: "trained" | "untrained-fixture";
}

export interface ShapeCnnArtifactV1 {
  readonly schemaVersion: typeof SHAPE_CNN_ARTIFACT_SCHEMA_VERSION;
  readonly modelVersion: typeof SHAPE_CNN_ARTIFACT_MODEL_VERSION;
  readonly architecture: ShapeCnnArchitecture;
  readonly classNames: readonly ["circle", "square", "triangle"];
  readonly preprocessingVersion: typeof SHAPE_CNN_ARTIFACT_PREPROCESSING_VERSION;
  readonly training: ShapeCnnTrainingMetadata;
  readonly parameters: Readonly<Record<string, readonly number[]>>;
  /** SHA-256 of the canonical artifact payload, excluding this field. */
  readonly checksumSha256: string;
}

export const SHAPE_CNN_ARCHITECTURE: ShapeCnnArchitecture = {
  inputShape: SHAPE_CNN_INPUT_SHAPE,
  conv1Filters: 4,
  conv2Filters: 8,
  kernelSize: 3,
  denseUnits: 32,
  outputUnits: 3,
};

export interface CreateShapeCnnArtifactOptions {
  readonly training: ShapeCnnTrainingMetadata;
  readonly modelVersion?: typeof SHAPE_CNN_ARTIFACT_MODEL_VERSION;
}

/** Converts a model to JSON-safe data. It deliberately performs no file I/O. */
export function serializeShapeCnn(model: ShapeCNN, options: CreateShapeCnnArtifactOptions): ShapeCnnArtifactV1 {
  const parameters: Record<string, number[]> = {};
  for (const parameter of model.parameters()) parameters[parameter.name] = Array.from(parameter.data.data);
  const payload = {
    schemaVersion: SHAPE_CNN_ARTIFACT_SCHEMA_VERSION,
    modelVersion: options.modelVersion ?? SHAPE_CNN_ARTIFACT_MODEL_VERSION,
    architecture: SHAPE_CNN_ARCHITECTURE,
    classNames: [...SHAPE_LABELS] as ["circle", "square", "triangle"],
    preprocessingVersion: SHAPE_CNN_ARTIFACT_PREPROCESSING_VERSION,
    training: options.training,
    parameters,
  };
  return { ...payload, checksumSha256: sha256Hex(canonicalArtifactPayload(payload)) };
}

/** Stable JSON input covered by the artifact checksum (usable in Node and browsers). */
export function canonicalArtifactPayload(artifact: Omit<ShapeCnnArtifactV1, "checksumSha256">): string {
  const { checksumSha256: _checksumSha256, ...payload } = artifact as ShapeCnnArtifactV1;
  return JSON.stringify(payload);
}

/**
 * Validates an untrusted JSON value, copies its weights into a fresh model, and
 * exercises that model before returning it. Any failure is safe to surface as a
 * browser-facing "model could not be loaded" error.
 */
export function loadShapeCnnArtifact(value: unknown): ShapeCNN {
  const artifact = validateShapeCnnArtifact(value);
  const model = new ShapeCNN();
  for (const parameter of model.parameters()) {
    const values = artifact.parameters[parameter.name]!;
    parameter.data.data.set(values);
  }
  runShapeCnnSmokeTest(model);
  return model;
}

/** Validates the schema without using Node APIs or allocating model tensors. */
export function validateShapeCnnArtifact(value: unknown): ShapeCnnArtifactV1 {
  const artifact = object(value, "artifact");
  equal(artifact.schemaVersion, SHAPE_CNN_ARTIFACT_SCHEMA_VERSION, "schemaVersion");
  equal(artifact.modelVersion, SHAPE_CNN_ARTIFACT_MODEL_VERSION, "modelVersion");
  equal(artifact.preprocessingVersion, SHAPE_CNN_ARTIFACT_PREPROCESSING_VERSION, "preprocessingVersion");
  validateArchitecture(artifact.architecture);
  validateClasses(artifact.classNames);
  validateTraining(artifact.training);
  const parameters = object(artifact.parameters, "parameters");
  if (typeof artifact.checksumSha256 !== "string" || !/^[a-f0-9]{64}$/.test(artifact.checksumSha256)) throw new Error("Model artifact checksumSha256 must be a lowercase SHA-256 hex digest.");
  const expected = expectedParameterLengths();
  const expectedNames = new Set(Object.keys(expected));
  for (const name of Object.keys(parameters)) if (!expectedNames.has(name)) throw new Error(`Model artifact contains unknown parameter ${name}.`);
  for (const [name, expectedLength] of Object.entries(expected)) {
    const values = parameters[name];
    if (!Array.isArray(values)) throw new Error(`Model artifact is missing parameter ${name}.`);
    if (values.length !== expectedLength) throw new Error(`Model artifact parameter ${name} has length ${values.length}; expected ${expectedLength}.`);
    values.forEach((number, index) => {
      if (typeof number !== "number" || !Number.isFinite(number) || !Number.isFinite(Math.fround(number))) {
        throw new Error(`Model artifact parameter ${name} has a non-finite value at index ${index}.`);
      }
    });
  }
  const typed = artifact as unknown as ShapeCnnArtifactV1;
  if (sha256Hex(canonicalArtifactPayload(typed)) !== typed.checksumSha256) throw new Error("Model artifact checksumSha256 does not match its contents.");
  return typed;
}

/** Small isomorphic SHA-256 implementation: artifact integrity must work before model loading in a browser. */
export function sha256Hex(text: string): string {
  const bytes = new TextEncoder().encode(text);
  const bitLength = bytes.length * 8;
  const paddedLength = ((bytes.length + 9 + 63) >> 6) << 6;
  const padded = new Uint8Array(paddedLength); padded.set(bytes); padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer); view.setUint32(paddedLength - 4, bitLength >>> 0, false); view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x1_0000_0000), false);
  const hash = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
  const constants = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  const words = new Uint32Array(64);
  for (let offset = 0; offset < paddedLength; offset += 64) {
    for (let i = 0; i < 16; i += 1) words[i] = view.getUint32(offset + i * 4, false);
    for (let i = 16; i < 64; i += 1) { const a = words[i - 15]!, b = words[i - 2]!; words[i] = (((a >>> 7) | (a << 25)) ^ ((a >>> 18) | (a << 14)) ^ (a >>> 3)) + words[i - 16]! + (((b >>> 17) | (b << 15)) ^ ((b >>> 19) | (b << 13)) ^ (b >>> 10)) + words[i - 7]!; }
    let [a,b,c,d,e,f,g,h] = Array.from(hash);
    for (let i = 0; i < 64; i += 1) { const s1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7)); const choice = (e & f) ^ (~e & g); const t1 = (h + s1 + choice + constants[i]! + words[i]!) >>> 0; const s0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10)); const majority = (a & b) ^ (a & c) ^ (b & c); h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + s0 + majority) >>> 0; }
    hash[0] = (hash[0]! + a) >>> 0; hash[1] = (hash[1]! + b) >>> 0; hash[2] = (hash[2]! + c) >>> 0; hash[3] = (hash[3]! + d) >>> 0; hash[4] = (hash[4]! + e) >>> 0; hash[5] = (hash[5]! + f) >>> 0; hash[6] = (hash[6]! + g) >>> 0; hash[7] = (hash[7]! + h) >>> 0;
  }
  return Array.from(hash, (word) => word.toString(16).padStart(8, "0")).join("");
}
function expectedParameterLengths(): Readonly<Record<string, number>> {
  return {
    "conv1.weight": 4 * 1 * 3 * 3, "conv1.bias": 4,
    "conv2.weight": 8 * 4 * 3 * 3, "conv2.bias": 8,
    "dense1.weight": 32 * 512, "dense1.bias": 32,
    "output.weight": 3 * 32, "output.bias": 3,
  };
}

/** Known all-zero input: output must be finite and sum to one within tolerance. */
export function runShapeCnnSmokeTest(model: ShapeCNN): void {
  const probabilities = model.forwardProbabilities(Tensor.zeros(SHAPE_CNN_INPUT_SHAPE));
  let sum = 0;
  for (const probability of probabilities.data) {
    if (!Number.isFinite(probability) || probability < 0 || probability > 1) throw new Error("Model smoke test failed: probabilities are not finite values in [0, 1].");
    sum += probability;
  }
  if (Math.abs(sum - 1) > MODEL_SMOKE_TOLERANCE) throw new Error(`Model smoke test failed: probability sum ${sum} exceeds tolerance ${MODEL_SMOKE_TOLERANCE}.`);
}

function validateArchitecture(value: unknown): void {
  const architecture = object(value, "architecture");
  const expected = SHAPE_CNN_ARCHITECTURE as unknown as Record<string, unknown>;
  for (const [key, expectedValue] of Object.entries(expected)) {
    const actual = architecture[key];
    if (Array.isArray(expectedValue)) {
      if (!Array.isArray(actual) || actual.length !== expectedValue.length || actual.some((entry, index) => entry !== expectedValue[index])) throw new Error(`Unsupported model architecture field ${key}.`);
    } else equal(actual, expectedValue, `architecture.${key}`);
  }
}
function validateClasses(value: unknown): void {
  if (!Array.isArray(value) || value.length !== SHAPE_LABELS.length || value.some((name, index) => name !== SHAPE_LABELS[index])) throw new Error(`Model artifact classNames must be [${SHAPE_LABELS.join(", ")}].`);
}
function validateTraining(value: unknown): void {
  const training = object(value, "training");
  if (!Number.isSafeInteger(training.seed)) throw new Error("Model artifact training.seed must be a safe integer.");
  if (typeof training.datasetManifestHash !== "string" || training.datasetManifestHash.length === 0) throw new Error("Model artifact training.datasetManifestHash must be a non-empty string.");
  for (const key of ["epochsCompleted", "bestValidationEpoch"] as const) if (!Number.isSafeInteger(training[key]) || (training[key] as number) < 0) throw new Error(`Model artifact training.${key} must be a non-negative safe integer.`);
  if (training.status !== "trained" && training.status !== "untrained-fixture") throw new Error("Model artifact training.status must be trained or untrained-fixture.");
}
function object(value: unknown, context: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error(`Model artifact ${context} must be an object.`);
  return value as Record<string, unknown>;
}
function equal(actual: unknown, expected: unknown, context: string): void {
  if (actual !== expected) throw new Error(`Unsupported model artifact ${context}: expected ${String(expected)}.`);
}
