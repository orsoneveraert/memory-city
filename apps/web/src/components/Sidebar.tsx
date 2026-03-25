import type { CityVariant, EvaluationReport } from "@memory-city/core-model";

type SidebarProps = {
  variants: CityVariant[];
  reports: Map<string, EvaluationReport>;
  selectedVariantId: string;
  selectedSemanticNodeId: string | null;
  onSelectVariant: (variantId: string) => void;
  onSelectSemanticNode: (semanticNodeId: string) => void;
};

export function Sidebar({
  variants,
  reports,
  selectedVariantId,
  selectedSemanticNodeId,
  onSelectVariant,
  onSelectSemanticNode
}: SidebarProps) {
  const selectedVariant = variants.find((variant) => variant.id === selectedVariantId)!;

  return (
    <aside className="sidebar">
      <section className="sidebar-section">
        <p className="eyebrow">Project</p>
        <h2>Ars memoriae tabletop study</h2>
        <p className="muted">
          Demo workspace focused on a compact sequence, clear thresholds, and a material language aligned with a wooden kit.
        </p>
      </section>

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
                  <span>Path {Math.round(report.profile.path * 100)}</span>
                  <span>Form {Math.round(report.profile.form * 100)}</span>
                  <span>Fab {Math.round(report.profile.fabrication * 100)}</span>
                </div>
                <div className="variant-card-row variant-card-metrics">
                  <span>{variant.ruleSet.name}</span>
                  <span>{variant.blockLibrary.moduleMm} mm</span>
                </div>
                <p className="variant-card-note">{report.findings[0]}</p>
              </button>
            );
          })}
        </div>
      </section>
    </aside>
  );
}
