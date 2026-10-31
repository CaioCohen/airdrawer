/** Public Node-side dataset boundary used by the training CLI. */
export { loadCorpusImage, loadExistingCorpus } from "./corpus.js";
export type { CorpusAudit, CorpusSample, CorpusSplit } from "./corpus.js";
export { GENERATED_AUDIT_PATH, GENERATED_DATASET_DIR, GENERATED_MANIFEST_PATH, inspectDatasetManifest } from "./manifest.js";
export type { DatasetAudit, DatasetManifestEntry } from "./manifest.js";
