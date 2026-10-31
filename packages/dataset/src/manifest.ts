import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SHAPE_LABELS, SHAPE_LABEL_IDS, type ShapeLabel } from "@airdraw/contracts";
import { IMAGE_CORPUS_PREPROCESS_VERSION, loadCorpusImage, loadExistingCorpus, type CorpusSample, type CorpusSplit } from "./corpus.js";

export const DATASET_MANIFEST_VERSION = "image-corpus-manifest-v1";
export const GENERATED_DATASET_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../../../datasets/generated/image-corpus-v1");
export const GENERATED_MANIFEST_PATH = resolve(GENERATED_DATASET_DIR, "manifest.jsonl");
export const GENERATED_AUDIT_PATH = resolve(GENERATED_DATASET_DIR, "audit.json");

export interface DatasetManifestEntry {
  readonly id: string;
  readonly groupId: string;
  readonly split: CorpusSplit;
  readonly label: ShapeLabel;
  readonly labelId: number;
  /** All supplied assets are complete rasters; no trajectory prefix is fabricated. */
  readonly visibleFraction: 1;
  readonly seed: number;
  /** There is no trajectory source for this supplied raster corpus. */
  readonly strokesFile: null;
  readonly source: string;
  /** POSIX-relative path below scripts/images, retained as provenance. */
  readonly path: string;
  readonly preprocessVersion: typeof IMAGE_CORPUS_PREPROCESS_VERSION;
  readonly checksum: string;
  readonly tensorChecksum: string;
}

export interface DatasetAudit {
  readonly version: typeof DATASET_MANIFEST_VERSION;
  readonly seed: number;
  readonly corpus: "scripts/images/manifest.csv";
  readonly preprocessVersion: typeof IMAGE_CORPUS_PREPROCESS_VERSION;
  readonly manifestSha256: string;
  readonly samples: number;
  readonly groups: number;
  /** Same-pixel assets retained from the supplied corpus, never silently deduplicated. */
  readonly identicalPngChecksums: number;
  readonly counts: Readonly<Record<CorpusSplit, Readonly<Record<ShapeLabel, number>>>>;
  readonly note: string;
}

export function generateDatasetManifest(seed: number, outputDirectory = GENERATED_DATASET_DIR): DatasetAudit {
  assertSeed(seed);
  const corpus = loadExistingCorpus();
  const entries = corpus.samples.map((sample) => entryFromSample(sample, seed)).sort((a, b) => a.id.localeCompare(b.id));
  const manifest = `${entries.map((entry) => JSON.stringify(entry)).join("\n")}\n`;
  const audit: DatasetAudit = {
    version: DATASET_MANIFEST_VERSION,
    seed,
    corpus: "scripts/images/manifest.csv",
    preprocessVersion: IMAGE_CORPUS_PREPROCESS_VERSION,
    manifestSha256: sha256(manifest),
    samples: entries.length,
    groups: corpus.groups,
    identicalPngChecksums: countIdenticalPngChecksums(entries),
    counts: corpus.counts,
    note: "The supplied split is preserved because it is already assigned by label:source before augmentation. Validation and test contain only 4 and 3 samples respectively and are statistically weak; no metrics are implied.",
  };
  const checked = auditDatasetManifest(entries, audit, corpus.samples);
  if (checked.manifestSha256 !== audit.manifestSha256) throw new Error("Internal manifest checksum mismatch.");
  mkdirSync(outputDirectory, { recursive: true });
  writeAtomically(resolve(outputDirectory, "manifest.jsonl"), manifest);
  writeAtomically(resolve(outputDirectory, "audit.json"), `${JSON.stringify(audit, null, 2)}\n`);
  return audit;
}

/** Validates the generated manifest against the immutable corpus, including every decoded tensor. */
export function inspectDatasetManifest(outputDirectory = GENERATED_DATASET_DIR): DatasetAudit {
  const manifestPath = resolve(outputDirectory, "manifest.jsonl");
  const auditPath = resolve(outputDirectory, "audit.json");
  if (!existsSync(manifestPath) || !existsSync(auditPath)) throw new Error(`Generated manifest is missing. Run pnpm dataset:generate --seed 42 first (${outputDirectory}).`);
  const manifestText = readFileSync(manifestPath, "utf8");
  const entries = manifestText.trimEnd().split("\n").filter(Boolean).map((line, index) => parseEntry(line, index + 1));
  const audit = parseAudit(readFileSync(auditPath, "utf8"));
  if (sha256(manifestText) !== audit.manifestSha256) throw new Error("Manifest checksum does not match audit.json.");
  auditDatasetManifest(entries, audit, loadExistingCorpus().samples);
  return audit;
}

function entryFromSample(sample: CorpusSample, seed: number): DatasetManifestEntry {
  const tensor = loadCorpusImage(sample);
  return {
    id: sample.id,
    groupId: sample.groupId,
    split: sample.split,
    label: sample.label,
    labelId: sample.labelId,
    visibleFraction: 1,
    seed,
    strokesFile: null,
    source: sample.source,
    path: sample.id,
    preprocessVersion: IMAGE_CORPUS_PREPROCESS_VERSION,
    checksum: sha256(readFileSync(sample.path)),
    tensorChecksum: sha256Tensor(tensor),
  };
}

function auditDatasetManifest(entries: readonly DatasetManifestEntry[], audit: DatasetAudit, corpusSamples: readonly CorpusSample[]): DatasetAudit {
  if (audit.version !== DATASET_MANIFEST_VERSION || audit.preprocessVersion !== IMAGE_CORPUS_PREPROCESS_VERSION) throw new Error("Unsupported generated dataset manifest version.");
  assertSeed(audit.seed);
  const sourceById = new Map(corpusSamples.map((sample) => [sample.id, sample]));
  if (entries.length !== sourceById.size || audit.samples !== entries.length) throw new Error(`Manifest sample count ${entries.length} does not match corpus ${sourceById.size}.`);
  const ids = new Set<string>(), paths = new Set<string>(), splitByGroup = new Map<string, CorpusSplit>();
  const counts = emptyCounts();
  for (const entry of entries) {
    if (ids.has(entry.id)) throw new Error(`Duplicate manifest id: ${entry.id}`);
    ids.add(entry.id);
    if (paths.has(entry.path)) throw new Error(`Duplicate manifest file path: ${entry.path}`);
    paths.add(entry.path);
    const source = sourceById.get(entry.id);
    if (!source) throw new Error(`Manifest entry is not in the supplied corpus: ${entry.id}`);
    if (entry.seed !== audit.seed || entry.path !== source.id || entry.groupId !== source.groupId || entry.split !== source.split || entry.label !== source.label || entry.labelId !== source.labelId || entry.source !== source.source || entry.visibleFraction !== 1 || entry.strokesFile !== null) throw new Error(`Manifest provenance mismatch for ${entry.id}.`);
    const priorSplit = splitByGroup.get(entry.groupId);
    if (priorSplit !== undefined && priorSplit !== entry.split) throw new Error(`Data leakage: group ${entry.groupId} appears in ${priorSplit} and ${entry.split}.`);
    splitByGroup.set(entry.groupId, entry.split);
    if (entry.checksum !== sha256(readFileSync(source.path))) throw new Error(`PNG checksum mismatch for ${entry.id}.`);
    const tensor = loadCorpusImage(source);
    if (tensor.length !== 1024 || !tensor.every((value) => Number.isFinite(value) && value >= 0 && value <= 1) || !tensor.some((value) => value > 0)) throw new Error(`Invalid tensor for ${entry.id}.`);
    if (entry.tensorChecksum !== sha256Tensor(tensor)) throw new Error(`Tensor checksum mismatch for ${entry.id}.`);
    counts[entry.split][entry.label] += 1;
  }
  if (splitByGroup.size !== audit.groups) throw new Error(`Manifest group count ${splitByGroup.size} does not match audit ${audit.groups}.`);
  if (countIdenticalPngChecksums(entries) !== audit.identicalPngChecksums) throw new Error("Manifest identical-PNG count does not match audit.json.");
  if (JSON.stringify(counts) !== JSON.stringify(audit.counts)) throw new Error("Manifest counts do not match audit.json.");
  return audit;
}

function parseEntry(line: string, lineNumber: number): DatasetManifestEntry {
  let value: unknown;
  try { value = JSON.parse(line); } catch { throw new Error(`Invalid JSON in manifest line ${lineNumber}.`); }
  if (!value || typeof value !== "object") throw new Error(`Invalid manifest entry at line ${lineNumber}.`);
  const entry = value as Record<string, unknown>;
  if (typeof entry.id !== "string" || typeof entry.groupId !== "string" || !["train", "val", "test"].includes(String(entry.split)) || !SHAPE_LABELS.includes(entry.label as ShapeLabel) || entry.labelId !== SHAPE_LABEL_IDS[entry.label as ShapeLabel] || entry.visibleFraction !== 1 || !Number.isSafeInteger(entry.seed) || entry.strokesFile !== null || typeof entry.source !== "string" || typeof entry.path !== "string" || entry.preprocessVersion !== IMAGE_CORPUS_PREPROCESS_VERSION || !isSha256(entry.checksum) || !isSha256(entry.tensorChecksum)) throw new Error(`Invalid manifest entry at line ${lineNumber}.`);
  return entry as unknown as DatasetManifestEntry;
}

function parseAudit(text: string): DatasetAudit {
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new Error("Invalid audit.json."); }
  if (!value || typeof value !== "object") throw new Error("Invalid audit.json.");
  const audit = value as Record<string, unknown>;
  if (audit.version !== DATASET_MANIFEST_VERSION || !Number.isSafeInteger(audit.seed) || audit.corpus !== "scripts/images/manifest.csv" || audit.preprocessVersion !== IMAGE_CORPUS_PREPROCESS_VERSION || !isSha256(audit.manifestSha256) || !Number.isSafeInteger(audit.samples) || !Number.isSafeInteger(audit.groups) || !Number.isSafeInteger(audit.identicalPngChecksums) || !audit.counts || typeof audit.note !== "string") throw new Error("Invalid audit.json.");
  return audit as unknown as DatasetAudit;
}

function emptyCounts(): Record<CorpusSplit, Record<ShapeLabel, number>> { return { train: { circle: 0, square: 0, triangle: 0 }, val: { circle: 0, square: 0, triangle: 0 }, test: { circle: 0, square: 0, triangle: 0 } }; }
function sha256(value: string | Uint8Array): string { return createHash("sha256").update(value).digest("hex"); }
function sha256Tensor(value: Float32Array): string { return sha256(new Uint8Array(value.buffer, value.byteOffset, value.byteLength)); }
function countIdenticalPngChecksums(entries: readonly DatasetManifestEntry[]): number { const seen = new Set<string>(); let identical = 0; for (const entry of entries) { if (seen.has(entry.checksum)) identical += 1; else seen.add(entry.checksum); } return identical; }
function isSha256(value: unknown): value is string { return typeof value === "string" && /^[a-f0-9]{64}$/.test(value); }
function assertSeed(seed: number): void { if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffff_ffff) throw new RangeError("Dataset seed must be an unsigned 32-bit integer."); }
function writeAtomically(path: string, contents: string): void { const temporary = `${path}.tmp`; writeFileSync(temporary, contents, "utf8"); renameSync(temporary, path); }
