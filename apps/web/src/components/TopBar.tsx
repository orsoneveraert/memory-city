import type { CityVariant, EvaluationReport } from "@memory-city/core-model";
import type { FabricationSummary } from "../zoneBuilder";
import type { SiteStudy } from "../rasterSiteImport";

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
  siteStudy?: SiteStudy | null;
};

export function TopBar({
  variant,
  report,
  workspaceMode,
  onWorkspaceModeChange,
  renderMode,
  onRenderModeChange,
  fabricationSummary,
  siteStudy = null
}: TopBarProps) {
  const isComposeMode = workspaceMode === "compose";

  return (
    <header className="top-bar">
      <div>
        <p className="eyebrow">{isComposeMode ? "Google zone / wood kit" : "Memory City"}</p>
        <h1>{isComposeMode ? "Site-to-block editor" : "Mnemonic city-object editor"}</h1>
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
          <span>{isComposeMode ? "Pieces" : "Blocks"}</span>
          <strong>{isComposeMode ? fabricationSummary.totalBlocks : variant.scene.blocks.length}</strong>
        </div>
        <div className="stat-pill">
          <span>{isComposeMode ? "Maquette" : "Path"}</span>
          <strong>
            {isComposeMode
              ? `${fabricationSummary.widthCm} x ${fabricationSummary.depthCm} cm`
              : report.metrics.routeLength}
          </strong>
        </div>
        <div className="stat-pill">
          <span>{isComposeMode ? "Module" : "Memory"}</span>
          <strong>{isComposeMode ? `${fabricationSummary.moduleCm} cm` : Math.round(report.profile.memory * 100)}</strong>
        </div>
        {isComposeMode && siteStudy ? (
          <div className="stat-pill">
            <span>Source</span>
            <strong>{siteStudy.metrics.buildingClusters} clusters</strong>
          </div>
        ) : null}

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
