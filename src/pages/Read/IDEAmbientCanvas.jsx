/**
 * IDEAmbientCanvas - React wrapper for IDEAmbientScene
 *
 * Defers Phaser initialization to browser idle time (requestIdleCallback,
 * 4 s timeout). This guarantees it never competes with first-interaction
 * paint and has zero INP impact during initial load.
 *
 * Props:
 *   schoolColor {string} - hex color for the active school (e.g. "#651fff")
 */
import { useEffect, useRef } from 'react';
import { mountPhaserGame } from '../../lib/phaser/phaser-runtime.adapter.js';
import { buildAmbientScene } from './scenes/IDEAmbientScene.js';

const useRIC = typeof requestIdleCallback !== 'undefined';

export default function IDEAmbientCanvas({ schoolColor = '#c8a84b' }) {
  const elRef    = useRef(null);
  const gameRef  = useRef(null);
  const colorRef = useRef(schoolColor);

  useEffect(() => { colorRef.current = schoolColor; }, [schoolColor]);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    const controller = new AbortController();
    let runtimeHandle = null;

    async function initPhaser() {
      if (controller.signal.aborted) return;
      try {
        const W = el.offsetWidth  || window.innerWidth;
        const H = el.offsetHeight || window.innerHeight;

        runtimeHandle = await mountPhaserGame({
          parent: el,
          buildScenes: [buildAmbientScene],
          config: {
            type: 2, // Phaser.WEBGL
            width: W,
            height: H,
            transparent: true,
            antialias: true,
            audio: { noAudio: true },
            scale: { mode: 3 }, // Phaser.Scale.RESIZE
            banner: false,
            render: {
              powerPreference: 'high-performance',
              batchSize: 4096,
            },
          },
          signal: controller.signal,
        });

        if (runtimeHandle) {
          if (runtimeHandle.game.canvas) runtimeHandle.game.canvas.style.pointerEvents = 'none';
          gameRef.current = runtimeHandle.game;
          
          runtimeHandle.game.events.once('ready', () => {
            if (controller.signal.aborted) return;
            const scene = runtimeHandle.game.scene.getScene('IDEAmbientScene');
            scene?.setSchoolColor?.(colorRef.current);
          });
        }
      } catch (e) {
        console.error("Ambient layer unavailable:", e);
      }
    }

    // Defer to idle time so first-interaction paint is never blocked.
    // Falls back to a 1.2 s setTimeout in browsers without RIC (Safari < 2023).
    const idleHandle = useRIC
      ? requestIdleCallback(initPhaser, { timeout: 4000 })
      : setTimeout(initPhaser, 1200);

    return () => {
      controller.abort();
      if (useRIC) cancelIdleCallback(idleHandle);
      else        clearTimeout(idleHandle);
      if (runtimeHandle) {
        runtimeHandle.destroy();
      }
      gameRef.current = null;
    };
  }, []);

  // Push school color updates into the live scene
  useEffect(() => {
    const scene = gameRef.current?.scene?.getScene('IDEAmbientScene');
    scene?.setSchoolColor?.(schoolColor);
  }, [schoolColor]);

  return (
    <div
      ref={elRef}
      className="ide-ambient-canvas"
      aria-hidden="true"
      style={{ pointerEvents: 'none' }}
    />
  );
}
