import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { BlockType, CityVariant } from "@memory-city/core-model";
import type { SiteStudy } from "../rasterSiteImport";

type SceneViewportProps = {
  variant: CityVariant;
  renderMode: "analytic" | "wood";
  selectedSemanticNodeId: string | null;
  onSelectSemanticNode: (semanticNodeId: string) => void;
  study?: SiteStudy | null;
};

const familyColors: Record<BlockType["family"], string> = {
  mass: "#ded4bf",
  axis: "#b48346",
  plateau: "#c8ad89",
  tower: "#735133",
  gate: "#8d6440",
  marker: "#412817",
  bridge: "#a67b53"
};

const woodTextureCache = new Map<string, THREE.CanvasTexture>();

function getType(variant: CityVariant, typeId: string): BlockType {
  return variant.blockLibrary.blockTypes.find((entry) => entry.id === typeId)!;
}

function createWoodTexture(key: string): THREE.CanvasTexture {
  if (woodTextureCache.has(key)) {
    return woodTextureCache.get(key)!;
  }

  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d")!;

  context.fillStyle = "#bea075";
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 36; i += 1) {
    const x = (i / 36) * canvas.width;
    const wobble = Math.sin(i * 1.3) * 9;
    context.strokeStyle = i % 3 === 0 ? "rgba(94, 60, 27, 0.22)" : "rgba(235, 217, 186, 0.16)";
    context.lineWidth = 3 + (i % 4);
    context.beginPath();
    context.moveTo(x + wobble, 0);
    context.bezierCurveTo(x - 6, 80, x + 10, 170, x + wobble * 0.5, canvas.height);
    context.stroke();
  }

  for (let i = 0; i < 18; i += 1) {
    context.fillStyle = i % 2 === 0 ? "rgba(90, 53, 25, 0.06)" : "rgba(255, 250, 239, 0.08)";
    context.beginPath();
    context.ellipse(20 + i * 13, 80 + ((i * 17) % 120), 18, 6, 0.3, 0, Math.PI * 2);
    context.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.2, 1.2);
  woodTextureCache.set(key, texture);
  return texture;
}

function BlockMesh({
  variant,
  block,
  renderMode,
  selectedSemanticNodeId,
  onSelectSemanticNode,
  baseLevel
}: {
  variant: CityVariant;
  block: CityVariant["scene"]["blocks"][number];
  renderMode: "analytic" | "wood";
  selectedSemanticNodeId: string | null;
  onSelectSemanticNode: (semanticNodeId: string) => void;
  baseLevel: number;
}) {
  const type = getType(variant, block.typeId);
  const width = block.rotation === 90 ? type.depth : type.width;
  const depth = block.rotation === 90 ? type.width : type.depth;
  const position: [number, number, number] = [
    block.x + width / 2 - variant.footprint.width / 2,
    baseLevel + type.height / 2,
    block.y + depth / 2 - variant.footprint.depth / 2
  ];

  const woodTexture = renderMode === "wood" ? createWoodTexture(type.family) : null;
  const color = renderMode === "wood" ? "#d2b185" : familyColors[type.family];
  const isSelected = block.semanticNodeId === selectedSemanticNodeId;
  const semanticNodeId = block.semanticNodeId;

  return (
    <mesh
      position={position}
      castShadow
      receiveShadow
      onClick={semanticNodeId ? () => onSelectSemanticNode(semanticNodeId) : undefined}
    >
      <boxGeometry args={[width, type.height, depth]} />
      <meshStandardMaterial
        color={isSelected ? "#e3b477" : color}
        map={woodTexture}
        roughness={0.83}
        metalness={0.02}
        emissive={isSelected ? "#5a2416" : "#000000"}
        emissiveIntensity={isSelected ? 0.22 : 0}
      />
    </mesh>
  );
}

export function SceneViewport({
  variant,
  renderMode,
  selectedSemanticNodeId,
  onSelectSemanticNode,
  study = null
}: SceneViewportProps) {
  const trayTexture = renderMode === "wood" ? createWoodTexture("tray-base") : null;
  const terrainTiles = study?.terrainCells ?? [];

  return (
    <div className="viewport scene-viewport">
      <Canvas camera={{ position: [8, 9, 12], fov: 42 }} shadows>
        <color attach="background" args={["#ffffff"]} />
        <ambientLight intensity={0.9} />
        <directionalLight
          castShadow
          intensity={1.1}
          position={[9, 14, 7]}
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />

        <mesh position={[0, -0.22, 0]} receiveShadow castShadow>
          <boxGeometry args={[variant.footprint.width + 2.6, 0.18, variant.footprint.depth + 2.6]} />
          <meshStandardMaterial
            color={renderMode === "wood" ? "#cfab7f" : "#f4f2ed"}
            map={trayTexture}
            roughness={0.9}
            metalness={0.02}
          />
        </mesh>

        <mesh rotation-x={-Math.PI / 2} position={[0, -0.12, 0]} receiveShadow>
          <planeGeometry args={[variant.footprint.width + 1.9, variant.footprint.depth + 1.9]} />
          <meshStandardMaterial color={renderMode === "wood" ? "#d8b58a" : "#ffffff"} map={trayTexture} roughness={1} />
        </mesh>

        {terrainTiles.map((cell) => (
          <mesh
            key={`terrain-${cell.x}-${cell.y}`}
            position={[
              cell.x + 0.5 - variant.footprint.width / 2,
              cell.tier * 0.14 - 0.03,
              cell.y + 0.5 - variant.footprint.depth / 2
            ]}
            receiveShadow
            castShadow
          >
            <boxGeometry args={[1, cell.tier * 0.28, 1]} />
            <meshStandardMaterial
              color={renderMode === "wood" ? "#cfa97e" : "#efe7dc"}
              map={trayTexture}
              roughness={0.96}
              metalness={0.01}
            />
          </mesh>
        ))}

        {variant.scene.blocks.map((block) => (
          <BlockMesh
            key={block.id}
            variant={variant}
            block={block}
            renderMode={renderMode}
            selectedSemanticNodeId={selectedSemanticNodeId}
            onSelectSemanticNode={onSelectSemanticNode}
            baseLevel={(study?.blockBaseLevels[block.id] ?? 0) * 0.28}
          />
        ))}

        {variant.scene.route.map((step) => {
          const semanticNodeId = step.semanticNodeId;
          const baseLevel = step.x >= 0 && step.y >= 0 ? study?.terrainCells.find((cell) => cell.x === step.x && cell.y === step.y)?.tier ?? 0 : 0;

          return (
            <mesh
              key={step.id}
              position={[
                step.x + 0.5 - variant.footprint.width / 2,
                baseLevel * 0.28 + 0.08,
                step.y + 0.5 - variant.footprint.depth / 2
              ]}
              rotation-x={-Math.PI / 2}
              onClick={semanticNodeId ? () => onSelectSemanticNode(semanticNodeId) : undefined}
            >
              <circleGeometry args={[step.role === "landmark" ? 0.19 : 0.11, 24]} />
              <meshBasicMaterial
                color={
                  semanticNodeId && semanticNodeId === selectedSemanticNodeId
                    ? "#c55122"
                    : step.role === "landmark"
                      ? "#8a2f1b"
                      : "#3d291d"
                }
              />
            </mesh>
          );
        })}

        <OrbitControls enablePan={false} maxPolarAngle={Math.PI / 2.05} />
      </Canvas>
    </div>
  );
}
