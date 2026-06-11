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
}

export const CrystalBallVisualizer: React.FC<CrystalBallVisualizerProps> = ({
  signalLevel,
  schoolColor,
  glyph,
  isTuning,
  isPlaying = false,
  schoolId,
  size = 320,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<any>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
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
          }
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
      
      // We push initial state
      const bpm = getAmbientPlayerService()?.getBPM?.() || 90;
      scene?.updateState?.({ signalLevel, schoolColor, glyph, isTuning, isPlaying, schoolId, bpm, reducedMotion: prefersReducedMotion });
    };

    void initPhaser();

    return () => {
      controller.abort();
      if (runtimeHandle) {
        runtimeHandle.destroy();
      }
      gameRef.current = null;
      sceneRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size]);

  useEffect(() => {
    const bpm = getAmbientPlayerService()?.getBPM?.() || 90;
    sceneRef.current?.updateState({ signalLevel, schoolColor, glyph, isTuning, isPlaying, schoolId, bpm, reducedMotion: prefersReducedMotion });
  }, [signalLevel, schoolColor, glyph, isTuning, isPlaying, schoolId, prefersReducedMotion]);

  return (
    <div
      ref={containerRef}
      className="crystal-ball-container"
      style={{ width: size, height: size, position: 'relative', overflow: 'visible' }}
    />
  );
};
