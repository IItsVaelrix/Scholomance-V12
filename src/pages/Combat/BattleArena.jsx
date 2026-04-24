import React, { useImperativeHandle, forwardRef, useRef } from 'react';
import PhaserLayer from './PhaserLayer.jsx';

/**
 * BattleArena.jsx
 *
 * Thin container for the Phaser board layer.
 * Passes board state down and exposes playCastEffect upward.
 *
 * Phase 1: renders only the PhaserLayer.
 * Entity displays live in the right panel and bottom console — not here.
 */
const BattleArena = forwardRef(function BattleArena(
  { arenaSchool, tileViewModels, renderedUnits, cursorTile, onSelectCell, onReady },
  ref
) {
  const phaserRef = useRef(null);

  useImperativeHandle(ref, () => ({
    playCastEffect(origin, target, school) {
      phaserRef.current?.playCastEffect(origin, target, school);
    },
    animateMove(unitId, path, descriptor, onComplete) {
      if (phaserRef.current) {
        phaserRef.current.animateMove(unitId, path, descriptor, onComplete);
      } else {
        onComplete?.();
      }
    },
    animateCast(unitId, target, school, descriptor, onComplete) {
      if (phaserRef.current) {
        phaserRef.current.animateCast(unitId, target, school, descriptor, onComplete);
      } else {
        onComplete?.();
      }
    },
    animateHit(affectedTiles, school, descriptor, onComplete) {
      if (phaserRef.current) {
        phaserRef.current.animateHit(affectedTiles, school, descriptor, onComplete);
      } else {
        onComplete?.();
      }
    },
    animateTurnShift(activeSide, descriptor, onComplete) {
      if (phaserRef.current) {
        phaserRef.current.animateTurnShift(activeSide, descriptor, onComplete);
      } else {
        onComplete?.();
      }
    }
  }));

  return (
    <div className="arena-grid-container">
      <PhaserLayer
        ref={phaserRef}
        arenaSchool={arenaSchool}
        tileViewModels={tileViewModels}
        renderedUnits={renderedUnits}
        cursorTile={cursorTile}
        onSelectCell={onSelectCell}
        onReady={onReady}
      />
    </div>
  );
});

export default BattleArena;
