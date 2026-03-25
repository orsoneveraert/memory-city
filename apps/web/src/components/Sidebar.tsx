import type { CityVariant, EvaluationReport } from "@memory-city/core-model";
import type { FabricationSummary, JuryStudySummary } from "../zoneBuilder";
import type { SiteStudy } from "../rasterSiteImport";

type SidebarProps = {
  variants: CityVariant[];
  reports: Map<string, EvaluationReport>;
  selectedVariantId: string;
  selectedSemanticNodeId: string | null;
  onSelectVariant: (variantId: string) => void;
  onSelectSemanticNode: (semanticNodeId: string) => void;
  workspaceMode: "review" | "semantics" | "compose" | "evaluate" | "fabrication";
  fabricationSummary: FabricationSummary;
  siteStudy: SiteStudy | null;
  jurySummary: JuryStudySummary | null;
};

export function Sidebar({
  variants,
  reports,
  selectedVariantId,
  selectedSemanticNodeId,
  onSelectVariant,
  onSelectSemanticNode,
  workspaceMode,
  fabricationSummary,
  siteStudy,
  jurySummary
}: SidebarProps) {
  const selectedVariant = variants.find((variant) => variant.id === selectedVariantId)!;
  const isComposeMode = workspaceMode === "compose";
  const sourceNote = selectedVariant.notes.find((note) => note.startsWith("Source URL:"));
  const spanNote = selectedVariant.notes.find((note) => note.startsWith("Study span:"));

  return (
    <aside className="sidebar">
      <section className="sidebar-section">
        <p className="eyebrow">Project</p>
        <h2>{isComposeMode ? "Urban site abstraction" : "Ars memoriae tabletop study"}</h2>
        <p className="muted">
          {isComposeMode
            ? "Current workspace translates a map-derived urban frame into a buildable wood block maquette."
            : "Demo workspace focused on a compact sequence, clear thresholds, and a material language aligned with a wooden kit."}
        </p>
      </section>

      {isComposeMode ? (
        <>
          <section className="sidebar-section">
            <p className="eyebrow">Source reading</p>
            <div className="metric-list">
              <div className="metric-row">
                <span>Frame</span>
                <strong>{spanNote ? spanNote.replace("Study span: ", "") : "Live frame"}</strong>
              </div>
              <div className="metric-row">
                <span>Scale</span>
                <strong>{jurySummary?.modelScaleLabel ?? `${fabricationSummary.moduleCm} cm module`}</strong>
              </div>
              <div className="metric-row">
                <span>Cell grain</span>
                <strong>{jurySummary ? `${jurySummary.cellMeters} m` : siteStudy?.referenceLabel ?? "-"}</strong>
              </div>
              <div className="metric-row">
                <span>Built/Open</span>
                <strong>{jurySummary ? `${jurySummary.sourceBuiltPct}% / ${jurySummary.sourceOpenPct}%` : "-"}</strong>
              </div>
              <div className="metric-row">
                <span>Road/green-blue</span>
                <strong>{jurySummary ? `${jurySummary.sourceRoadPct}% / ${jurySummary.sourceGreenBluePct}%` : "-"}</strong>
              </div>
              <div className="metric-row">
                <span>Terrain tiers</span>
                <strong>{jurySummary?.terrainTierCount ?? 0}</strong>
              </div>
            </div>
            {sourceNote ? <p className="variant-card-note">{sourceNote.replace("Source URL: ", "")}</p> : null}
            {siteStudy ? <p className="variant-card-note">{`Open map raster reference · z${siteStudy.tileZoom} · ${siteStudy.referenceLabel}`}</p> : null}
          </section>

          <section className="sidebar-section">
            <p className="eyebrow">Maquette translation</p>
            <div className="metric-list">
              <div className="metric-row">
                <span>Footprint</span>
                <strong>{fabricationSummary.widthCm} x {fabricationSummary.depthCm} cm</strong>
              </div>
              <div className="metric-row">
                <span>Height</span>
                <strong>{fabricationSummary.heightCm} cm</strong>
              </div>
              <div className="metric-row">
                <span>Pieces</span>
                <strong>{fabricationSummary.totalBlocks}</strong>
              </div>
              <div className="metric-row">
                <span>Source match</span>
                <strong>{jurySummary ? `${jurySummary.matchedSourcePct}%` : "-"}</strong>
              </div>
              <div className="metric-row">
                <span>Compression</span>
                <strong>{jurySummary ? `${jurySummary.abstractionCompression}:1` : `${fabricationSummary.totalVolumeCm3} cm3`}</strong>
              </div>
              <div className="metric-row">
                <span>Wood volume</span>
                <strong>{fabricationSummary.totalVolumeCm3} cm3</strong>
              </div>
            </div>
          </section>
        </>
      ) : (
        <section className="sidebar-section">
          <p className="eyebrow">Semantics</p>
          <ul className="semantic-list">
            {selectedVariant.semanticGraph.nodes.map((node) => (
              <li key={node.id}>
                <button
                  className={`semantic-list-button ${selectedSemanticNodeId === node.id ? "is-active" : ""}`}
                  onClick={() => onSelectSemanticNode(node.id)}
                  type="button"
                >
                  <span>{node.order}. {node.label}</span>
                  <small>{node.kind}</small>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="sidebar-section">
        <div className="sidebar-heading">
          <div>
            <p className="eyebrow">Variants</p>
            <h3>Comparison board</h3>
          </div>
          <span className="count-badge">{variants.length}</span>
        </div>

        <div className="variant-list">
          {variants.map((variant) => {
            const report = reports.get(variant.id)!;
            const selected = variant.id === selectedVariantId;

            return (
              <button
                key={variant.id}
                className={`variant-card ${selected ? "is-selected" : ""}`}
                onClick={() => onSelectVariant(variant.id)}
                type="button"
              >
                <div className="variant-card-row">
                  <strong>{variant.name}</strong>
                  <span>{variant.seed}</span>
                </div>
                <div className="variant-card-row variant-card-metrics">
                  <span>{isComposeMode ? `Pieces ${variant.scene.blocks.length}` : `Path ${Math.round(report.profile.path * 100)}`}</span>
                  <span>{isComposeMode ? `Grid ${variant.footprint.width} x ${variant.footprint.depth}` : `Form ${Math.round(report.profile.form * 100)}`}</span>
                  <span>{isComposeMode ? `Module ${variant.blockLibrary.moduleMm / 10} cm` : `Fab ${Math.round(report.profile.fabrication * 100)}`}</span>
                </div>
                <div className="variant-card-row variant-card-metrics">
                  <span>{isComposeMode ? variant.fabricationProfile.name : variant.ruleSet.name}</span>
                  <span>{isComposeMode ? `${variant.scene.blocks.length} pcs` : `${variant.blockLibrary.moduleMm / 10} cm`}</span>
                </div>
                <p className="variant-card-note">
                  {isComposeMode
                    ? variant.notes.find((note) => note.startsWith("Urban preset:")) ?? variant.ruleSet.notes[0] ?? variant.fabricationProfile.name
                    : report.findings[0]}
                </p>
              </button>
            );
          })}
        </div>
      </section>
    </aside>
  );
}
