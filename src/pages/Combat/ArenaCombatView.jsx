import React, { useEffect, useRef } from 'react';
import { mountPhaserGame } from '../../lib/phaser/phaser-runtime.adapter';
import { getGameBrazierFireService } from '../../lib/audio/gameBrazierFire.service.js';
import { getGameFireballImpactService } from '../../lib/audio/gameFireballImpact.service.js';
import { getGameSwordSliceService } from '../../lib/audio/gameSwordSlice.service.js';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion.js';
import { bridgeArenaScene } from './arenaBridge.js';

// Import FACTORIES (not classes). They receive Phaser at runtime.
import createCombatArenaScene from '../../phaser/CombatArenaScene';

export default function ArenaCombatView({ onCast }) {
  const containerRef = useRef(null);
  const gameRef = useRef(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  
  // Store the latest callback to avoid re-mounting Phaser on every render/keystroke
  const onCastRef = useRef(onCast);
  useEffect(() => {
    onCastRef.current = onCast;
  }, [onCast]);

  useEffect(() => {
    const fire = getGameBrazierFireService();
    const sword = getGameSwordSliceService();
    const fireball = getGameFireballImpactService();
    if (!prefersReducedMotion) {
      fire.prime();
      fire.setEnabled(true);
      void fire.start();

      sword.prime();
      sword.setEnabled(true);

      fireball.prime();
      fireball.setEnabled(true);
    } else {
      fire.setEnabled(false);
      void fire.stop();
      sword.setEnabled(false);
      fireball.setEnabled(false);
    }

    return () => {
      void fire.stop();
    };
  }, [prefersReducedMotion]);

  useEffect(() => {
    // StrictMode double-invokes this effect (mount → cleanup → mount). The
    // cleanup fires while mountPhaserGame is still awaiting, so a plain
    // `destroyed` boolean can't tear down a game that hasn't resolved yet —
    // it leaks as an orphaned second canvas that swallows every right-click
    // while the React bridge listens to the other game. Pass the adapter its
    // abort signal (it's built to destroy the game if aborted mid-construction)
    // so exactly one game survives and it's the one we wire.
    const controller = new AbortController();

    async function start() {
      if (!containerRef.current) return;

      const result = await mountPhaserGame({
        parent: containerRef.current,
        // Correct: array of factories (Phaser) => SceneClass
        buildScenes: [createCombatArenaScene],
        signal: controller.signal,
        config: {
          type: 2,                    // Phaser.WEBGL (force GPU)
          width: '100%',
          height: '100%',
          transparent: false,
          scale: {
            mode: 3,                  // Phaser.Scale.RESIZE
            autoCenter: 1,
          },
          physics: { default: 'arcade' },
          banner: false,
          disableContextMenu: true,
          audio: { noAudio: true },
        },
      });

      if (controller.signal.aborted || !result) return;

      gameRef.current = result;

      // Bridge events from the arena scene. The scene isn't in the game's
      // registry until its `ready` event fires (Phaser boots config scenes
      // asynchronously), so bridgeArenaScene defers listener attachment until
      // getScene() can actually resolve. Wiring synchronously here would
      // attach nothing and silently break right-click tile inspection.
      bridgeArenaScene(result.game, 'CombatArenaScene', (action) => {
        if (onCastRef.current) {
          onCastRef.current(action);
        }
      });
    }

    start();

    return () => {
      controller.abort();
      if (gameRef.current?.destroy) {
        gameRef.current.destroy(true);
      }
      gameRef.current = null;
    };
  }, []); // <-- Empty dependency array ensures Phaser only mounts once!

  return (
    // Pure container for the Phaser arena. All visual UI elements removed.
    <div
      ref={containerRef}
      className="combat-arena-mount"
    />
  );
}
