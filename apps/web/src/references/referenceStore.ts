import { SHAPE_LABELS, assertDrawing, type Drawing, type ShapeLabel } from "@airdraw/contracts";

export const REFERENCE_SCHEMA_VERSION = 1;
export const REFERENCE_STORAGE_KEY = "airdraw.reference-samples.v1";
const MAX_STROKES = 100;
const MAX_POINTS = 5_000;
const MAX_ID_LENGTH = 128;
const MAX_SAMPLES = 50;

export type InputMode = "mouse" | "camera";
export interface DrawingReference {
  readonly schemaVersion: typeof REFERENCE_SCHEMA_VERSION;
  readonly kind: "airdraw-reference";
  readonly createdAt: string;
  readonly label?: ShapeLabel;
  readonly inputMode: InputMode;
  readonly logicalSize: { readonly width: 1; readonly height: 1 };
  readonly drawing: Drawing;
}

export function createReference(drawing: Drawing, label: ShapeLabel | undefined, inputMode: InputMode, createdAt = new Date().toISOString()): DrawingReference {
  assertDrawing(drawing);
  if (drawing.strokes.length === 0) throw new Error("Desenhe algo antes de salvar uma referência.");
  const reference: DrawingReference = { schemaVersion: REFERENCE_SCHEMA_VERSION, kind: "airdraw-reference", createdAt, label, inputMode, logicalSize: { width: 1, height: 1 }, drawing };
  validateReference(reference);
  return reference;
}

export function validateReference(value: unknown): asserts value is DrawingReference {
  if (!isRecord(value)) throw new Error("Arquivo inválido: esperava um objeto de referência.");
  const allowed = new Set(["schemaVersion", "kind", "createdAt", "label", "inputMode", "logicalSize", "drawing"]);
  if (Object.keys(value).some((key) => !allowed.has(key))) throw new Error("Arquivo inválido: contém campos não permitidos.");
  if (value.schemaVersion !== REFERENCE_SCHEMA_VERSION || value.kind !== "airdraw-reference") throw new Error("Arquivo inválido: versão ou tipo de referência não suportado.");
  if (typeof value.createdAt !== "string" || Number.isNaN(Date.parse(value.createdAt))) throw new Error("Arquivo inválido: data de criação ausente ou inválida.");
  if (value.label !== undefined && !isShapeLabel(value.label)) throw new Error("Arquivo inválido: rótulo deve ser circle, square ou triangle.");
  if (value.inputMode !== "mouse" && value.inputMode !== "camera") throw new Error("Arquivo inválido: modo de entrada inválido.");
  if (!isRecord(value.logicalSize) || value.logicalSize.width !== 1 || value.logicalSize.height !== 1) throw new Error("Arquivo inválido: dimensões lógicas inválidas.");
  if (!isRecord(value.drawing) || !Array.isArray(value.drawing.strokes) || value.drawing.strokes.length === 0 || value.drawing.strokes.length > MAX_STROKES) throw new Error("Arquivo inválido: quantidade de traços fora do limite.");
  let pointCount = 0;
  const ids = new Set<string>();
  for (const stroke of value.drawing.strokes) {
    if (!isRecord(stroke) || typeof stroke.id !== "string" || stroke.id.length === 0 || stroke.id.length > MAX_ID_LENGTH || !Array.isArray(stroke.points)) throw new Error("Arquivo inválido: traço malformado.");
    if (ids.has(stroke.id)) throw new Error("Arquivo inválido: identificadores de traço repetidos.");
    ids.add(stroke.id);
    pointCount += stroke.points.length;
    if (pointCount > MAX_POINTS) throw new Error("Arquivo inválido: pontos demais para uma referência.");
  }
  if (pointCount === 0) throw new Error("Arquivo inválido: a referência não contém pontos.");
  try { assertDrawing(value.drawing as unknown as Drawing); } catch { throw new Error("Arquivo inválido: pontos devem ser números finitos entre 0 e 1 e a revisão deve ser válida."); }
}

export function parseReference(json: string): DrawingReference {
  if (json.length > 1_000_000) throw new Error("Arquivo inválido: referência grande demais.");
  let parsed: unknown;
  try { parsed = JSON.parse(json); } catch { throw new Error("Arquivo inválido: JSON não pôde ser lido."); }
  validateReference(parsed);
  return parsed;
}

export function loadReferences(storage: Storage): DrawingReference[] {
  const raw = storage.getItem(REFERENCE_STORAGE_KEY);
  if (!raw) return [];
  try { const parsed: unknown = JSON.parse(raw); if (!Array.isArray(parsed) || parsed.length > MAX_SAMPLES) throw new Error(); parsed.forEach(validateReference); return parsed; }
  catch { storage.removeItem(REFERENCE_STORAGE_KEY); return []; }
}
export function saveReferences(storage: Storage, references: readonly DrawingReference[]): void {
  if (references.length > MAX_SAMPLES) throw new Error("Limite de 50 referências locais atingido.");
  references.forEach(validateReference); storage.setItem(REFERENCE_STORAGE_KEY, JSON.stringify(references));
}
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function isShapeLabel(value: unknown): value is ShapeLabel { return typeof value === "string" && (SHAPE_LABELS as readonly string[]).includes(value); }
