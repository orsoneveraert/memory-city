import type { CityVariant, EvaluationReport } from "@memory-city/core-model";

type InspectorPanelProps = {
  variant: CityVariant;
  report: EvaluationReport;
  workspaceMode: "review" | "semantics" | "compose" | "evaluate" | "fabrication";
  selectedSemanticNodeId: string | null;
  diagnostics: string[];
};

export function InspectorPanel({
  variant,
  report,
  workspaceMode,
  selectedSemanticNodeId,
  diagnostics
}: InspectorPanelProps) {
  const selectedNode = variant.semanticGraph.nodes.find((node) => node.id === selectedSemanticNodeId) ?? null;

  return (
    <aside className="inspector">
      {workspaceMode === "review" ? (
        <section className="inspector-section">
          <p className="eyebrow">Review mode</p>
          <div className="score-grid">
            <ScoreCard label="Path" value={report.profile.path} />
            <ScoreCard label="Memory" value={report.profile.memory} />
            <ScoreCard label="Form" value={report.profile.form} />
            <ScoreCard label="Fabrication" value={report.profile.fabrication} />
            <ScoreCard label="Semantic" value={report.profile.semantic} />
          </div>

          <div className="metric-list">
            <MetricRow label="Typologies" value={report.metrics.typologyCount.toString()} />
            <MetricRow label="Landmarks" value={report.metrics.landmarkCount.toString()} />
            <MetricRow label="Compactness" value={`${Math.round(report.metrics.compactness * 100)}%`} />
            <MetricRow label="Useful voids" value={`${Math.round(report.metrics.voidUsefulness * 100)}%`} />
            <MetricRow label="Average height" value={report.metrics.averageHeight.toFixed(1)} />
          </div>

          <div className="finding-list">
            {report.findings.map((finding) => (
              <p key={finding}>{finding}</p>
            ))}
          </div>

          {selectedNode ? (
            <div className="semantic-card">
              <div className="semantic-card-row">
                <strong>Focused concept</strong>
                <span>{selectedNode.importance}/5</span>
              </div>
              <p>{selectedNode.label}</p>
              <small>{selectedNode.note}</small>
            </div>
          ) : null}
        </section>
      ) : null}

      {workspaceMode === "semantics" ? (
        <section className="inspector-section">
          <p className="eyebrow">Semantic mode</p>
          {selectedNode ? (
            <div className="semantic-card">
              <div className="semantic-card-row">
                <strong>{selectedNode.order}. {selectedNode.label}</strong>
                <span>{selectedNode.importance}/5</span>
              </div>
              <p>{selectedNode.note}</p>
              <small>{selectedNode.kind} · {selectedNode.category}</small>
            </div>
          ) : null}

          <ul className="plain-list">
            <li>Linked selection now binds concept, route anchor, and block.</li>
            <li>Next step: editable mapping rules for height, family, and threshold form.</li>
            <li>Next step: allow concept locking before regeneration.</li>
          </ul>
        </section>
      ) : null}

      {workspaceMode === "compose" ? (
        <section className="inspector-section">
          <p className="eyebrow">Compose mode</p>
          <ul className="plain-list">
            <li>{variant.ruleSet.name}</li>
            <li>{variant.ruleSet.notes[0]}</li>
            <li>{variant.ruleSet.notes[1]}</li>
          </ul>
        </section>
      ) : null}

      {workspaceMode === "evaluate" ? (
        <section className="inspector-section">
          <p className="eyebrow">Evaluate mode</p>
          <div className="finding-list">
            {report.findings.map((finding) => (
              <p key={finding}>{finding}</p>
            ))}
          </div>
          {diagnostics.length > 0 ? (
            <div className="finding-list">
              {diagnostics.map((entry) => (
                <p key={entry}>{entry}</p>
              ))}
            </div>
          ) : null}
          <ul className="plain-list">
            <li>Next step: add delta comparison between two variants.</li>
            <li>Next step: surface why a score changed after local edits.</li>
            <li>Next step: add landmark spacing warnings in plan view.</li>
          </ul>
        </section>
      ) : null}

      {workspaceMode === "fabrication" ? (
        <section className="inspector-section">
          <p className="eyebrow">Fabrication mode</p>
          <div className="metric-list">
            <MetricRow label="Footprint" value={`${variant.footprint.width} x ${variant.footprint.depth} modules`} />
            <MetricRow label="Piece count" value={variant.scene.blocks.length.toString()} />
            <MetricRow label="Base module" value={`${variant.fabricationProfile.moduleMm} mm`} />
            <MetricRow label="Material" value={variant.fabricationProfile.material} />
            <MetricRow label="Assembly" value={variant.fabricationProfile.joinStrategy} />
          </div>
          <div className="finding-list">
            <p>Wood mode is part of the design logic: it keeps the digital preview aligned with the intended object language.</p>
            <p>Next fabrication pass should add cut lists, piece schedule, and a tray layout.</p>
          </div>
        </section>
      ) : null}
    </aside>
  );
}

function ScoreCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="score-card">
      <span>{label}</span>
      <strong>{Math.round(value * 100)}</strong>
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
