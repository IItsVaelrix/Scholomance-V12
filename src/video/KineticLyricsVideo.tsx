import React from "react";
import { AbsoluteFill, Audio } from "remotion";
import type { GrimoireTrackWithAlignment } from "../pages/Visualiser/tracks/loadTrackWithAlignment";
import { DEFAULT_PACING } from "../pages/Visualiser/tracks/types";
import { useBeatClock } from "./useBeatClock";
import { resolveActiveScene } from "./logic/resolveActiveScene";
import { resolveActiveLines } from "./logic/resolveActiveLines";
import { resolveDominantSchool } from "./logic/resolveDominantSchool";
import { PixelBrainStage } from "./PixelBrainStage";
import { KineticLine } from "./KineticLine";
import type { SceneCue } from "./schemas/videoScene";
import type { VideoSidecar } from "./schemas/videoScene";

export interface KineticLyricsVideoProps {
  track: GrimoireTrackWithAlignment;
  video?: VideoSidecar;
}

function applyEasing(p: number, type: string): number {
  switch (type) {
    case "smoothstep":
      return p * p * (3 - 2 * p);
    case "easeOutCubic": {
      const q = p - 1;
      return q * q * q + 1;
    }
    case "easeInOutSine":
      return p < 0.5 ? (1 - Math.cos(Math.PI * p)) / 2 : (1 + Math.cos(Math.PI * (p - 0.5))) / 2;
    default:
      return p;
  }
}

function resolveCameraTransform(
  scene: SceneCue,
  barIndex: number,
  beatPhase: number
): string {
  const { kind, intensity, easing, shakeOnDownbeat } = scene.camera;
  const eased = applyEasing(beatPhase, easing);

  const baseScale = 1 + intensity * 0.05;
  const scale = kind === "push" ? baseScale + eased * 0.08 : kind === "pull" ? baseScale - eased * 0.06 : baseScale;

  let translateX = 0;
  let translateY = 0;

  if (kind === "parallax") {
    translateX = ((barIndex * 13) % 30) - 15;
    translateY = ((barIndex * 7) % 20) - 10;
  } else if (kind === "orbit") {
    const angle = (barIndex * 15 * Math.PI) / 180;
    translateX = Math.cos(angle) * intensity * 20;
    translateY = Math.sin(angle) * intensity * 15;
  } else if (kind === "shake" || (shakeOnDownbeat && beatPhase < 0.1)) {
    const shakeIntensity = intensity * 8 * (1 - beatPhase);
    translateX = Math.sin(barIndex * 17) * shakeIntensity;
    translateY = Math.cos(barIndex * 23) * shakeIntensity;
  }

  return `translate(${translateX}px, ${translateY}px) scale(${scale})`;
}

function resolveLineLayoutStyles(layout: string, lineCount: number): React.CSSProperties {
  switch (layout) {
    case "emblem":
      return {
        display: "flex",
        flexDirection: "column" as const,
        alignItems: "center",
        justifyContent: "center",
        gap: "0.4em",
        fontSize: lineCount > 2 ? "64px" : "96px",
      };
    case "impactStack":
      return {
        display: "flex",
        flexDirection: "column" as const,
        alignItems: "center",
        justifyContent: "center",
        gap: "0.3em",
        fontSize: lineCount > 2 ? "56px" : "80px",
      };
    case "splitPolarity":
      return {
        display: "flex",
        flexDirection: "column" as const,
        alignItems: "center",
        justifyContent: "space-between",
        gap: "1.5em",
        fontSize: "72px",
        padding: "0 8vw",
      };
    case "flood":
      return {
        display: "flex",
        flexDirection: "column" as const,
        alignContent: "flex-end",
        justifyContent: "center",
        gap: "0.4em",
        fontSize: "64px",
        padding: "0 6vw 10vh",
      };
    case "orbit":
      return {
        display: "flex",
        flexDirection: "column" as const,
        alignItems: "center",
        justifyContent: "center",
        gap: "0.5em",
        fontSize: "72px",
      };
    case "arena":
      return {
        display: "flex",
        flexDirection: "column" as const,
        alignItems: "center",
        justifyContent: "space-around",
        gap: "0.4em",
        fontSize: "68px",
        padding: "8vh 10vw",
      };
    default:
      return {
        display: "flex",
        flexDirection: "column" as const,
        alignItems: "center",
        justifyContent: "center",
        gap: "0.4em",
        fontSize: "76px",
      };
  }
}

export function KineticLyricsVideo({ track, video }: KineticLyricsVideoProps) {
  const pacing = track.pacing ?? DEFAULT_PACING;
  const offsetMs = (pacing.leadInS ?? 0) * 1000;
  const clock = useBeatClock({ bpm: pacing.bpm, offsetMs });
  const beatDurationMs = 60000 / pacing.bpm;

  const scenes = video?.scenes ?? [];
  const activeScene = resolveActiveScene(clock.timeMs, scenes);

  const maxLines = activeScene?.typography.maxVisibleWords ?? 3;
  const activeLines = resolveActiveLines(
    track.wordTimings ?? [],
    clock.timeMs,
    { preRollMs: 80, holdMs: 600, maxLines, lineBreakThresholdMs: 400 }
  );

  const allActiveWords = activeLines.flatMap((l) => l.words);
  const dominantSchool = resolveDominantSchool(allActiveWords, { historySize: 8 });

  const isBarDownbeat = clock.beat.phase < 0.1;
  const layout = activeScene?.typography.layout ?? "centerPulse";

  const cameraTransform = activeScene
    ? resolveCameraTransform(activeScene, clock.bar.index, clock.beat.phase)
    : "translate(0px, 0px) scale(1)";

  return (
    <AbsoluteFill
      style={{
        background: "#050505",
        overflow: "hidden",
      }}
    >
      <Audio src={track.audioUrl} />
      <PixelBrainStage
        scene={activeScene}
        clock={clock}
        dominantSchool={dominantSchool}
      />
      <AbsoluteFill
        style={{
          transform: cameraTransform,
          transformOrigin: "center",
          fontFamily: "'Georgia', serif",
          transition: "transform 0.3s ease-out",
        }}
      >
        <AbsoluteFill
          style={{
            ...resolveLineLayoutStyles(layout, activeLines.length),
            padding: layout === "emblem" ? "0" : "80px 140px",
            fontWeight: 900,
            letterSpacing: "-0.03em",
            lineHeight: 1.2,
            textTransform: "uppercase",
            textAlign: "center",
          }}
        >
          {activeLines.map((line, index) => (
            <KineticLine
              key={`${line.lineIndex}-${line.startMs}-${index}`}
              line={line}
              clock={clock}
              beatDurationMs={beatDurationMs}
              isPunchline={activeScene?.typography.emphasizePunchlines ?? false}
              isDownbeat={isBarDownbeat}
              layout={layout}
            />
          ))}
        </AbsoluteFill>
      </AbsoluteFill>
      <div
        style={{
          position: "absolute",
          top: 40,
          left: 40,
          fontFamily: "'JetBrains Mono', monospace",
          color: "#94a3b8",
          fontSize: 20,
          opacity: 0.7,
          display: "flex",
          flexDirection: "column",
          gap: 6,
          zIndex: 1000,
          pointerEvents: "none",
        }}
      >
        <div>
          BAR: {clock.bar.index.toString().padStart(3, "0")} | BEAT:{" "}
          {clock.beat.index.toString().padStart(3, "0")}
        </div>
        <div style={{ fontSize: 14, opacity: 0.5 }}>
          PHASE: {clock.beat.phase.toFixed(3)}
        </div>
        <div style={{ fontSize: 14, opacity: 0.5 }}>
          LINES: {activeLines.length}
        </div>
        <div style={{ fontSize: 14, opacity: 0.5 }}>
          SCENE:{" "}
          {activeScene
            ? activeScene.id.replace("scene-", "S")
            : "none"}
        </div>
        <div style={{ fontSize: 14, opacity: 0.5 }}>
          SCHOOL: {dominantSchool}
        </div>
      </div>
    </AbsoluteFill>
  );
}