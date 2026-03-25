import { startTransition, useState } from "react";
import type { CityVariant } from "@memory-city/core-model";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { PlanViewport } from "./components/PlanViewport";
import { SceneViewport } from "./components/SceneViewport";
import { InspectorPanel } from "./components/InspectorPanel";
import { BottomBar } from "./components/BottomBar";
import { createDemoWorkspace, DEMO_BLOCK_LIBRARY, DEMO_FABRICATION_PROFILE } from "./demoData";
import { buildSiteVariantFromGoogleZone } from "./siteImport";
import {
  buildZoneBlockLibrary,
  buildZoneFabricationProfile,
  summarizeBlockLibrary,
  summarizeVariantForFabrication,
  type ZoneImportState
} from "./zoneBuilder";

const initialWorkspace = createDemoWorkspace();

export default function App() {
  const [workspace, setWorkspace] = useState(() => initialWorkspace);
  const [selectedVariantId, setSelectedVariantId] = useState(initialWorkspace.variants[0].id);
  const [renderMode, setRenderMode] = useState<"analytic" | "wood">("wood");
  const [workspaceMode, setWorkspaceMode] = useState<
    "review" | "semantics" | "compose" | "evaluate" | "fabrication"
  >("review");
  const [primaryViewport, setPrimaryViewport] = useState<"plan" | "volume">("volume");
  const [selectedSemanticNodeId, setSelectedSemanticNodeId] = useState<string | null>(
    initialWorkspace.variants[0].semanticGraph.nodes[0]?.id ?? null
  );
  const [siteImportState, setSiteImportState] = useState<ZoneImportState>({
    sourceUrl: "https://www.google.com/maps/@48.8566,2.3522,17z",
    spanMeters: 560,
    moduleCm: 2,
    blockStrategy: "generative",
    uniformWidthCm: 2,
    uniformDepthCm: 2,
    uniformHeightCm: 2,
    typeProfile: "balanced",
    status: "idle",
    message: "Paste a Google Maps URL or raw lat,lng to build a wood block site study."
  });

  const selectedVariant = workspace.variants.find((variant) => variant.id === selectedVariantId) as CityVariant;
  const selectedReport = workspace.reports.get(selectedVariantId)!;
  const isComposeMode = workspaceMode === "compose";
  const previewBlockLibrary = buildZoneBlockLibrary(siteImportState, DEMO_BLOCK_LIBRARY);
  const previewFabricationProfile = buildZoneFabricationProfile(siteImportState, DEMO_FABRICATION_PROFILE);
  const kitPreview = summarizeBlockLibrary(previewBlockLibrary);
  const fabricationSummary = summarizeVariantForFabrication(selectedVariant);

  function handleSelectVariant(variantId: string) {
    setSelectedVariantId(variantId);
    const variant = workspace.variants.find((entry) => entry.id === variantId);
    setSelectedSemanticNodeId(variant?.semanticGraph.nodes[0]?.id ?? null);
  }

  function handleGenerateSiteVariant() {
    try {
      const result = buildSiteVariantFromGoogleZone({
        sourceUrl: siteImportState.sourceUrl,
        spanMeters: siteImportState.spanMeters,
        blockLibrary: previewBlockLibrary,
        fabricationProfile: previewFabricationProfile,
        blockStrategy: siteImportState.blockStrategy
      });

      startTransition(() => {
        setWorkspace((current) => ({
          variants: [result.variant, ...current.variants.filter((entry) => entry.id !== result.variant.id)],
          reports: new Map(current.reports).set(result.variant.id, result.report),
          diagnostics: new Map(current.diagnostics).set(result.variant.id, result.diagnostics)
        }));
        setSelectedVariantId(result.variant.id);
        setSelectedSemanticNodeId(result.variant.semanticGraph.nodes[0]?.id ?? null);
        setWorkspaceMode("compose");
        setPrimaryViewport("volume");
        setRenderMode("wood");
      });

      setSiteImportState((current) => ({
        ...current,
        status: "ready",
        message: result.summary
      }));
    } catch (error) {
      setSiteImportState((current) => ({
        ...current,
        status: "error",
        message: error instanceof Error ? error.message : "Could not build a site study from this zone."
      }));
    }
  }

  const effectivePrimaryViewport = isComposeMode ? "volume" : primaryViewport;
  const secondaryViewport = isComposeMode ? "plan" : primaryViewport === "plan" ? "volume" : "plan";

  return (
    <div className={`app-shell ${isComposeMode ? "is-compose-mode" : ""}`}>
      <TopBar
        variant={selectedVariant}
        report={selectedReport}
        workspaceMode={workspaceMode}
        onWorkspaceModeChange={setWorkspaceMode}
        renderMode={renderMode}
        onRenderModeChange={setRenderMode}
        fabricationSummary={fabricationSummary}
      />

      <div className={`workspace-grid ${isComposeMode ? "is-compose-mode" : ""}`}>
        <Sidebar
          variants={workspace.variants}
          reports={workspace.reports}
          selectedVariantId={selectedVariantId}
          onSelectVariant={handleSelectVariant}
          selectedSemanticNodeId={selectedSemanticNodeId}
          onSelectSemanticNode={setSelectedSemanticNodeId}
          workspaceMode={workspaceMode}
          fabricationSummary={fabricationSummary}
        />

        <main className={`main-stage ${isComposeMode ? "is-compose-mode" : ""}`}>
          <header className="stage-header">
            <div className="stage-title-block">
              <p className="eyebrow">{isComposeMode ? "Google zone" : "Viewer"}</p>
              <h2>{isComposeMode ? "Wood block site study" : selectedVariant.name}</h2>
              <p className="panel-note">
                {isComposeMode
                  ? `${selectedVariant.name} · ${siteImportState.spanMeters} m site span · ${fabricationSummary.strategyLabel}`
                  : selectedVariant.semanticGraph.title}
              </p>
            </div>

            <div className="stage-controls">
              {isComposeMode ? null : (
                <div className="view-toggle" role="tablist" aria-label="Primary viewport">
                  <button
                    className={primaryViewport === "plan" ? "is-active" : ""}
                    onClick={() => setPrimaryViewport("plan")}
                    type="button"
                  >
                    Plan
                  </button>
                  <button
                    className={primaryViewport === "volume" ? "is-active" : ""}
                    onClick={() => setPrimaryViewport("volume")}
                    type="button"
                  >
                    Volume
                  </button>
                </div>
              )}

              <div className="stage-metrics">
                <div className="stage-metric">
                  <span>{isComposeMode ? "System" : "Rule set"}</span>
                  <strong>{isComposeMode ? fabricationSummary.strategyLabel : selectedVariant.ruleSet.name}</strong>
                </div>
                <div className="stage-metric">
                  <span>{isComposeMode ? "Maquette" : "Blocks"}</span>
                  <strong>
                    {isComposeMode
                      ? `${fabricationSummary.widthCm} x ${fabricationSummary.depthCm} x ${fabricationSummary.heightCm} cm`
                      : selectedVariant.scene.blocks.length}
                  </strong>
                </div>
                <div className="stage-metric">
                  <span>{isComposeMode ? "Pieces" : "Memory"}</span>
                  <strong>{isComposeMode ? fabricationSummary.totalBlocks : Math.round(selectedReport.profile.memory * 100)}</strong>
                </div>
                <div className="stage-metric">
                  <span>{isComposeMode ? "Module" : "Path"}</span>
                  <strong>{isComposeMode ? `${fabricationSummary.moduleCm} cm` : selectedReport.metrics.routeLength}</strong>
                </div>
              </div>
            </div>
          </header>

          <div className={`viewer-layout ${isComposeMode ? "is-compose-mode" : ""}`}>
            <section className="viewer-primary-shell">
              {effectivePrimaryViewport === "plan" ? (
                <PlanViewport
                  variant={selectedVariant}
                  selectedSemanticNodeId={selectedSemanticNodeId}
                  onSelectSemanticNode={setSelectedSemanticNodeId}
                />
              ) : (
                <SceneViewport
                  variant={selectedVariant}
                  renderMode={renderMode}
                  selectedSemanticNodeId={selectedSemanticNodeId}
                  onSelectSemanticNode={setSelectedSemanticNodeId}
                />
              )}
            </section>

            <aside className="viewer-secondary-shell">
              <div className="secondary-label">
                <p className="eyebrow">Inset</p>
                <strong>
                  {isComposeMode ? "Construction plan" : secondaryViewport === "plan" ? "Plan" : "Volume"}
                </strong>
              </div>
              {secondaryViewport === "plan" ? (
                <PlanViewport
                  variant={selectedVariant}
                  selectedSemanticNodeId={selectedSemanticNodeId}
                  onSelectSemanticNode={setSelectedSemanticNodeId}
                />
              ) : (
                <SceneViewport
                  variant={selectedVariant}
                  renderMode={renderMode}
                  selectedSemanticNodeId={selectedSemanticNodeId}
                  onSelectSemanticNode={setSelectedSemanticNodeId}
                />
              )}
            </aside>
          </div>
        </main>

        <InspectorPanel
          variant={selectedVariant}
          report={selectedReport}
          workspaceMode={workspaceMode}
          selectedSemanticNodeId={selectedSemanticNodeId}
          diagnostics={workspace.diagnostics.get(selectedVariantId) ?? []}
          siteImportState={siteImportState}
          kitPreview={kitPreview}
          fabricationSummary={fabricationSummary}
          onSiteImportSourceChange={(value) =>
            setSiteImportState((current) => ({
              ...current,
              sourceUrl: value
            }))
          }
          onSiteImportSpanChange={(value) =>
            setSiteImportState((current) => ({
              ...current,
              spanMeters: value
            }))
          }
          onSiteImportModuleChange={(value) =>
            setSiteImportState((current) => ({
              ...current,
              moduleCm: value
            }))
          }
          onSiteImportBlockStrategyChange={(value) =>
            setSiteImportState((current) => ({
              ...current,
              blockStrategy: value
            }))
          }
          onSiteImportUniformShapeChange={(dimension, value) =>
            setSiteImportState((current) => ({
              ...current,
              [dimension]: value
            }))
          }
          onSiteImportTypeProfileChange={(value) =>
            setSiteImportState((current) => ({
              ...current,
              typeProfile: value
            }))
          }
          onGenerateSiteVariant={handleGenerateSiteVariant}
        />
      </div>

      <BottomBar
        variant={selectedVariant}
        report={selectedReport}
        selectedSemanticNodeId={selectedSemanticNodeId}
        onSelectSemanticNode={setSelectedSemanticNodeId}
        workspaceMode={workspaceMode}
        fabricationSummary={fabricationSummary}
      />
    </div>
  );
}
