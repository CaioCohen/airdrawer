import { inflateSync } from "node:zlib";
import { readFileSync } from "node:fs";
import { resolve, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { SHAPE_LABELS, SHAPE_LABEL_IDS, type ShapeLabel } from "@airdraw/contracts";

/** Immutable description of the hand-drawn PNG corpus already in scripts/images. */
export type CorpusSplit = "train" | "val" | "test";

export interface CorpusSample {
  readonly id: string;
  /** Stable original manual drawing; all _aug_ siblings share this value. */
  readonly groupId: string;
  readonly split: CorpusSplit;
  readonly label: ShapeLabel;
  readonly labelId: number;
  readonly source: string;
  readonly augmented: boolean;
  readonly path: string;
}

export interface CorpusAudit {
  readonly samples: readonly CorpusSample[];
  readonly counts: Readonly<Record<CorpusSplit, Readonly<Record<ShapeLabel, number>>>>;
  readonly groups: number;
}

/**
 * Image-corpus contract v1: decoded PNGs are read upright (no EXIF transform),
 * grayscale luminance is composited on white, dark border => inverted, and
 * `ink = clamp((220 - luminance) / 220, 0, 1)`.  Thus the model sees the same
 * convention as the whiteboard: background 0 and dark ink 1.  Resampling is
 * deterministic area averaging into channel-first [1, 32, 32].
 */
export const IMAGE_CORPUS_PREPROCESS_VERSION = "image-corpus-v1";
export const IMAGE_INK_THRESHOLD = 220;
export const IMAGE_SIZE = 32;

export function loadExistingCorpus(corpusRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../scripts/images")): CorpusAudit {
  const manifestPath = resolve(corpusRoot, "manifest.csv");
  const lines = readFileSync(manifestPath, "utf8").trim().split(/\r?\n/);
  if (lines.shift() !== "path,split,label,source,augmented") throw new Error(`Unexpected corpus manifest header: ${manifestPath}`);
  const samples = lines.map((line, lineIndex) => parseManifestLine(line, lineIndex + 2, corpusRoot));
  if (samples.length === 0) throw new Error("Corpus manifest has no samples.");

  const splitByGroup = new Map<string, CorpusSplit>();
  const ids = new Set<string>();
  for (const sample of samples) {
    if (ids.has(sample.id)) throw new Error(`Duplicate corpus sample id: ${sample.id}`);
    ids.add(sample.id);
    const prior = splitByGroup.get(sample.groupId);
    if (prior !== undefined && prior !== sample.split) throw new Error(`Data leakage: group ${sample.groupId} appears in ${prior} and ${sample.split}.`);
    splitByGroup.set(sample.groupId, sample.split);
    // Decode now: a bad/truncated/non-PNG listed by the manifest must fail early.
    decodePng(readFileSync(sample.path));
  }
  const counts = emptyCounts();
  for (const sample of samples) counts[sample.split][sample.label] += 1;
  return { samples, counts, groups: splitByGroup.size };
}

/** Load one manifest sample as a finite Float32Array in exact [1,32,32] layout. */
export function loadCorpusImage(sample: CorpusSample): Float32Array {
  return pngToWhiteboardTensor(decodePng(readFileSync(sample.path)));
}

export function pngToWhiteboardTensor(image: DecodedPng): Float32Array {
  const luminance = new Float32Array(image.width * image.height);
  for (let i = 0; i < luminance.length; i += 1) {
    const pixel = image.rgba.subarray(i * 4, i * 4 + 4);
    // Alpha composited over the whiteboard before deciding ink.
    luminance[i] = ((0.2126 * pixel[0]! + 0.7152 * pixel[1]! + 0.0722 * pixel[2]!) * pixel[3]! + 255 * (255 - pixel[3]!)) / 255;
  }
  const border: number[] = [];
  for (let x = 0; x < image.width; x += 1) border.push(luminance[x]!, luminance[(image.height - 1) * image.width + x]!);
  for (let y = 1; y < image.height - 1; y += 1) border.push(luminance[y * image.width]!, luminance[y * image.width + image.width - 1]!);
  border.sort((a, b) => a - b);
  const inverted = border[Math.floor(border.length / 2)]! < 127;
  const output = new Float32Array(IMAGE_SIZE * IMAGE_SIZE);
  for (let y = 0; y < IMAGE_SIZE; y += 1) for (let x = 0; x < IMAGE_SIZE; x += 1) {
    let total = 0;
    const x0 = x * image.width / IMAGE_SIZE, x1 = (x + 1) * image.width / IMAGE_SIZE;
    const y0 = y * image.height / IMAGE_SIZE, y1 = (y + 1) * image.height / IMAGE_SIZE;
    for (let sy = Math.floor(y0); sy < Math.ceil(y1); sy += 1) for (let sx = Math.floor(x0); sx < Math.ceil(x1); sx += 1) {
      const overlap = Math.max(0, Math.min(x1, sx + 1) - Math.max(x0, sx)) * Math.max(0, Math.min(y1, sy + 1) - Math.max(y0, sy));
      const value = inverted ? luminance[sy * image.width + sx]! : 255 - luminance[sy * image.width + sx]!;
      total += overlap * Math.max(0, Math.min(1, (IMAGE_INK_THRESHOLD - (255 - value)) / IMAGE_INK_THRESHOLD));
    }
    output[y * IMAGE_SIZE + x] = total / ((x1 - x0) * (y1 - y0));
  }
  if (!output.some((value) => value > 0) || output.some((value) => !Number.isFinite(value) || value < 0 || value > 1)) throw new Error("PNG has no valid whiteboard ink after normalization.");
  return output;
}

export interface DecodedPng { readonly width: number; readonly height: number; readonly rgba: Uint8Array; }

/** Strict, dependency-free PNG decoder for the 8-bit non-interlaced PNGs accepted by this corpus. */
export function decodePng(bytes: Uint8Array): DecodedPng {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (signature.some((byte, i) => bytes[i] !== byte)) throw new Error("Expected a PNG signature.");
  let offset = 8, width = 0, height = 0, colorType = -1; const chunks: Uint8Array[] = [];
  while (offset + 12 <= bytes.length) {
    const length = readU32(bytes, offset); const type = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8));
    const dataStart = offset + 8, dataEnd = dataStart + length;
    if (dataEnd + 4 > bytes.length) throw new Error("Truncated PNG chunk.");
    if (type === "IHDR") { width = readU32(bytes, dataStart); height = readU32(bytes, dataStart + 4); if (bytes[dataStart + 8] !== 8 || bytes[dataStart + 10] !== 0 || bytes[dataStart + 11] !== 0 || bytes[dataStart + 12] !== 0) throw new Error("PNG must be 8-bit, non-interlaced and use the standard compression/filter methods."); colorType = bytes[dataStart + 9]!; }
    if (type === "IDAT") chunks.push(bytes.slice(dataStart, dataEnd));
    if (type === "IEND") break;
    offset = dataEnd + 4;
  }
  const channels = colorType === 0 ? 1 : colorType === 2 ? 3 : colorType === 4 ? 2 : colorType === 6 ? 4 : 0;
  if (!width || !height || !channels || chunks.length === 0) throw new Error("Unsupported or incomplete PNG.");
  const raw = inflateSync(Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)))); const stride = width * channels;
  if (raw.length !== height * (stride + 1)) throw new Error("PNG scanline length is invalid.");
  const decoded = new Uint8Array(height * stride); let cursor = 0;
  for (let y = 0; y < height; y += 1) { const filter = raw[cursor++]!; const row = decoded.subarray(y * stride, (y + 1) * stride); const prior = y ? decoded.subarray((y - 1) * stride, y * stride) : undefined;
    for (let x = 0; x < stride; x += 1) { const value = raw[cursor++]!; const left = x >= channels ? row[x - channels]! : 0, up = prior?.[x] ?? 0, upLeft = x >= channels ? (prior?.[x - channels] ?? 0) : 0; row[x] = filter === 0 ? value : filter === 1 ? (value + left) & 255 : filter === 2 ? (value + up) & 255 : filter === 3 ? (value + Math.floor((left + up) / 2)) & 255 : filter === 4 ? (value + paeth(left, up, upLeft)) & 255 : (() => { throw new Error(`Unsupported PNG filter ${filter}.`); })(); }
  }
  const rgba = new Uint8Array(width * height * 4);
  for (let i = 0, j = 0; i < decoded.length; i += channels, j += 4) { const r = decoded[i]!; rgba[j] = r; rgba[j + 1] = channels === 1 || channels === 2 ? r : decoded[i + 1]!; rgba[j + 2] = channels === 1 || channels === 2 ? r : decoded[i + 2]!; rgba[j + 3] = channels === 2 ? decoded[i + 1]! : channels === 4 ? decoded[i + 3]! : 255; }
  return { width, height, rgba };
}

function parseManifestLine(line: string, lineNumber: number, root: string): CorpusSample {
  const [relative, split, label, source, augmented] = line.split(",");
  if (!relative || !["train", "val", "test"].includes(split) || !SHAPE_LABELS.includes(label as ShapeLabel) || !source || !["0", "1"].includes(augmented ?? "")) throw new Error(`Invalid manifest row ${lineNumber}: ${line}`);
  const expectedPrefix = `${split}/${label}/`; if (!relative.startsWith(expectedPrefix) || extname(relative).toLowerCase() !== ".png") throw new Error(`Manifest row ${lineNumber} path does not match split/label: ${relative}`);
  const groupId = `${label}:${source}`;
  return { id: relative, groupId, split: split as CorpusSplit, label: label as ShapeLabel, labelId: SHAPE_LABEL_IDS[label as ShapeLabel], source, augmented: augmented === "1", path: resolve(root, relative) };
}
function emptyCounts(): Record<CorpusSplit, Record<ShapeLabel, number>> { return { train: { circle: 0, square: 0, triangle: 0 }, val: { circle: 0, square: 0, triangle: 0 }, test: { circle: 0, square: 0, triangle: 0 } }; }
function readU32(data: Uint8Array, index: number): number { return ((data[index]! << 24) >>> 0) + (data[index + 1]! << 16) + (data[index + 2]! << 8) + data[index + 3]!; }
function paeth(a: number, b: number, c: number): number { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); return pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
