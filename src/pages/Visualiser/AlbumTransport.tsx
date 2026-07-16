import type { PlaybackStatus } from './hooks/useAlbumAudioEngine';

interface AlbumTransportProps {
  status: PlaybackStatus;
  currentTime: number;
  duration: number;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (time: number) => void;
  onPrev: () => void;
  onNext: () => void;
  repeat: boolean;
  onToggleRepeat: () => void;
  canPrev: boolean;
  canNext: boolean;
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export function AlbumTransport({
  status,
  currentTime,
  duration,
  onPlay,
  onPause,
  onSeek,
  onPrev,
  onNext,
  repeat,
  onToggleRepeat,
  canPrev,
  canNext,
}: AlbumTransportProps) {
  const isPlaying = status === 'playing' || status === 'loading' || status === 'buffering';
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="alb-transport" role="region" aria-label="Playback controls">
      <span className="alb-transport__time">{fmt(currentTime)}</span>
      <div className="alb-transport__bar">
        <input
          type="range"
          className="alb-transport__slider"
          min={0}
          max={duration || 0}
          step={0.1}
          value={currentTime}
          onChange={(e) => onSeek(parseFloat(e.target.value))}
          aria-label="Seek"
          aria-valuenow={Math.round(currentTime)}
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuetext={`${fmt(currentTime)} of ${fmt(duration)}`}
          style={{ '--progress': `${progress}%` } as React.CSSProperties}
        />
      </div>
      <span className="alb-transport__time">{fmt(duration)}</span>
      <div className="alb-transport__controls">
        <button
          type="button"
          className="alb-transport__btn"
          onClick={onPrev}
          disabled={!canPrev}
          aria-label="Previous track"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 20 9 12l10-8v16ZM5 19V5" />
          </svg>
        </button>
        <button
          type="button"
          className="alb-transport__btn alb-transport__btn--play"
          onClick={isPlaying ? onPause : onPlay}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
              <path d="M7 4h3.4v16H7zM13.6 4H17v16h-3.4z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
              <path d="M7 4.5 19.5 12 7 19.5v-15Z" />
            </svg>
          )}
        </button>
        <button
          type="button"
          className="alb-transport__btn"
          onClick={onNext}
          disabled={!canNext}
          aria-label="Next track"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m5 4 10 8-10 8V4ZM19 5v14" />
          </svg>
        </button>
        <button
          type="button"
          className={`alb-transport__btn${repeat ? ' is-on' : ''}`}
          onClick={onToggleRepeat}
          aria-label="Repeat album"
          aria-pressed={repeat}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m17 2 4 4-4 4M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4M21 13v1a4 4 0 0 1-4 4H3" />
          </svg>
        </button>
      </div>
    </div>
  );
}
