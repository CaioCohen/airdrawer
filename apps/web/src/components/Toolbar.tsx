export function Toolbar({ canUndo, canClear, mode, cameraState, onUndo, onClear, onToggleMode, onStartCamera, onStopCamera }: {
  canUndo: boolean; canClear: boolean; mode: "mouse" | "camera";
  cameraState: "off" | "starting" | "active" | "error";
  onUndo: () => void; onClear: () => void; onToggleMode: () => void; onStartCamera: () => void; onStopCamera: () => void;
}) {
  return <section className="toolbar" aria-label="Controles">
    <button type="button" onClick={onClear} disabled={!canClear}>Limpar lousa</button>
    <button type="button" onClick={onUndo} disabled={!canUndo}>Desfazer</button>
    <button type="button" aria-pressed={mode === "mouse"} onClick={onToggleMode}>Modo: {mode === "mouse" ? "Mouse" : "Câmera"}</button>
    <button type="button" onClick={onStartCamera} disabled={cameraState === "starting" || cameraState === "active"}>Iniciar câmera</button>
    <button type="button" onClick={onStopCamera} disabled={cameraState === "off"}>Parar câmera</button>
    <span>{mode === "mouse" ? "Desenhe com mouse, caneta ou toque." : "Una polegar e indicador para desenhar."}</span>
  </section>;
}
