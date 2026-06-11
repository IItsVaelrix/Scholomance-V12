import React from "react";
import { SigilGlyph } from "./SigilGlyph";

interface RitualSyncData {
  phase: string;
  cycle: string;
  bpm: number;
  key: string;
}

interface RitualSyncCardProps {
  data: RitualSyncData;
}

export function RitualSyncCard({ data }: RitualSyncCardProps) {
  const sigilSeed = `${data.phase}:${data.cycle}:${data.bpm}:${data.key}`;
  return (
    <div className="scholoCard">
      <span className="scholoOverline scholoGoldOverline">RITUAL SYNC</span>
      <div style={{ display: "flex", gap: "var(--scholo-space-4)", alignItems: "center" }}>
        <SigilGlyph seed={sigilSeed} size={56} />
        <div className="scholoCoordinates" style={{ flex: 1 }}>
          <div className="scholoCoordinateRow">
            <span className="scholoCoordinateAxis">PHASE</span>
            <span className="scholoCoordinateValue">{data.phase}</span>
          </div>
          <div className="scholoCoordinateRow">
            <span className="scholoCoordinateAxis">CYCLE</span>
            <span className="scholoCoordinateValue">{data.cycle}</span>
          </div>
          <div className="scholoCoordinateRow">
            <span className="scholoCoordinateAxis">BPM</span>
            <span className="scholoCoordinateValue">{data.bpm}</span>
          </div>
          <div className="scholoCoordinateRow">
            <span className="scholoCoordinateAxis">KEY</span>
            <span className="scholoCoordinateValue">{data.key}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
