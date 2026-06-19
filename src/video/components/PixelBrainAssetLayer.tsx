import React from "react";
import { AbsoluteFill } from "remotion";
import type { SceneCue } from "../schemas/videoScene";

interface PixelBrainAssetLayerProps {
  scene: SceneCue | null;
  beat: { phase: number };
  bar: { phase: number };
}

export function PixelBrainAssetLayer({ scene, beat }: PixelBrainAssetLayerProps) {
  if (!scene || scene.assets.length === 0) {
    return null;
  }

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {scene.assets.map((assetId, index) => (
        <PixelBrainAssetSprite
          key={assetId}
          assetId={assetId}
          index={index}
          beatPhase={beat.phase}
          sceneMode={scene.mode}
        />
      ))}
    </AbsoluteFill>
  );
}

interface PixelBrainAssetSpriteProps {
  assetId: string;
  index: number;
  beatPhase: number;
  sceneMode: string;
}

// PNG bridge: renders Foundry asset by id until packet-native rendering is available.
// Assets are expected at /pixelbrain/assets/<assetId>.png served from public/.
function PixelBrainAssetSprite({
  assetId,
  index,
  beatPhase,
  sceneMode,
}: PixelBrainAssetSpriteProps) {
  const opacity = resolveAssetOpacity(assetId, sceneMode, index);
  // Subtle scale breathe on beat — primary asset breathes more than secondaries
  const scale = 1 + beatPhase * (index === 0 ? 0.018 : 0.008);

  return (
    <div
      data-pixelbrain-asset-id={assetId}
      style={{
        position: "absolute",
        inset: 0,
        opacity,
        transform: `scale(${scale.toFixed(4)})`,
        transformOrigin: "center",
        backgroundImage: `url(/pixelbrain/assets/${assetId}.png)`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
        backgroundSize: "contain",
        // Primary asset composites normally; secondaries screen-blend for additive layering
        mixBlendMode: index === 0 ? "normal" : "screen",
      }}
    />
  );
}

function resolveAssetOpacity(assetId: string, sceneMode: string, index: number): number {
  if (assetId.includes("emblem")) return 0.92;
  if (sceneMode === "threshold") return index === 0 ? 0.55 : 0.28;
  if (sceneMode === "recovery-polarity") return index === 0 ? 0.62 : 0.38;
  return index === 0 ? 0.5 : 0.24;
}
