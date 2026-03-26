import type { BlockPreviewRow, ZoneBlockStrategy } from "../zoneBuilder";

type BlockShapeDiagramProps = {
  rows: BlockPreviewRow[];
  moduleCm: number;
  strategy: ZoneBlockStrategy;
};

function BlockGlyph({
  row,
  slotX,
  slotWidth,
  scale,
  baseline
}: {
  row: BlockPreviewRow;
  slotX: number;
  slotWidth: number;
  scale: number;
  baseline: number;
}) {
  const width = row.widthCm * scale;
  const depth = row.depthCm * scale;
  const height = row.heightCm * scale;
  const skewX = depth * 0.5;
  const skewY = depth * 0.28;
  const originX = slotX + slotWidth / 2 - (width + skewX) / 2;
  const originY = baseline;

  const frontLeft = `${originX},${originY - height}`;
  const frontRight = `${originX + width},${originY - height}`;
  const frontBottomRight = `${originX + width},${originY}`;
  const frontBottomLeft = `${originX},${originY}`;
  const topBackLeft = `${originX + skewX},${originY - height - skewY}`;
  const topBackRight = `${originX + width + skewX},${originY - height - skewY}`;
  const sideBackRight = `${originX + width + skewX},${originY - skewY}`;

  return (
    <g>
      <polygon
        points={`${frontLeft} ${frontRight} ${frontBottomRight} ${frontBottomLeft}`}
        fill="rgba(207, 171, 127, 0.48)"
        stroke="#4a3725"
        strokeWidth="1"
      />
      <polygon
        points={`${frontLeft} ${frontRight} ${topBackRight} ${topBackLeft}`}
        fill="rgba(233, 219, 196, 0.84)"
        stroke="#4a3725"
        strokeWidth="1"
      />
      <polygon
        points={`${frontRight} ${topBackRight} ${sideBackRight} ${frontBottomRight}`}
        fill="rgba(173, 127, 83, 0.52)"
        stroke="#4a3725"
        strokeWidth="1"
      />
      <text x={slotX + slotWidth / 2} y={baseline + 18} textAnchor="middle" fontSize="10" fill="#161616">
        {row.label}
      </text>
      <text x={slotX + slotWidth / 2} y={baseline + 31} textAnchor="middle" fontSize="9" fill="#666258">
        {`${row.widthCm} x ${row.depthCm} x ${row.heightCm} cm`}
      </text>
    </g>
  );
}

export function BlockShapeDiagram({ rows, moduleCm, strategy }: BlockShapeDiagramProps) {
  const displayedRows = strategy === "uniform" ? rows.slice(0, 1) : rows.slice(0, Math.min(4, rows.length));
  const maxDimension = Math.max(
    1,
    ...displayedRows.flatMap((row) => [row.widthCm, row.depthCm, row.heightCm])
  );
  const viewWidth = strategy === "uniform" ? 260 : 360;
  const viewHeight = 160;
  const slotWidth = viewWidth / Math.max(1, displayedRows.length);
  const scale = strategy === "uniform" ? 86 / maxDimension : 56 / maxDimension;

  return (
    <div className="block-diagram-shell">
      <svg viewBox={`0 0 ${viewWidth} ${viewHeight}`} role="img" aria-label="Live block shape diagram">
        <rect width={viewWidth} height={viewHeight} fill="#ffffff" />
        <line x1="18" y1="112" x2={viewWidth - 18} y2="112" stroke="#d3d0c7" strokeWidth="1" />

        {displayedRows.map((row, index) => (
          <BlockGlyph
            key={row.id}
            row={row}
            slotX={index * slotWidth}
            slotWidth={slotWidth}
            scale={scale}
            baseline={104}
          />
        ))}

        <text x="18" y="18" fontSize="10" letterSpacing="1.3" fill="#666258">
          BLOCK GRAMMAR
        </text>
        <text x="18" y="34" fontSize="10" fill="#161616">
          {strategy === "uniform" ? "Single repeated block" : "Generative family preview"}
        </text>
        <text x="18" y="49" fontSize="9" fill="#666258">
          {`${moduleCm} cm base module`}
        </text>
      </svg>
    </div>
  );
}
