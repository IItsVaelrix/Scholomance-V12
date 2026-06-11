import React, { useMemo } from "react";

interface WaveformScrubberProps {
  currentTime?: number;
  duration?: number;
  waveformData?: number[];
  onSeek?: (pct: number) => void;
}

function fmt(t: number): string {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function WaveformScrubber({ currentTime = 0, duration = 100, waveformData, onSeek }: WaveformScrubberProps) {
  const bars = useMemo(() => {
    if (waveformData && waveformData.length > 0) return waveformData;
    return Array.from({ length: 60 }, (_, i) =>
      0.2 + 0.4 * Math.abs(Math.sin(i * 0.5)) + 0.2 * Math.sin(i * 0.15)
    );
  }, [waveformData]);

  const progress = duration > 0 ? currentTime / duration : 0;

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    onSeek?.(Math.max(0, Math.min(1, pct)));
  };

  return (
    <div className="scholoWaveform" onClick={handleClick} role="slider" aria-label="Track progress"
      aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100} tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") onSeek?.(Math.min(1, progress + 0.05));
        if (e.key === "ArrowLeft") onSeek?.(Math.max(0, progress - 0.05));
      }}
    >
      <div className="scholoWaveformBars" aria-hidden="true">
        {bars.map((bar, i) => {
          const barPct = i / bars.length;
          return (
            <div
              key={i}
              className="scholoWaveBar"
              style={{ "--bar": bar } as React.CSSProperties}
              data-played={barPct <= progress ? "true" : undefined}
            />
          );
        })}
      </div>
      <div className="scholoWaveformTime">
        <span>{fmt(currentTime)}</span>
        <span>{fmt(duration)}</span>
      </div>
    </div>
  );
}
