import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAlbumAudioEngine } from '../../src/pages/Visualiser/hooks/useAlbumAudioEngine';
import type { ResolvedAlbumTrack } from '../../src/pages/Visualiser/hooks/useAlbumResolver';

function makeTrack(overrides: Partial<ResolvedAlbumTrack> = {}): ResolvedAlbumTrack {
  return {
    albumTrack: { trackId: 'test', trackNumber: 1 },
    grimoireTrack: null,
    title: 'Test Track',
    audioUrl: 'https://cdn1.suno.ai/test.mp3',
    coverUrl: 'https://cdn2.suno.ai/test.jpg',
    duration: 180,
    available: true,
    lyrics: ['Line one'],
    annotations: [],
    ...overrides,
  };
}

describe('useAlbumAudioEngine', () => {
  let audioEl: HTMLAudioElement;

  beforeEach(() => {
    audioEl = document.createElement('audio');
    audioEl.crossOrigin = 'anonymous';
    audioEl.preload = 'metadata';
  });

  it('starts with idle status', () => {
    const { result } = renderHook(() =>
      useAlbumAudioEngine({
        audioRef: { current: audioEl },
        activeTrack: makeTrack(),
        autoplayIntent: false,
        onEnded: vi.fn(),
      })
    );
    expect(result.current.status).toBe('idle');
    expect(result.current.currentTime).toBe(0);
    expect(result.current.analyser).toBeNull();
    expect(result.current.analysisAvailability).toBe('uninitialized');
  });

  it('play returns a promise', () => {
    const { result } = renderHook(() =>
      useAlbumAudioEngine({
        audioRef: { current: audioEl },
        activeTrack: makeTrack(),
        autoplayIntent: false,
        onEnded: vi.fn(),
      })
    );
    const playResult = result.current.play();
    expect(playResult).toBeInstanceOf(Promise);
  });

  it('seek sets audio currentTime', () => {
    const { result } = renderHook(() =>
      useAlbumAudioEngine({
        audioRef: { current: audioEl },
        activeTrack: makeTrack(),
        autoplayIntent: false,
        onEnded: vi.fn(),
      })
    );
    act(() => { result.current.seek(42); });
    expect(audioEl.currentTime).toBe(42);
  });

  it('pause sets audio paused', () => {
    const { result } = renderHook(() =>
      useAlbumAudioEngine({
        audioRef: { current: audioEl },
        activeTrack: makeTrack(),
        autoplayIntent: false,
        onEnded: vi.fn(),
      })
    );
    act(() => { result.current.pause(); });
    expect(audioEl.paused).toBe(true);
  });

  it('updates src when activeTrack changes', () => {
    const track1 = makeTrack({ audioUrl: 'https://cdn1.suno.ai/a.mp3' });
    const track2 = makeTrack({ audioUrl: 'https://cdn1.suno.ai/b.mp3' });

    const { rerender } = renderHook(
      ({ track }) => useAlbumAudioEngine({
        audioRef: { current: audioEl },
        activeTrack: track,
        autoplayIntent: false,
        onEnded: vi.fn(),
      }),
      { initialProps: { track: track1 } }
    );

    expect(audioEl.src).toContain('/a.mp3');

    rerender({ track: track2 });
    expect(audioEl.src).toContain('/b.mp3');
  });

  it('transitions to loading on play event', () => {
    const { result } = renderHook(() =>
      useAlbumAudioEngine({
        audioRef: { current: audioEl },
        activeTrack: makeTrack(),
        autoplayIntent: false,
        onEnded: vi.fn(),
      })
    );

    act(() => { audioEl.dispatchEvent(new Event('play')); });
    expect(result.current.status).toBe('loading');
  });

  it('transitions to playing on playing event', () => {
    const { result } = renderHook(() =>
      useAlbumAudioEngine({
        audioRef: { current: audioEl },
        activeTrack: makeTrack(),
        autoplayIntent: false,
        onEnded: vi.fn(),
      })
    );

    act(() => { audioEl.dispatchEvent(new Event('playing')); });
    expect(result.current.status).toBe('playing');
  });

  it('transitions to paused on pause event', () => {
    const { result } = renderHook(() =>
      useAlbumAudioEngine({
        audioRef: { current: audioEl },
        activeTrack: makeTrack(),
        autoplayIntent: false,
        onEnded: vi.fn(),
      })
    );

    act(() => { audioEl.dispatchEvent(new Event('pause')); });
    expect(result.current.status).toBe('paused');
  });

  it('transitions to ended and calls onEnded', () => {
    const onEnded = vi.fn();
    const { result } = renderHook(() =>
      useAlbumAudioEngine({
        audioRef: { current: audioEl },
        activeTrack: makeTrack(),
        autoplayIntent: false,
        onEnded,
      })
    );

    act(() => { audioEl.dispatchEvent(new Event('ended')); });
    expect(result.current.status).toBe('ended');
    expect(onEnded).toHaveBeenCalledOnce();
  });

  it('transitions to error on error event', () => {
    const { result } = renderHook(() =>
      useAlbumAudioEngine({
        audioRef: { current: audioEl },
        activeTrack: makeTrack(),
        autoplayIntent: false,
        onEnded: vi.fn(),
      })
    );

    act(() => { audioEl.dispatchEvent(new Event('error')); });
    expect(result.current.status).toBe('error');
  });
});
