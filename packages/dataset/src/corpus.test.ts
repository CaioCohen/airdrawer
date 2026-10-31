import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { loadCorpusImage, loadExistingCorpus } from "./corpus.js";
import { generateDatasetManifest, inspectDatasetManifest } from "./manifest.js";

const root = resolve(process.cwd(), "../..");

describe("existing hand-drawn corpus", () => {
  it("is deterministic, labelled and split by manual-source group", () => {
    const first = loadExistingCorpus(resolve(root, "scripts/images"));
    const second = loadExistingCorpus(resolve(root, "scripts/images"));
    expect(first.samples.map((sample) => `${sample.id}:${sample.groupId}`)).toEqual(second.samples.map((sample) => `${sample.id}:${sample.groupId}`));
    expect(first.samples).toHaveLength(1546);
    expect(first.groups).toBe(26);
    expect(first.counts).toEqual({ train: { circle: 567, square: 486, triangle: 486 }, val: { circle: 2, square: 1, triangle: 1 }, test: { circle: 1, square: 1, triangle: 1 } });
    const splitsByGroup = new Map<string, string>();
    for (const sample of first.samples) { expect(sample.labelId).toBe(["circle", "square", "triangle"].indexOf(sample.label)); expect(splitsByGroup.get(sample.groupId) ?? sample.split).toBe(sample.split); splitsByGroup.set(sample.groupId, sample.split); }
  });

  it("converts PNGs deterministically to finite whiteboard [1,32,32] tensors", () => {
    const sample = loadExistingCorpus(resolve(root, "scripts/images")).samples.find((item) => item.label === "circle")!;
    const first = loadCorpusImage(sample), second = loadCorpusImage(sample);
    expect(first).toHaveLength(1024);
    expect([...first]).toEqual([...second]);
    expect(Math.max(...first)).toBeGreaterThan(0.5);
    expect(Math.min(...first)).toBe(0);
    expect(first.every((value) => Number.isFinite(value) && value >= 0 && value <= 1)).toBe(true);
  });

  it("writes a reproducible manifest and rejects duplicate IDs even when its checksum is recomputed", () => {
    const directory = mkdtempSync(resolve(tmpdir(), "airdraw-manifest-"));
    try {
      const generated = generateDatasetManifest(42, directory);
      expect(inspectDatasetManifest(directory).manifestSha256).toBe(generated.manifestSha256);
      const manifestPath = resolve(directory, "manifest.jsonl");
      const lines = readFileSync(manifestPath, "utf8").trimEnd().split("\n");
      lines[1] = lines[0]!;
      const corrupt = `${lines.join("\n")}\n`;
      writeFileSync(manifestPath, corrupt, "utf8");
      const auditPath = resolve(directory, "audit.json");
      const audit = JSON.parse(readFileSync(auditPath, "utf8")) as { manifestSha256: string };
      audit.manifestSha256 = createHash("sha256").update(corrupt).digest("hex");
      writeFileSync(auditPath, `${JSON.stringify(audit)}\n`, "utf8");
      expect(() => inspectDatasetManifest(directory)).toThrow("Duplicate manifest id");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
