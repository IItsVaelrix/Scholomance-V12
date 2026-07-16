import { useCallback, useRef, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { useAlbumResolver } from './hooks/useAlbumResolver';
import { useAlbumAudioEngine } from './hooks/useAlbumAudioEngine';
import { AlbumSidebar } from './AlbumSidebar';
import { WmpSpectrum } from './WmpSpectrum';
import { AlbumLyrics } from './AlbumLyrics';
import { AlbumTransport } from './AlbumTransport';
import './AlbumPage.css';

export default function AlbumPage() {
  const { albumId } = useParams<{ albumId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const reducedMotion = usePrefersReducedMotion();

  const trackQuery = searchParams.get('track') ?? undefined;
  const resolver = useAlbumResolver(albumId ?? '', trackQuery);

  const [activeIndex, setActiveIndex] = useState(resolver.activeTrackIndex);
  const [repeat, setRepeat] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const activeTrack = resolver.tracks[activeIndex] ?? resolver.activeTrack;

  const findNextPlayable = useCallback((from: number, direction: 1 | -1): number => {
    const { tracks } = resolver;
    let idx = from + direction;
    while (idx >= 0 && idx < tracks.length) {
      if (tracks[idx].available && !tracks[idx].albumTrack.hidden) return idx;
      idx += direction;
    }
    return -1;
  }, [resolver]);

  const switchTrack = useCallback((index: number, shouldPlay: boolean) => {
    setActiveIndex(index);
    const track = resolver.tracks[index];
    if (!track?.available) return;

    setTrackQuery(track.grimoireTrack?.id ?? '');

    if (shouldPlay) {
      setTimeout(() => {
        audioRef.current?.play().catch(() => {});
      }, 100);
    }
  }, [resolver.tracks]);

  const setTrackQuery = useCallback((trackId: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('track', trackId);
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const onEnded = useCallback(() => {
    const next = findNextPlayable(activeIndex, 1);
    if (next >= 0) {
      switchTrack(next, true);
    } else if (repeat) {
      const first = findNextPlayable(-1, 1);
      if (first >= 0) switchTrack(first, true);
    }
  }, [activeIndex, repeat, findNextPlayable, switchTrack]);

  const engine = useAlbumAudioEngine({
    audioRef,
    activeTrack: activeTrack ?? resolver.tracks[0],
    autoplayIntent: false,
    onEnded,
  });

  const handleSelectTrack = useCallback((index: number) => {
    const wasPlaying = engine.status === 'playing' || engine.status === 'loading' || engine.status === 'buffering';
    switchTrack(index, wasPlaying || true);
  }, [engine.status, switchTrack]);

  const handlePrev = useCallback(() => {
    if (engine.currentTime > 3) {
      engine.seek(0);
      return;
    }
    const prev = findNextPlayable(activeIndex, -1);
    if (prev >= 0) {
      const wasPlaying = engine.status === 'playing';
      switchTrack(prev, wasPlaying);
    }
  }, [activeIndex, engine, findNextPlayable]);

  const handleNext = useCallback(() => {
    const next = findNextPlayable(activeIndex, 1);
    if (next >= 0) {
      const wasPlaying = engine.status === 'playing';
      switchTrack(next, wasPlaying);
    }
  }, [activeIndex, engine.status, findNextPlayable]);

  const canPrev = findNextPlayable(activeIndex, -1) >= 0;
  const canNext = findNextPlayable(activeIndex, 1) >= 0;

  if (resolver.notFound) {
    return (
      <main className="alb-page alb-page--not-found" aria-label="Album not found">
        <h1>Album Not Found</h1>
        <p>The album you are looking for does not exist.</p>
        <Link to="/visualiser/albums">Browse all albums</Link>
      </main>
    );
  }

  if (resolver.empty) {
    return (
      <main className="alb-page alb-page--empty" aria-label="Empty album">
        <h1>{resolver.album?.title ?? 'Album'}</h1>
        <p>This album has no playable tracks.</p>
        <Link to="/visualiser/albums">Browse all albums</Link>
      </main>
    );
  }

  return (
    <main className="alb-page" aria-label={`${resolver.album?.title} album`}>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio
        ref={audioRef}
        crossOrigin="anonymous"
        preload="metadata"
      />

      <div className="alb-spread">
        <AlbumSidebar
          resolver={resolver}
          activeIndex={activeIndex}
          status={engine.status}
          onSelectTrack={handleSelectTrack}
        />

        <section className="alb-experience" aria-label="Track experience">
          <div className="alb-experience__spectrum">
            <WmpSpectrum
              analyser={engine.analyser}
              analysisAvailability={engine.analysisAvailability}
              bpm={activeTrack?.pacing?.bpm ?? 120}
              reducedMotion={reducedMotion}
            />
          </div>

          <div className="alb-experience__lyrics">
            {activeTrack && (
              <AlbumLyrics
                track={activeTrack}
                currentTime={engine.currentTime}
                status={engine.status}
                reducedMotion={reducedMotion}
              />
            )}
          </div>

          <AlbumTransport
            status={engine.status}
            currentTime={engine.currentTime}
            duration={engine.duration}
            onPlay={() => { engine.play().catch(() => {}); }}
            onPause={engine.pause}
            onSeek={engine.seek}
            onPrev={handlePrev}
            onNext={handleNext}
            repeat={repeat}
            onToggleRepeat={() => setRepeat(r => !r)}
            canPrev={canPrev}
            canNext={canNext}
          />
        </section>
      </div>

      <div aria-live="polite" className="sr-only">
        {activeTrack && engine.status === 'playing'
          ? `Now playing: ${activeTrack.title}`
          : ''}
      </div>
    </main>
  );
}
