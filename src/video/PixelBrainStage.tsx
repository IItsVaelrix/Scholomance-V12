import React from "react";
import { AbsoluteFill } from "remotion";
import type { SceneCue } from "./schemas/videoScene";
import type { BeatClockState } from "./useBeatClock";
import { SceneAtmosphereLayer } from "./components/SceneAtmosphereLayer";
import { BytecodeMandalaLayer } from "./components/BytecodeMandalaLayer";
import { PixelBrainAssetLayer } from "./components/PixelBrainAssetLayer";

interface PixelBrainStageProps {
  scene: SceneCue | null;
  clock: BeatClockState;
  dominantSchool: string;
}

export function PixelBrainStage({
  scene,
  clock,
  dominantSchool,
}: PixelBrainStageProps) {
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <SceneAtmosphereLayer
        scene={scene}
        beat={clock.beat}
        dominantSchool={dominantSchool}
      />
      <PixelBrainAssetLayer
        scene={scene}
        beat={clock.beat}
        bar={clock.bar}
      />
      <BytecodeMandalaLayer
        scene={scene}
        beat={clock.beat}
        dominantSchool={dominantSchool}
      />
    </AbsoluteFill>
  );
}