import type { BlockType, CityVariant } from "@memory-city/core-model";
import type { SiteStudy } from "../rasterSiteImport";
import { buildVariantCoverageCells } from "../zoneBuilder";

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

  const blockCoverage = buildVariantCoverageCells(variant);
  const sourceBuilt = new Set(
    study.referenceCells.filter((cell) => cell.kind === "building").map((cell) => `${cell.x}:${cell.y}`)
  );
  const lostCells = study.referenceCells.filter(
    (cell) => cell.kind === "building" && !blockCoverage.has(`${cell.x}:${cell.y}`)
  );
  const gainedCells = Array.from(blockCoverage)
    .filter((key) => !sourceBuilt.has(key))
    .map((key) => {
      const [x, y] = key.split(":").map(Number);
      return { x, y };
    });
  const scaleCells = Math.max(1, Math.min(4, Math.round(120 / Math.max(study.cellMeters, 1))));
  const scaleMeters = Math.max(10, Math.round((scaleCells * study.cellMeters) / 10) * 10);

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

        <g transform="translate(10, 10)">
          <rect width="208" height="100" fill="rgba(255,255,255,0.92)" stroke="#d3d0c7" />
          <text x="10" y="16" fontSize="8" letterSpacing="1.4" fill="#666258">
            REFERENCE LEGEND
          </text>
          <rect x="10" y="26" width="10" height="10" fill={sourceColors.building3} />
          <text x="26" y="34" fontSize="9" fill="#161616">
            Built mass
          </text>
          <rect x="10" y="42" width="10" height="10" fill={sourceColors.road} />
          <text x="26" y="50" fontSize="9" fill="#161616">
            Road void
          </text>
          <rect x="10" y="58" width="10" height="10" fill={sourceColors.park} />
          <text x="26" y="66" fontSize="9" fill="#161616">
            Green / blue field
          </text>
          <rect x="112" y="26" width="10" height="10" fill={sourceColors.terrain2} />
          <text x="128" y="34" fontSize="9" fill="#161616">
            Terrain tier
          </text>
          <rect x="112" y="42" width="16" height="10" fill="none" stroke="#4a3725" strokeDasharray="5 3" />
          <text x="134" y="50" fontSize="9" fill="#161616">
            Block overlay
          </text>
          <rect x="10" y="74" width="10" height="10" fill="rgba(170, 82, 58, 0.24)" stroke="#aa523a" />
          <text x="26" y="82" fontSize="9" fill="#161616">
            Source loss
          </text>
          <rect x="112" y="74" width="10" height="10" fill="rgba(166, 124, 70, 0.18)" stroke="#8d6240" strokeDasharray="4 3" />
          <text x="128" y="82" fontSize="9" fill="#161616">
            Model gain
          </text>
          <text x="112" y="92" fontSize="9" fill="#666258">
            {study.referenceLabel}
          </text>
        </g>

        <g transform={`translate(${width - 44}, 16)`}>
          <path d="M 8 26 L 8 0" fill="none" stroke="#161616" strokeWidth="1.2" />
          <path d="M 8 0 L 4 7 L 12 7 Z" fill="#161616" />
          <text x="8" y="38" fontSize="8" textAnchor="middle" fill="#666258">
            N
          </text>
        </g>

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

        {lostCells.map((cell) => (
          <rect
            key={`loss-${cell.x}-${cell.y}`}
            x={cell.x * cellSize + 5}
            y={cell.y * cellSize + 5}
            width={cellSize - 10}
            height={cellSize - 10}
            fill="rgba(170, 82, 58, 0.18)"
            stroke="#aa523a"
            strokeWidth="1"
            rx="4"
          />
        ))}

        {gainedCells.map((cell) => (
          <rect
            key={`gain-${cell.x}-${cell.y}`}
            x={cell.x * cellSize + 7}
            y={cell.y * cellSize + 7}
            width={cellSize - 14}
            height={cellSize - 14}
            fill="rgba(166, 124, 70, 0.14)"
            stroke="#8d6240"
            strokeWidth="1"
            strokeDasharray="4 3"
            rx="3"
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

        <g transform={`translate(16, ${height - 26})`}>
          <rect x="-8" y="-10" width="106" height="22" fill="rgba(255,255,255,0.92)" stroke="#d3d0c7" />
          <rect x="0" y="0" width={scaleCells * cellSize} height="3" fill="#161616" />
          <rect x="0" y="-2" width="1.2" height="7" fill="#161616" />
          <rect x={scaleCells * cellSize - 1.2} y="-2" width="1.2" height="7" fill="#161616" />
          <text x={scaleCells * cellSize / 2} y="-5" fontSize="8" textAnchor="middle" fill="#666258">
            {scaleMeters} m
          </text>
        </g>
      </svg>
    </div>
  );
}
