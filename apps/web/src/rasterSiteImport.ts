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
import type {
  ZoneBlockStrategy,
  ZoneTerrainMode,
  ZoneUrbanPreset
} from "./zoneBuilder";
import { parseGoogleMapsZone, type ParsedGoogleZone } from "./siteImport";

type PixelPoint = { x: number; y: number };
type CellKey = `${number}:${number}`;
type CellKind = "building" | "road" | "park" | "water";
type BuildingCell = {
  x: number;
  y: number;
  clusterId: string;
  heightBand: number;
  terrainTier: number;
};

export type SiteStudyCell = {
  x: number;
  y: number;
  kind: CellKind;
  heightBand?: number;
  terrainTier?: number;
  clusterId?: string;
};

export type TerrainCell = {
  x: number;
  y: number;
  tier: number;
};

export type SiteStudy = {
  zone: ParsedGoogleZone;
  footprint: { width: number; depth: number };
  cellMeters: number;
  tileZoom: number;
  referenceCells: SiteStudyCell[];
  terrainCells: TerrainCell[];
  blockBaseLevels: Record<string, number>;
  metrics: {
    buildingCells: number;
    roadCells: number;
    parkCells: number;
    waterCells: number;
    buildingClusters: number;
    sourceCoverage: number;
    blockCoverage: number;
    coverageDelta: number;
    terrainActive: boolean;
  };
  checks: string[];
  referenceLabel: string;
};

export type RealSiteImportResult = {
  zone: ParsedGoogleZone;
  variant: CityVariant;
  report: EvaluationReport;
  diagnostics: string[];
  summary: string;
  study: SiteStudy;
};

type RasterStats = {
  building: number;
  road: number;
  park: number;
  water: number;
};

type RasterCell = {
  x: number;
  y: number;
  stats: RasterStats;
  kind: CellKind | null;
  terrainValue: number;
};

type TileCanvas = {
  canvas: HTMLCanvasElement;
  zoom: number;
};

const STANDARD_TILE = "https://tile.openstreetmap.org";
const TOPO_TILE = "https://a.tile.opentopomap.org";
const HEIGHT_BANDS = [1, 2, 3, 5];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

function fract(value: number): number {
  return value - Math.floor(value);
}

function hash(valueA: number, valueB: number, seed: number): number {
  return fract(Math.sin(valueA * 127.1 + valueB * 311.7 + seed * 74.7) * 43758.5453123);
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function coordinateSeed(zone: ParsedGoogleZone): number {
  return Math.abs(
    Math.round(zone.centerLat * 10000) ^
      Math.round(zone.centerLng * 10000) ^
      Math.round((zone.zoom ?? 16) * 100) ^
      Math.round(zone.spanMeters)
  );
}

function labelForAnchor(x: number, y: number, width: number, depth: number, index: number): string {
  const horizontal = x < width * 0.33 ? "west" : x > width * 0.66 ? "east" : "central";
  const vertical = y < depth * 0.33 ? "north" : y > depth * 0.66 ? "south" : "middle";
  const nouns = ["mass", "edge", "hinge", "court", "tower", "marker"];
  return `${capitalize(vertical)} ${capitalize(horizontal)} ${capitalize(nouns[index % nouns.length])}`;
}

function metersPerPixel(latitude: number, zoom: number): number {
  return (156543.03392 * Math.cos((latitude * Math.PI) / 180)) / Math.pow(2, zoom);
}

function latLngToWorldPixel(lat: number, lng: number, zoom: number): PixelPoint {
  const scale = 256 * Math.pow(2, zoom);
  const sinLat = Math.sin((lat * Math.PI) / 180);
  return {
    x: ((lng + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale
  };
}

function tileUrl(base: string, zoom: number, x: number, y: number): string {
  return `${base}/${zoom}/${x}/${y}.png`;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load tile ${url}`));
    image.src = url;
  });
}

async function loadTileCanvas(baseUrl: string, zone: ParsedGoogleZone, zoom: number, paddingPx = 48): Promise<TileCanvas> {
  const center = latLngToWorldPixel(zone.centerLat, zone.centerLng, zoom);
  const halfSpanPx = zone.spanMeters / metersPerPixel(zone.centerLat, zoom) / 2;
  const minX = center.x - halfSpanPx - paddingPx;
  const maxX = center.x + halfSpanPx + paddingPx;
  const minY = center.y - halfSpanPx - paddingPx;
  const maxY = center.y + halfSpanPx + paddingPx;

  const tileXMin = Math.floor(minX / 256);
  const tileXMax = Math.floor(maxX / 256);
  const tileYMin = Math.floor(minY / 256);
  const tileYMax = Math.floor(maxY / 256);

  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(maxX - minX);
  canvas.height = Math.ceil(maxY - minY);
  const context = canvas.getContext("2d")!;

  const tasks: Array<Promise<void>> = [];
  for (let tileX = tileXMin; tileX <= tileXMax; tileX += 1) {
    for (let tileY = tileYMin; tileY <= tileYMax; tileY += 1) {
      const url = tileUrl(baseUrl, zoom, tileX, tileY);
      tasks.push(
        loadImage(url).then((image) => {
          context.drawImage(image, tileX * 256 - minX, tileY * 256 - minY);
        })
      );
    }
  }

  await Promise.all(tasks);
  return { canvas, zoom };
}

function classifyPixel(r: number, g: number, b: number): CellKind | null {
  const brightness = (r + g + b) / 3;
  const maxChannel = Math.max(r, g, b);
  const minChannel = Math.min(r, g, b);
  const saturation = maxChannel - minChannel;

  if (b > g + 10 && b > r + 18 && brightness > 120) {
    return "water";
  }

  if (g > r + 8 && g > b + 4 && brightness > 110) {
    return "park";
  }

  if (r > g && g > b && r - b > 8 && brightness > 140 && brightness < 235) {
    return "building";
  }

  if (brightness > 228 && saturation < 24) {
    return "road";
  }

  return null;
}

function analyzeRasterCells(
  mapCanvas: HTMLCanvasElement,
  terrainCanvas: HTMLCanvasElement | null,
  zone: ParsedGoogleZone,
  preset: ZoneUrbanPreset,
  abstractionRatio: number
): { footprint: { width: number; depth: number }; cells: RasterCell[]; cellMeters: number } {
  const detailBias = abstractionRatio / 100;
  const footprintWidth = clamp(Math.round(zone.spanMeters / lerp(22, 46, detailBias)), 14, 28);
  const footprintDepth = footprintWidth;
  const cellMeters = zone.spanMeters / footprintWidth;

  const mapContext = mapCanvas.getContext("2d", { willReadFrequently: true })!;
  const terrainContext = terrainCanvas?.getContext("2d", { willReadFrequently: true }) ?? null;
  const cells: RasterCell[] = [];

  for (let y = 0; y < footprintDepth; y += 1) {
    for (let x = 0; x < footprintWidth; x += 1) {
      const x0 = Math.floor((x / footprintWidth) * mapCanvas.width);
      const y0 = Math.floor((y / footprintDepth) * mapCanvas.height);
      const x1 = Math.ceil(((x + 1) / footprintWidth) * mapCanvas.width);
      const y1 = Math.ceil(((y + 1) / footprintDepth) * mapCanvas.height);
      const width = Math.max(1, x1 - x0);
      const height = Math.max(1, y1 - y0);
      const imageData = mapContext.getImageData(x0, y0, width, height).data;

      const stats: RasterStats = {
        building: 0,
        road: 0,
        park: 0,
        water: 0
      };

      for (let index = 0; index < imageData.length; index += 8) {
        const kind = classifyPixel(imageData[index], imageData[index + 1], imageData[index + 2]);
        if (kind) {
          stats[kind] += 1;
        }
      }

      const total = Math.max(1, Math.floor(imageData.length / 8));
      const terrainValue = terrainContext
        ? (() => {
            const terrainData = terrainContext.getImageData(x0, y0, width, height).data;
            let sum = 0;
            let count = 0;
            for (let index = 0; index < terrainData.length; index += 8) {
              const brightness = (terrainData[index] + terrainData[index + 1] + terrainData[index + 2]) / 3;
              sum += brightness;
              count += 1;
            }
            return count > 0 ? sum / count : 0;
          })()
        : 0;

      const normalized = {
        building: stats.building / total,
        road: stats.road / total,
        park: stats.park / total,
        water: stats.water / total
      };

      let kind: CellKind | null = null;
      if (normalized.water > 0.2) {
        kind = "water";
      } else if (normalized.park > 0.22) {
        kind = "park";
      } else if (normalized.building > 0.14) {
        kind = "building";
      } else if (normalized.road > 0.12) {
        kind = "road";
      }

      cells.push({ x, y, stats, kind, terrainValue });
    }
  }

  const lookup = new Map(cells.map((cell) => [`${cell.x}:${cell.y}`, cell] as const));
  const directions = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1]
  ];

  cells.forEach((cell) => {
    if (cell.kind !== null) {
      return;
    }

    let roadNeighbors = 0;
    let buildingNeighbors = 0;
    for (const [dx, dy] of directions) {
      const neighbor = lookup.get(`${cell.x + dx}:${cell.y + dy}`);
      if (!neighbor) {
        continue;
      }
      if (neighbor.kind === "road") {
        roadNeighbors += 1;
      }
      if (neighbor.kind === "building") {
        buildingNeighbors += 1;
      }
    }

    const roadBias = cell.stats.road / Math.max(1, cell.stats.road + cell.stats.building + cell.stats.park + cell.stats.water);
    if (roadBias > 0.08 && buildingNeighbors > 0) {
      cell.kind = "road";
      return;
    }

    if (preset === "campus" && roadNeighbors === 0 && buildingNeighbors <= 1) {
      cell.kind = "park";
    }
  });

  return {
    footprint: { width: footprintWidth, depth: footprintDepth },
    cells,
    cellMeters
  };
}

function floodFillClusters(cells: RasterCell[], width: number, depth: number): Array<{ id: string; cells: RasterCell[] }> {
  const buildingMap = new Map<string, RasterCell>();
  cells.forEach((cell) => {
    if (cell.kind === "building") {
      buildingMap.set(`${cell.x}:${cell.y}`, cell);
    }
  });

  const visited = new Set<string>();
  const clusters: Array<{ id: string; cells: RasterCell[] }> = [];
  const directions = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1]
  ];

  for (let y = 0; y < depth; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const key = `${x}:${y}`;
      const start = buildingMap.get(key);
      if (!start || visited.has(key)) {
        continue;
      }

      const queue = [start];
      const clusterCells: RasterCell[] = [];
      visited.add(key);

      while (queue.length > 0) {
        const cell = queue.shift()!;
        clusterCells.push(cell);

        for (const [dx, dy] of directions) {
          const neighborKey = `${cell.x + dx}:${cell.y + dy}`;
          const neighbor = buildingMap.get(neighborKey);
          if (!neighbor || visited.has(neighborKey)) {
            continue;
          }
          visited.add(neighborKey);
          queue.push(neighbor);
        }
      }

      clusters.push({
        id: `cluster-${clusters.length + 1}`,
        cells: clusterCells
      });
    }
  }

  return clusters;
}

function buildTerrainTiers(
  cells: RasterCell[],
  terrainMode: ZoneTerrainMode,
  preset: ZoneUrbanPreset,
  seed: number
): Map<CellKey, number> {
  const tiers = new Map<CellKey, number>();
  if (terrainMode === "flat") {
    return tiers;
  }

  const values = cells.map((cell) => cell.terrainValue);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const spread = maxValue - minValue;
  const amplitude = preset === "hillside" ? 3 : preset === "waterfront" ? 2 : 1;

  cells.forEach((cell) => {
    const localNoise = hash(cell.x, cell.y, seed);
    const normalized =
      spread > 8 ? (cell.terrainValue - minValue) / spread : preset === "hillside" ? localNoise * 0.6 : localNoise * 0.2;
    const tier = clamp(Math.floor(normalized * (amplitude + 1)), 0, amplitude);
    if (tier > 0 && cell.kind !== "water") {
      tiers.set(`${cell.x}:${cell.y}`, tier);
    }
  });

  return tiers;
}

function deriveHeightBand(
  cluster: { cells: RasterCell[] },
  footprint: { width: number; depth: number },
  preset: ZoneUrbanPreset
): number {
  const area = cluster.cells.length;
  const centroid = cluster.cells.reduce(
    (sum, cell) => ({
      x: sum.x + cell.x,
      y: sum.y + cell.y
    }),
    { x: 0, y: 0 }
  );
  const centerX = centroid.x / area;
  const centerY = centroid.y / area;
  const distance =
    Math.hypot(centerX - footprint.width / 2, centerY - footprint.depth / 2) /
    Math.hypot(footprint.width / 2, footprint.depth / 2);

  let band = area >= 9 ? 3 : area >= 4 ? 2 : 1;
  if (distance < 0.28) {
    band += 1;
  }

  if (preset === "compact-core") {
    band += distance < 0.4 ? 1 : 0;
  } else if (preset === "campus" || preset === "suburban") {
    band -= 1;
  } else if (preset === "waterfront") {
    band += area >= 6 ? 1 : 0;
  }

  return clamp(band, 1, 4);
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

function preferredTypesForCell(
  targetHeight: number,
  blockLibrary: BlockLibrary,
  strategy: ZoneBlockStrategy,
  maxWidth: number,
  maxDepth: number,
  preset: ZoneUrbanPreset
): Array<{ typeId: string; rotation: 0 | 90 }> {
  const fallback = blockLibrary.blockTypes[0];
  if (!fallback) {
    return [];
  }

  if (strategy === "uniform") {
    return [{ typeId: fallback.id, rotation: 0 }];
  }

  const scored: Array<{ typeId: string; rotation: 0 | 90; score: number }> = [];
  for (const type of blockLibrary.blockTypes) {
    const rotations: Array<0 | 90> = type.width === type.depth ? [0] : [0, 90];
    for (const rotation of rotations) {
      const width = rotation === 90 ? type.depth : type.width;
      const depth = rotation === 90 ? type.width : type.depth;
      if (width > maxWidth || depth > maxDepth) {
        continue;
      }
      const area = width * depth;
      const heightPenalty = Math.abs(type.height - targetHeight);
      const presetBonus =
        preset === "compact-core" && type.height >= 3
          ? 0.8
          : preset === "campus" && type.height <= 2
            ? 0.5
            : preset === "suburban" && type.height <= 2
              ? 0.4
              : preset === "waterfront" && type.width >= 2
                ? 0.3
                : 0;

      scored.push({
        typeId: type.id,
        rotation,
        score: area * 2.4 - heightPenalty * 1.3 + presetBonus + (type.landmark ? 0.2 : 0)
      });
    }
  }

  if (scored.length === 0) {
    return [{ typeId: fallback.id, rotation: 0 }];
  }

  return scored.sort((left, right) => right.score - left.score).map(({ typeId, rotation }) => ({ typeId, rotation }));
}

function contiguousExtent(
  x: number,
  y: number,
  clusterId: string,
  buildingMap: Map<CellKey, BuildingCell>,
  claimed: Set<CellKey>,
  footprint: { width: number; depth: number }
): { width: number; depth: number } {
  let width = 0;
  while (x + width < footprint.width) {
    const key = `${x + width}:${y}` as CellKey;
    const cell = buildingMap.get(key);
    if (!cell || cell.clusterId !== clusterId || claimed.has(key)) {
      break;
    }
    width += 1;
  }

  let depth = 0;
  while (y + depth < footprint.depth) {
    let rowFits = true;
    for (let dx = 0; dx < width; dx += 1) {
      const key = `${x + dx}:${y + depth}` as CellKey;
      const cell = buildingMap.get(key);
      if (!cell || cell.clusterId !== clusterId || claimed.has(key)) {
        rowFits = false;
        break;
      }
    }
    if (!rowFits) {
      break;
    }
    depth += 1;
  }

  return {
    width: Math.max(1, width),
    depth: Math.max(1, depth)
  };
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

function buildSemanticGraph(anchors: Array<{ x: number; y: number; blockId: string; weight: number }>, footprint: { width: number; depth: number }): SemanticGraph {
  return {
    id: `site-reference-${anchors.length}`,
    title: "Urban block abstraction",
    nodes: anchors.map((anchor, index) => ({
      id: `zone-node-${index + 1}`,
      label: labelForAnchor(anchor.x, anchor.y, footprint.width, footprint.depth, index),
      kind: index === 0 || index === anchors.length - 1 ? "transition" : anchor.weight >= 4 ? "landmark" : "concept",
      category: index % 2 === 0 ? "method" : "history",
      importance: clamp(anchor.weight, 2, 5),
      order: index + 1,
      note: `Reference anchor ${index + 1} from the imported site study.`
    })),
    edges: anchors.slice(1).map((_, index) => ({
      id: `zone-edge-${index + 1}`,
      from: `zone-node-${index + 1}`,
      to: `zone-node-${index + 2}`,
      relation: "next"
    }))
  };
}

function buildRouteFromAnchors(
  anchors: Array<{ x: number; y: number; semanticNodeId: string }>,
  footprint: { width: number; depth: number }
): RouteStep[] {
  if (anchors.length === 0) {
    return [];
  }

  const route: RouteStep[] = [
    {
      id: "zone-entry",
      x: anchors[0].x,
      y: anchors[0].y,
      semanticNodeId: anchors[0].semanticNodeId,
      role: "entry"
    }
  ];

  anchors.forEach((anchor, index) => {
    const previous = route[route.length - 1];
    if (previous.x !== anchor.x || previous.y !== anchor.y) {
      addRouteSegment(route, previous.x, previous.y, anchor.x, anchor.y);
    }

    route.push({
      id: `zone-anchor-${anchor.semanticNodeId}`,
      x: anchor.x,
      y: anchor.y,
      semanticNodeId: anchor.semanticNodeId,
      role: index === 0 || index === anchors.length - 1 ? "threshold" : index === Math.floor(anchors.length / 2) ? "landmark" : "sequence"
    });
  });

  const last = anchors[anchors.length - 1];
  route.push({
    id: "zone-exit",
    x: clamp(last.x + 1, 0, footprint.width - 1),
    y: clamp(last.y + 1, 0, footprint.depth - 1),
    role: "exit"
  });

  return route;
}

function createVoidCells(cells: SiteStudyCell[]): VoidCell[] {
  return cells
    .filter((cell) => cell.kind !== "building")
    .map((cell) => ({
      id: `void-${cell.kind}-${cell.x}-${cell.y}`,
      x: cell.x,
      y: cell.y,
      kind:
        cell.kind === "road"
          ? "circulation"
          : cell.kind === "park"
            ? "pause"
            : cell.kind === "water"
              ? "mnemonic"
              : "threshold"
    }));
}

export async function buildRasterSiteVariantFromGoogleZone(options: {
  sourceUrl: string;
  spanMeters: number;
  blockLibrary: BlockLibrary;
  fabricationProfile: FabricationProfile;
  blockStrategy: ZoneBlockStrategy;
  urbanPreset: ZoneUrbanPreset;
  terrainMode: ZoneTerrainMode;
  abstractionRatio: number;
}): Promise<RealSiteImportResult> {
  const zone = parseGoogleMapsZone(options.sourceUrl, options.spanMeters);
  const seed = coordinateSeed(zone);
  const tileZoom = clamp(zone.zoom ?? 16, 15, 17);
  const [mapRaster, terrainRaster] = await Promise.all([
    loadTileCanvas(STANDARD_TILE, zone, tileZoom),
    options.terrainMode === "stepped" ? loadTileCanvas(TOPO_TILE, zone, Math.max(13, tileZoom - 1)) : Promise.resolve(null)
  ]);

  const { footprint, cells, cellMeters } = analyzeRasterCells(
    mapRaster.canvas,
    terrainRaster?.canvas ?? null,
    zone,
    options.urbanPreset,
    options.abstractionRatio
  );

  const terrainMap = buildTerrainTiers(cells, options.terrainMode, options.urbanPreset, seed);
  const clusters = floodFillClusters(cells, footprint.width, footprint.depth);
  const buildingMap = new Map<CellKey, BuildingCell>();

  clusters.forEach((cluster) => {
    const heightBand = deriveHeightBand(cluster, footprint, options.urbanPreset);
    cluster.cells.forEach((cell) => {
      buildingMap.set(`${cell.x}:${cell.y}` as CellKey, {
        x: cell.x,
        y: cell.y,
        clusterId: cluster.id,
        heightBand,
        terrainTier: terrainMap.get(`${cell.x}:${cell.y}` as CellKey) ?? 0
      });
    });
  });

  const referenceCells: SiteStudyCell[] = [];
  cells.forEach((cell) => {
    const key = `${cell.x}:${cell.y}` as CellKey;
    const building = buildingMap.get(key);
    if (building) {
      referenceCells.push({
        x: cell.x,
        y: cell.y,
        kind: "building",
        heightBand: building.heightBand,
        terrainTier: building.terrainTier,
        clusterId: building.clusterId
      });
      return;
    }
    if (cell.kind) {
      referenceCells.push({
        x: cell.x,
        y: cell.y,
        kind: cell.kind,
        terrainTier: terrainMap.get(key) ?? 0
      });
    }
  });

  const occupiedBlockCells = new Set<string>();
  const claimedBuildingCells = new Set<CellKey>();
  const blockBaseLevels: Record<string, number> = {};
  const placedBlocks: PlacedBlock[] = [];
  const availableTypeIds = new Set(options.blockLibrary.blockTypes.map((type) => type.id));

  for (let y = 0; y < footprint.depth; y += 1) {
    for (let x = 0; x < footprint.width; x += 1) {
      const key = `${x}:${y}` as CellKey;
      const building = buildingMap.get(key);
      if (!building || claimedBuildingCells.has(key)) {
        continue;
      }

      const extent = contiguousExtent(x, y, building.clusterId, buildingMap, claimedBuildingCells, footprint);
      const targetHeight = HEIGHT_BANDS[building.heightBand - 1] ?? HEIGHT_BANDS[0];
      const candidateTypes = preferredTypesForCell(
        targetHeight,
        options.blockLibrary,
        options.blockStrategy,
        extent.width,
        extent.depth,
        options.urbanPreset
      ).filter((candidate) => availableTypeIds.has(candidate.typeId));

      let placed: PlacedBlock | null = null;
      for (const candidate of candidateTypes) {
        const attempt: PlacedBlock = {
          id: `site-block-${placedBlocks.length + 1}`,
          typeId: candidate.typeId,
          x,
          y,
          rotation: candidate.rotation
        };
        if (!canPlaceBlock(attempt, occupiedBlockCells, options.blockLibrary, footprint.width, footprint.depth)) {
          continue;
        }
        placed = attempt;
        markBlockCells(attempt, occupiedBlockCells, options.blockLibrary);
        break;
      }

      if (!placed) {
        continue;
      }

      const dimensions = getPlacedBlockDimensions(placed, options.blockLibrary);
      const coveredKeys: CellKey[] = [];
      for (let dx = 0; dx < dimensions.width; dx += 1) {
        for (let dy = 0; dy < dimensions.depth; dy += 1) {
          const coveredKey = `${x + dx}:${y + dy}` as CellKey;
          if (buildingMap.has(coveredKey)) {
            claimedBuildingCells.add(coveredKey);
            coveredKeys.push(coveredKey);
          }
        }
      }

      if (coveredKeys.length === 0) {
        continue;
      }

      const averageTerrain = Math.round(
        coveredKeys.reduce((sum, cellKey) => sum + (terrainMap.get(cellKey) ?? 0), 0) / coveredKeys.length
      );
      blockBaseLevels[placed.id] = averageTerrain;
      placedBlocks.push(placed);
    }
  }

  const clusterAnchors = clusters
    .map((cluster) => {
      const clusterBuildingCells = cluster.cells.map((cell) => buildingMap.get(`${cell.x}:${cell.y}` as CellKey)!);
      const centroid = clusterBuildingCells.reduce(
        (sum, cell) => ({
          x: sum.x + cell.x,
          y: sum.y + cell.y
        }),
        { x: 0, y: 0 }
      );
      const x = Math.round(centroid.x / clusterBuildingCells.length);
      const y = Math.round(centroid.y / clusterBuildingCells.length);
      return {
        x: clamp(x, 0, footprint.width - 1),
        y: clamp(y, 0, footprint.depth - 1),
        blockId: placedBlocks.find((block) => {
          const dims = getPlacedBlockDimensions(block, options.blockLibrary);
          return x >= block.x && x < block.x + dims.width && y >= block.y && y < block.y + dims.depth;
        })?.id ?? "",
        weight: deriveHeightBand(cluster, footprint, options.urbanPreset) + (cluster.cells.length >= 6 ? 1 : 0)
      };
    })
    .filter((anchor) => anchor.blockId)
    .sort((left, right) => right.weight - left.weight)
    .slice(0, Math.min(6, placedBlocks.length))
    .sort((left, right) => (left.x === right.x ? left.y - right.y : left.x - right.x));

  const semanticGraph = buildSemanticGraph(clusterAnchors, footprint);
  clusterAnchors.forEach((anchor, index) => {
    const block = placedBlocks.find((entry) => entry.id === anchor.blockId);
    if (block) {
      block.semanticNodeId = semanticGraph.nodes[index].id;
    }
  });

  const route = buildRouteFromAnchors(
    clusterAnchors.map((anchor, index) => ({
      x: anchor.x,
      y: anchor.y,
      semanticNodeId: semanticGraph.nodes[index].id
    })),
    footprint
  );

  const voids = createVoidCells(referenceCells);
  const routeGraph = buildRouteGraph(route);
  const layout = buildLayoutGrid(footprint.width, footprint.depth, placedBlocks, route, voids, options.blockLibrary);

  const ruleSet: RuleSet = {
    id: `open-raster-${seed}`,
    name: "Open raster city adapter",
    generatorFamily: "open-raster-site",
    notes: [
      "Raster map colors are sampled into building, road, green, and water cells.",
      "Heights are quantized into a small set of block tiers based on footprint prominence and preset.",
      options.terrainMode === "stepped"
        ? "Terrain tiers are added as a stepped wooden base layer."
        : "Terrain is kept flat for a cleaner table-object reading."
    ]
  };

  const variant: CityVariant = {
    id: `open-site-${seed}`,
    name: `Site ${zone.centerLat.toFixed(3)}, ${zone.centerLng.toFixed(3)}`,
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
      `Reference mode: open raster`,
      `Urban preset: ${options.urbanPreset}`
    ]
  };

  const report = evaluateVariant(variant);
  const sourceBuildingCount = referenceCells.filter((cell) => cell.kind === "building").length;
  const roadCells = referenceCells.filter((cell) => cell.kind === "road").length;
  const parkCells = referenceCells.filter((cell) => cell.kind === "park").length;
  const waterCells = referenceCells.filter((cell) => cell.kind === "water").length;
  const sourceCoverage = sourceBuildingCount / Math.max(1, footprint.width * footprint.depth);
  const blockCoverage =
    layout.occupancy.filter((entry) => entry.layer === "block").length / Math.max(1, footprint.width * footprint.depth);
  const coverageDelta = Math.abs(sourceCoverage - blockCoverage);

  const checks: string[] = [];
  if (coverageDelta > 0.18) {
    checks.push("Abstraction is diverging strongly from source coverage. Consider a lower abstraction setting.");
  }
  if (placedBlocks.length > options.fabricationProfile.maxPieceCount) {
    checks.push("Piece count exceeds the current fabrication profile.");
  }
  if (waterCells > 0 && options.urbanPreset !== "waterfront") {
    checks.push("Water is present in the source. Waterfront preset may preserve edge conditions better.");
  }
  if (options.terrainMode === "stepped" && terrainMap.size < Math.floor(footprint.width * 0.08)) {
    checks.push("Terrain signal is weak in this zone. Flat base may read more clearly.");
  }
  if (sourceBuildingCount < 10) {
    checks.push("Source extraction found few building cells. A tighter span or higher zoom URL will improve fidelity.");
  }

  const diagnostics = [
    `Reference raster sampled at zoom ${tileZoom}.`,
    `${clusters.length} building clusters extracted from the source map.`,
    `${roadCells} circulation cells, ${parkCells} green cells, and ${waterCells} water cells preserved as void structure.`
  ];

  const study: SiteStudy = {
    zone,
    footprint,
    cellMeters,
    tileZoom,
    referenceCells,
    terrainCells: Array.from(terrainMap.entries())
      .filter(([key]) => !buildingMap.has(key as CellKey))
      .map(([key, tier]) => {
        const [x, y] = key.split(":").map(Number);
        return { x, y, tier };
      }),
    blockBaseLevels,
    metrics: {
      buildingCells: sourceBuildingCount,
      roadCells,
      parkCells,
      waterCells,
      buildingClusters: clusters.length,
      sourceCoverage,
      blockCoverage,
      coverageDelta,
      terrainActive: options.terrainMode === "stepped"
    },
    checks,
    referenceLabel: `${Math.round(cellMeters)} m per grid cell`
  };

  return {
    zone,
    variant,
    report,
    diagnostics: [...diagnostics, ...checks],
    summary: `${clusters.length} source clusters · ${placedBlocks.length} blocks · ${Math.round(cellMeters)} m / cell`,
    study
  };
}
