import type { CityVariant, EvaluationReport } from "@memory-city/core-model";

type InspectorPanelProps = {
  variant: CityVariant;
  report: EvaluationReport;
  workspaceMode: "review" | "semantics" | "compose" | "evaluate" | "fabrication";
  selectedSemanticNodeId: string | null;
  diagnostics: string[];
  siteImportState: {
    sourceUrl: string;
    spanMeters: number;
    status: "idle" | "ready" | "error";
    message: string;
  };
  onSiteImportSourceChange: (value: string) => void;
  onSiteImportSpanChange: (value: number) => void;
  onGenerateSiteVariant: () => void;
};

export function InspectorPanel({
  variant,
  report,
  workspaceMode,
  selectedSemanticNodeId,
  diagnostics,
  siteImportState,
  onSiteImportSourceChange,
  onSiteImportSpanChange,
  onGenerateSiteVariant
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
          <div className="table-block">
            <div className="table-row">
              <span>Generator</span>
              <strong>{variant.ruleSet.name}</strong>
            </div>
            <div className="table-row">
              <span>Family</span>
              <strong>{variant.ruleSet.generatorFamily}</strong>
            </div>
            <div className="table-row">
              <span>Block module</span>
              <strong>{variant.blockLibrary.moduleMm} mm</strong>
            </div>
          </div>

          <div className="editorial-note">
            <p>{variant.ruleSet.notes[0]}</p>
            <p>{variant.ruleSet.notes[1]}</p>
          </div>

          <div className="form-block">
            <p className="eyebrow">Geographic adapter</p>
            <label className="field-label" htmlFor="site-url">
              Google Maps URL or raw lat,lng
            </label>
            <textarea
              id="site-url"
              className="text-input"
              rows={3}
              value={siteImportState.sourceUrl}
              onChange={(event) => onSiteImportSourceChange(event.target.value)}
            />

            <label className="field-label" htmlFor="site-span">
              Study span in meters
            </label>
            <input
              id="site-span"
              className="text-input text-input-small"
              type="number"
              min={160}
              max={2000}
              step={20}
              value={siteImportState.spanMeters}
              onChange={(event) => onSiteImportSpanChange(Number(event.target.value))}
            />

            <button className="primary-button" onClick={onGenerateSiteVariant} type="button">
              Build zone study
            </button>

            <div className={`status-strip is-${siteImportState.status}`}>
              <strong>{siteImportState.status}</strong>
              <span>{siteImportState.message}</span>
            </div>

            <div className="editorial-note">
              <p>This first adapter parses the Google Maps zone and builds a geospatially seeded woodblock study.</p>
              <p>Direct Google photorealistic 3D scan sampling is a next adapter, because it requires the Map Tiles API and streamed 3D tiles.</p>
            </div>
          </div>
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
