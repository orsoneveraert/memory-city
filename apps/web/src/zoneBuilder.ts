import type { BlockFamily, BlockLibrary, CityVariant, FabricationProfile } from "@memory-city/core-model";

export type ZoneBlockStrategy = "uniform" | "generative";
export type ZoneTypeProfile = "balanced" | "compact" | "vertical";

export type ZoneImportState = {
  sourceUrl: string;
  spanMeters: number;
  moduleCm: number;
  blockStrategy: ZoneBlockStrategy;
  uniformWidthCm: number;
  uniformDepthCm: number;
  uniformHeightCm: number;
  typeProfile: ZoneTypeProfile;
  status: "idle" | "ready" | "error";
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

export const ZONE_TYPE_PROFILE_LABELS: Record<ZoneTypeProfile, string> = {
  balanced: "Balanced set",
  compact: "Compact set",
  vertical: "Vertical set"
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

export function summarizeVariantForFabrication(variant: CityVariant): FabricationSummary {
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
        return (type?.height ?? 0) * moduleCm;
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
      label: "Base grid",
      detail: `Prepare a ${widthCm} x ${depthCm} cm tray laid out as ${variant.footprint.width} x ${variant.footprint.depth} cells.`
    },
    {
      step: 2,
      label: "Low pieces",
      detail: lowCount > 0 ? `Place ${lowCount} low pieces to establish the base massing.` : "No low pieces in this study."
    },
    {
      step: 3,
      label: "Raised pieces",
      detail:
        midCount > 0 ? `Add ${midCount} medium-height pieces to shape terraces and thresholds.` : "No raised terrace layer in this study."
    },
    {
      step: 4,
      label: "Tall markers",
      detail: tallCount > 0 ? `Finish with ${tallCount} tall pieces to complete the skyline.` : "No tall markers in this study."
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
