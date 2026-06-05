import { useCallback, useEffect, useRef, useState } from 'react';
// Reuse the ambient engine's exported analysis math (no duplication). These are
// pure helpers; importing them does not instantiate the school player.
import {
  createPercussivePulseState,
  getPercussivePulseLevelFromWaveform,
} from '../../lib/ambient/ambientPlayer.service.js';

interface UseTrackPlayerArgs {
  streamUrl: string | null | undefined;
  fingerprintId?: string | null;
  fallbackDurationMs?: number;
}

interface TrackPlayerState {
  isPlaying: boolean;
  positionMs: number;
  durationMs: number;
  /** 0..1 live percussive pulse for the genome; 0 when FFT is unavailable. */
  pulse: number;
  play: () => Promise<void>;
  pause: () => void;
  toggle: () => void;
  seekTo: (ms: number) => void;
}

function makeAudio(): HTMLAudioElement {
  return document.createElement('audio');
}

/**
 * Single-track player for the Grimoire spread. Plays a direct stream URL,
 * exposes playback position (to drive the karaoke lyric highlight) and a live
 * FFT pulse (to make the deterministic genome breathe with the music).
 *
 * Degrade ladder: audio playback never depends on FFT; if the analyser can't be
 * built (CORS / unsupported), `pulse` stays 0 and the genome renders static.
 */
export function useTrackPlayer({ streamUrl, fingerprintId, fallbackDurationMs = 0 }: UseTrackPlayerArgs): TrackPlayerState {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataRef = useRef<Uint8Array | null>(null);
  const pulseStateRef = useRef(createPercussivePulseState());
  const rafRef = useRef<number | null>(null);
  const sidecarRef = useRef<{ frames: number[], frameIntervalMs: number } | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(fallbackDurationMs);
  const [pulse, setPulse] = useState(0);

  // Create the audio element once and wire lifecycle listeners.
  useEffect(() => {
    const audio = makeAudio();
    audio.preload = 'metadata';
    audio.crossOrigin = 'anonymous';
    audioRef.current = audio;

    const onLoaded = () => {
      if (Number.isFinite(audio.duration)) setDurationMs(Math.round(audio.duration * 1000));
    };
    const onTime = () => setPositionMs(Math.round(audio.currentTime * 1000));
    const onEnded = () => {
      setIsPlaying(false);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      setPulse(0);
    };
    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnded);

    return () => {
      try { audio.pause(); } catch { /* jsdom / unsupported */ }
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('ended', onEnded);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Load a new track when the URL changes.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setIsPlaying(false);
    setPositionMs(0);
    setPulse(0);
    setDurationMs(fallbackDurationMs);
    if (streamUrl) audio.src = streamUrl;
  }, [streamUrl, fallbackDurationMs]);

  // Load deterministic sidecar if available.
  useEffect(() => {
    sidecarRef.current = null;
    if (fingerprintId) {
      fetch(`/audio/${fingerprintId}.sidecar.json`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && Array.isArray(data.frames) && data.frameIntervalMs) {
            sidecarRef.current = { frames: data.frames, frameIntervalMs: data.frameIntervalMs };
          }
        })
        .catch(() => { /* silent fallback */ });
    }
  }, [fingerprintId]);

  const ensureAnalyser = useCallback(() => {
    if (analyserRef.current || !audioRef.current) return;
    try {
      const w = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
      const AC = w.AudioContext || w.webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      const src = ctx.createMediaElementSource(audioRef.current);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;
      const data = new Uint8Array(analyser.fftSize);
      src.connect(analyser);
      analyser.connect(ctx.destination);
      ctxRef.current = ctx;
      analyserRef.current = analyser;
      dataRef.current = data;
    } catch {
      // CORS-tainted stream or no Web Audio → pulse stays 0, audio still plays.
    }
  }, []);

  const loop = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const currentMs = Math.round(audio.currentTime * 1000);
    setPositionMs(currentMs);

    if (sidecarRef.current) {
      const { frames, frameIntervalMs } = sidecarRef.current;
      const frameIdx = Math.floor(currentMs / frameIntervalMs);
      setPulse(frames[frameIdx] ?? 0);
    } else {
      const analyser = analyserRef.current;
      const data = dataRef.current;
      if (analyser && data && typeof analyser.getByteTimeDomainData === 'function') {
        analyser.getByteTimeDomainData(data);
        setPulse(getPercussivePulseLevelFromWaveform(data, pulseStateRef.current));
      }
    }
    rafRef.current = requestAnimationFrame(loop);
  }, []);

  const play = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    ensureAnalyser();
    if (ctxRef.current?.state === 'suspended') {
      try { await ctxRef.current.resume(); } catch { /* ignore */ }
    }
    try {
      await audio.play();
      setIsPlaying(true);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(loop);
    } catch {
      setIsPlaying(false);
    }
  }, [ensureAnalyser, loop]);

  const pause = useCallback(() => {
    try { audioRef.current?.pause(); } catch { /* jsdom / unsupported */ }
    setIsPlaying(false);
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    setPulse(0);
  }, []);

  const toggle = useCallback(() => {
    if (isPlaying) pause();
    else void play();
  }, [isPlaying, play, pause]);

  const seekTo = useCallback((ms: number) => {
    const clamped = Math.max(0, Math.round(ms));
    const audio = audioRef.current;
    if (audio) {
      try { audio.currentTime = clamped / 1000; } catch { /* ignore */ }
    }
    setPositionMs(clamped); // optimistic — timeupdate may not fire while paused
  }, []);

  return { isPlaying, positionMs, durationMs, pulse, play, pause, toggle, seekTo };
}
