/** Human-inspection helper only; training always consumes the Float32Array. */
export function tensorToAscii(tensor: Float32Array, width = 32, threshold = 0.5): string {
  if (!Number.isSafeInteger(width) || width <= 0 || tensor.length !== width * width) throw new Error("tensorToAscii expects a square tensor and its width.");
  return Array.from({ length: width }, (_, y) => Array.from({ length: width }, (_, x) => tensor[y * width + x]! >= threshold ? "#" : ".").join("")).join("\n");
}
