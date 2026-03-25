import type { CityVariant, EvaluationReport } from "@memory-city/core-model";

type TopBarProps = {
  variant: CityVariant;
  report: EvaluationReport;
  workspaceMode: "review" | "semantics" | "compose" | "evaluate" | "fabrication";
  onWorkspaceModeChange: (
    mode: "review" | "semantics" | "compose" | "evaluate" | "fabrication"
  ) => void;
  renderMode: "analytic" | "wood";
  onRenderModeChange: (mode: "analytic" | "wood") => void;
};

export function TopBar({
  variant,
  report,
  workspaceMode,
  onWorkspaceModeChange,
  renderMode,
  onRenderModeChange
}: TopBarProps) {
  return (
    <header className="top-bar">
      <div>
        <p className="eyebrow">Memory City</p>
        <h1>Mnemonic city-object editor</h1>
        <div className="workspace-mode-toggle" role="tablist" aria-label="Workspace mode">
          {(["review", "semantics", "compose", "evaluate", "fabrication"] as const).map((mode) => (
            <button
              key={mode}
              className={workspaceMode === mode ? "is-active" : ""}
              onClick={() => onWorkspaceModeChange(mode)}
              type="button"
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      <div className="top-bar-meta">
        <div className="stat-pill">
          <span>Seed</span>
          <strong>{variant.seed}</strong>
        </div>
        <div className="stat-pill">
          <span>Blocks</span>
          <strong>{variant.scene.blocks.length}</strong>
        </div>
        <div className="stat-pill">
          <span>Path</span>
          <strong>{report.metrics.routeLength}</strong>
        </div>
        <div className="stat-pill">
          <span>Memory</span>
          <strong>{Math.round(report.profile.memory * 100)}</strong>
        </div>

        <div className="render-toggle" role="tablist" aria-label="Render mode">
          <button
            className={renderMode === "analytic" ? "is-active" : ""}
            onClick={() => onRenderModeChange("analytic")}
            type="button"
          >
            Analytic
          </button>
          <button
            className={renderMode === "wood" ? "is-active" : ""}
            onClick={() => onRenderModeChange("wood")}
            type="button"
          >
            Wood
          </button>
        </div>
      </div>
    </header>
  );
}
