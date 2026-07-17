import React, { useEffect, useRef } from 'react';
// eslint-disable-next-line no-restricted-imports -- type-only import removed at compile time
import type Phaser from 'phaser';
import { buildCrystalBallScene } from './scenes/CrystalBallScene.js';
import { mountPhaserGame } from '../../lib/phaser/phaser-runtime.adapter.js';
import { getAmbientPlayerService } from '../../lib/ambient/ambientPlayer.service.js';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion.js';

interface CrystalBallVisualizerProps {
  signalLevel: number;
  schoolColor: string;
  glyph: string;
  isTuning: boolean;
  isPlaying?: boolean;
  schoolId?: string;
  size?: number;
  /**
   * When false, the Phaser game is not created and any existing instance is destroyed.
   * Scholomance Station must pass true only while the station view is open.
   */
  active?: boolean;
}

function sleepGame(game: Phaser.Game | null) {
  if (!game?.loop) return;
  try {
    (game.loop as { sleep?: () => void }).sleep?.();
  } catch {
    /* tolerate runtime API drift */
  }
}

function wakeGame(game: Phaser.Game | null) {
  if (!game?.loop) return;
  try {
    (game.loop as { wake?: () => void }).wake?.();
  } catch {
    /* tolerate runtime API drift */
  }
}

export const CrystalBallVisualizer: React.FC<CrystalBallVisualizerProps> = ({
  signalLevel,
  schoolColor,
  glyph,
  isTuning,
  isPlaying = false,
  schoolId,
  size = 320,
  active = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<any>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  // Create Phaser only while the station is active. Destroy on close so
  // WebGL + the 60fps update loop cannot run off-screen.
  useEffect(() => {
    if (!active) {
      gameRef.current = null;
      sceneRef.current = null;
      return undefined;
    }

    const controller = new AbortController();
    let runtimeHandle: { game: Phaser.Game; destroy: () => void } | null = null;

    const initPhaser = async () => {
      if (!containerRef.current || controller.signal.aborted) return;

      runtimeHandle = await mountPhaserGame({
        parent: containerRef.current,
        buildScenes: [buildCrystalBallScene],
        config: {
          type: 2, // Phaser.WEBGL
          width: size,
          height: size,
          transparent: true,
          antialias: true,
          fps: { target: 60 },
          render: {
            powerPreference: 'high-performance',
            batchSize: 1024,
          },
        },
        signal: controller.signal,
      });

      if (!runtimeHandle || controller.signal.aborted) return;

      const game = runtimeHandle.game;
      gameRef.current = game;

      game.scene.stop('CrystalBallScene');
      game.scene.start('CrystalBallScene', { reducedMotion: prefersReducedMotion });

      const scene = game.scene.getScene('CrystalBallScene') as
        (Phaser.Scene & { updateState?: (state: Record<string, unknown>) => void }) | null;
      sceneRef.current = scene;

      const bpm = getAmbientPlayerService()?.getBPM?.() || 90;
      scene?.updateState?.({
        signalLevel,
        schoolColor,
        glyph,
        isTuning,
        isPlaying,
        schoolId,
        bpm,
        reducedMotion: prefersReducedMotion,
      });

      if (typeof document !== 'undefined' && document.hidden) {
        sleepGame(game);
      }
    };

    void initPhaser();

    const onVisibility = () => {
      if (document.hidden) sleepGame(gameRef.current);
      else wakeGame(gameRef.current);
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      controller.abort();
      if (runtimeHandle) {
        runtimeHandle.destroy();
      }
      gameRef.current = null;
      sceneRef.current = null;
    };
    // size + active gate lifecycle; reactive state is pushed in the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, size]);

  useEffect(() => {
    if (!active || !sceneRef.current) return;
    const bpm = getAmbientPlayerService()?.getBPM?.() || 90;
    sceneRef.current.updateState({
      signalLevel,
      schoolColor,
      glyph,
      isTuning,
      isPlaying,
      schoolId,
      bpm,
      reducedMotion: prefersReducedMotion,
    });
  }, [active, signalLevel, schoolColor, glyph, isTuning, isPlaying, schoolId, prefersReducedMotion]);

  // Stable mount node so Phaser can attach when active flips true.
  // When inactive the shell stays empty (no canvas) because the effect never mounts Phaser.
  return (
    <div
      ref={containerRef}
      className="crystal-ball-container"
      style={{
        width: size,
        height: size,
        position: 'relative',
        overflow: 'visible',
        display: active ? 'block' : 'none',
      }}
      aria-hidden={!active}
    />
  );
};
