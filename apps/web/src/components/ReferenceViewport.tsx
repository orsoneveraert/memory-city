import type { BlockType, CityVariant } from "@memory-city/core-model";
import type { SiteStudy } from "../rasterSiteImport";

type ReferenceViewportProps = {
  variant: CityVariant;
  study: SiteStudy | null;
  overlayBlocks?: boolean;
};

const cellSize = 26;

const sourceColors = {
  road: "#ece7db",
  park: "#dfe8d6",
  water: "#d5e5ee",
  building1: "#d9d0c4",
  building2: "#cabaa4",
  building3: "#b5956d",
  building4: "#8f6844",
  terrain1: "rgba(204, 184, 156, 0.34)",
  terrain2: "rgba(176, 146, 111, 0.24)",
  terrain3: "rgba(140, 108, 72, 0.22)"
};

const familyStroke: Record<BlockType["family"], string> = {
  mass: "#4a3725",
  axis: "#8d6240",
  plateau: "#a87f56",
  tower: "#5a3820",
  gate: "#6b4a2d",
  marker: "#2f1d11",
  bridge: "#916842"
};

function heightColor(heightBand: number | undefined): string {
  if (!heightBand || heightBand <= 1) {
    return sourceColors.building1;
  }
  if (heightBand === 2) {
    return sourceColors.building2;
  }
  if (heightBand === 3) {
    return sourceColors.building3;
  }
  return sourceColors.building4;
}

export function ReferenceViewport({ variant, study, overlayBlocks = true }: ReferenceViewportProps) {
  const width = variant.footprint.width * cellSize;
  const height = variant.footprint.depth * cellSize;

  if (!study) {
    return (
      <div className="viewport reference-viewport reference-viewport-empty">
        <div className="reference-empty-copy">
          <p className="eyebrow">Reference view</p>
          <p>No site reference loaded for this variant.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="viewport reference-viewport">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Reference plan and block comparison">
        <defs>
          <pattern id="reference-grid" width={cellSize} height={cellSize} patternUnits="userSpaceOnUse">
            <path d={`M ${cellSize} 0 L 0 0 0 ${cellSize}`} fill="none" stroke="#ddd8cf" strokeWidth="1" />
          </pattern>
        </defs>

        <rect width={width} height={height} fill="#ffffff" />
        <rect width={width} height={height} fill="url(#reference-grid)" opacity="0.9" />

        {study.terrainCells.map((cell) => (
          <rect
            key={`terrain-${cell.x}-${cell.y}`}
            x={cell.x * cellSize}
            y={cell.y * cellSize}
            width={cellSize}
            height={cellSize}
            fill={cell.tier >= 3 ? sourceColors.terrain3 : cell.tier === 2 ? sourceColors.terrain2 : sourceColors.terrain1}
          />
        ))}

        {study.referenceCells.map((cell) => (
          <rect
            key={`${cell.kind}-${cell.x}-${cell.y}`}
            x={cell.x * cellSize}
            y={cell.y * cellSize}
            width={cellSize}
            height={cellSize}
            fill={
              cell.kind === "road"
                ? sourceColors.road
                : cell.kind === "park"
                  ? sourceColors.park
                  : cell.kind === "water"
                    ? sourceColors.water
                    : heightColor(cell.heightBand)
            }
            opacity={cell.kind === "building" ? 0.95 : 0.88}
            rx={cell.kind === "building" ? 4 : 0}
          />
        ))}

        {overlayBlocks
          ? variant.scene.blocks.map((block) => {
              const type = variant.blockLibrary.blockTypes.find((entry) => entry.id === block.typeId)!;
              const drawWidth = (block.rotation === 90 ? type.depth : type.width) * cellSize;
              const drawDepth = (block.rotation === 90 ? type.width : type.depth) * cellSize;
              return (
                <rect
                  key={`overlay-${block.id}`}
                  x={block.x * cellSize + 2}
                  y={block.y * cellSize + 2}
                  width={drawWidth - 4}
                  height={drawDepth - 4}
                  fill="none"
                  stroke={familyStroke[type.family]}
                  strokeWidth="1.8"
                  strokeDasharray="7 4"
                  rx="4"
                />
              );
            })
          : null}
      </svg>
    </div>
  );
}
