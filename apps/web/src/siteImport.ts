import type {
  BlockLibrary,
  CityVariant,
  EvaluationReport,
  FabricationProfile,
  LayoutGrid,
  PlacedBlock,
  RouteEdge,
  RouteGraph,
  RouteNode,
  RouteStep,
  RuleSet,
  SemanticGraph,
  VoidCell
} from "@memory-city/core-model";
import { evaluateVariant } from "@memory-city/core-evaluation";

export type ParsedGoogleZone = {
  sourceUrl: string;
  centerLat: number;
  centerLng: number;
  zoom: number | null;
  spanMeters: number;
};

export type SiteImportResult = {
  zone: ParsedGoogleZone;
  variant: CityVariant;
  report: EvaluationReport;
  diagnostics: string[];
  summary: string;
};

function parseLatLngPair(text: string): { lat: number; lng: number } | null {
  const match = text.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
  if (!match) {
    return null;
  }

  return {
    lat: Number(match[1]),
    lng: Number(match[2])
  };
}

export function parseGoogleMapsZone(sourceUrl: string, spanMeters: number): ParsedGoogleZone {
  const trimmed = sourceUrl.trim();
  const rawPair = parseLatLngPair(trimmed);

  if (rawPair && !trimmed.includes("google.")) {
    return {
      sourceUrl: trimmed,
      centerLat: rawPair.lat,
      centerLng: rawPair.lng,
      zoom: 16,
      spanMeters
    };
  }

  const atPattern = trimmed.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),(\d+(?:\.\d+)?)z/);
  if (atPattern) {
    return {
      sourceUrl: trimmed,
      centerLat: Number(atPattern[1]),
      centerLng: Number(atPattern[2]),
      zoom: Number(atPattern[3]),
      spanMeters
    };
  }

  const threeDPattern = trimmed.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  if (threeDPattern) {
    return {
      sourceUrl: trimmed,
      centerLat: Number(threeDPattern[1]),
      centerLng: Number(threeDPattern[2]),
      zoom: 17,
      spanMeters
    };
  }

  const queryPattern = trimmed.match(/[?&](?:ll|q)=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (queryPattern) {
    return {
      sourceUrl: trimmed,
      centerLat: Number(queryPattern[1]),
      centerLng: Number(queryPattern[2]),
      zoom: 16,
      spanMeters
    };
  }

  throw new Error("Could not parse a center point from this Google Maps URL. Use a URL with @lat,lng,zoomz or paste raw lat,lng.");
}

function fract(value: number): number {
  return value - Math.floor(value);
}

function hash(valueA: number, valueB: number, seed: number): number {
  return fract(Math.sin(valueA * 127.1 + valueB * 311.7 + seed * 74.7) * 43758.5453123);
}

function smoothstep(value: number): number {
  return value * value * (3 - 2 * value);
}

function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

function valueNoise(x: number, y: number, seed: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = x0 + 1;
  const y1 = y0 + 1;

  const sx = smoothstep(fract(x));
  const sy = smoothstep(fract(y));

  const n00 = hash(x0, y0, seed);
  const n10 = hash(x1, y0, seed);
  const n01 = hash(x0, y1, seed);
  const n11 = hash(x1, y1, seed);

  const nx0 = lerp(n00, n10, sx);
  const nx1 = lerp(n01, n11, sx);
  return lerp(nx0, nx1, sy);
}

function coordinateSeed(zone: ParsedGoogleZone): number {
  return Math.abs(
    Math.round(zone.centerLat * 10000) ^
      Math.round(zone.centerLng * 10000) ^
      Math.round((zone.zoom ?? 16) * 100) ^
      Math.round(zone.spanMeters)
  );
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function labelForCell(x: number, y: number, width: number, depth: number, index: number): string {
  const horizontal = x < width * 0.33 ? "west" : x > width * 0.66 ? "east" : "central";
  const vertical = y < depth * 0.33 ? "north" : y > depth * 0.66 ? "south" : "middle";
  const nouns = ["edge", "band", "hinge", "core", "marker", "exit"];
  return `${capitalize(vertical)} ${capitalize(horizontal)} ${capitalize(nouns[index % nouns.length])}`;
}

function addRouteSegment(route: RouteStep[], fromX: number, fromY: number, toX: number, toY: number): void {
  let x = fromX;
  let y = fromY;

  while (x !== toX) {
    x += Math.sign(toX - x);
    route.push({
      id: `site-route-${route.length + 1}`,
      x,
      y,
      role: "sequence"
    });
  }

  while (y !== toY) {
    y += Math.sign(toY - y);
    route.push({
      id: `site-route-${route.length + 1}`,
      x,
      y,
      role: "sequence"
    });
  }
}

function getPlacedBlockDimensions(block: PlacedBlock, blockLibrary: BlockLibrary): { width: number; depth: number } {
  const type = blockLibrary.blockTypes.find((entry) => entry.id === block.typeId)!;
  return {
    width: block.rotation === 90 ? type.depth : type.width,
    depth: block.rotation === 90 ? type.width : type.depth
  };
}

function canPlaceBlock(
  block: PlacedBlock,
  occupiedBlockCells: Set<string>,
  blockLibrary: BlockLibrary,
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

function markBlockCells(block: PlacedBlock, occupiedBlockCells: Set<string>, blockLibrary: BlockLibrary): void {
  const dimensions = getPlacedBlockDimensions(block, blockLibrary);
  for (let dx = 0; dx < dimensions.width; dx += 1) {
    for (let dy = 0; dy < dimensions.depth; dy += 1) {
      occupiedBlockCells.add(`${block.x + dx}:${block.y + dy}`);
    }
  }
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
    id: `site-edge-${index + 1}`,
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
  width: number,
  depth: number,
  blocks: PlacedBlock[],
  route: RouteStep[],
  voids: VoidCell[],
  blockLibrary: BlockLibrary
): LayoutGrid {
  const occupancy: LayoutGrid["occupancy"] = [];

  blocks.forEach((block) => {
    const dimensions = getPlacedBlockDimensions(block, blockLibrary);
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

  return { width, depth, occupancy };
}

export function buildSiteVariantFromGoogleZone(options: {
  sourceUrl: string;
  spanMeters: number;
  blockLibrary: BlockLibrary;
  fabricationProfile: FabricationProfile;
}): SiteImportResult {
  const zone = parseGoogleMapsZone(options.sourceUrl, options.spanMeters);
  const footprint = { width: 18, depth: 12 };
  const seed = coordinateSeed(zone);
  const zoomFactor = Math.min(1.2, Math.max(0.75, (zone.zoom ?? 16) / 16));
  const streetX = 3 + Math.floor(hash(seed, 1, 11) * (footprint.width - 6));
  const streetY = 2 + Math.floor(hash(seed, 2, 19) * (footprint.depth - 4));
  const bandY = 1 + Math.floor(hash(seed, 4, 31) * (footprint.depth - 2));
  const voids: VoidCell[] = [];
  const occupiedBlockCells = new Set<string>();
  const occupiedVoidCells = new Set<string>();
  const candidates: Array<PlacedBlock & { score: number }> = [];

  for (let y = 0; y < footprint.depth; y += 1) {
    for (let x = 0; x < footprint.width; x += 1) {
      const isAxis = x === streetX || y === streetY || y === bandY;
      const isPlaza = Math.abs(x - streetX) <= 1 && Math.abs(y - streetY) <= 1;

      if (isAxis || isPlaza) {
        const key = `${x}:${y}`;
        occupiedVoidCells.add(key);
        voids.push({
          id: `site-void-${x}-${y}`,
          x,
          y,
          kind: isPlaza ? "pause" : x === streetX || y === streetY ? "circulation" : "threshold"
        });
        continue;
      }

      const centrality =
        1 -
        Math.hypot(x - footprint.width / 2, y - footprint.depth / 2) /
          Math.hypot(footprint.width / 2, footprint.depth / 2);
      const grain = valueNoise(x * 0.42 + zone.centerLat * 1.5, y * 0.42 + zone.centerLng * 1.5, seed);
      const directionality = 1 - Math.min(1, Math.abs(x - streetX) / footprint.width);
      const banding = 1 - Math.min(1, Math.abs(y - bandY) / footprint.depth);
      const density = grain * 0.48 + centrality * 0.32 + directionality * 0.12 + banding * 0.08;

      if (density * zoomFactor < 0.56) {
        continue;
      }

      const rotation = x % 2 === 0 ? 0 : 90;
      candidates.push({
        id: `site-cell-${x}-${y}`,
        typeId: "cube",
        x,
        y,
        rotation,
        score: density * zoomFactor
      });
    }
  }

  candidates.sort((left, right) => right.score - left.score);

  const placedBlocks: Array<PlacedBlock & { score: number }> = [];
  const maxBlocks = Math.min(options.fabricationProfile.maxPieceCount, 26);

  for (const candidate of candidates) {
    if (placedBlocks.length >= maxBlocks) {
      break;
    }

    const preferredTypes =
      candidate.score > 0.98
        ? ["marker", "tower", "terrace"]
        : candidate.score > 0.9
          ? ["tower", "terrace", "gate"]
          : candidate.score > 0.82
            ? ["terrace", "slab", "bar"]
            : candidate.score > 0.72
              ? [candidate.rotation === 0 ? "bar" : "slab", "cube"]
              : ["cube"];

    let placed = false;

    for (const typeId of preferredTypes) {
      const attempt: PlacedBlock = {
        ...candidate,
        typeId,
        rotation: typeId === "bar" ? candidate.rotation : 0
      };

      if (!canPlaceBlock(attempt, occupiedBlockCells, options.blockLibrary, footprint.width, footprint.depth)) {
        continue;
      }

      markBlockCells(attempt, occupiedBlockCells, options.blockLibrary);
      placedBlocks.push({
        ...attempt,
        score: candidate.score
      });
      placed = true;
      break;
    }

    if (!placed) {
      continue;
    }
  }

  const anchors = placedBlocks
    .slice()
    .sort((left, right) => right.score - left.score)
    .slice(0, Math.min(6, placedBlocks.length))
    .sort((left, right) => (left.x === right.x ? left.y - right.y : left.x - right.x));

  const semanticGraph: SemanticGraph = {
    id: `google-zone-${seed}`,
    title: `Zone study ${zone.centerLat.toFixed(4)}, ${zone.centerLng.toFixed(4)}`,
    nodes: anchors.map((block, index) => ({
      id: `zone-node-${index + 1}`,
      label: labelForCell(block.x, block.y, footprint.width, footprint.depth, index),
      kind: index === Math.floor(anchors.length / 2) ? "landmark" : index === 0 || index === anchors.length - 1 ? "transition" : "concept",
      category: index % 2 === 0 ? "memory" : "method",
      importance: Math.min(5, Math.max(2, Math.round(block.score * 5))),
      order: index + 1,
      note: `Derived from Google Maps zone center ${zone.centerLat.toFixed(5)}, ${zone.centerLng.toFixed(5)} with a ${zone.spanMeters} m study span.`
    })),
    edges: anchors.slice(1).map((_, index) => ({
      id: `zone-edge-${index + 1}`,
      from: `zone-node-${index + 1}`,
      to: `zone-node-${index + 2}`,
      relation: "next"
    }))
  };

  anchors.forEach((anchor, index) => {
    anchor.semanticNodeId = semanticGraph.nodes[index].id;
  });

  const route: RouteStep[] = anchors.length
    ? [
        {
          id: "zone-entry",
          x: anchors[0].x,
          y: anchors[0].y,
          semanticNodeId: semanticGraph.nodes[0].id,
          role: "entry"
        }
      ]
    : [];

  anchors.forEach((anchor, index) => {
    const previous = route[route.length - 1];
    if (previous && (previous.x !== anchor.x || previous.y !== anchor.y)) {
      addRouteSegment(route, previous.x, previous.y, anchor.x, anchor.y);
    }

    route.push({
      id: `zone-anchor-${anchor.semanticNodeId}`,
      x: anchor.x,
      y: anchor.y,
      semanticNodeId: anchor.semanticNodeId,
      role: index === Math.floor(anchors.length / 2) ? "landmark" : index === 0 || index === anchors.length - 1 ? "threshold" : "sequence"
    });
  });

  if (anchors.length > 0) {
    route.push({
      id: "zone-exit",
      x: Math.min(footprint.width - 1, anchors[anchors.length - 1].x + 1),
      y: Math.min(footprint.depth - 1, anchors[anchors.length - 1].y + 1),
      role: "exit"
    });
  }

  const routeGraph = buildRouteGraph(route);
  const layout = buildLayoutGrid(footprint.width, footprint.depth, placedBlocks, route, voids, options.blockLibrary);

  const ruleSet: RuleSet = {
    id: `zone-adapter-${seed}`,
    name: "Zone adapter — Google URL seed",
    generatorFamily: "geo-zone-seeded",
    notes: [
      "Coordinates and zoom are used as the site seed.",
      "Primary void axes are treated as street-like clearances and pauses.",
      "Direct Google photorealistic 3D mesh sampling is not wired in this prototype yet."
    ]
  };

  const variant: CityVariant = {
    id: `site-variant-${seed}`,
    name: `Zone ${zone.centerLat.toFixed(3)}, ${zone.centerLng.toFixed(3)}`,
    seed,
    footprint,
    semanticGraph,
    blockLibrary: options.blockLibrary,
    ruleSet,
    fabricationProfile: options.fabricationProfile,
    routeGraph,
    layout,
    scene: {
      blocks: placedBlocks,
      route,
      voids
    },
    overrides: [],
    notes: [
      `Source URL: ${zone.sourceUrl}`,
      `Study span: ${zone.spanMeters} m`,
      "This is a first-pass geospatial abstraction seeded from a Google Maps zone URL."
    ]
  };

  const report = evaluateVariant(variant);
  const diagnostics = [
    `Google Maps zone parsed at ${zone.centerLat.toFixed(5)}, ${zone.centerLng.toFixed(5)}.`,
    `Zoom ${zone.zoom ?? 16} and span ${zone.spanMeters} m used to seed the site study.`,
    "Current prototype generates a geospatially seeded woodblock abstraction. A direct Google 3D Tiles adapter remains a next step."
  ];

  return {
    zone,
    variant,
    report,
    diagnostics,
    summary: `${zone.centerLat.toFixed(5)}, ${zone.centerLng.toFixed(5)} · ${zone.spanMeters} m span · ${placedBlocks.length} blocks`
  };
}
