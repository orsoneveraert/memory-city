import type { CityVariant, EvaluationReport } from "@memory-city/core-model";
import type { FabricationSummary, JuryStudySummary } from "../zoneBuilder";

type TopBarProps = {
  variant: CityVariant;
  report: EvaluationReport;
  workspaceMode: "review" | "semantics" | "compose" | "evaluate" | "fabrication";
  onWorkspaceModeChange: (
    mode: "review" | "semantics" | "compose" | "evaluate" | "fabrication"
  ) => void;
  renderMode: "analytic" | "wood";
  onRenderModeChange: (mode: "analytic" | "wood") => void;
  fabricationSummary: FabricationSummary;
  jurySummary?: JuryStudySummary | null;
};

export function TopBar({
  variant,
  report,
  workspaceMode,
  onWorkspaceModeChange,
  renderMode,
  onRenderModeChange,
  fabricationSummary,
  jurySummary = null
}: TopBarProps) {
  const isComposeMode = workspaceMode === "compose";

  return (
    <header className="top-bar">
      <div>
        <p className="eyebrow">{isComposeMode ? "Urban woodblock study" : "Memory City"}</p>
        <h1>{isComposeMode ? "Map-derived site abstraction editor" : "Mnemonic city-object editor"}</h1>
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
          <span>{isComposeMode ? "Frame" : "Seed"}</span>
          <strong>{isComposeMode ? jurySummary?.scaleLabel ?? `${fabricationSummary.moduleCm} cm module` : variant.seed}</strong>
        </div>
        <div className="stat-pill">
          <span>{isComposeMode ? "Scale" : "Blocks"}</span>
          <strong>{isComposeMode ? jurySummary?.modelScaleLabel ?? `${fabricationSummary.moduleCm} cm module` : variant.scene.blocks.length}</strong>
        </div>
        <div className="stat-pill">
          <span>{isComposeMode ? "Pieces" : "Blocks"}</span>
          <strong>{isComposeMode ? fabricationSummary.totalBlocks : variant.scene.blocks.length}</strong>
        </div>
        <div className="stat-pill">
          <span>{isComposeMode ? "Match" : "Path"}</span>
          <strong>
            {isComposeMode
              ? jurySummary
                ? `${jurySummary.matchedSourcePct}%`
                : `${fabricationSummary.widthCm} x ${fabricationSummary.depthCm} cm`
              : report.metrics.routeLength}
          </strong>
        </div>
        <div className="stat-pill">
          <span>{isComposeMode ? "Relief" : "Memory"}</span>
          <strong>{isComposeMode ? `${jurySummary?.terrainTierCount ?? 0} tiers` : Math.round(report.profile.memory * 100)}</strong>
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
