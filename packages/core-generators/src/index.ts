import type {
  CellClaim,
  GeneratedVariantArtifacts,
  GeneratorInput,
  LayoutGrid,
  PlacedBlock,
  RouteEdge,
  RouteGraph,
  RouteNode,
  RouteStep,
  VoidCell
} from "@memory-city/core-model";

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let result = Math.imul(t ^ (t >>> 15), t | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function addRouteSegment(
  route: RouteStep[],
  fromX: number,
  fromY: number,
  toX: number,
  toY: number
): void {
  let x = fromX;
  let y = fromY;

  while (x !== toX) {
    x += Math.sign(toX - x);
    route.push({
      id: `r-${route.length + 1}`,
      x,
      y,
      role: "sequence"
    });
  }

  while (y !== toY) {
    y += Math.sign(toY - y);
    route.push({
      id: `r-${route.length + 1}`,
      x,
      y,
      role: "sequence"
    });
  }
}

function chooseType(importance: number, index: number): string {
  if (importance >= 5) {
    return index % 2 === 0 ? "marker" : "tower";
  }
  if (importance >= 4) {
    return index % 3 === 0 ? "gate" : "terrace";
  }
  if (importance === 3) {
    return index % 2 === 0 ? "bar" : "cube";
  }
  return "slab";
}

function getPlacedBlockDimensions(
  block: PlacedBlock,
  blockLibrary: GeneratorInput["blockLibrary"]
): { width: number; depth: number } {
  const type = blockLibrary.blockTypes.find((entry) => entry.id === block.typeId)!;
  return {
    width: block.rotation === 90 ? type.depth : type.width,
    depth: block.rotation === 90 ? type.width : type.depth
  };
}

function canPlaceBlock(
  block: PlacedBlock,
  occupiedBlockCells: Set<string>,
  blockLibrary: GeneratorInput["blockLibrary"],
  width: number,
  depth: number
): boolean {
  const dimensions = getPlacedBlockDimensions(block, blockLibrary);

  for (let dx = 0; dx < dimensions.width; dx += 1) {
    for (let dy = 0; dy < dimensions.depth; dy += 1) {
      const x = block.x + dx;
      const y = block.y + dy;
      if (x < 0 || x >= width || y < 0 || y >= depth) {
        return false;
      }
      if (occupiedBlockCells.has(`${x}:${y}`)) {
        return false;
      }
    }
  }

  return true;
}

function markBlockCells(
  block: PlacedBlock,
  occupiedBlockCells: Set<string>,
  blockLibrary: GeneratorInput["blockLibrary"]
): void {
  const dimensions = getPlacedBlockDimensions(block, blockLibrary);

  for (let dx = 0; dx < dimensions.width; dx += 1) {
    for (let dy = 0; dy < dimensions.depth; dy += 1) {
      occupiedBlockCells.add(`${block.x + dx}:${block.y + dy}`);
    }
  }
}

function placeAnchorBlock(
  candidate: PlacedBlock,
  occupiedBlockCells: Set<string>,
  input: GeneratorInput,
  diagnostics: string[]
): PlacedBlock {
  if (canPlaceBlock(candidate, occupiedBlockCells, input.blockLibrary, input.footprint.width, input.footprint.depth)) {
    markBlockCells(candidate, occupiedBlockCells, input.blockLibrary);
    return candidate;
  }

  const offsets = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1]
  ];

  for (const [offsetX, offsetY] of offsets) {
    const shifted: PlacedBlock = {
      ...candidate,
      x: clamp(candidate.x + offsetX, 0, input.footprint.width - 1),
      y: clamp(candidate.y + offsetY, 0, input.footprint.depth - 1)
    };

    if (canPlaceBlock(shifted, occupiedBlockCells, input.blockLibrary, input.footprint.width, input.footprint.depth)) {
      diagnostics.push(`Relocated anchor block ${candidate.id} to avoid a collision.`);
      markBlockCells(shifted, occupiedBlockCells, input.blockLibrary);
      return shifted;
    }
  }

  diagnostics.push(`Anchor block ${candidate.id} could not be relocated cleanly and kept its original cell.`);
  markBlockCells(candidate, occupiedBlockCells, input.blockLibrary);
  return candidate;
}

function createSupportBlocks(
  route: RouteStep[],
  variantIndex: number,
  input: GeneratorInput,
  occupiedBlockCells: Set<string>,
  diagnostics: string[]
): PlacedBlock[] {
  const blocks: PlacedBlock[] = [];

  route.forEach((step, index) => {
    if (index % 3 !== variantIndex % 3) {
      return;
    }

    const barHorizontal = index % 2 === 0;
    const candidate: PlacedBlock = {
      id: `support-${index}`,
      typeId: barHorizontal ? "bar" : "slab",
      x: clamp(step.x + (barHorizontal ? 0 : 1), 0, input.footprint.width - 2),
      y: clamp(step.y + (barHorizontal ? 1 : 0), 0, input.footprint.depth - 2),
      rotation: barHorizontal ? 0 : 90
    };

    if (!canPlaceBlock(candidate, occupiedBlockCells, input.blockLibrary, input.footprint.width, input.footprint.depth)) {
      diagnostics.push(`Skipped support block ${candidate.id} because its footprint collided with an occupied cell.`);
      return;
    }

    markBlockCells(candidate, occupiedBlockCells, input.blockLibrary);
    blocks.push(candidate);
  });

  return blocks;
}

function createVoids(route: RouteStep[], variantIndex: number, input: GeneratorInput, occupiedBlockCells: Set<string>): VoidCell[] {
  const voids: VoidCell[] = [];
  const occupiedVoidCells = new Set<string>();

  route.forEach((step, index) => {
    if (index % 4 === 1) {
      const x = clamp(step.x + 1, 0, input.footprint.width - 1);
      const y = step.y;
      const key = `${x}:${y}`;
      if (!occupiedBlockCells.has(key) && !occupiedVoidCells.has(key)) {
        occupiedVoidCells.add(key);
        voids.push({
          id: `void-pause-${index}`,
          x,
          y,
          kind: index % 8 === 1 ? "pause" : "circulation"
        });
      }
    }

    if (index % 5 === variantIndex % 5) {
      const x = step.x;
      const y = clamp(step.y + 1, 0, input.footprint.depth - 1);
      const key = `${x}:${y}`;
      if (!occupiedBlockCells.has(key) && !occupiedVoidCells.has(key)) {
        occupiedVoidCells.add(key);
        voids.push({
          id: `void-threshold-${index}`,
          x,
          y,
          kind: index % 2 === 0 ? "threshold" : "mnemonic"
        });
      }
    }
  });

  return voids;
}

function buildRouteGraph(route: RouteStep[]): RouteGraph {
  const nodes: RouteNode[] = route.map((step) => ({
    id: step.id,
    x: step.x,
    y: step.y,
    semanticNodeId: step.semanticNodeId,
    role: step.role
  }));

  const edges: RouteEdge[] = route.slice(1).map((step, index) => ({
    id: `edge-${index + 1}`,
    from: route[index].id,
    to: step.id
  }));

  return {
    nodes,
    edges,
    primaryPathNodeIds: route.map((step) => step.id)
  };
}

function buildLayoutGrid(
  blocks: PlacedBlock[],
  route: RouteStep[],
  voids: VoidCell[],
  input: GeneratorInput
): LayoutGrid {
  const occupancy: CellClaim[] = [];

  blocks.forEach((block) => {
    const dimensions = getPlacedBlockDimensions(block, input.blockLibrary);
    for (let dx = 0; dx < dimensions.width; dx += 1) {
      for (let dy = 0; dy < dimensions.depth; dy += 1) {
        occupancy.push({
          id: `claim-block-${block.id}-${dx}-${dy}`,
          x: block.x + dx,
          y: block.y + dy,
          layer: "block",
          refId: block.id
        });
      }
    }
  });

  route.forEach((step) => {
    occupancy.push({
      id: `claim-route-${step.id}`,
      x: step.x,
      y: step.y,
      layer: "route",
      refId: step.id
    });
  });

  voids.forEach((voidCell) => {
    occupancy.push({
      id: `claim-void-${voidCell.id}`,
      x: voidCell.x,
      y: voidCell.y,
      layer: "void",
      refId: voidCell.id
    });
  });

  return {
    width: input.footprint.width,
    depth: input.footprint.depth,
    occupancy
  };
}

export function generateMnemonicVariants(input: GeneratorInput): GeneratedVariantArtifacts[] {
  const count = input.count ?? 4;
  const baseSeed = input.baseSeed ?? 101;

  return Array.from({ length: count }, (_, variantIndex) => {
    const diagnostics: string[] = [];
    const seed = baseSeed + variantIndex * 37;
    const random = mulberry32(seed);

    const anchors = input.semanticGraph.nodes
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((node, index) => {
        const x = clamp(2 + index + Math.round(random() * 2), 1, input.footprint.width - 2);
        const yBase = 2 + ((index + variantIndex) % 3) * 2;
        const yJitter = Math.round(random() * 2) - 1;
        const y = clamp(yBase + yJitter, 1, input.footprint.depth - 2);
        return { node, x, y };
      });

    const route: RouteStep[] = [
      {
        id: "route-entry",
        x: anchors[0]?.x ?? 1,
        y: anchors[0]?.y ?? 1,
        semanticNodeId: anchors[0]?.node.id,
        role: "entry"
      }
    ];

    anchors.forEach((anchor, index) => {
      const previous = route[route.length - 1];

      if (previous.x !== anchor.x || previous.y !== anchor.y) {
        addRouteSegment(route, previous.x, previous.y, anchor.x, anchor.y);
      }

      route.push({
        id: `anchor-${anchor.node.id}`,
        x: anchor.x,
        y: anchor.y,
        semanticNodeId: anchor.node.id,
        role:
          anchor.node.kind === "landmark" || anchor.node.importance >= 4
            ? "landmark"
            : anchor.node.kind === "transition"
              ? "threshold"
              : "sequence"
      });

      if (index === anchors.length - 1) {
        route.push({
          id: "route-exit",
          x: clamp(anchor.x + 2, 0, input.footprint.width - 1),
          y: clamp(anchor.y + 1, 0, input.footprint.depth - 1),
          role: "exit"
        });
      }
    });

    const occupiedBlockCells = new Set<string>();

    const semanticBlocks: PlacedBlock[] = anchors.map((anchor, index) =>
      placeAnchorBlock(
        {
          id: `block-${anchor.node.id}`,
          typeId: chooseType(anchor.node.importance, index + variantIndex),
          x: anchor.x,
          y: anchor.y,
          rotation: index % 2 === 0 ? 0 : 90,
          semanticNodeId: anchor.node.id
        },
        occupiedBlockCells,
        input,
        diagnostics
      )
    );

    const supportBlocks = createSupportBlocks(route, variantIndex, input, occupiedBlockCells, diagnostics);

    const frameCandidates: PlacedBlock[] = [
      { id: `frame-west-${variantIndex}`, typeId: "bar", x: 0, y: 1, rotation: 90 },
      { id: `frame-south-${variantIndex}`, typeId: "bar", x: 2, y: input.footprint.depth - 1, rotation: 0 },
      { id: `frame-core-${variantIndex}`, typeId: "cube", x: input.footprint.width - 3, y: 2 + variantIndex, rotation: 0 }
    ];

    const frameBlocks = frameCandidates.filter((block) => {
      if (!canPlaceBlock(block, occupiedBlockCells, input.blockLibrary, input.footprint.width, input.footprint.depth)) {
        diagnostics.push(`Skipped frame block ${block.id} because it would collide with an occupied cell.`);
        return false;
      }
      markBlockCells(block, occupiedBlockCells, input.blockLibrary);
      return true;
    });

    const voids = createVoids(route, variantIndex, input, occupiedBlockCells);
    const scene = {
      blocks: [...semanticBlocks, ...supportBlocks, ...frameBlocks],
      route,
      voids
    };
    const routeGraph = buildRouteGraph(route);
    const layout = buildLayoutGrid(scene.blocks, route, voids, input);

    return {
      variant: {
        id: `variant-${seed}`,
        name: `Variant ${variantIndex + 1}`,
        seed,
        footprint: input.footprint,
        semanticGraph: input.semanticGraph,
        blockLibrary: input.blockLibrary,
        ruleSet: input.ruleSet,
        fabricationProfile: input.fabricationProfile,
        routeGraph,
        layout,
        scene,
        overrides: [],
        notes: [
          "Primary route kept compact to preserve mnemonic legibility.",
          "One elevated anchor marks the conceptual climax.",
          "Structured voids are treated as pauses and thresholds rather than leftover emptiness."
        ]
      },
      diagnostics
    };
  });
}
