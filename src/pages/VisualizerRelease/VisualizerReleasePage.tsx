import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { VisualizerKit } from "../../kits/scholomance-visualizer-kit";
import { useAmbientPlayer } from "../../hooks/useAmbientPlayer";
import { SCHOOLS, generateSchoolColor } from "../../data/schools";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import type { ScholomanceRelease } from "../../kits/scholomance-visualizer-kit";

const DEMO_RELEASE: ScholomanceRelease = {
  id: "scholo-demo-001",
  title: "RESONANCE FIELD",
  artist: "SCHOLOMANCE",
  album: "SIGNAL CHAMBER",
  releaseDate: "2026-06-10",
  audio: {
    duration: "3:42",
    bpm: 120,
    key: "Dm",
    genre: ["AMBIENT", "ELECTRONIC", "ORCHESTRAL"],
    fileType: "FLAC",
    sampleRate: "48kHz",
    bitDepth: "24-bit",
  },
  commerce: {
    price: "$7",
    currency: "USD",
    buyEnabled: true,
    downloadFormats: ["FLAC", "WAV", "MP3"],
  },
  provenance: {
    humanIntent: "Craft a reactive sonic environment for the Scholomance Signal Chamber",
    tools: ["Suno AI", "Ableton Live", "ScholoCandy"],
    assistance: ["Claude (composition)", "Gemini (structuring)"],
    masteringChain: ["Ozone 11", "YouLean Loudness Meter"],
  },
  bytecode: {
    fingerprint: "0x8F3A:7C2B:9D1E:4F6A",
    checksum: "a3f8c1e9b27d4f6a8c0e5d3b7f1a9c2e",
    seed: "scholo-demo-001:a3f8c1e9",
    glyphcoreVersion: "v2.4.0",
    coordinates: { x: 0.618, y: 0.382, z: 0.786 },
    ritualSync: {
      phase: "WANING_CRESCENT",
      cycle: "RESONANCE_Ω",
      bpm: 120,
      key: "Dm",
    },
  },
  semantics: [
    { label: "DRIFT", description: "Flowing ambient movement", active: true },
    { label: "PULSE", description: "Rhythmic energy signature" },
    { label: "FRACTURE", description: "Glitch/buffer disruption" },
    { label: "VEIL", description: "Muffled behind frequency curtain" },
    { label: "BLEED", description: "Overlapping harmonic wash" },
    { label: "ECHO", description: "Delayed reflection" },
  ],
  lyrics: [
    { index: 0, text: "SIGNAL LOST IN THE VOID", timestamp: "0:00", semanticTag: "veil" },
    { index: 1, text: "FREQUENCY BLEEDS THROUGH STATIC", timestamp: "0:12", semanticTag: "bleed" },
    { index: 2, text: "RESONANCE CARRIES THE WAVE", timestamp: "0:28" },
    { index: 3, text: "THROUGH CRYSTAL AND STEEL", timestamp: "0:44" },
    { index: 4, text: "FRACTURED LIGHT BEHIND IT ALL", timestamp: "1:02", semanticTag: "fracture" },
    { index: 5, text: "THE ORB REMEMBERS THE FREQUENCY", timestamp: "1:22" },
    { index: 6, text: "PULSE OF THE DEEP MACHINE", timestamp: "1:44", semanticTag: "pulse" },
    { index: 7, text: "ECHOES IN THE SIGNAL CHAMBER", timestamp: "2:08", semanticTag: "echo" },
    { index: 8, text: "DRIFT INTO THE NOISE FLOOR", timestamp: "2:34", semanticTag: "drift" },
  ],
};

export default function VisualizerReleasePage() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const allSchoolIds = useMemo(() => Object.keys(SCHOOLS), []);
  const [currentTime, setCurrentTime] = useState(0);
  const duration = 222;
  const rafRef = useRef<number>(0);

  const {
    currentSchoolId,
    isPlaying,
    isTuning,
    signalLevel,
    volume,
    setVolume,
    togglePlayPause,
    tuneToSchool,
    getByteFrequencyData,
    seek,
    trackUrl,
  } = useAmbientPlayer(allSchoolIds);

  const [activeLyricIndex, setActiveLyricIndex] = useState<number | undefined>();

  // Simulate playback time tracking
  useEffect(() => {
    if (!isPlaying) {
      cancelAnimationFrame(rafRef.current);
      return;
    }
    let lastTime = performance.now();
    const tick = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      setCurrentTime((t) => {
        const next = t + dt;
        if (next >= duration) return 0;
        return next;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, duration]);

  // Sync active lyric index with playback
  useEffect(() => {
    if (!isPlaying || !DEMO_RELEASE.lyrics.length) {
      setActiveLyricIndex(undefined);
      return;
    }
    let activeIndex = -1;
    for (let i = 0; i < DEMO_RELEASE.lyrics.length; i++) {
      const lyric = DEMO_RELEASE.lyrics[i];
      if (lyric.timestamp && parseTime(lyric.timestamp) <= currentTime) {
        activeIndex = i;
      }
    }
    setActiveLyricIndex(activeIndex >= 0 ? activeIndex : undefined);
  }, [currentTime, isPlaying]);

  const handlePlay = useCallback(() => {
    togglePlayPause();
  }, [togglePlayPause]);

  const handlePause = useCallback(() => {
    togglePlayPause();
  }, [togglePlayPause]);

  const handleRewind = useCallback(() => {
    seek(-10);
  }, [seek]);

  const handleFastForward = useCallback(() => {
    seek(10);
  }, [seek]);

  const handleSeek = useCallback((pct: number) => {
    const target = pct * duration - currentTime;
    seek(target - currentTime);
  }, [seek, currentTime, duration]);

  const handleBuy = useCallback(() => {
    console.warn("Purchase flow — This would open Stripe/checkout in production.");
  }, []);

  return (
    <VisualizerKit
      release={DEMO_RELEASE}
      isPlaying={isPlaying}
      playerState={isTuning ? "loading" : isPlaying ? "playing" : "paused"}
      signalLevel={signalLevel}
      volume={volume}
      currentTime={currentTime}
      duration={duration}
      getByteFrequencyData={getByteFrequencyData}
      schoolId={currentSchoolId || "SONIC"}
      activeLyricIndex={activeLyricIndex}
      onPlay={handlePlay}
      onPause={handlePause}
      onRewind={handleRewind}
      onFastForward={handleFastForward}
      onSeek={handleSeek}
      onBuy={handleBuy}
      onTagClick={(label) => {
        const tagIdx = DEMO_RELEASE.semantics.findIndex(s => s.label === label);
        if (tagIdx >= 0) {
          DEMO_RELEASE.semantics.forEach(s => s.active = false);
          DEMO_RELEASE.semantics[tagIdx].active = true;
          setActiveLyricIndex(undefined);
          // Force re-render by spreading
          setActiveLyricIndex(-1);
          setTimeout(() => setActiveLyricIndex(undefined), 50);
        }
      }}
    />
  );
}

function parseTime(ts: string): number {
  const parts = ts.split(":").map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}
