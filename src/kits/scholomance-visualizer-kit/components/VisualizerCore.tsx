import React from "react";
import { SigilGlyph } from "./SigilGlyph";

interface VisualizerCoreProps {
  signalLevel?: number;
  isPlaying?: boolean;
  schoolId?: string;
}

export function VisualizerCore({ signalLevel = 0, isPlaying = false, schoolId = "SONIC" }: VisualizerCoreProps) {
  const pulse = isPlaying ? 1 + signalLevel * 0.15 : 1;

  return (
    <div className="scholoVisualizerCore" aria-hidden="true">
      <div
        className="scholoVisualizerRing"
        style={{ transform: `scale(${pulse})`, transition: "transform 0.3s ease" }}
      />
      <div
        className="scholoVisualizerRing"
        style={{ transform: `scale(${pulse * 0.92})`, transition: "transform 0.4s ease" }}
      />
      <div
        className="scholoVisualizerRing"
        style={{ transform: `scale(${pulse * 0.84})`, transition: "transform 0.5s ease" }}
      />
      <div
        className="scholoVisualizerWaveformHalo"
        style={{ opacity: 0.4 + signalLevel * 0.5 }}
      />
      <div className="scholoVisualizerNode">
        <SigilGlyph seed={schoolId} size={40} />
      </div>
    </div>
  );
}
