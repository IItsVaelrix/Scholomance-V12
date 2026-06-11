/**
 * IsoMap Sandbox - Internal Lab Page
 * PDR: Pixel Lotus Actor Forge and Isometric Combat Runtime
 * 
 * Playable vertical slice: isometric map with controllable actor.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { IsoMapCanvas } from '../../../game/iso/rendering/IsoMapCanvas';
import { IsoDebugOverlay } from '../../../game/iso/rendering/IsoDebugOverlay';
import { velocityToFacing } from '../../../game/iso/math/isoProjection';
import type { IsoScene, IsoFacing, PixelLotusAnimationName } from '../../../game/iso/contracts/isoScene.schema';
import './IsoMapSandbox.css';

// Default scene for sandbox testing
const createDefaultScene = (): IsoScene => ({
  schemaVersion: 'iso-scene-v1',
  id: 'sandbox-01',
  tileWidth: 64,
  tileHeight: 32,
  origin: { x: 400, y: 100 },
  map: {
    cols: 10,
    rows: 10,
    tiles: Array.from({ length: 100 }, (_, i) => {
      const col = i % 10;
      const row = Math.floor(i / 10);
      return {
        id: `tile-${col}-${row}`,
        col,
        row,
        height: 0,
        terrain: col === 0 || row === 0 || col === 9 || row === 9 
          ? 'stone' 
          : col === 5 && row === 5 
            ? 'water' 
            : 'grass',
        walkable: col !== 0 && row !== 0 && col !== 9 && row !== 9 && !(col === 5 && row === 5),
        blocksSight: false,
        movementCost: 1,
        elevation: 0,
        textureSeed: `${col},${row}`,
      };
    }),
  },
  actors: [
    {
      id: 'player-01',
      actorBuildId: 'native-wizard',
      spriteSheetId: 'placeholder',
      animationManifestId: 'default-8dir',
      animation: 'idle',
      facing: 'S',
      gridPosition: { col: 4, row: 4, z: 0 },
      worldPosition: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0 },
      radius: 0.5,
      team: 'player',
    },
  ],
  props: [
    {
      id: 'pillar-01',
      col: 2,
      row: 2,
      height: 1.5,
      width: 1,
      spriteId: 'pillar',
      blocksMovement: true,
      blocksSight: true,
    },
    {
      id: 'pillar-02',
      col: 7,
      row: 7,
      height: 1.5,
      width: 1,
      spriteId: 'pillar',
      blocksMovement: true,
      blocksSight: true,
    },
  ],
  spellFields: [],
});

export default function IsoMapSandbox() {
  const [scene, setScene] = useState<IsoScene>(createDefaultScene());
  const [showDebug, setShowDebug] = useState(false);
  const animationRef = useRef<number>();
  const targetRef = useRef<{ col: number; row: number } | null>(null);

  // Handle tile click - set target for movement
  const handleTileClick = useCallback((tile: { col: number; row: number; walkable: boolean }) => {
    if (!tile.walkable) return;
    
    const player = scene.actors[0];
    if (!player) return;
    
    // Check for blocking props
    const blockingProp = scene.props.find(
      p => p.blocksMovement && p.col === tile.col && p.row === tile.row
    );
    if (blockingProp) return;
    
    targetRef.current = { col: tile.col, row: tile.row };
  }, [scene]);

  // Movement system - integrate movement toward target
  useEffect(() => {
    const player = scene.actors[0];
    if (!player || !targetRef.current) return;

    const target = targetRef.current;
    const dx = target.col - player.gridPosition.col;
    const dy = target.row - player.gridPosition.row;
    
    // Check if we've arrived
    if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) {
      targetRef.current = null;
      setScene(prev => ({
        ...prev,
        actors: prev.actors.map(a => 
          a.id === player.id ? { ...a, velocity: { x: 0, y: 0 }, animation: 'idle' } : a
        ),
      }));
      return;
    }

    // Set velocity toward target
    setScene(prev => ({
      ...prev,
      actors: prev.actors.map(a => {
        if (a.id !== player.id) return a;
        const facing = velocityToFacing(dx, dy);
        return {
          ...a,
          facing,
          animation: 'walk',
          velocity: { x: dx * 2, y: dy * 2 }, // Speed factor
        };
      }),
    }));
  }, [scene]);

  // Animation loop for smooth movement
  useEffect(() => {
    const update = () => {
      setScene(prev => {
        const player = prev.actors[0];
        if (!player || !targetRef.current) return prev;

        const { x, y } = player.velocity;
        if (Math.abs(x) < 0.01 && Math.abs(y) < 0.01) return prev;

        return {
          ...prev,
          actors: prev.actors.map(a => {
            if (a.id !== player.id) return a;
            
            const newCol = a.gridPosition.col + x * 0.05;
            const newRow = a.gridPosition.row + y * 0.05;
            
            return {
              ...a,
              gridPosition: {
                ...a.gridPosition,
                col: newCol,
                row: newRow,
              },
              velocity: {
                x: Math.abs(x) > 0.01 ? x : 0,
                y: Math.abs(y) > 0.01 ? y : 0,
              },
            };
          }),
        };
      });
      
      animationRef.current = requestAnimationFrame(update);
    };
    
    animationRef.current = requestAnimationFrame(update);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return (
    <div className="iso-map-sandbox">
      <header className="sandbox-header">
        <h1>IsoMap Sandbox</h1>
        <p className="sandbox-subtitle">Pixel Lotus Actor Forge - Isometric Runtime Test</p>
        <button
          type="button"
          className="debug-toggle"
          onClick={() => setShowDebug(d => !d)}
          aria-pressed={showDebug}
        >
          {showDebug ? 'Hide' : 'Show'} Debug
        </button>
      </header>

      <div className="sandbox-content">
        <IsoMapCanvas scene={scene} onTileClick={handleTileClick} />
        <IsoDebugOverlay 
          scene={scene} 
          visible={showDebug} 
          onClose={() => setShowDebug(false)} 
        />
      </div>
    </div>
  );
}