import { SHAPE_LABELS } from "@airdraw/contracts";
import type { ShapePrediction } from "./useShapePrediction";

export function PredictionPanel({ prediction }: { prediction: ShapePrediction }) {
  const message = prediction.status === "waiting" ? "Aguardando desenho" :
    prediction.status === "insufficient-ink" || prediction.status === "uncertain" ? "Ainda não sei — desenhe um pouco mais" :
    prediction.status === "model-pending" ? "Modelo carregando…" :
    prediction.status === "model-unavailable" || prediction.status === "model-invalid" ? "Erro ao carregar modelo" : `Provavelmente: ${prediction.label}`;
  return <section aria-label="Predição" className="prediction" aria-live="polite"><h2>Predição</h2><p>{message}</p>
    <ul>{SHAPE_LABELS.map((label) => <li key={label}>{label}: {prediction.probabilities ? `${Math.round(prediction.probabilities[label] * 100)}%` : "—"}</li>)}</ul>
  </section>;
}
