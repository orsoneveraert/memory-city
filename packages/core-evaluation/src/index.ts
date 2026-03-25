import type { CityVariant, EvaluationReport } from "@memory-city/core-model";

export function evaluateVariant(variant: CityVariant): EvaluationReport {
  const usedTypes = new Set(variant.scene.blocks.map((block) => block.typeId));
  const landmarkCount = variant.scene.blocks.filter((block) => {
    const type = variant.blockLibrary.blockTypes.find((entry) => entry.id === block.typeId);
    return type?.landmark;
  }).length;

  const totalHeight = variant.scene.blocks.reduce((sum, block) => {
    const type = variant.blockLibrary.blockTypes.find((entry) => entry.id === block.typeId);
    return sum + (type?.height ?? 1);
  }, 0);

  const blockClaims = variant.layout.occupancy.filter((claim) => claim.layer === "block");
  const occupiedCells = blockClaims.length;
  const seenBlockClaims = new Set<string>();
  const duplicateBlockClaims = new Set<string>();

  blockClaims.forEach((claim) => {
    const key = `${claim.x}:${claim.y}`;
    if (seenBlockClaims.has(key)) {
      duplicateBlockClaims.add(key);
    }
    seenBlockClaims.add(key);
  });

  const compactness = Math.min(
    1,
    occupiedCells / Math.max(variant.footprint.width * variant.footprint.depth * 0.42, 1)
  );
  const voidUsefulness = Math.min(
    1,
    variant.scene.voids.filter((item) => item.kind !== "residual").length / Math.max(variant.scene.voids.length, 1)
  );
  const semanticCoverage = Math.min(
    1,
    variant.scene.blocks.filter((block) => block.semanticNodeId).length / Math.max(variant.semanticGraph.nodes.length, 1)
  );
  const averageHeight = totalHeight / Math.max(variant.scene.blocks.length, 1);
  const fabricationPressure = Math.max(0, variant.scene.blocks.length - variant.fabricationProfile.maxPieceCount);
  const fabricationFit = Math.max(
    0,
    1 - fabricationPressure / Math.max(variant.fabricationProfile.maxPieceCount, 1)
  );

  const profile = {
    path: Math.min(1, variant.scene.route.length / 18),
    memory: Math.min(1, landmarkCount / 4) * 0.5 + voidUsefulness * 0.5,
    form: compactness * 0.55 + Math.min(1, usedTypes.size / 5) * 0.45,
    fabrication: fabricationFit,
    semantic: semanticCoverage
  };

  const findings: string[] = [];

  if (duplicateBlockClaims.size > 0) {
    findings.push("Some block footprints overlap in the occupancy model, so this variant should not be trusted for fabrication yet.");
  }
  if (landmarkCount < 2) {
    findings.push("The variant needs at least one more strong landmark to support recall.");
  }
  if (variant.scene.route.length > 22) {
    findings.push("The route is becoming long for a compact mnemonic object.");
  }
  if (compactness < 0.55) {
    findings.push("The composition spreads too loosely across the tray and loses density.");
  }
  if (voidUsefulness < 0.75) {
    findings.push("Some voids still read as residual rather than structural.");
  }
  if (profile.fabrication < 0.7) {
    findings.push("Piece count is starting to exceed a comfortable tabletop kit.");
  }
  if (findings.length === 0) {
    findings.push("The route, landmark spacing, and fabrication profile are in a healthy range for a first prototype.");
  }

  return {
    variantId: variant.id,
    profile,
    metrics: {
      routeLength: variant.scene.route.length,
      landmarkCount,
      typologyCount: usedTypes.size,
      compactness,
      voidUsefulness,
      semanticCoverage,
      averageHeight
    },
    findings
  };
}
