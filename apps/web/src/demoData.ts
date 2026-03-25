import type { BlockLibrary, CityVariant, EvaluationReport, FabricationProfile, RuleSet, SemanticGraph } from "@memory-city/core-model";
import { generateMnemonicVariants } from "@memory-city/core-generators";
import { evaluateVariant } from "@memory-city/core-evaluation";

export const DEMO_BLOCK_LIBRARY: BlockLibrary = {
  id: "classic-wood-kit",
  name: "Classic wood kit",
  moduleMm: 20,
  blockTypes: [
    { id: "cube", label: "Cube", family: "mass", width: 1, depth: 1, height: 1, landmark: false },
    { id: "bar", label: "Bar", family: "axis", width: 2, depth: 1, height: 1, landmark: false },
    { id: "slab", label: "Slab", family: "plateau", width: 2, depth: 2, height: 1, landmark: false },
    { id: "tower", label: "Tower", family: "tower", width: 1, depth: 1, height: 3, landmark: true },
    { id: "gate", label: "Gate", family: "gate", width: 2, depth: 1, height: 2, landmark: true },
    { id: "terrace", label: "Terrace", family: "plateau", width: 2, depth: 2, height: 2, landmark: false },
    { id: "marker", label: "Marker", family: "marker", width: 1, depth: 1, height: 5, landmark: true },
    { id: "bridge", label: "Bridge", family: "bridge", width: 2, depth: 1, height: 1, landmark: true }
  ]
};

export const DEMO_RULE_SET: RuleSet = {
  id: "graph-first-mvp",
  name: "Graph-first mnemonic generator",
  generatorFamily: "graph-first",
  notes: [
    "Importance maps to height and landmark intensity.",
    "Threshold concepts create stronger pauses and gates.",
    "Variant seeds perturb anchor placement without breaking the route order."
  ]
};

export const DEMO_FABRICATION_PROFILE: FabricationProfile = {
  id: "tabletop-hardwood",
  name: "Tabletop hardwood kit",
  moduleMm: 20,
  material: "light-hardwood",
  finish: "matte",
  joinStrategy: "gravity-tray",
  maxPieceCount: 28
};

export const DEMO_SEMANTIC_GRAPH: SemanticGraph = {
  id: "ars-memoriae-demo",
  title: "Mnemonic lesson on city, memory, threshold, and contrast",
  nodes: [
    {
      id: "n1",
      label: "Entry thesis",
      kind: "chapter",
      category: "history",
      importance: 3,
      order: 1,
      note: "The city becomes a memory instrument."
    },
    {
      id: "n2",
      label: "Threshold",
      kind: "transition",
      category: "method",
      importance: 4,
      order: 2,
      note: "A remembered path needs a marked crossing."
    },
    {
      id: "n3",
      label: "Contrast",
      kind: "contrast",
      category: "contrast",
      importance: 3,
      order: 3,
      note: "Difference increases recall."
    },
    {
      id: "n4",
      label: "Pause court",
      kind: "concept",
      category: "memory",
      importance: 2,
      order: 4,
      note: "A pause helps structure a sequence."
    },
    {
      id: "n5",
      label: "Tower anchor",
      kind: "landmark",
      category: "memory",
      importance: 5,
      order: 5,
      note: "A tall singularity locks the middle of the lesson."
    },
    {
      id: "n6",
      label: "Return branch",
      kind: "transition",
      category: "method",
      importance: 3,
      order: 6,
      note: "The system allows a secondary recall loop."
    },
    {
      id: "n7",
      label: "Bridge idea",
      kind: "concept",
      category: "contrast",
      importance: 4,
      order: 7,
      note: "Two distant ideas can be linked by a visible crossing."
    },
    {
      id: "n8",
      label: "Conclusion",
      kind: "conclusion",
      category: "history",
      importance: 5,
      order: 8,
      note: "The route closes with an elevated summary."
    }
  ],
  edges: [
    { id: "e1", from: "n1", to: "n2", relation: "next" },
    { id: "e2", from: "n2", to: "n3", relation: "next" },
    { id: "e3", from: "n3", to: "n4", relation: "next" },
    { id: "e4", from: "n4", to: "n5", relation: "next" },
    { id: "e5", from: "n5", to: "n6", relation: "next" },
    { id: "e6", from: "n6", to: "n7", relation: "next" },
    { id: "e7", from: "n7", to: "n8", relation: "next" },
    { id: "e8", from: "n3", to: "n7", relation: "contrast" },
    { id: "e9", from: "n5", to: "n8", relation: "supports" }
  ]
};

export function createDemoWorkspace(): {
  variants: CityVariant[];
  reports: Map<string, EvaluationReport>;
  diagnostics: Map<string, string[]>;
} {
  const generated = generateMnemonicVariants({
    semanticGraph: DEMO_SEMANTIC_GRAPH,
    blockLibrary: DEMO_BLOCK_LIBRARY,
    ruleSet: DEMO_RULE_SET,
    fabricationProfile: DEMO_FABRICATION_PROFILE,
    footprint: { width: 16, depth: 12 },
    count: 4,
    baseSeed: 101
  });

  return {
    variants: generated.map((entry) => entry.variant),
    reports: new Map(generated.map((entry) => [entry.variant.id, evaluateVariant(entry.variant)])),
    diagnostics: new Map(generated.map((entry) => [entry.variant.id, entry.diagnostics]))
  };
}
