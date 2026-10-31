import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { loadShapeCnnArtifact, serializeShapeCnn } from "@airdraw/ml-core";
import type { CreateShapeCnnArtifactOptions, ShapeCnnArtifactV1, ShapeCNN } from "@airdraw/ml-core";

/** Node-only persistence boundary; browser code must use fetch + ml-core loader. */
export async function writeShapeCnnArtifact(filePath: string, model: ShapeCNN, options: CreateShapeCnnArtifactOptions): Promise<void> {
  const artifact = serializeShapeCnn(model, options);
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
}

export async function readShapeCnnArtifact(filePath: string): Promise<{ readonly artifact: ShapeCnnArtifactV1; readonly model: ShapeCNN }> {
  let parsed: unknown;
  try { parsed = JSON.parse(await readFile(filePath, "utf8")); }
  catch (error) { throw new Error(`Could not read model artifact ${filePath}: ${error instanceof Error ? error.message : String(error)}`); }
  const model = loadShapeCnnArtifact(parsed);
  return { artifact: parsed as ShapeCnnArtifactV1, model };
}
