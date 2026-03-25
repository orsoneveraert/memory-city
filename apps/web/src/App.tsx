import { useState } from "react";
import type { CityVariant } from "@memory-city/core-model";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { PlanViewport } from "./components/PlanViewport";
import { SceneViewport } from "./components/SceneViewport";
import { InspectorPanel } from "./components/InspectorPanel";
import { BottomBar } from "./components/BottomBar";
import { createDemoWorkspace } from "./demoData";

export default function App() {
  const [{ variants, reports, diagnostics }] = useState(() => createDemoWorkspace());
  const [selectedVariantId, setSelectedVariantId] = useState(variants[0].id);
  const [renderMode, setRenderMode] = useState<"analytic" | "wood">("wood");
  const [workspaceMode, setWorkspaceMode] = useState<
    "review" | "semantics" | "compose" | "evaluate" | "fabrication"
  >("review");
  const [selectedSemanticNodeId, setSelectedSemanticNodeId] = useState<string | null>(
    variants[0].semanticGraph.nodes[0]?.id ?? null
  );

  const selectedVariant = variants.find((variant) => variant.id === selectedVariantId) as CityVariant;
  const selectedReport = reports.get(selectedVariantId)!;

  function handleSelectVariant(variantId: string) {
    setSelectedVariantId(variantId);
    const variant = variants.find((entry) => entry.id === variantId);
    setSelectedSemanticNodeId(variant?.semanticGraph.nodes[0]?.id ?? null);
  }

  return (
    <div className="app-shell">
      <TopBar
        variant={selectedVariant}
        report={selectedReport}
        workspaceMode={workspaceMode}
        onWorkspaceModeChange={setWorkspaceMode}
        renderMode={renderMode}
        onRenderModeChange={setRenderMode}
      />

      <div className="workspace-grid">
        <Sidebar
          variants={variants}
          reports={reports}
          selectedVariantId={selectedVariantId}
          onSelectVariant={handleSelectVariant}
          selectedSemanticNodeId={selectedSemanticNodeId}
          onSelectSemanticNode={setSelectedSemanticNodeId}
        />

        <main className="main-stage">
          <section className="viewport-panel">
            <header className="panel-header">
              <div>
                <p className="eyebrow">Plan</p>
                <h2>Mnemonic route and linked footprint</h2>
              </div>
              <p className="panel-note">Selecting a concept now highlights its route anchor and physical block in every view.</p>
            </header>
            <PlanViewport
              variant={selectedVariant}
              selectedSemanticNodeId={selectedSemanticNodeId}
              onSelectSemanticNode={setSelectedSemanticNodeId}
            />
          </section>

          <section className="viewport-panel">
            <header className="panel-header">
              <div>
                <p className="eyebrow">Volume</p>
                <h2>3D material preview</h2>
              </div>
              <p className="panel-note">Toggle between analytic and wood mode to compare form and material expression.</p>
            </header>
            <SceneViewport
              variant={selectedVariant}
              renderMode={renderMode}
              selectedSemanticNodeId={selectedSemanticNodeId}
              onSelectSemanticNode={setSelectedSemanticNodeId}
            />
          </section>
        </main>

        <InspectorPanel
          variant={selectedVariant}
          report={selectedReport}
          workspaceMode={workspaceMode}
          selectedSemanticNodeId={selectedSemanticNodeId}
          diagnostics={diagnostics.get(selectedVariantId) ?? []}
        />
      </div>

      <BottomBar
        variant={selectedVariant}
        report={selectedReport}
        selectedSemanticNodeId={selectedSemanticNodeId}
        onSelectSemanticNode={setSelectedSemanticNodeId}
      />
    </div>
  );
}
