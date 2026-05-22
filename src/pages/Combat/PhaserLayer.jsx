import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { ResonanceScene } from './scenes/ResonanceScene.js';

/**
 * PhaserLayer.jsx
 *
 * Thin React → Phaser bridge.
 * Owns the Phaser game instance lifecycle, resize handling,
 * and one-way data sync from React state into the ResonanceScene public API.
 *
 * Props:
 *   arenaSchool    — school string for seam color
 *   tileViewModels — BoardTileViewModel[25]
 *   renderedUnits  — RenderedUnit[]
 *   cursorTile     — { x, y } | null
 *   onSelectCell   — (coord: {x, y}) => void  (mouse click on tile)
 */
const PhaserLayer = forwardRef(function PhaserLayer(
  { arenaSchool, tileViewModels, renderedUnits, cursorTile, onSelectCell, onReady },
  ref
) {
  const hostRef  = useRef(null);
  const gameRef  = useRef(null);
  const sceneRef = useRef(null);
  const [isReady, setIsReady] = useState(false);

  // Keep latest prop values accessible inside the init closure without re-running it.
  const tileVMRef     = useRef(tileViewModels);
  const unitsRef      = useRef(renderedUnits);
  const schoolRef     = useRef(arenaSchool);
  const cursorRef     = useRef(cursorTile);
  const selectCellRef = useRef(onSelectCell);
  const onReadyRef    = useRef(onReady);

  useEffect(() => { tileVMRef.current     = tileViewModels; }, [tileViewModels]);
  useEffect(() => { unitsRef.current      = renderedUnits;  }, [renderedUnits]);
  useEffect(() => { schoolRef.current     = arenaSchool;    }, [arenaSchool]);
  useEffect(() => { cursorRef.current     = cursorTile;     }, [cursorTile]);
  useEffect(() => { selectCellRef.current = onSelectCell;   }, [onSelectCell]);
  useEffect(() => { onReadyRef.current    = onReady;        }, [onReady]);

  // Expose methods upward to BattleArena → CombatPage.
  // CRITICAL: every method must call onComplete() even when sceneRef is not yet ready.
  // If optional-chain short-circuits and onComplete is never called, isPlaying gets
  // stuck true and the OracleScribe textarea is permanently disabled.
  useImperativeHandle(ref, () => ({
    playCastEffect(origin, target, school) {
      sceneRef.current?.playCastEffect(origin, target, school);
    },
    animateMove(unitId, path, descriptor, onComplete) {
      if (sceneRef.current) {
        sceneRef.current.animateMove(unitId, path, descriptor, onComplete);
      } else {
        onComplete?.();
      }
    },
    animateCast(unitId, target, school, descriptor, onComplete) {
      if (sceneRef.current) {
        sceneRef.current.animateCast(unitId, target, school, descriptor, onComplete);
      } else {
        onComplete?.();
      }
    },
    animateHit(affectedTiles, school, descriptor, onComplete) {
      if (sceneRef.current) {
        sceneRef.current.animateHit(affectedTiles, school, descriptor, onComplete);
      } else {
        onComplete?.();
      }
    },
    animateTurnShift(activeSide, descriptor, onComplete) {
      if (sceneRef.current) {
        sceneRef.current.animateTurnShift(activeSide, descriptor, onComplete);
      } else {
        onComplete?.();
      }
    }
  }));

  // --- Phaser init (runs once on mount) ---
  useEffect(() => {
    let mounted = true;
    let game    = null;

    const init = async () => {
      try {
        const { default: Phaser } = await import('phaser');
        if (!mounted || !hostRef.current) return;

        const w = hostRef.current.clientWidth  || 500;
        const h = hostRef.current.clientHeight || 500;

        game = new Phaser.Game({
          type:        Phaser.AUTO,
          parent:      hostRef.current,
          width:       w,
          height:      h,
          transparent: true,
          pixelArt:    false,
          scene:       [ResonanceScene],
          // Prevent Phaser from capturing keyboard events — React owns WASD/input.
          input: { keyboard: false },
        });

        gameRef.current = game;

        // Poll until the scene's create() has completed (sys.isActive becomes true).
        let attempts = 0;
        const poll = setInterval(() => {
          if (!mounted) { clearInterval(poll); return; }
          if (++attempts > 100) { clearInterval(poll); return; } // 10s timeout

          const scene = game.scene.getScene('ResonanceScene');
          if (scene && scene.sys.isActive()) {
            sceneRef.current = scene;

            // Wire the select-cell callback
            scene.onSelectCell = selectCellRef.current;

            // Sync current prop state into the now-ready scene
            if (schoolRef.current)            scene.setArenaSchool(schoolRef.current);
            if (tileVMRef.current?.length)    scene.updateTileStates(tileVMRef.current);
            if (unitsRef.current?.length)     scene.renderUnits(unitsRef.current);
            if (cursorRef.current)            scene.setCursor(cursorRef.current);

            setIsReady(true);
            onReadyRef.current?.();
            clearInterval(poll);
          }
        }, 100);
      } catch (err) {
        console.error('[PhaserLayer] Init failed:', err);
      }
    };

    init();

    return () => {
      mounted = false;
      game?.destroy(true);
      gameRef.current  = null;
      sceneRef.current = null;
    };
  }, []); // --- Prop sync effects ---

  useEffect(() => {
    sceneRef.current?.setArenaSchool(arenaSchool);
  }, [arenaSchool]);

  useEffect(() => {
    sceneRef.current?.updateTileStates(tileViewModels);
  }, [tileViewModels]);

  useEffect(() => {
    sceneRef.current?.renderUnits(renderedUnits);
  }, [renderedUnits]);

  useEffect(() => {
    sceneRef.current?.setCursor(cursorTile);
  }, [cursorTile]);

  // Keep onSelectCell callback current without re-initing Phaser.
  useEffect(() => {
    if (sceneRef.current) sceneRef.current.onSelectCell = onSelectCell;
  }, [onSelectCell]);

  // --- Resize handling ---
  useEffect(() => {
    const handleResize = () => {
      if (!gameRef.current || !hostRef.current) return;
      gameRef.current.scale.resize(
        hostRef.current.clientWidth,
        hostRef.current.clientHeight
      );
      sceneRef.current?.recenter();
    };

    window.addEventListener('resize', handleResize);
    const ro = new ResizeObserver(handleResize);
    if (hostRef.current) ro.observe(hostRef.current);

    return () => {
      window.removeEventListener('resize', handleResize);
      ro.disconnect();
    };
  }, []);

  return (
    <div className="phaser-layer-container" style={{ width: '100%', height: '100%' }}>
      <div
        ref={hostRef}
        className="phaser-host"
        style={{ width: '100%', height: '100%' }}
        aria-label="5×5 tactical combat board"
        role="grid"
      />
      {!isReady && (
        <div className="phaser-loading" aria-live="polite">
          CALIBRATING LATTICE...
        </div>
      )}
    </div>
  );
});

export default PhaserLayer;
