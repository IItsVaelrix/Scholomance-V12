import { useEffect, useRef, useState } from 'react';
// eslint-disable-next-line no-restricted-imports -- type-only import removed at compile time
import type Phaser from 'phaser';
import { cacheBackground } from '../../lib/cache/backgroundCache';
import { getAmbientPlayerService } from '../../lib/ambient/ambientPlayer.service.js';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion.js';
import { mountPhaserGame } from '../../lib/phaser/phaser-runtime.adapter.js';
import { PBShaderStage } from '../../ui/animation/pbstage';
import { ATMOSPHERE_PACKET } from './shaders/atmospherePacket.js';
import { getBytecodeAMP, AMP_CHANNELS } from '../../lib/ambient/bytecodeAMP.js';

// Shared game reference for SignalChamberConsole to attach to
let sharedPhaserGame: Phaser.Game | null = null;

export function getSharedPhaserGame(): Phaser.Game | null {
  return sharedPhaserGame;
}

/**
 * AlchemicalLabBackground - Creates a SINGLE Phaser game with multiple scenes:
 * - AlchemicalLabScene (zIndex: 0) - Background atmosphere with rotating hexagram
 * - SignalChamberScene (zIndex: 10) - Console UI (mounted by SignalChamberConsole)
 *
 * Performance: Cache + Hydrate pattern for instant LCP
 * - First visit: Shows CSS background, loads Phaser, caches rendered static layer
 * - Subsequent: Shows cached image instantly, hydrates with Phaser in background
 */
export const AlchemicalLabBackground: React.FC<{
  signalLevel?: number;
  /** When true, freeze Phaser + Tier-A shader (e.g. while Scholomance Station is open). */
  paused?: boolean;
}> = ({ signalLevel = 0, paused = false }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const phaserRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const bgSceneRef = useRef<any>(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const [isLoaded, setIsLoaded] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    let isMounted = true;
    if (!phaserRef.current || gameRef.current) return;
    const el = phaserRef.current;

    const controller = new AbortController();
    let runtimeHandle: { game: Phaser.Game; destroy: () => void } | null = null;

    // Load Phaser in background (non-blocking)
    const initBackground = async () => {
      const { buildAlchemicalLabScene } = await import('./scenes/AlchemicalLabScene.js');
      const { buildSignalChamberScene } = await import('./scenes/SignalChamberScene.js');

      if (controller.signal.aborted || !el || gameRef.current) return;

      runtimeHandle = await mountPhaserGame({
        parent: el,
        buildScenes: [buildAlchemicalLabScene, buildSignalChamberScene],
        config: {
          type: 2, // Phaser.WEBGL
          width: el.offsetWidth || window.innerWidth,
          height: el.offsetHeight || window.innerHeight,
          backgroundColor: '#010305',
          transparent: false,
          antialias: true,
          fps: { target: 60, forceSetTimeOut: false },
          input: { mouse: true, touch: true, keyboard: true, gamepad: false },
          render: {
            pixelArt: false,
            antialias: true,
            powerPreference: 'high-performance',
            batchSize: 4096,
          },
        },
        signal: controller.signal,
      });

      if (!runtimeHandle || controller.signal.aborted) return;

      const game = runtimeHandle.game;
      sharedPhaserGame = game;
      gameRef.current = game;

      game.scene.stop('AlchemicalLabScene');
      game.scene.start('AlchemicalLabScene', { reducedMotion: prefersReducedMotion });
      game.scene.stop('SignalChamberScene');
      game.scene.start('SignalChamberScene', { reducedMotion: prefersReducedMotion });

      game.events.once('ready', () => {
        if (controller.signal.aborted) return;
        // Get background scene
        const bgScene = game.scene.getScene('AlchemicalLabScene');
        if (bgScene) {
          bgSceneRef.current = bgScene;
        }

        // Style the Phaser canvas
        const canvas = el.querySelector('canvas');
        if (canvas) {
          canvas.style.position = 'absolute';
          canvas.style.inset = '0';
          canvas.style.width = '100%';
          canvas.style.height = '100%';
          canvas.style.display = 'block';
          canvas.style.zIndex = '1';
        }

        // Fade in the Phaser canvas
        if (typeof window !== 'undefined') {
          setIsLoaded(true);
        }

        // Honor current pause flag if station opened before Phaser finished booting.
        if (pausedRef.current) {
          try {
            (game.loop as { sleep?: () => void }).sleep?.();
          } catch { /* ignore */ }
        }

        // Cache the static background for next visit (after a delay to not block render)
        setTimeout(() => {
          if (controller.signal.aborted || pausedRef.current) return;
          cacheStaticBackground(bgScene);
        }, 1000);
      });
    };

    // Render and cache static background
    const cacheStaticBackground = async (bgScene: any) => {
      if (!bgScene || !sharedPhaserGame) return;

      try {
        // Get the canvas from the game
        const canvas = sharedPhaserGame.canvas as HTMLCanvasElement;
        if (!canvas) return;

        // Create a temporary canvas to render static-only version
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) return;

        // Draw current frame (includes all static elements)
        tempCtx.drawImage(canvas, 0, 0);

        // Cache the data URL
        const dataURL = tempCanvas.toDataURL('image/png', 0.85);
        await cacheBackground(dataURL);
      } catch (error) {
        console.warn('Failed to cache background:', error);
      }
    };

    void initBackground();

    return () => {
      isMounted = false;
      controller.abort();
      if (runtimeHandle) {
        runtimeHandle.destroy();
      }
      gameRef.current = null;
      bgSceneRef.current = null;
      sharedPhaserGame = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Sync React state to Phaser background scene
    if (bgSceneRef.current && !paused) {
      const bpm = getAmbientPlayerService()?.getBPM?.() || 90;
      bgSceneRef.current.updateState({ signalLevel, bpm });
    }
  }, [signalLevel, paused]);

  // Freeze chamber GPU while Scholomance Station is open (avoids dual Phaser).
  useEffect(() => {
    const game = gameRef.current;
    if (!game?.loop) return;
    try {
      const loop = game.loop as { sleep?: () => void; wake?: () => void };
      if (paused) loop.sleep?.();
      else loop.wake?.();
    } catch {
      /* tolerate Phaser loop API drift */
    }
  }, [paused]);

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className="alchemical-lab-background"
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        // Hide chamber canvas while station owns the screen (saves composite work).
        visibility: paused ? 'hidden' : 'visible',
      }}
    >
      {/* Phaser canvas container - must be FIRST so it has lower stacking context */}
      <div
        className="alchemical-lab-phaser"
        ref={phaserRef}
        style={{
          position: 'absolute',
          inset: 0,
          opacity: isLoaded && !paused ? 1 : 0,
          transition: 'opacity 0.3s ease',
          zIndex: 2,
          pointerEvents: paused ? 'none' : 'auto',
        }}
      />

      {/*
        Tier A atmosphere - PBShaderStage renders the ambient atmosphere shader,
        replacing the old static CSS portal subtree. Sits below the Phaser
        canvas (zIndex 0 vs 2). Paused while station is open.
      */}
      <PBShaderStage
        packet={ATMOSPHERE_PACKET}
        reducedMotion={prefersReducedMotion}
        paused={paused}
        style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}
        getRuntimeInput={(elapsedMs) => ({
          elapsedMs,
          resonance: Math.max(0, Math.min(1, signalLevel)),
          vowelDensity: getBytecodeAMP(elapsedMs, AMP_CHANNELS.PULSE),
        })}
      />
    </div>
  );
};
