/**
 * useAudioForge — React Hook
 *
 * Owns the AudioContext unlock gesture.
 * Exposes event-bus-compatible API to combat pages and Phaser adapters.
 *
 * AMENDMENT 2: dispose() defaults to NOT closing AudioContext.
 * AMENDMENT 5: Event-bus-compatible surface:
 *   { ready, muted, emitSfx, scheduleSfx, playPacket, setVolume, unlock, dispose }
 *
 * LAYER: src/hooks — React integration only.
 * No DSP logic. No AudioContext construction (delegated to forge).
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { createPixelBrainAudioForge } from '../audio/pixelbrain-audio-forge.js';

// ─── Gesture Events ───────────────────────────────────────────────────────────

const UNLOCK_GESTURE_EVENTS = ['pointerdown', 'keydown', 'touchstart'];

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * React hook for the PixelBrain Audio Forge.
 *
 * @param {object} [options]
 * @param {AudioContext} [options.audioContext] - External context (forge won't close it)
 * @param {boolean}      [options.prefersReducedMotion] - If true, defers non-critical SFX
 * @returns {{
 *   ready: boolean,
 *   muted: boolean,
 *   emitSfx: (eventType: string, payload?: object) => void,
 *   scheduleSfx: (eventType: string, payload?: object) => void,
 *   playPacket: (packet: object) => Promise<void>,
 *   setVolume: (bus: string, value: number) => void,
 *   unlock: () => Promise<void>,
 *   dispose: (opts?: { closeAudioContext?: boolean }) => void,
 * }}
 */
export function useAudioForge(options = {}) {
  const forgeRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [muted, setMuted] = useState(false);
  const prefersReducedMotion = options.prefersReducedMotion ?? false;

  // Create forge once on mount
  useEffect(() => {
    const forge = createPixelBrainAudioForge({
      audioContext: options.audioContext ?? undefined,
    });
    forgeRef.current = forge;

    // Gesture unlock handler
    const handleGesture = () => {
      forge.unlock().then(() => {
        setReady(forge.ready);
      }).catch(() => {});
    };

    UNLOCK_GESTURE_EVENTS.forEach((evt) => {
      document.addEventListener(evt, handleGesture, { once: true, passive: true });
    });

    return () => {
      UNLOCK_GESTURE_EVENTS.forEach((evt) => {
        document.removeEventListener(evt, handleGesture);
      });
      // AMENDMENT 2: Never close an external AudioContext by default on unmount.
      // Only close if forge owns the context (options.audioContext was not provided).
      const ownsContext = !options.audioContext;
      forge.dispose({ closeAudioContext: ownsContext });
      forgeRef.current = null;
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Stable Callbacks ─────────────────────────────────────────────────────

  const scheduleSfx = useCallback((eventType, payload = {}) => {
    const forge = forgeRef.current;
    if (!forge) return;
    // Respect prefers-reduced-motion: skip non-critical UI SFX
    if (prefersReducedMotion && _isNonCriticalSfx(eventType)) return;
    forge.scheduleSfx(eventType, payload);
  }, [prefersReducedMotion]);

  const emitSfx = useCallback((eventType, payload = {}) => {
    return scheduleSfx(eventType, payload);
  }, [scheduleSfx]);

  const playPacket = useCallback(async (packet) => {
    const forge = forgeRef.current;
    if (!forge) return;
    return forge.playPacket(packet);
  }, []);

  const setVolume = useCallback((bus, value) => {
    forgeRef.current?.setVolume(bus, value);
  }, []);

  const unlock = useCallback(async () => {
    const forge = forgeRef.current;
    if (!forge) return;
    await forge.unlock();
    setReady(forge.ready);
  }, []);

  const dispose = useCallback((opts = {}) => {
    forgeRef.current?.dispose(opts);
    setReady(false);
  }, []);

  return {
    ready,
    muted,
    emitSfx,
    scheduleSfx,
    playPacket,
    setVolume,
    unlock,
    dispose,
  };
}

// ─── Reduced Motion Filter ────────────────────────────────────────────────────

const NON_CRITICAL_SFX_TYPES = new Set([
  'UI_CONFIRM',
  'UI_CANCEL',
  'SYNTACTICAL_CHESS_ADVANTAGE',
]);

function _isNonCriticalSfx(eventType) {
  return NON_CRITICAL_SFX_TYPES.has(eventType);
}
