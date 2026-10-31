import { cpus, platform, release, arch } from "node:os";
import { copyFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { loadCorpusImage, loadExistingCorpus, inspectDatasetManifest } from "@airdraw/dataset";
import { canonicalArtifactPayload, loadShapeCnnArtifact, ShapeCNN, sha256Hex, Tensor, type ShapeCnnArtifactV1 } from "@airdraw/ml-core";
import { writeShapeCnnArtifact } from "./model-artifact.js";
import { train, type TrainingExample } from "./training-loop.js";
import { fractionReport, summarizePredictions, UNCERTAINTY_POLICY } from "./evaluation-metrics.js";

const command = process.argv[2] ?? "unknown";
if (command === "train") void run().catch(reportFailure);
else if (command === "evaluate") void evaluateCommand().catch(reportFailure);
else if (command === "export") void exportCommand().catch(reportFailure);
else { console.error(`ml:${command} is not implemented yet.`); process.exitCode = 1; }

async function run(): Promise<void> {
  const seed = integerFlag("--seed", 42), epochs = integerFlag("--epochs", 25), learningRate = numberFlag("--lr", 0.001), patience = integerFlag("--patience", 5);
  if (seed < 0 || seed > 0xffff_ffff) throw new Error("--seed must be an unsigned 32-bit integer.");
  if (epochs <= 0) throw new Error("--epochs must be positive.");
  if (!(learningRate > 0) || !Number.isFinite(learningRate)) throw new Error("--lr must be finite and positive.");
  const output = resolve(process.cwd(), "artifacts/checkpoints", `shape-cnn-v1-seed-${seed}`);
  const audit = inspectDatasetManifest();
  const corpus = loadExistingCorpus();
  const examples = corpus.samples.map((sample): TrainingExample => ({ id: sample.id, label: sample.labelId, input: new Tensor(loadCorpusImage(sample), [1, 32, 32]) }));
  const trainExamples = examples.filter((_, index) => corpus.samples[index]!.split === "train");
  const validationExamples = examples.filter((_, index) => corpus.samples[index]!.split === "val");
  await mkdir(output, { recursive: true });
  const checkpoint = resolve(output, "best-validation-loss.json");
  const started = performance.now();
  const model = new ShapeCNN({ seed });
  let bestModel: ShapeCNN | undefined;
  const result = train(model, trainExamples, validationExamples, { epochs, learningRate, seed, patience }, (_epoch, best) => { bestModel = cloneModel(best); });
  if (!bestModel) throw new Error("Training completed without a validation checkpoint.");
  await writeShapeCnnArtifact(checkpoint, bestModel, { training: { seed, datasetManifestHash: audit.manifestSha256, epochsCompleted: result.epochsCompleted, bestValidationEpoch: result.bestEpoch, status: "trained" } });
  const restored = loadShapeCnnArtifact(JSON.parse(await readFile(checkpoint, "utf8")));
  await writeShapeCnnArtifact(checkpoint, restored, { training: { seed, datasetManifestHash: audit.manifestSha256, epochsCompleted: result.epochsCompleted, bestValidationEpoch: result.bestEpoch, status: "trained" } });
  const durationMs = performance.now() - started;
  await writeFile(resolve(output, "history.csv"), ["epoch,train_loss,train_accuracy,validation_loss,validation_accuracy", ...result.history.map((row) => [row.epoch, row.trainLoss, row.trainAccuracy, row.validationLoss, row.validationAccuracy].join(","))].join("\n") + "\n", "utf8");
  await writeFile(resolve(output, "run-config.json"), `${JSON.stringify({ seed, epochsRequested: epochs, epochsCompleted: result.epochsCompleted, learningRate, patience, batchStrategy: "per-sample", dataset: { version: audit.version, manifestSha256: audit.manifestSha256, samples: audit.samples, groups: audit.groups, counts: audit.counts }, architecture: "ShapeCNN [1,32,32] -> conv4 -> pool -> conv8 -> pool -> dense32 -> logits3", bestValidationEpoch: result.bestEpoch, bestValidationLoss: result.bestValidationLoss, stoppedEarly: result.stoppedEarly, durationMs, runtime: { node: process.version, platform: `${platform()} ${release()} ${arch()}`, cpu: cpus()[0]?.model ?? "unknown", logicalCpus: cpus().length }, limitations: ["Validation has only 4 supplied examples (circle=2, square=1, triangle=1), so checkpoint selection is statistically weak.", "Held-out test has 3 supplied examples and was deliberately not read for tuning or reporting by this command.", "Floating-point details can vary across Node/CPU platforms despite deterministic seeds." ] }, null, 2)}\n`, "utf8");
  console.log(`Training completed in ${(durationMs / 1000).toFixed(2)}s; best validation loss ${result.bestValidationLoss.toFixed(6)} at epoch ${result.bestEpoch}.`);
  console.log(`Artifacts: ${output}`);
  console.log("Warning: validation contains only 4 examples and is statistically weak; test was not used.");
}
function flag(name: string): string | undefined { const index = process.argv.indexOf(name); if (index === -1) return undefined; const value = process.argv[index + 1]; if (value === undefined) throw new Error(`${name} requires a value.`); return value; }
function integerFlag(name: string, fallback: number): number { const value = flag(name); const parsed = value === undefined ? fallback : Number(value); if (!Number.isSafeInteger(parsed)) throw new Error(`${name} must be a safe integer.`); return parsed; }
function numberFlag(name: string, fallback: number): number { const value = flag(name); const parsed = value === undefined ? fallback : Number(value); if (!Number.isFinite(parsed)) throw new Error(`${name} must be finite.`); return parsed; }
function cloneModel(model: ShapeCNN): ShapeCNN { const copy = new ShapeCNN({ seed: 0 }); const source = model.parameters(), target = copy.parameters(); for (let index = 0; index < source.length; index += 1) target[index]!.data.data.set(source[index]!.data.data); return copy; }

async function evaluateCommand(): Promise<void> {
  const splitFlag = flag("--split") ?? "test";
  if (splitFlag !== "test" && splitFlag !== "val") throw new Error("--split must be test or val.");
  const seed = integerFlag("--seed", 42);
  const checkpointDirectory = resolve(process.cwd(), "artifacts/checkpoints", `shape-cnn-v1-seed-${seed}`);
  const checkpointPath = resolve(checkpointDirectory, "best-validation-loss.json");
  const output = resolve(checkpointDirectory, "evaluation");
  const audit = inspectDatasetManifest();
  const corpus = loadExistingCorpus();
  const modelArtifact = JSON.parse(await readFile(checkpointPath, "utf8"));
  const model = loadShapeCnnArtifact(modelArtifact);
  const predict = (selectedSplit: "val" | "test") => corpus.samples
    .filter((sample) => sample.split === selectedSplit)
    .map((sample) => ({ id: sample.id, label: sample.labelId, visibleFraction: 1, probabilities: Array.from(model.forwardProbabilities(new Tensor(loadCorpusImage(sample), [1, 32, 32])).data) }));

  // These initial limits are frozen by the specification. Validation is evaluated
  // first and persisted before test is opened; no test result selects a setting.
  const validation = summarizePredictions(predict("val"));
  const calibration = {
    selectedOn: "validation", policy: UNCERTAINTY_POLICY, selection: "Frozen initial policy; no search or optimization was performed.",
    validation, limitation: "Validation has only 4 examples, so this measurement is statistically weak and does not establish calibration.",
  };
  await mkdir(output, { recursive: true });
  await writeFile(resolve(output, "calibration.json"), `${JSON.stringify(calibration, null, 2)}\n`, "utf8");
  // Materialize the requested split once, after validation calibration is written.
  const predictions = splitFlag === "test" ? predict("test") : predict("val");
  const selected = splitFlag === "test" ? summarizePredictions(predictions) : validation;
  const metrics = {
    schemaVersion: 1, evaluatedSplit: splitFlag, evaluatedAt: new Date().toISOString(),
    model: { version: modelArtifact.modelVersion, checkpoint: checkpointPath, selectedBy: "best validation loss", bestValidationEpoch: modelArtifact.training.bestValidationEpoch },
    classOrder: ["circle", "square", "triangle"], dataset: { manifestSha256: audit.manifestSha256, groups: audit.groups, counts: audit.counts, corpus: "scripts/images/manifest.csv" },
    uncertaintyPolicy: UNCERTAINTY_POLICY, overall: selected, byVisibleFraction: fractionReport(predictions),
    browserInferenceTiming: { status: "not-measured", reason: "No browser/hardware timing was run in this CLI evaluation; the p95 < 50 ms and 100–250 ms update goals are not claimed." },
    limitations: ["Test contains only 3 examples (one per class), so reported values are descriptive, not reliable performance estimates.", "No consented real-test samples were found or evaluated; synthetic/manual-raster results are not human-drawing results.", "The supplied corpus has no partial trajectories, so prefix/fraction metrics are unavailable."],
  };
  await writeFile(resolve(output, "metrics.json"), `${JSON.stringify(metrics, null, 2)}\n`, "utf8");
  await writeFile(resolve(output, "confusion-matrix.json"), `${JSON.stringify({ classOrder: metrics.classOrder, rows: "actual", columns: "predicted", matrix: selected.confusionMatrix, counts: selected.examples }, null, 2)}\n`, "utf8");
  await writeFile(resolve(output, "dataset-summary.json"), `${JSON.stringify({ ...audit, evaluatedSplit: splitFlag, evaluationExamples: selected.examples, visibleFractions: { status: "unavailable", observed: [1], reason: "No partial trajectories in supplied corpus." } }, null, 2)}\n`, "utf8");
  const runConfig = JSON.parse(await readFile(resolve(checkpointDirectory, "run-config.json"), "utf8"));
  await writeFile(resolve(output, "training-config.json"), `${JSON.stringify({ ...runConfig, evaluation: { policy: UNCERTAINTY_POLICY, calibratedOn: "validation before test", checkpointPath } }, null, 2)}\n`, "utf8");
  await writeFile(resolve(output, "history.csv"), await readFile(resolve(checkpointDirectory, "history.csv"), "utf8"), "utf8");
  console.log(`Evaluation (${splitFlag}) complete: accuracy ${(selected.accuracy * 100).toFixed(2)}%, accepted ${selected.accepted}/${selected.examples}, abstention ${(selected.abstentionRate * 100).toFixed(2)}%.`);
  console.log(`Artifacts: ${output}`);
  console.log("Warning: validation/test are only 4/3 examples; fraction and browser-timing metrics are unavailable/not measured.");
}

async function exportCommand(): Promise<void> {
  const seed = integerFlag("--seed", 42);
  const checkpointDirectory = resolve(process.cwd(), "artifacts/checkpoints", `shape-cnn-v1-seed-${seed}`);
  const checkpointPath = resolve(checkpointDirectory, "best-validation-loss.json");
  const outputPath = resolve(process.cwd(), "artifacts/models/shape-cnn.v1.json");
  const publicPath = resolve(process.cwd(), "../../apps/web/public/models/shape-cnn.v1.json");
  const rawCheckpoint = JSON.parse(await readFile(checkpointPath, "utf8"));
  // Checkpoints produced before the integrity field are accepted only as local
  // migration input; every exported/served artifact is checksummed.
  const checkpoint = rawCheckpoint.checksumSha256 ? rawCheckpoint : { ...rawCheckpoint, checksumSha256: sha256Hex(canonicalArtifactPayload(rawCheckpoint as Omit<ShapeCnnArtifactV1, "checksumSha256">)) };
  const model = loadShapeCnnArtifact(checkpoint);
  if (checkpoint.training.status !== "trained") throw new Error("Refusing to export an untrained fixture as the production model.");
  await writeShapeCnnArtifact(outputPath, model, { training: checkpoint.training });
  const local = JSON.parse(await readFile(outputPath, "utf8"));
  const localModel = loadShapeCnnArtifact(local);
  const fixture = exportFixture();
  const expected = predictionSnapshot(localModel, fixture);
  const clean = await verifyInCleanProcess(outputPath);
  assertEquivalentSnapshot(expected, clean);
  await mkdir(resolve(process.cwd(), "../../apps/web/public/models"), { recursive: true });
  await copyFile(outputPath, publicPath);
  const [outputStats, publicStats] = await Promise.all([stat(outputPath), stat(publicPath)]);
  if (outputStats.size !== publicStats.size) throw new Error("Served model copy has a different byte size than the validated export.");
  console.log(`Exported trained model: ${outputPath}`);
  console.log(`Served model: ${publicPath}`);
  console.log(`SHA-256: ${local.checksumSha256}; bytes: ${outputStats.size}; clean-process logits/probabilities match within 1e-6.`);
}

function exportFixture(): Tensor { const values = new Float32Array(32 * 32); for (let index = 0; index < values.length; index += 1) values[index] = (index % 29) / 28; return new Tensor(values, [1, 32, 32]); }
function predictionSnapshot(model: ShapeCNN, input: Tensor): { logits: number[]; probabilities: number[] } { return { logits: Array.from(model.forwardLogits(input).data), probabilities: Array.from(model.forwardProbabilities(input).data) }; }
async function verifyInCleanProcess(filePath: string): Promise<{ logits: number[]; probabilities: number[] }> {
  const output = await new Promise<string>((resolvePromise, reject) => {
    const tsxCli = resolve(process.cwd(), "node_modules/tsx/dist/cli.mjs");
    const child = spawn(process.execPath, [tsxCli, "src/verify-export.ts", filePath], { cwd: process.cwd(), stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "", stderr = ""; child.stdout.on("data", (chunk) => { stdout += String(chunk); }); child.stderr.on("data", (chunk) => { stderr += String(chunk); });
    child.on("error", reject); child.on("close", (code) => code === 0 ? resolvePromise(stdout) : reject(new Error(`Clean export verification failed (${code}): ${stderr || stdout}`)));
  });
  try { return JSON.parse(output) as { logits: number[]; probabilities: number[] }; } catch { throw new Error(`Clean export verification returned invalid JSON: ${output}`); }
}
function assertEquivalentSnapshot(expected: { logits: number[]; probabilities: number[] }, actual: { logits: number[]; probabilities: number[] }): void {
  for (const key of ["logits", "probabilities"] as const) {
    if (!Array.isArray(actual[key]) || actual[key].length !== expected[key].length) throw new Error(`Clean export verification returned invalid ${key}.`);
    actual[key].forEach((value, index) => { if (!Number.isFinite(value) || Math.abs(value - expected[key][index]!) > 1e-6) throw new Error(`Clean export verification differs in ${key}[${index}].`); });
  }
}

function reportFailure(error: unknown): void { console.error(`ml:${command} failed: ${error instanceof Error ? error.message : String(error)}`); process.exitCode = 1; }
