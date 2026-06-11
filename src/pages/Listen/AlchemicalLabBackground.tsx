import { useEffect, useRef, useState } from 'react';
// eslint-disable-next-line no-restricted-imports -- type-only import removed at compile time
import type Phaser from 'phaser';
import { cacheBackground } from '../../lib/cache/backgroundCache';
import { getAmbientPlayerService } from '../../lib/ambient/ambientPlayer.service.js';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion.js';
import { mountPhaserGame } from '../../lib/phaser/phaser-runtime.adapter.js';

// Shared game reference for SignalChamberConsole to attach to
let sharedPhaserGame: Phaser.Game | null = null;

export function getSharedPhaserGame(): Phaser.Game | null {
  return sharedPhaserGame;
}

/**
 * AlchemicalLabBackground — Creates a SINGLE Phaser game with multiple scenes:
 * - AlchemicalLabScene (zIndex: 0) — Background atmosphere with rotating hexagram
 * - SignalChamberScene (zIndex: 10) — Console UI (mounted by SignalChamberConsole)
 *
 * Performance: Cache + Hydrate pattern for instant LCP
 * - First visit: Shows CSS background, loads Phaser, caches rendered static layer
 * - Subsequent: Shows cached image instantly, hydrates with Phaser in background
 */
export const AlchemicalLabBackground: React.FC<{ signalLevel?: number }> = ({ signalLevel = 0 }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const phaserRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const bgSceneRef = useRef<any>(null);
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

        // Cache the static background for next visit (after a delay to not block render)
        setTimeout(() => {
          if (controller.signal.aborted) return;
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
    if (bgSceneRef.current) {
      const bpm = getAmbientPlayerService()?.getBPM?.() || 90;
      bgSceneRef.current.updateState({ signalLevel, bpm });
    }
  }, [signalLevel]);

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
      }}
    >
      {/* Phaser canvas container - must be FIRST so it has lower stacking context */}
      <div
        className="alchemical-lab-phaser"
        ref={phaserRef}
        style={{
          position: 'absolute',
          inset: 0,
          opacity: isLoaded ? 1 : 0,
          transition: 'opacity 0.3s ease',
          zIndex: 2,
          pointerEvents: 'auto',
        }}
      />

      {/*
        STATIC CSS BACKGROUND - Shows initially, then fades behind Phaser
        This is the LCP element - pure CSS, no JS required
      */}
      <div 
        className="alchemical-lab-static-bg" 
        aria-hidden="true"
        style={{
          opacity: isLoaded ? 0 : 1,
          transition: 'opacity 0.3s ease',
          zIndex: 1,
        }}
      >
        {/* Stone wall pattern */}
        <div className="alchemical-stone-wall" />

        {/* Central arch portal */}
        <div className="alchemical-arch-portal">
          <div className="arch-ring arch-ring--outer" />
          <div className="arch-ring arch-ring--mid" />
          <div className="arch-ring arch-ring--inner" />
          <div className="arch-pentagram">
            <svg viewBox="0 0 200 200" className="pentagram-svg">
              {/* Pentagram drawn with a single continuous stroke for sharp magical look */}
              <path d="M100 20 L147 165 L24 75 L176 75 L53 165 Z" className="pentagram-path" />
            </svg>
          </div>
        </div>

        {/* Vignette overlay */}
        <div className="alchemical-vignette" />
      </div>
    </div>
  );
};
