import type { CityVariant, EvaluationReport } from "@memory-city/core-model";
import type { FabricationSummary } from "../zoneBuilder";
import type { SiteStudy } from "../rasterSiteImport";

type BottomBarProps = {
  variant: CityVariant;
  report: EvaluationReport;
  selectedSemanticNodeId: string | null;
  onSelectSemanticNode: (semanticNodeId: string) => void;
  workspaceMode: "review" | "semantics" | "compose" | "evaluate" | "fabrication";
  fabricationSummary: FabricationSummary;
  siteStudy: SiteStudy | null;
};

export function BottomBar({
  variant,
  report,
  selectedSemanticNodeId,
  onSelectSemanticNode,
  workspaceMode,
  fabricationSummary,
  siteStudy
}: BottomBarProps) {
  if (workspaceMode === "compose") {
    return (
      <footer className="bottom-bar">
        <div className="bottom-grid">
          <section className="bottom-table-shell">
            <div className="analytic-block-header">
              <p className="eyebrow">Wood blocks necessary</p>
              <strong>{fabricationSummary.totalBlocks} pieces</strong>
            </div>
            <div className="analytic-table">
              <div className="analytic-row analytic-row-header">
                <span>Type</span>
                <span>Count</span>
                <span>Size</span>
                <span>Volume</span>
              </div>
              {fabricationSummary.typeRows.map((row) => (
                <div className="analytic-row" key={row.id}>
                  <span>{row.label}</span>
                  <span>{row.count}</span>
                  <span>
                    {row.widthCm} x {row.depthCm} x {row.heightCm} cm
                  </span>
                  <span>{row.totalVolumeCm3} cm3</span>
                </div>
              ))}
            </div>
          </section>

          <section className="bottom-table-shell">
            <div className="analytic-block-header">
              <p className="eyebrow">Reality and construction</p>
              <strong>{fabricationSummary.widthCm} x {fabricationSummary.depthCm} cm</strong>
            </div>
            <div className="analytic-table">
              <div className="analytic-row analytic-row-header">
                <span>Step</span>
                <span>Action</span>
                <span>Detail</span>
              </div>
              {fabricationSummary.constructionSteps.map((row) => (
                <div className="analytic-row" key={row.step}>
                  <span>{row.step}</span>
                  <span>{row.label}</span>
                  <span>{row.detail}</span>
                </div>
              ))}
              {siteStudy
                ? [
                    {
                      step: "R1",
                      label: "Source coverage",
                      detail: `${Math.round(siteStudy.metrics.sourceCoverage * 100)}% source coverage vs ${Math.round(siteStudy.metrics.blockCoverage * 100)}% block coverage.`
                    },
                    {
                      step: "R2",
                      label: "Street and open cells",
                      detail: `${siteStudy.metrics.roadCells} road cells, ${siteStudy.metrics.parkCells} green cells, ${siteStudy.metrics.waterCells} water cells.`
                    }
                  ].map((row) => (
                    <div className="analytic-row" key={row.step}>
                      <span>{row.step}</span>
                      <span>{row.label}</span>
                      <span>{row.detail}</span>
                    </div>
                  ))
                : null}
            </div>
          </section>
        </div>
      </footer>
    );
  }

  return (
    <footer className="bottom-bar">
      <div className="bottom-strip">
        <p className="eyebrow">Route sequence</p>
        <div className="chip-row">
          {variant.semanticGraph.nodes.map((node) => (
            <button
              key={node.id}
              className={`chip chip-button ${selectedSemanticNodeId === node.id ? "is-active" : ""}`}
              onClick={() => onSelectSemanticNode(node.id)}
              type="button"
            >
              {node.order}. {node.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bottom-strip">
        <p className="eyebrow">Prototype diagnostics</p>
        <div className="chip-row">
          <span className="chip">Path clarity {Math.round(report.profile.path * 100)}</span>
          <span className="chip">Memory anchors {report.metrics.landmarkCount}</span>
          <span className="chip">Useful voids {Math.round(report.metrics.voidUsefulness * 100)}%</span>
          <span className="chip">Typologies {report.metrics.typologyCount}</span>
          <span className="chip">Route nodes {variant.routeGraph.nodes.length}</span>
        </div>
      </div>
    </footer>
  );
}
