import type { BlockType, CityVariant, VoidKind } from "@memory-city/core-model";

type PlanViewportProps = {
  variant: CityVariant;
  selectedSemanticNodeId: string | null;
  onSelectSemanticNode: (semanticNodeId: string) => void;
};

const cellSize = 26;

const familyColors: Record<BlockType["family"], string> = {
  mass: "#d9ceb4",
  axis: "#bc8f52",
  plateau: "#bca27d",
  tower: "#6c5134",
  gate: "#8a6744",
  marker: "#3f2b1d",
  bridge: "#9f7a52"
};

const voidColors: Record<VoidKind, string> = {
  circulation: "#cddceb",
  threshold: "#e4d2bf",
  pause: "#efe4cf",
  mnemonic: "#d9d1ef",
  residual: "#f4f1ea"
};

function getType(variant: CityVariant, typeId: string): BlockType {
  return variant.blockLibrary.blockTypes.find((entry) => entry.id === typeId)!;
}

export function PlanViewport({ variant, selectedSemanticNodeId, onSelectSemanticNode }: PlanViewportProps) {
  const width = variant.footprint.width * cellSize;
  const height = variant.footprint.depth * cellSize;
  const routePath = variant.scene.route
    .map((step, index) => {
      const x = step.x * cellSize + cellSize / 2;
      const y = step.y * cellSize + cellSize / 2;
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  return (
    <div className="viewport plan-viewport">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Plan view of mnemonic city">
        <defs>
          <pattern id="grid" width={cellSize} height={cellSize} patternUnits="userSpaceOnUse">
            <path d={`M ${cellSize} 0 L 0 0 0 ${cellSize}`} fill="none" stroke="#d8ccb8" strokeWidth="1" />
          </pattern>
        </defs>

        <rect width={width} height={height} fill="#f7f2e8" />
        <rect width={width} height={height} fill="url(#grid)" opacity="0.8" />

        {variant.scene.voids.map((voidCell) => (
          <rect
            key={voidCell.id}
            x={voidCell.x * cellSize}
            y={voidCell.y * cellSize}
            width={cellSize}
            height={cellSize}
            fill={voidColors[voidCell.kind]}
            opacity="0.85"
            rx="5"
          />
        ))}

        <path d={routePath} fill="none" stroke="#7f2f22" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />

        {variant.scene.blocks.map((block) => {
          const type = getType(variant, block.typeId);
          const drawWidth = (block.rotation === 90 ? type.depth : type.width) * cellSize;
          const drawDepth = (block.rotation === 90 ? type.width : type.depth) * cellSize;
          const semanticNodeId = block.semanticNodeId;

          return (
            <g key={block.id}>
              <rect
                x={block.x * cellSize}
                y={block.y * cellSize}
                width={drawWidth}
                height={drawDepth}
                fill={familyColors[type.family]}
                stroke={block.semanticNodeId === selectedSemanticNodeId ? "#7f2f22" : "#2a1d12"}
                strokeWidth={block.semanticNodeId === selectedSemanticNodeId ? "3" : "1.4"}
                rx="4"
                className={semanticNodeId ? "plan-block-clickable" : ""}
                onClick={semanticNodeId ? () => onSelectSemanticNode(semanticNodeId) : undefined}
              />
              {semanticNodeId ? (
                <circle
                  cx={block.x * cellSize + drawWidth / 2}
                  cy={block.y * cellSize + drawDepth / 2}
                  r={semanticNodeId === selectedSemanticNodeId ? "6" : "4"}
                  fill={semanticNodeId === selectedSemanticNodeId ? "#7f2f22" : "#f8f1e5"}
                />
              ) : null}
            </g>
          );
        })}

        {variant.scene.route.map((step) => {
          const semanticNodeId = step.semanticNodeId;

          return (
            <circle
              key={step.id}
              cx={step.x * cellSize + cellSize / 2}
              cy={step.y * cellSize + cellSize / 2}
              r={step.role === "landmark" ? 5 : 3}
              fill={
                semanticNodeId && semanticNodeId === selectedSemanticNodeId
                  ? "#7f2f22"
                  : step.role === "landmark"
                    ? "#f7d9a0"
                    : "#1f1510"
              }
              className={semanticNodeId ? "plan-block-clickable" : ""}
              onClick={semanticNodeId ? () => onSelectSemanticNode(semanticNodeId) : undefined}
            />
          );
        })}
      </svg>
    </div>
  );
}
