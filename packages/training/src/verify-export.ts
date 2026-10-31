import { readFile } from "node:fs/promises";
import { loadShapeCnnArtifact, Tensor } from "@airdraw/ml-core";

const path = process.argv[2];
if (!path) throw new Error("verify-export requires an artifact path.");
const model = loadShapeCnnArtifact(JSON.parse(await readFile(path, "utf8")));
const values = new Float32Array(32 * 32);
for (let index = 0; index < values.length; index += 1) values[index] = (index % 29) / 28;
const input = new Tensor(values, [1, 32, 32]);
console.log(JSON.stringify({ logits: Array.from(model.forwardLogits(input).data), probabilities: Array.from(model.forwardProbabilities(input).data) }));
