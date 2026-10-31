/** Isomorphic numerical primitives. No DOM, Node-only APIs, or ML framework dependencies. */
export { SHAPE_LABELS, SHAPE_LABEL_IDS, assertDrawing, assertNormalizedPoint, withStrokes } from "@airdraw/contracts";
export type { Drawing, Point2D, PreprocessResult, ShapeLabel, Stroke } from "@airdraw/contracts";
export { Tensor, tensorSize } from "./tensor.js";
export { SeededRandom, heNormal } from "./random.js";
export { Conv2D, MaxPool2D, ReLU } from "./layers.js";
export { Dense } from "./dense.js";
export { SHAPE_CLASS_COUNT, softmax, SoftmaxCrossEntropy } from "./softmax-cross-entropy.js";
export { Adam } from "./adam.js";
export type { Parameter } from "./parameters.js";
export { ShapeCNN, SHAPE_CNN_INPUT_SHAPE, SHAPE_CNN_PARAMETER_COUNT } from "./shape-cnn.js";
export { MODEL_SMOKE_TOLERANCE, SHAPE_CNN_ARCHITECTURE, SHAPE_CNN_ARTIFACT_MODEL_VERSION, SHAPE_CNN_ARTIFACT_PREPROCESSING_VERSION, SHAPE_CNN_ARTIFACT_SCHEMA_VERSION, canonicalArtifactPayload, loadShapeCnnArtifact, runShapeCnnSmokeTest, serializeShapeCnn, sha256Hex, validateShapeCnnArtifact } from "./model-artifact.js";
export type { CreateShapeCnnArtifactOptions, ShapeCnnArchitecture, ShapeCnnArtifactV1, ShapeCnnTrainingMetadata } from "./model-artifact.js";
export { normalize, PREPROCESS_MARGIN, PREPROCESS_SIZE, MIN_INK_LENGTH } from "./preprocessing/normalize.js";
export type { NormalizeResult, NormalizedDrawing, NormalizedPoint, NormalizedSegment } from "./preprocessing/normalize.js";
export { rasterize, RASTER_SUPERSAMPLE, STROKE_RADIUS } from "./preprocessing/rasterize.js";
export { preprocessDrawing, PREPROCESS_VERSION } from "./preprocessing/preprocess.js";
export { tensorToAscii } from "./preprocessing/inspect.js";
