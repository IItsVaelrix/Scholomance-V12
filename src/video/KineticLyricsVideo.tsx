import React from "react";
import { AbsoluteFill, Audio } from "remotion";
import type { GrimoireTrackWithAlignment } from "../pages/Visualiser/tracks/loadTrackWithAlignment";

export interface KineticLyricsVideoProps {
  track: GrimoireTrackWithAlignment;
}

export function KineticLyricsVideo({ track }: KineticLyricsVideoProps) {
  return (
    <AbsoluteFill
      style={{
        background: "#0a0a0f",
        fontFamily: "'Space Grotesk', sans-serif",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Audio src={track.audioUrl} />
      <div
        style={{
          color: "#94a3b8",
          fontSize: 32,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          opacity: 0.4,
        }}
      >
        {track.title} — {track.artist}
      </div>
    </AbsoluteFill>
  );
}
