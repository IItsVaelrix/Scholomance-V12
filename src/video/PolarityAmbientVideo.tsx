import React from "react";
import { AbsoluteFill, Audio } from "remotion";
import type { GrimoireTrackWithAlignment } from "../pages/Visualiser/tracks/loadTrackWithAlignment";
import { DEFAULT_PACING } from "../pages/Visualiser/tracks/types";
import { useBeatClock } from "./useBeatClock";
import { resolveActiveScene } from "./logic/resolveActiveScene";
import { PolarityAmbientBackground } from "./components/ambient/PolarityAmbientBackground";
import { resolveAmbientPalette } from "./components/ambient/AmbientPalette";
import type { VideoSidecar } from "./schemas/videoScene";

export interface PolarityAmbientVideoProps {
  track: GrimoireTrackWithAlignment;
  video?: VideoSidecar;
}

export function PolarityAmbientVideo({ track, video }: PolarityAmbientVideoProps) {
  const pacing = track.pacing ?? DEFAULT_PACING;
  const offsetMs = (pacing.leadInS ?? 0) * 1000;
  const clock = useBeatClock({ bpm: pacing.bpm, offsetMs });

  const scenes = video?.scenes ?? [];
  const activeScene = resolveActiveScene(clock.timeMs, scenes);
  const palette = resolveAmbientPalette(activeScene, scenes, clock.timeMs);

  return (
    <AbsoluteFill style={{ background: palette.deepBase, overflow: "hidden" }}>
      <Audio src={track.audioUrl} />
      <PolarityAmbientBackground
        scene={activeScene}
        scenes={scenes}
        clock={clock}
        palette={palette}
      />
    </AbsoluteFill>
  );
}
