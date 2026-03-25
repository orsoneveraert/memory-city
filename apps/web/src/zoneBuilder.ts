import type { BlockFamily, BlockLibrary, CityVariant, FabricationProfile } from "@memory-city/core-model";
import type { SiteStudy } from "./rasterSiteImport";

export type ZoneBlockStrategy = "uniform" | "generative";
export type ZoneTypeProfile = "balanced" | "compact" | "vertical";
export type ZoneDataMode = "open-raster" | "seeded";
export type ZoneTerrainMode = "flat" | "stepped";
export type ZoneUrbanPreset = "compact-core" | "waterfront" | "hillside" | "campus" | "suburban";

export type ZoneImportState = {
  sourceUrl: string;
  spanMeters: number;
  moduleCm: number;
  dataMode: ZoneDataMode;
  terrainMode: ZoneTerrainMode;
  urbanPreset: ZoneUrbanPreset;
  abstractionRatio: number;
  blockStrategy: ZoneBlockStrategy;
  uniformWidthCm: number;
  uniformDepthCm: number;
  uniformHeightCm: number;
  typeProfile: ZoneTypeProfile;
  status: "idle" | "loading" | "ready" | "error";
  message: string;
};

export type BlockPreviewRow = {
  id: string;
  label: string;
  family: BlockFamily;
  widthCm: number;
  depthCm: number;
  heightCm: number;
};

export type FabricationTypeRow = BlockPreviewRow & {
  count: number;
  totalVolumeCm3: number;
};

export type FabricationSummary = {
  moduleCm: number;
  totalBlocks: number;
  distinctTypes: number;
  widthCm: number;
  depthCm: number;
  heightCm: number;
  totalVolumeCm3: number;
  strategyLabel: string;
  typeRows: FabricationTypeRow[];
  familyRows: Array<{ family: string; count: number }>;
  constructionSteps: Array<{ step: number; label: string; detail: string }>;
};

export type JuryStudySummary = {
  sourceBuiltPct: number;
  sourceOpenPct: number;
  sourceRoadPct: number;
  sourceGreenBluePct: number;
  blockCoveragePct: number;
  coverageDeltaPct: number;
  matchedSourcePct: number;
  matchedSourceCells: number;
  lostSourceCells: number;
  addedModelCells: number;
  clusterCount: number;
  averageClusterCells: number;
  abstractionCompression: number;
  terrainCellCount: number;
  terrainTierCount: number;
  cellMeters: number;
  tileZoom: number;
  modelScaleLabel: string;
  sourceHeightBands: Array<{ label: string; count: number }>;
  blockHeights: Array<{ label: string; count: number }>;
  scaleLabel: string;
};

export const ZONE_TYPE_PROFILE_LABELS: Record<ZoneTypeProfile, string> = {
  balanced: "Balanced set",
  compact: "Compact set",
  vertical: "Vertical set"
};

export const ZONE_DATA_MODE_LABELS: Record<ZoneDataMode, string> = {
  "open-raster": "Open map reference",
  seeded: "Seeded abstraction"
};

export const ZONE_TERRAIN_MODE_LABELS: Record<ZoneTerrainMode, string> = {
  flat: "Flat base",
  stepped: "Stepped terrain"
};

export const ZONE_URBAN_PRESET_LABELS: Record<ZoneUrbanPreset, string> = {
  "compact-core": "Compact core",
  waterfront: "Waterfront",
  hillside: "Hillside",
  campus: "Campus",
  suburban: "Suburban"
};

const ZONE_TYPE_PROFILES: Record<ZoneTypeProfile, string[]> = {
  balanced: ["cube", "bar", "slab", "gate", "terrace", "tower", "marker"],
  compact: ["cube", "bar", "slab", "terrace"],
  vertical: ["cube", "bar", "tower", "gate", "marker"]
};

const FAMILY_LABELS: Record<BlockFamily, string> = {
  mass: "Mass",
  axis: "Axis",
  plateau: "Plateau",
  tower: "Tower",
  gate: "Gate",
  marker: "Marker",
  bridge: "Bridge"
};

function roundToTenth(value: number): number {
  return Math.round(value * 10) / 10;
}

function cmToModules(valueCm: number, moduleCm: number): number {
  if (!Number.isFinite(valueCm) || valueCm <= 0) {
    return 1;
  }

  return Math.max(1, Math.round(valueCm / moduleCm));
}

function strategyLabelFromLibrary(blockLibrary: BlockLibrary): string {
  return blockLibrary.blockTypes.length === 1 ? "Single block size" : "Generative type set";
}

function percent(value: number): number {
  return Math.round(value * 100);
}

function coverageKey(x: number, y: number): string {
  return `${x}:${y}`;
}

export function buildVariantCoverageCells(variant: CityVariant): Set<string> {
  const typeMap = new Map(variant.blockLibrary.blockTypes.map((type) => [type.id, type]));
  const cells = new Set<string>();

  variant.scene.blocks.forEach((block) => {
    const type = typeMap.get(block.typeId);
    if (!type) {
      return;
    }

    const width = block.rotation === 90 ? type.depth : type.width;
    const depth = block.rotation === 90 ? type.width : type.depth;

    for (let dx = 0; dx < width; dx += 1) {
      for (let dy = 0; dy < depth; dy += 1) {
        cells.add(coverageKey(block.x + dx, block.y + dy));
      }
    }
  });

  return cells;
}

export function buildZoneBlockLibrary(state: ZoneImportState, sourceLibrary: BlockLibrary): BlockLibrary {
  const moduleCm = Math.max(0.5, roundToTenth(state.moduleCm));
  const moduleMm = Math.round(moduleCm * 10);

  if (state.blockStrategy === "uniform") {
    const width = cmToModules(state.uniformWidthCm, moduleCm);
    const depth = cmToModules(state.uniformDepthCm, moduleCm);
    const height = cmToModules(state.uniformHeightCm, moduleCm);

    return {
      id: `${sourceLibrary.id}-uniform-${moduleMm}-${width}-${depth}-${height}`,
      name: `Uniform block ${roundToTenth(width * moduleCm)} x ${roundToTenth(depth * moduleCm)} x ${roundToTenth(
        height * moduleCm
      )} cm`,
      moduleMm,
      blockTypes: [
        {
          id: "uniform-block",
          label: "Uniform block",
          family: "mass",
          width,
          depth,
          height,
          landmark: height >= 3
        }
      ]
    };
  }

  const allowedIds = new Set(ZONE_TYPE_PROFILES[state.typeProfile]);
  const filteredTypes = sourceLibrary.blockTypes.filter((type) => allowedIds.has(type.id));

  return {
    ...sourceLibrary,
    id: `${sourceLibrary.id}-${state.typeProfile}-${moduleMm}`,
    name: `${sourceLibrary.name} — ${ZONE_TYPE_PROFILE_LABELS[state.typeProfile]}`,
    moduleMm,
    blockTypes: filteredTypes.length > 0 ? filteredTypes : sourceLibrary.blockTypes
  };
}

export function buildZoneFabricationProfile(
  state: ZoneImportState,
  sourceProfile: FabricationProfile
): FabricationProfile {
  return {
    ...sourceProfile,
    id: `${sourceProfile.id}-${Math.round(state.moduleCm * 10)}-${state.blockStrategy}`,
    name:
      state.blockStrategy === "uniform"
        ? "Single-block wood kit"
        : `${ZONE_TYPE_PROFILE_LABELS[state.typeProfile]} wood kit`,
    moduleMm: Math.round(Math.max(0.5, roundToTenth(state.moduleCm)) * 10)
  };
}

export function summarizeBlockLibrary(blockLibrary: BlockLibrary): BlockPreviewRow[] {
  const moduleCm = blockLibrary.moduleMm / 10;

  return blockLibrary.blockTypes
    .map((type) => ({
      id: type.id,
      label: type.label,
      family: type.family,
      widthCm: roundToTenth(type.width * moduleCm),
      depthCm: roundToTenth(type.depth * moduleCm),
      heightCm: roundToTenth(type.height * moduleCm)
    }))
    .sort((left, right) => {
      const volumeLeft = left.widthCm * left.depthCm * left.heightCm;
      const volumeRight = right.widthCm * right.depthCm * right.heightCm;
      return volumeRight - volumeLeft || left.label.localeCompare(right.label);
    });
}

export function summarizeVariantForFabrication(variant: CityVariant, study: SiteStudy | null = null): FabricationSummary {
  const moduleCm = variant.blockLibrary.moduleMm / 10;
  const typeMap = new Map(variant.blockLibrary.blockTypes.map((type) => [type.id, type]));
  const typeCounts = new Map<string, number>();
  const familyCounts = new Map<BlockFamily, number>();

  variant.scene.blocks.forEach((block) => {
    typeCounts.set(block.typeId, (typeCounts.get(block.typeId) ?? 0) + 1);
    const family = typeMap.get(block.typeId)?.family;
    if (family) {
      familyCounts.set(family, (familyCounts.get(family) ?? 0) + 1);
    }
  });

  const typeRows = Array.from(typeCounts.entries())
    .map(([typeId, count]) => {
      const type = typeMap.get(typeId)!;
      const widthCm = roundToTenth(type.width * moduleCm);
      const depthCm = roundToTenth(type.depth * moduleCm);
      const heightCm = roundToTenth(type.height * moduleCm);

      return {
        id: type.id,
        label: type.label,
        family: type.family,
        widthCm,
        depthCm,
        heightCm,
        count,
        totalVolumeCm3: Math.round(count * widthCm * depthCm * heightCm)
      };
    })
    .sort((left, right) => right.count - left.count || right.totalVolumeCm3 - left.totalVolumeCm3);

  const totalVolumeCm3 = typeRows.reduce((sum, row) => sum + row.totalVolumeCm3, 0);
  const widthCm = roundToTenth(variant.footprint.width * moduleCm);
  const depthCm = roundToTenth(variant.footprint.depth * moduleCm);
  const heightCm = roundToTenth(
    Math.max(
      0,
      ...variant.scene.blocks.map((block) => {
        const type = typeMap.get(block.typeId);
        const baseLevel = study?.blockBaseLevels[block.id] ?? 0;
        return ((type?.height ?? 0) + baseLevel) * moduleCm;
      })
    )
  );

  const familyRows = Array.from(familyCounts.entries())
    .map(([family, count]) => ({
      family: FAMILY_LABELS[family],
      count
    }))
    .sort((left, right) => right.count - left.count || left.family.localeCompare(right.family));

  const lowCount = typeRows.filter((row) => row.heightCm <= moduleCm * 1.2).reduce((sum, row) => sum + row.count, 0);
  const midCount = typeRows
    .filter((row) => row.heightCm > moduleCm * 1.2 && row.heightCm <= moduleCm * 2.2)
    .reduce((sum, row) => sum + row.count, 0);
  const tallCount = typeRows.filter((row) => row.heightCm > moduleCm * 2.2).reduce((sum, row) => sum + row.count, 0);

  const constructionSteps = [
    {
      step: 1,
      label: "Tray and grid",
      detail: `Prepare a ${widthCm} x ${depthCm} cm tray laid out as ${variant.footprint.width} x ${variant.footprint.depth} cells${study?.metrics.terrainActive ? " with stepped base tiers." : "."}`
    },
    {
      step: 2,
      label: study?.metrics.terrainActive ? "Terrain base" : "Primary masses",
      detail: study?.metrics.terrainActive
        ? `Build the stepped base first using ${study.terrainCells.length} terrain cells before placing the first wood masses.`
        : lowCount > 0
          ? `Place ${lowCount} low pieces to establish the primary urban massing.`
          : "No low pieces in this study."
    },
    {
      step: 3,
      label: "Secondary masses",
      detail:
        midCount > 0 ? `Add ${midCount} medium-height pieces to articulate terraces, street walls, and secondary relief.` : "No medium-height massing in this study."
    },
    {
      step: 4,
      label: "Markers and skyline",
      detail: tallCount > 0 ? `Finish with ${tallCount} tall pieces to set landmarks and complete the skyline.` : "No tall markers in this study."
    }
  ];

  return {
    moduleCm: roundToTenth(moduleCm),
    totalBlocks: variant.scene.blocks.length,
    distinctTypes: typeRows.length,
    widthCm,
    depthCm,
    heightCm,
    totalVolumeCm3,
    strategyLabel: strategyLabelFromLibrary(variant.blockLibrary),
    typeRows,
    familyRows,
    constructionSteps
  };
}

export function summarizeStudyForJury(variant: CityVariant, study: SiteStudy | null): JuryStudySummary | null {
  if (!study) {
    return null;
  }

  const totalCells = Math.max(1, study.footprint.width * study.footprint.depth);
  const moduleCm = variant.blockLibrary.moduleMm / 10;
  const sourceBuiltPct = percent(study.metrics.buildingCells / totalCells);
  const sourceOpenPct = percent(1 - study.metrics.buildingCells / totalCells);
  const sourceRoadPct = percent(study.metrics.roadCells / totalCells);
  const sourceGreenBluePct = percent((study.metrics.parkCells + study.metrics.waterCells) / totalCells);
  const blockCoveragePct = percent(study.metrics.blockCoverage);
  const coverageDeltaPct = percent(study.metrics.coverageDelta);
  const averageClusterCells =
    study.metrics.buildingClusters > 0 ? Math.round((study.metrics.buildingCells / study.metrics.buildingClusters) * 10) / 10 : 0;
  const abstractionCompression =
    variant.scene.blocks.length > 0 ? Math.round((study.metrics.buildingCells / variant.scene.blocks.length) * 10) / 10 : 0;
  const sourceBuiltCells = new Set(
    study.referenceCells.filter((cell) => cell.kind === "building").map((cell) => coverageKey(cell.x, cell.y))
  );
  const blockCoverageCells = buildVariantCoverageCells(variant);
  let matchedSourceCells = 0;
  let lostSourceCells = 0;

  sourceBuiltCells.forEach((key) => {
    if (blockCoverageCells.has(key)) {
      matchedSourceCells += 1;
    } else {
      lostSourceCells += 1;
    }
  });

  let addedModelCells = 0;
  blockCoverageCells.forEach((key) => {
    if (!sourceBuiltCells.has(key)) {
      addedModelCells += 1;
    }
  });
  const matchedSourcePct = sourceBuiltCells.size > 0 ? percent(matchedSourceCells / sourceBuiltCells.size) : 0;

  const sourceHeightCounts = new Map<number, number>();
  study.referenceCells.forEach((cell) => {
    if (cell.kind !== "building") {
      return;
    }
    const heightBand = cell.heightBand ?? 1;
    sourceHeightCounts.set(heightBand, (sourceHeightCounts.get(heightBand) ?? 0) + 1);
  });

  const blockTypeMap = new Map(variant.blockLibrary.blockTypes.map((type) => [type.id, type]));
  const blockHeightCounts = new Map<number, number>();
  variant.scene.blocks.forEach((block) => {
    const type = blockTypeMap.get(block.typeId);
    if (!type) {
      return;
    }
    blockHeightCounts.set(type.height, (blockHeightCounts.get(type.height) ?? 0) + 1);
  });

  return {
    sourceBuiltPct,
    sourceOpenPct,
    sourceRoadPct,
    sourceGreenBluePct,
    blockCoveragePct,
    coverageDeltaPct,
    matchedSourcePct,
    matchedSourceCells,
    lostSourceCells,
    addedModelCells,
    clusterCount: study.metrics.buildingClusters,
    averageClusterCells,
    abstractionCompression,
    terrainCellCount: study.terrainCells.length,
    terrainTierCount: Math.max(0, ...study.terrainCells.map((cell) => cell.tier)),
    cellMeters: Math.round(study.cellMeters * 10) / 10,
    tileZoom: study.tileZoom,
    modelScaleLabel: `1:${Math.max(1, Math.round((study.cellMeters * 100) / Math.max(moduleCm, 0.1)))}`,
    sourceHeightBands: Array.from(sourceHeightCounts.entries())
      .sort((left, right) => left[0] - right[0])
      .map(([band, count]) => ({
        label: `Band ${band}`,
        count
      })),
    blockHeights: Array.from(blockHeightCounts.entries())
      .sort((left, right) => left[0] - right[0])
      .map(([height, count]) => ({
        label: `${height}u`,
        count
      })),
    scaleLabel: study.referenceLabel
  };
}
