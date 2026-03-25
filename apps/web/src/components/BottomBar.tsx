import type { CityVariant, EvaluationReport } from "@memory-city/core-model";

type BottomBarProps = {
  variant: CityVariant;
  report: EvaluationReport;
  selectedSemanticNodeId: string | null;
  onSelectSemanticNode: (semanticNodeId: string) => void;
};

export function BottomBar({
  variant,
  report,
  selectedSemanticNodeId,
  onSelectSemanticNode
}: BottomBarProps) {
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
