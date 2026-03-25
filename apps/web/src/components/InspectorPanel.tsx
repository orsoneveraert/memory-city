import type { CityVariant, EvaluationReport } from "@memory-city/core-model";
import type {
  BlockPreviewRow,
  FabricationSummary,
  JuryStudySummary,
  ZoneBlockStrategy,
  ZoneDataMode,
  ZoneImportState,
  ZoneTerrainMode,
  ZoneTypeProfile
} from "../zoneBuilder";
import {
  ZONE_DATA_MODE_LABELS,
  ZONE_TERRAIN_MODE_LABELS,
  ZONE_TYPE_PROFILE_LABELS,
  ZONE_URBAN_PRESET_LABELS,
  type ZoneUrbanPreset
} from "../zoneBuilder";
import type { SiteStudy } from "../rasterSiteImport";

type InspectorPanelProps = {
  variant: CityVariant;
  report: EvaluationReport;
  workspaceMode: "review" | "semantics" | "compose" | "evaluate" | "fabrication";
  selectedSemanticNodeId: string | null;
  diagnostics: string[];
  siteImportState: ZoneImportState;
  kitPreview: BlockPreviewRow[];
  fabricationSummary: FabricationSummary;
  siteStudy: SiteStudy | null;
  jurySummary: JuryStudySummary | null;
  onSiteImportSourceChange: (value: string) => void;
  onSiteImportSpanChange: (value: number) => void;
  onSiteImportModuleChange: (value: number) => void;
  onSiteImportDataModeChange: (value: ZoneDataMode) => void;
  onSiteImportTerrainModeChange: (value: ZoneTerrainMode) => void;
  onSiteImportUrbanPresetChange: (value: ZoneUrbanPreset) => void;
  onSiteImportAbstractionChange: (value: number) => void;
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
  siteStudy,
  jurySummary,
  onSiteImportSourceChange,
  onSiteImportSpanChange,
  onSiteImportModuleChange,
  onSiteImportDataModeChange,
  onSiteImportTerrainModeChange,
  onSiteImportUrbanPresetChange,
  onSiteImportAbstractionChange,
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
          <p className="eyebrow">Map frame to maquette</p>

          <div className="segmented-toggle" role="tablist" aria-label="Source mode">
            <button
              className={siteImportState.dataMode === "open-raster" ? "is-active" : ""}
              onClick={() => onSiteImportDataModeChange("open-raster")}
              type="button"
            >
              {ZONE_DATA_MODE_LABELS["open-raster"]}
            </button>
            <button
              className={siteImportState.dataMode === "seeded" ? "is-active" : ""}
              onClick={() => onSiteImportDataModeChange("seeded")}
              type="button"
            >
              {ZONE_DATA_MODE_LABELS.seeded}
            </button>
          </div>

          <div className="analytic-block">
            <div className="analytic-block-header">
              <p className="eyebrow">Method</p>
              <strong>{siteImportState.dataMode === "open-raster" ? "Map-derived" : "Seeded"}</strong>
            </div>
            <div className="analytic-table">
              <div className="analytic-row analytic-row-header">
                <span>Step</span>
                <span>Value</span>
                <span>Reading</span>
              </div>
              <div className="analytic-row">
                <span>1. Source frame</span>
                <span>{siteImportState.spanMeters} m</span>
                <span>{siteImportState.dataMode === "open-raster" ? "Open map raster reference centered on the imported Google frame." : "Seeded geometric abstraction around the imported frame."}</span>
              </div>
              <div className="analytic-row">
                <span>2. Urban preset</span>
                <span>{ZONE_URBAN_PRESET_LABELS[siteImportState.urbanPreset]}</span>
                <span>Controls how built clusters, voids, and edges are simplified into a woodblock field.</span>
              </div>
              <div className="analytic-row">
                <span>3. Relief</span>
                <span>{ZONE_TERRAIN_MODE_LABELS[siteImportState.terrainMode]}</span>
                <span>{siteStudy ? `Reference zoom z${siteStudy.tileZoom} · ${Math.round(siteStudy.cellMeters)} m/cell.` : "Flat tray or stepped terrain base before blocks are placed."}</span>
              </div>
              <div className="analytic-row">
                <span>4. Abstraction</span>
                <span>{siteImportState.abstractionRatio}%</span>
                <span>Balances literal site grain against a reduced block grammar for fabrication.</span>
              </div>
              <div className="analytic-row">
                <span>5. Block system</span>
                <span>{siteImportState.blockStrategy === "uniform" ? "Same size" : "Generative set"}</span>
                <span>{siteImportState.blockStrategy === "uniform" ? "Single block dimension repeated across the field." : `${ZONE_TYPE_PROFILE_LABELS[siteImportState.typeProfile]} block family with shared module.`}</span>
              </div>
            </div>
          </div>

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

          <div className="form-block">
            <div className="table-row">
              <span>City preset</span>
              <strong>{ZONE_URBAN_PRESET_LABELS[siteImportState.urbanPreset]}</strong>
            </div>
            <div className="segmented-toggle segmented-toggle-preset" role="tablist" aria-label="Urban preset">
              {(["compact-core", "waterfront", "hillside", "campus", "suburban"] as const).map((preset) => (
                <button
                  key={preset}
                  className={siteImportState.urbanPreset === preset ? "is-active" : ""}
                  onClick={() => onSiteImportUrbanPresetChange(preset)}
                  type="button"
                >
                  {ZONE_URBAN_PRESET_LABELS[preset]}
                </button>
              ))}
            </div>
          </div>

          <div className="field-stack">
            <div className="table-row">
              <span>Abstraction</span>
              <strong>{siteImportState.abstractionRatio}%</strong>
            </div>
            <input
              className="range-input"
              type="range"
              min={30}
              max={80}
              step={5}
              value={siteImportState.abstractionRatio}
              onChange={(event) => onSiteImportAbstractionChange(Number(event.target.value))}
            />
          </div>

          <div className="segmented-toggle" role="tablist" aria-label="Terrain mode">
            <button
              className={siteImportState.terrainMode === "flat" ? "is-active" : ""}
              onClick={() => onSiteImportTerrainModeChange("flat")}
              type="button"
            >
              {ZONE_TERRAIN_MODE_LABELS.flat}
            </button>
            <button
              className={siteImportState.terrainMode === "stepped" ? "is-active" : ""}
              onClick={() => onSiteImportTerrainModeChange("stepped")}
              type="button"
            >
              {ZONE_TERRAIN_MODE_LABELS.stepped}
            </button>
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
            {siteImportState.dataMode === "open-raster" ? "Build map-derived study" : "Build seeded study"}
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

          {siteStudy ? (
            <>
              <div className="analytic-block">
                <div className="analytic-block-header">
                  <p className="eyebrow">Urban reading</p>
                  <strong>{jurySummary?.scaleLabel ?? siteStudy.referenceLabel}</strong>
                </div>
                <div className="metric-list">
                  <MetricRow label="Source built fabric" value={`${jurySummary?.sourceBuiltPct ?? 0}%`} />
                  <MetricRow label="Road structure" value={`${jurySummary?.sourceRoadPct ?? 0}%`} />
                  <MetricRow label="Green and water" value={`${jurySummary?.sourceGreenBluePct ?? 0}%`} />
                  <MetricRow label="Maquette coverage" value={`${jurySummary?.blockCoveragePct ?? 0}%`} />
                  <MetricRow label="Source match" value={`${jurySummary?.matchedSourcePct ?? 0}%`} />
                  <MetricRow label="Source/model delta" value={`${jurySummary?.coverageDeltaPct ?? 0}%`} />
                </div>
              </div>

              <div className="analytic-block">
                <div className="analytic-block-header">
                  <p className="eyebrow">Reference extraction</p>
                  <strong>{siteStudy.metrics.buildingClusters} clusters</strong>
                </div>
                <div className="metric-list">
                  <MetricRow label="Building cells" value={siteStudy.metrics.buildingCells.toString()} />
                  <MetricRow label="Road cells" value={siteStudy.metrics.roadCells.toString()} />
                  <MetricRow label="Green cells" value={siteStudy.metrics.parkCells.toString()} />
                  <MetricRow label="Water cells" value={siteStudy.metrics.waterCells.toString()} />
                  <MetricRow label="Matched source cells" value={`${jurySummary?.matchedSourceCells ?? 0}`} />
                  <MetricRow label="Added model cells" value={`${jurySummary?.addedModelCells ?? 0}`} />
                  <MetricRow label="Average grain" value={`${jurySummary?.averageClusterCells ?? 0} cells / cluster`} />
                </div>
              </div>

              <div className="analytic-block">
                <div className="analytic-block-header">
                  <p className="eyebrow">Height translation</p>
                  <strong>{jurySummary?.modelScaleLabel ?? "-"}</strong>
                </div>
                <div className="analytic-table">
                  <div className="analytic-row analytic-row-header">
                    <span>Source band</span>
                    <span>Cells</span>
                    <span>Block tier</span>
                  </div>
                  {jurySummary
                    ? Array.from({ length: Math.max(jurySummary.sourceHeightBands.length, jurySummary.blockHeights.length) }, (_, index) => {
                        const sourceBand = jurySummary.sourceHeightBands[index];
                        const blockBand = jurySummary.blockHeights[index];
                        return (
                          <div className="analytic-row" key={`height-${index}`}>
                            <span>{sourceBand?.label ?? "—"}</span>
                            <span>{sourceBand?.count ?? 0}</span>
                            <span>{blockBand ? `${blockBand.label} · ${blockBand.count} pcs` : "—"}</span>
                          </div>
                        );
                      })
                    : null}
                </div>
              </div>

              <div className="analytic-block">
                <div className="analytic-block-header">
                  <p className="eyebrow">Reference legend</p>
                  <strong>Source / model</strong>
                </div>
                <div className="analytic-table">
                  <div className="analytic-row analytic-row-header">
                    <span>Layer</span>
                    <span>Code</span>
                    <span>Reading</span>
                  </div>
                  <div className="analytic-row">
                    <span>Built fabric</span>
                    <span>Warm solids</span>
                    <span>Imported built surface and height bands.</span>
                  </div>
                  <div className="analytic-row">
                    <span>Road network</span>
                    <span>Pale corridors</span>
                    <span>Circulation structure preserved as void.</span>
                  </div>
                  <div className="analytic-row">
                    <span>Green and water</span>
                    <span>Green / blue</span>
                    <span>Landscape and edge conditions kept as open field.</span>
                  </div>
                  <div className="analytic-row">
                    <span>Terrain tiers</span>
                    <span>Contour wash</span>
                    <span>Stepped base relief inferred from topographic raster sampling.</span>
                  </div>
                  <div className="analytic-row">
                    <span>Block overlay</span>
                    <span>Dashed outline</span>
                    <span>Woodblock abstraction positioned against the source field.</span>
                  </div>
                  <div className="analytic-row">
                    <span>Loss / gain</span>
                    <span>Red / ochre</span>
                    <span>Highlights built fabric omitted by the model and mass added beyond the source.</span>
                  </div>
                </div>
              </div>

              <div className="analytic-block">
                <div className="analytic-block-header">
                  <p className="eyebrow">Fabrication checks</p>
                  <strong>{siteStudy.checks.length}</strong>
                </div>
                <div className="finding-list">
                  {(siteStudy.checks.length > 0 ? siteStudy.checks : diagnostics.slice(0, 3)).map((entry) => (
                    <p key={entry}>{entry}</p>
                  ))}
                </div>
              </div>
            </>
          ) : null}
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
