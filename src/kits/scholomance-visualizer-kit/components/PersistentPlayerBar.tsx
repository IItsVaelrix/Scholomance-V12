import React from "react";
import { WaveformScrubber } from "./WaveformScrubber";
import { IconButton } from "./IconButton";
import type { PlayerState } from "../types";

interface PersistentPlayerBarProps {
  title?: string;
  artist?: string;
  isPlaying?: boolean;
  playerState?: PlayerState;
  volume?: number;
  currentTime?: number;
  duration?: number;
  onPlay?: () => void;
  onPause?: () => void;
  onRewind?: () => void;
  onFastForward?: () => void;
  onSeek?: (pct: number) => void;
  onBuy?: () => void;
  waveformData?: number[];
}

export function PersistentPlayerBar({
  title = "No signal",
  artist,
  isPlaying = false,
  currentTime = 0,
  duration = 100,
  onPlay,
  onPause,
  onRewind,
  onFastForward,
  onSeek,
  onBuy,
  waveformData,
}: PersistentPlayerBarProps) {
  return (
    <div className="scholoPlayerBar" role="region" aria-label="Music player">
      <div style={{ minWidth: 0 }}>
        <div className="scholoPlayerTitle">{title}</div>
        {artist && <div className="scholoPlayerMeta">{artist}</div>}
      </div>

      <div style={{ minWidth: 0 }}>
        <div className="scholoPlayerControls">
          <IconButton onClick={onRewind} disabled={!isPlaying} ariaLabel="Rewind">
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>fast_rewind</span>
          </IconButton>
          <button
            className="scholoPlayButton"
            onClick={isPlaying ? onPause : onPlay}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "24px" }}>
              {isPlaying ? "pause" : "play_arrow"}
            </span>
          </button>
          <IconButton onClick={onFastForward} disabled={!isPlaying} ariaLabel="Fast forward">
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>fast_forward</span>
          </IconButton>
        </div>
        <WaveformScrubber
          currentTime={currentTime}
          duration={duration}
          waveformData={waveformData}
          onSeek={onSeek}
        />
      </div>

      {onBuy && (
        <button className="scholoBuyButton" onClick={onBuy} aria-label="Buy this release">
          OWN THIS
        </button>
      )}
    </div>
  );
}
