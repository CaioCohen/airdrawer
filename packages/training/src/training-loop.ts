import { Adam, SeededRandom, ShapeCNN, SoftmaxCrossEntropy, Tensor } from "@airdraw/ml-core";

export interface TrainingExample { readonly id: string; readonly input: Tensor; readonly label: number; }
export interface EpochMetrics { readonly epoch: number; readonly trainLoss: number; readonly trainAccuracy: number; readonly validationLoss: number; readonly validationAccuracy: number; }
export interface TrainingOptions { readonly epochs: number; readonly learningRate: number; readonly seed: number; readonly patience?: number; }
export interface TrainingResult { readonly history: readonly EpochMetrics[]; readonly bestEpoch: number; readonly bestValidationLoss: number; readonly epochsCompleted: number; readonly stoppedEarly: boolean; }

/** Forward-only categorical evaluation. It never invokes backward or Adam. */
export function evaluate(model: ShapeCNN, examples: readonly TrainingExample[]): { loss: number; accuracy: number } {
  if (examples.length === 0) throw new Error("Cannot evaluate an empty split.");
  const loss = new SoftmaxCrossEntropy();
  let totalLoss = 0;
  let correct = 0;
  for (const example of examples) {
    const logits = model.forwardLogits(example.input);
    const value = loss.forward(logits, example.label);
    assertFinite(value, `evaluation loss for ${example.id}`);
    totalLoss += value;
    if (argmax(logits) === example.label) correct += 1;
  }
  const mean = totalLoss / examples.length;
  assertFinite(mean, "mean evaluation loss");
  return { loss: mean, accuracy: correct / examples.length };
}

/** Per-sample updates avoid accidental, unnormalised pseudo-batching. */
export function train(model: ShapeCNN, trainExamples: readonly TrainingExample[], validationExamples: readonly TrainingExample[], options: TrainingOptions, onBest: (epoch: number, model: ShapeCNN) => void): TrainingResult {
  if (!Number.isSafeInteger(options.epochs) || options.epochs <= 0) throw new Error("epochs must be a positive safe integer.");
  if (!Number.isSafeInteger(options.seed)) throw new Error("seed must be a safe integer.");
  if (trainExamples.length === 0) throw new Error("Cannot train on an empty split.");
  if (validationExamples.length === 0) throw new Error("Cannot select a checkpoint from an empty validation split.");
  const patience = options.patience ?? 5;
  if (!Number.isSafeInteger(patience) || patience < 0) throw new Error("patience must be a non-negative safe integer.");
  const optimizer = new Adam(options.learningRate);
  const history: EpochMetrics[] = [];
  let bestEpoch = 0;
  let bestValidationLoss = Number.POSITIVE_INFINITY;
  let staleEpochs = 0;
  for (let epoch = 1; epoch <= options.epochs; epoch += 1) {
    for (const example of shuffled(trainExamples, options.seed + epoch)) {
      model.forwardLogits(example.input);
      const loss = model.backward(example.label);
      assertFinite(loss, `training loss for ${example.id}`);
      optimizer.step(model.parameters());
      assertModelFinite(model, `after training ${example.id}`);
    }
    const trainMetrics = evaluate(model, trainExamples);
    const validationMetrics = evaluate(model, validationExamples);
    const metrics: EpochMetrics = { epoch, trainLoss: trainMetrics.loss, trainAccuracy: trainMetrics.accuracy, validationLoss: validationMetrics.loss, validationAccuracy: validationMetrics.accuracy };
    history.push(metrics);
    if (metrics.validationLoss < bestValidationLoss) {
      bestValidationLoss = metrics.validationLoss;
      bestEpoch = epoch;
      staleEpochs = 0;
      onBest(epoch, model);
    } else {
      staleEpochs += 1;
      if (staleEpochs >= patience) return { history, bestEpoch, bestValidationLoss, epochsCompleted: epoch, stoppedEarly: true };
    }
  }
  return { history, bestEpoch, bestValidationLoss, epochsCompleted: options.epochs, stoppedEarly: false };
}

export function shuffled<T>(items: readonly T[], seed: number): T[] {
  const copy = [...items]; const random = new SeededRandom(seed);
  for (let index = copy.length - 1; index > 0; index -= 1) { const target = Math.floor(random.next() * (index + 1)); [copy[index], copy[target]] = [copy[target]!, copy[index]!]; }
  return copy;
}
function argmax(values: Tensor): number { let best = 0; for (let i = 1; i < values.size; i += 1) if (values.data[i]! > values.data[best]!) best = i; return best; }
function assertFinite(value: number, context: string): void { if (!Number.isFinite(value)) throw new Error(`${context} became non-finite.`); }
function assertModelFinite(model: ShapeCNN, context: string): void { for (const parameter of model.parameters()) parameter.data.assertFinite(`Parameter ${parameter.name} ${context}`); }
