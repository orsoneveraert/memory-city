import type { CityVariant, EvaluationReport } from "@memory-city/core-model";
import type {
  BlockPreviewRow,
  FabricationSummary,
  ZoneBlockStrategy,
  ZoneImportState,
  ZoneTypeProfile
} from "../zoneBuilder";

type InspectorPanelProps = {
  variant: CityVariant;
  report: EvaluationReport;
  workspaceMode: "review" | "semantics" | "compose" | "evaluate" | "fabrication";
  selectedSemanticNodeId: string | null;
  diagnostics: string[];
  siteImportState: ZoneImportState;
  kitPreview: BlockPreviewRow[];
  fabricationSummary: FabricationSummary;
  onSiteImportSourceChange: (value: string) => void;
  onSiteImportSpanChange: (value: number) => void;
  onSiteImportModuleChange: (value: number) => void;
  onSiteImportBlockStrategyChange: (value: ZoneBlockStrategy) => void;
  onSiteImportUniformShapeChange: (dimension: "uniformWidthCm" | "uniformDepthCm" | "uniformHeightCm", value: number) => void;
  onSiteImportTypeProfileChange: (value: ZoneTypeProfile) => void;
  onGenerateSiteVariant: () => void;
};

export function InspectorPanel({
  variant,
  report,
  workspaceMode,
  selectedSemanticNodeId,
  diagnostics,
  siteImportState,
  kitPreview,
  fabricationSummary,
  onSiteImportSourceChange,
  onSiteImportSpanChange,
  onSiteImportModuleChange,
  onSiteImportBlockStrategyChange,
  onSiteImportUniformShapeChange,
  onSiteImportTypeProfileChange,
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
                <strong>
                  {selectedNode.order}. {selectedNode.label}
                </strong>
                <span>{selectedNode.importance}/5</span>
              </div>
              <p>{selectedNode.note}</p>
              <small>
                {selectedNode.kind} · {selectedNode.category}
              </small>
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
          <p className="eyebrow">Google map to blocks</p>

          <div className="form-block">
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

            <div className="field-grid field-grid-tight">
              <div className="field-stack">
                <label className="field-label" htmlFor="site-span">
                  Study span (m)
                </label>
                <input
                  id="site-span"
                  className="text-input"
                  type="number"
                  min={160}
                  max={2000}
                  step={20}
                  value={siteImportState.spanMeters}
                  onChange={(event) => onSiteImportSpanChange(Number(event.target.value))}
                />
              </div>

              <div className="field-stack">
                <label className="field-label" htmlFor="site-module">
                  Base module (cm)
                </label>
                <input
                  id="site-module"
                  className="text-input"
                  type="number"
                  min={0.5}
                  max={8}
                  step={0.5}
                  value={siteImportState.moduleCm}
                  onChange={(event) => onSiteImportModuleChange(Number(event.target.value))}
                />
              </div>
            </div>
          </div>

          <div className="table-block">
            <div className="table-row">
              <span>Block system</span>
              <strong>{siteImportState.blockStrategy === "uniform" ? "Single block size" : "Generative type set"}</strong>
            </div>
          </div>

          <div className="segmented-toggle" role="tablist" aria-label="Block strategy">
            <button
              className={siteImportState.blockStrategy === "uniform" ? "is-active" : ""}
              onClick={() => onSiteImportBlockStrategyChange("uniform")}
              type="button"
            >
              Same block size
            </button>
            <button
              className={siteImportState.blockStrategy === "generative" ? "is-active" : ""}
              onClick={() => onSiteImportBlockStrategyChange("generative")}
              type="button"
            >
              Generative shapes
            </button>
          </div>

          {siteImportState.blockStrategy === "uniform" ? (
            <div className="form-block">
              <p className="eyebrow">Block shape (cm)</p>
              <div className="field-grid field-grid-third">
                <div className="field-stack">
                  <label className="field-label" htmlFor="uniform-width">
                    Width
                  </label>
                  <input
                    id="uniform-width"
                    className="text-input"
                    type="number"
                    min={siteImportState.moduleCm}
                    step={siteImportState.moduleCm}
                    value={siteImportState.uniformWidthCm}
                    onChange={(event) => onSiteImportUniformShapeChange("uniformWidthCm", Number(event.target.value))}
                  />
                </div>
                <div className="field-stack">
                  <label className="field-label" htmlFor="uniform-depth">
                    Depth
                  </label>
                  <input
                    id="uniform-depth"
                    className="text-input"
                    type="number"
                    min={siteImportState.moduleCm}
                    step={siteImportState.moduleCm}
                    value={siteImportState.uniformDepthCm}
                    onChange={(event) => onSiteImportUniformShapeChange("uniformDepthCm", Number(event.target.value))}
                  />
                </div>
                <div className="field-stack">
                  <label className="field-label" htmlFor="uniform-height">
                    Height
                  </label>
                  <input
                    id="uniform-height"
                    className="text-input"
                    type="number"
                    min={siteImportState.moduleCm}
                    step={siteImportState.moduleCm}
                    value={siteImportState.uniformHeightCm}
                    onChange={(event) => onSiteImportUniformShapeChange("uniformHeightCm", Number(event.target.value))}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="form-block">
              <p className="eyebrow">Type profile</p>
              <div className="segmented-toggle segmented-toggle-tight" role="tablist" aria-label="Type profile">
                <button
                  className={siteImportState.typeProfile === "compact" ? "is-active" : ""}
                  onClick={() => onSiteImportTypeProfileChange("compact")}
                  type="button"
                >
                  Compact
                </button>
                <button
                  className={siteImportState.typeProfile === "balanced" ? "is-active" : ""}
                  onClick={() => onSiteImportTypeProfileChange("balanced")}
                  type="button"
                >
                  Balanced
                </button>
                <button
                  className={siteImportState.typeProfile === "vertical" ? "is-active" : ""}
                  onClick={() => onSiteImportTypeProfileChange("vertical")}
                  type="button"
                >
                  Vertical
                </button>
              </div>
            </div>
          )}

          <button className="primary-button" onClick={onGenerateSiteVariant} type="button">
            Build zone study
          </button>

          <div className={`status-strip is-${siteImportState.status}`}>
            <strong>{siteImportState.status}</strong>
            <span>{siteImportState.message}</span>
          </div>

          <div className="analytic-block">
            <div className="analytic-block-header">
              <p className="eyebrow">Block kit preview</p>
              <strong>{kitPreview.length} types</strong>
            </div>
            <div className="analytic-table">
              <div className="analytic-row analytic-row-header">
                <span>Type</span>
                <span>Family</span>
                <span>Size</span>
              </div>
              {kitPreview.map((row) => (
                <div className="analytic-row" key={row.id}>
                  <span>{row.label}</span>
                  <span>{row.family}</span>
                  <span>
                    {row.widthCm} x {row.depthCm} x {row.heightCm} cm
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="analytic-block">
            <div className="analytic-block-header">
              <p className="eyebrow">Current maquette recap</p>
              <strong>{fabricationSummary.totalBlocks} pieces</strong>
            </div>
            <div className="metric-list">
              <MetricRow
                label="Maquette size"
                value={`${fabricationSummary.widthCm} x ${fabricationSummary.depthCm} x ${fabricationSummary.heightCm} cm`}
              />
              <MetricRow label="Distinct block types" value={fabricationSummary.distinctTypes.toString()} />
              <MetricRow label="Wood volume" value={`${fabricationSummary.totalVolumeCm3} cm3`} />
              <MetricRow label="Construction plan inset" value="Visible beside the main 3D view" />
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
          <div className="analytic-table">
            <div className="analytic-row analytic-row-header">
              <span>Type</span>
              <span>Count</span>
              <span>Size</span>
            </div>
            {fabricationSummary.typeRows.map((row) => (
              <div className="analytic-row" key={row.id}>
                <span>{row.label}</span>
                <span>{row.count}</span>
                <span>
                  {row.widthCm} x {row.depthCm} x {row.heightCm} cm
                </span>
              </div>
            ))}
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
