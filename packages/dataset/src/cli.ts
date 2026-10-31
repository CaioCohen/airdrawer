import { generateDatasetManifest, inspectDatasetManifest } from "./manifest.js";

const command = process.argv[2] ?? "unknown";
try {
  if (command === "generate") {
    const seedFlag = process.argv.indexOf("--seed");
    const seed = seedFlag === -1 ? 42 : Number(process.argv[seedFlag + 1]);
    if (seedFlag !== -1 && process.argv[seedFlag + 1] === undefined) throw new Error("--seed requires an unsigned 32-bit integer.");
    const audit = generateDatasetManifest(seed);
    console.log(`Generated auditable manifest for ${audit.samples} PNGs / ${audit.groups} groups (seed ${audit.seed}).`);
    printCounts(audit);
  } else if (command === "inspect") {
    const audit = inspectDatasetManifest();
    console.log(`Verified manifest SHA-256 ${audit.manifestSha256} for ${audit.samples} PNGs / ${audit.groups} groups.`);
    printCounts(audit);
    console.log("Warning: validation/test are statistically weak (4/3 samples); no performance metrics are reported.");
  } else throw new Error(`Unknown dataset command: ${command}. Use generate --seed <n> or inspect.`);
} catch (error) {
  console.error(error instanceof Error ? `dataset:${command} failed: ${error.message}` : `dataset:${command} failed.`);
  process.exitCode = 1;
}

function printCounts(audit: ReturnType<typeof inspectDatasetManifest>): void {
  for (const split of ["train", "val", "test"] as const) console.log(`${split}: ${Object.entries(audit.counts[split]).map(([label, count]) => `${label}=${count}`).join(" ")}`);
}
