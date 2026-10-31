import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Drawing } from "@airdraw/contracts";
import { PredictionPanel } from "./PredictionPanel";
import { createArtifactModelLoader, PREDICTION_INTERVAL_MS, type ModelLoader, type PredictionModel, useShapePrediction } from "./useShapePrediction";

const first: Drawing = { revision: 1, strokes: [{ id: "one", points: [{ x: .1, y: .1 }, { x: .8, y: .8 }] }] };
const second: Drawing = { revision: 2, strokes: [{ id: "two", points: [{ x: .1, y: .8 }, { x: .8, y: .1 }] }] };
function Harness({ drawing, loader }: { drawing: Drawing; loader: ModelLoader }) { return <PredictionPanel prediction={useShapePrediction(drawing, loader)} />; }

afterEach(() => { cleanup(); vi.useRealTimers(); });
describe("useShapePrediction", () => {
  it("keeps a valid drawing pending while the model artifact is still loading", async () => {
    let resolveLoader!: (value: Awaited<ReturnType<ModelLoader>>) => void;
    const loader: ModelLoader = () => new Promise((resolve) => { resolveLoader = resolve; });
    render(<Harness drawing={first} loader={loader} />);
    expect(screen.getByText("Modelo carregando…")).toBeTruthy();
    await act(async () => { resolveLoader({ kind: "unavailable" }); });
  });

  it("does not invoke the model when the drawing has insufficient ink", async () => {
    const dot: Drawing = { revision: 3, strokes: [{ id: "dot", points: [{ x: .5, y: .5 }] }] };
    const model: PredictionModel = { predict: vi.fn().mockResolvedValue([.9, .05, .05]) };
    render(<Harness drawing={dot} loader={async () => ({ kind: "ready", model })} />);
    await waitFor(() => expect(screen.getByText("Ainda não sei — desenhe um pouco mais")).toBeTruthy());
    expect(model.predict).not.toHaveBeenCalled();
  });

  it("shows uncertainty and all probabilities when confidence or margin is insufficient", async () => {
    const model: PredictionModel = { predict: vi.fn().mockResolvedValue([.45, .4, .15]) };
    render(<Harness drawing={first} loader={async () => ({ kind: "ready", model })} />);
    await waitFor(() => expect(screen.getByText("Ainda não sei — desenhe um pouco mais")).toBeTruthy());
    expect(screen.getByText("circle: 45%")).toBeTruthy();
    expect(screen.getByText("square: 40%")).toBeTruthy();
    expect(screen.getByText("triangle: 15%")).toBeTruthy();
  });

  it("uses the shared drawing preprocessing with an injected test fixture and shows all three probabilities", async () => {
    const model: PredictionModel = { predict: vi.fn().mockResolvedValue([.7, .1, .2]) };
    render(<Harness drawing={first} loader={async () => ({ kind: "ready", model })} />);
    await waitFor(() => expect(screen.getByText("Provavelmente: circle")).toBeTruthy());
    expect(model.predict).toHaveBeenCalledOnce();
    expect(screen.getByText("circle: 70%")).toBeTruthy();
    expect(screen.getByText("square: 10%")).toBeTruthy();
    expect(screen.getByText("triangle: 20%")).toBeTruthy();
  });

  it("does not allow a late revision to overwrite a newer drawing", async () => {
    vi.useFakeTimers();
    let resolveFirst!: (value: readonly number[]) => void;
    const model: PredictionModel = { predict: vi.fn().mockImplementation(() => new Promise<readonly number[]>((resolve) => { resolveFirst = resolve; })) };
    const loader: ModelLoader = async () => ({ kind: "ready", model });
    const view = render(<Harness drawing={first} loader={loader} />);
    await act(async () => { await Promise.resolve(); });
    view.rerender(<Harness drawing={second} loader={loader} />);
    await act(async () => { resolveFirst([.9, .05, .05]); await Promise.resolve(); });
    expect(view.queryByText("Provavelmente: circle")).toBeNull();
    await act(async () => { await vi.advanceTimersByTimeAsync(PREDICTION_INTERVAL_MS); });
    expect(model.predict).toHaveBeenCalledTimes(2);
  });

  it("declares the production model unavailable instead of inventing probabilities", async () => {
    render(<Harness drawing={first} loader={async () => ({ kind: "unavailable" })} />);
    await waitFor(() => expect(screen.getByText("Erro ao carregar modelo")).toBeTruthy());
    expect(screen.getByText("circle: —")).toBeTruthy();
  });

  it("surfaces an invalid artifact instead of initializing random weights", async () => {
    render(<Harness drawing={first} loader={createArtifactModelLoader(async () => ({ nope: true }))} />);
    await waitFor(() => expect(screen.getByText("Erro ao carregar modelo")).toBeTruthy());
  });
});
