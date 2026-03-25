export type SemanticNodeKind =
  | "chapter"
  | "concept"
  | "transition"
  | "landmark"
  | "contrast"
  | "conclusion";

export type SemanticNode = {
  id: string;
  label: string;
  kind: SemanticNodeKind;
  category: "history" | "method" | "contrast" | "memory";
  importance: number;
  order: number;
  note?: string;
};

export type SemanticEdge = {
  id: string;
  from: string;
  to: string;
  relation: "next" | "contrast" | "supports" | "returns";
};

export type SemanticGraph = {
  id: string;
  title: string;
  nodes: SemanticNode[];
  edges: SemanticEdge[];
};

export type Project = {
  id: string;
  name: string;
  variantIds: string[];
  ruleSetIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type Footprint = {
  width: number;
  depth: number;
};

export type VoidKind =
  | "circulation"
  | "threshold"
  | "pause"
  | "mnemonic"
  | "residual";

export type BlockFamily =
  | "mass"
  | "axis"
  | "plateau"
  | "tower"
  | "gate"
  | "marker"
  | "bridge";

export type BlockType = {
  id: string;
  label: string;
  family: BlockFamily;
  width: number;
  depth: number;
  height: number;
  landmark: boolean;
};

export type BlockLibrary = {
  id: string;
  name: string;
  moduleMm: number;
  blockTypes: BlockType[];
};

export type RuleSet = {
  id: string;
  name: string;
  generatorFamily: string;
  notes: string[];
};

export type FabricationProfile = {
  id: string;
  name: string;
  moduleMm: number;
  material: "light-hardwood" | "beech" | "painted-mdf";
  finish: "matte" | "satin";
  joinStrategy: "gravity-tray" | "magnetized-base";
  maxPieceCount: number;
};

export type PlacedBlock = {
  id: string;
  typeId: string;
  x: number;
  y: number;
  rotation: 0 | 90;
  semanticNodeId?: string;
};

export type RouteNode = {
  id: string;
  x: number;
  y: number;
  semanticNodeId?: string;
  role: "entry" | "sequence" | "threshold" | "pause" | "landmark" | "exit";
};

export type RouteEdge = {
  id: string;
  from: string;
  to: string;
};

export type RouteGraph = {
  nodes: RouteNode[];
  edges: RouteEdge[];
  primaryPathNodeIds: string[];
};

export type RouteStep = {
  id: string;
  x: number;
  y: number;
  semanticNodeId?: string;
  role: "entry" | "sequence" | "threshold" | "pause" | "landmark" | "exit";
};

export type VoidCell = {
  id: string;
  x: number;
  y: number;
  kind: VoidKind;
};

export type CellClaim = {
  id: string;
  x: number;
  y: number;
  layer: "block" | "route" | "void";
  refId: string;
};

export type LayoutGrid = {
  width: number;
  depth: number;
  occupancy: CellClaim[];
};

export type Scene3D = {
  blocks: PlacedBlock[];
  route: RouteStep[];
  voids: VoidCell[];
};

export type OverridePatch = {
  id: string;
  targetId: string;
  operation: "lock" | "replaceType" | "adjustHeight" | "reserveVoid";
  payload: Record<string, unknown>;
};

export type CityVariant = {
  id: string;
  name: string;
  seed: number;
  footprint: Footprint;
  semanticGraph: SemanticGraph;
  blockLibrary: BlockLibrary;
  ruleSet: RuleSet;
  fabricationProfile: FabricationProfile;
  routeGraph: RouteGraph;
  layout: LayoutGrid;
  scene: Scene3D;
  overrides: OverridePatch[];
  notes: string[];
};

export type GeneratorInput = {
  semanticGraph: SemanticGraph;
  blockLibrary: BlockLibrary;
  ruleSet: RuleSet;
  fabricationProfile: FabricationProfile;
  footprint: Footprint;
  count?: number;
  baseSeed?: number;
};

export type GeneratedVariantArtifacts = {
  variant: CityVariant;
  diagnostics: string[];
};

export type EvaluationProfile = {
  path: number;
  memory: number;
  form: number;
  fabrication: number;
  semantic: number;
};

export type EvaluationReport = {
  variantId: string;
  profile: EvaluationProfile;
  metrics: {
    routeLength: number;
    landmarkCount: number;
    typologyCount: number;
    compactness: number;
    voidUsefulness: number;
    semanticCoverage: number;
    averageHeight: number;
  };
  findings: string[];
};
