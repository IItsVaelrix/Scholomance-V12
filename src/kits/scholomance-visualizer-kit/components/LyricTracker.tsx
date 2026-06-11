import React from "react";

interface LyricLine {
  index: number;
  text: string;
  timestamp?: string;
  semanticTag?: string;
}

interface LyricTrackerProps {
  lyrics: LyricLine[];
  activeIndex?: number;
}

export function LyricTracker({ lyrics, activeIndex }: LyricTrackerProps) {
  return (
    <div className="scholoCard">
      <span className="scholoOverline">LYRICS</span>
      <div className="scholoLyrics" role="log" aria-label="Song lyrics">
        {lyrics.map((line) => (
          <div
            key={line.index}
            className="scholoLyricLine"
            data-active={activeIndex === line.index ? "true" : undefined}
            data-semantic={line.semanticTag || undefined}
          >
            <span className="scholoLyricIndex">
              {String(line.index + 1).padStart(2, "0")}
            </span>
            <span>{line.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
