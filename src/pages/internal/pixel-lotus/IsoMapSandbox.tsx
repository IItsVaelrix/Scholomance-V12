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
import {
  blockedTileAabbs,
  makeAabb,
  resolveSweptAabb,
} from '../../../game/iso/math/sweptAabb';
import type { IsoActorState, IsoScene, IsoTile } from '../../../game/iso/contracts/isoScene.schema';
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

const MINIMAP_TILE_COLORS: Record<IsoTile['terrain'], string> = {
  stone: '#6b6478',
  grass: '#2f7d4a',
  water: '#236ea5',
  void: '#090713',
  metal: '#9ca3af',
  crystal: '#67e8f9',
  fabric: '#8b5e46',
  energy: '#facc15',
};

function seededTextureOpacity(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return 0.12 + ((hash >>> 0) % 100) / 1000;
}

function IsoMinimap({ scene, player }: { scene: IsoScene; player: IsoActorState | null }) {
  const size = 156;
  const padding = 10;
  const tileSize = (size - padding * 2) / Math.max(scene.map.cols, scene.map.rows);
  const actorX = player ? padding + (player.gridPosition.col + 0.5) * tileSize : 0;
  const actorY = player ? padding + (player.gridPosition.row + 0.5) * tileSize : 0;

  return (
    <aside className="iso-minimap" aria-label="Minimap">
      <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Tile minimap with player position">
        <defs>
          <pattern id="iso-minimap-grain" width="6" height="6" patternUnits="userSpaceOnUse">
            <path d="M0 5 L6 1" stroke="rgba(255,255,255,0.18)" strokeWidth="0.7" />
          </pattern>
          <pattern id="iso-minimap-water" width="8" height="8" patternUnits="userSpaceOnUse">
            <path d="M0 4 C2 2 4 6 8 4" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="0.8" />
          </pattern>
        </defs>
        <rect width={size} height={size} rx="6" className="iso-minimap__backdrop" />
        {scene.map.tiles.map(tile => {
          const x = padding + tile.col * tileSize;
          const y = padding + tile.row * tileSize;
          const opacity = seededTextureOpacity(tile.textureSeed);
          return (
            <g key={tile.id}>
              <rect
                x={x}
                y={y}
                width={tileSize}
                height={tileSize}
                fill={MINIMAP_TILE_COLORS[tile.terrain] ?? '#444'}
                opacity={tile.walkable ? 0.95 : 0.58}
              />
              <rect
                x={x}
                y={y}
                width={tileSize}
                height={tileSize}
                fill={tile.terrain === 'water' ? 'url(#iso-minimap-water)' : 'url(#iso-minimap-grain)'}
                opacity={opacity}
              />
              {!tile.walkable && (
                <path
                  d={`M${x + 2},${y + 2} L${x + tileSize - 2},${y + tileSize - 2}`}
                  stroke="rgba(2,3,10,0.72)"
                  strokeWidth="1"
                />
              )}
            </g>
          );
        })}
        {scene.props.filter(prop => prop.blocksMovement).map(prop => (
          <rect
            key={prop.id}
            x={padding + prop.col * tileSize + tileSize * 0.18}
            y={padding + prop.row * tileSize + tileSize * 0.18}
            width={tileSize * 0.64}
            height={tileSize * 0.64}
            fill="#f6b863"
            stroke="#20122e"
            strokeWidth="1"
          />
        ))}
        {player && (
          <g>
            <circle cx={actorX} cy={actorY} r="5.5" fill="#60a5fa" stroke="#f8fbff" strokeWidth="1.5" />
            <circle cx={actorX} cy={actorY} r="9" fill="none" stroke="rgba(96,165,250,0.42)" strokeWidth="2" />
          </g>
        )}
      </svg>
    </aside>
  );
}

export default function IsoMapSandbox() {
  const [scene, setScene] = useState<IsoScene>(createDefaultScene());
  const [showDebug, setShowDebug] = useState(false);
  const animationRef = useRef<number>();
  const targetRef = useRef<{ col: number; row: number } | null>(null);
  const keysRef = useRef(new Set<string>());

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

  // WASD walking input. Keyboard movement cancels click-to-move while held.
  useEffect(() => {
    const movementKeys = new Set(['w', 'a', 's', 'd']);
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (!movementKeys.has(key)) return;
      event.preventDefault();
      keysRef.current.add(key);
      targetRef.current = null;
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (!movementKeys.has(key)) return;
      event.preventDefault();
      keysRef.current.delete(key);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

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
    let lastTime = performance.now();
    const update = () => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      setScene(prev => {
        const player = prev.actors[0];
        if (!player) return prev;

        const keys = keysRef.current;
        const inputX = (keys.has('d') ? 1 : 0) - (keys.has('a') ? 1 : 0);
        const inputY = (keys.has('s') ? 1 : 0) - (keys.has('w') ? 1 : 0);
        const hasKeyboardInput = inputX !== 0 || inputY !== 0;
        const speed = 3.25;
        let velocity = player.velocity;

        if (hasKeyboardInput) {
          const len = Math.hypot(inputX, inputY) || 1;
          velocity = { x: (inputX / len) * speed, y: (inputY / len) * speed };
        } else if (!targetRef.current) {
          if (Math.abs(player.velocity.x) < 0.01 && Math.abs(player.velocity.y) < 0.01) return prev;
          velocity = { x: 0, y: 0 };
        }

        const delta = { x: velocity.x * dt, y: velocity.y * dt };
        if (Math.abs(delta.x) < 0.0001 && Math.abs(delta.y) < 0.0001) {
          return {
            ...prev,
            actors: prev.actors.map(a => (
              a.id === player.id ? { ...a, velocity, animation: 'idle' } : a
            )),
          };
        }

        const obstacles = blockedTileAabbs(prev.map.tiles, prev.props);

        return {
          ...prev,
          actors: prev.actors.map(a => {
            if (a.id !== player.id) return a;

            const actorBox = makeAabb(
              { x: a.gridPosition.col, y: a.gridPosition.row },
              { x: Math.max(0.1, a.radius * 0.55), y: Math.max(0.1, a.radius * 0.55) }
            );
            const resolved = resolveSweptAabb(actorBox, delta, obstacles);
            const newCol = resolved.position.x;
            const newRow = resolved.position.y;
            const moved = Math.abs(resolved.delta.x) > 0.0001 || Math.abs(resolved.delta.y) > 0.0001;
            const nextVelocity = moved ? velocity : { x: 0, y: 0 };
            
            return {
              ...a,
              facing: hasKeyboardInput ? velocityToFacing(velocity.x, velocity.y) : a.facing,
              animation: moved || hasKeyboardInput ? 'walk' : 'idle',
              gridPosition: {
                ...a.gridPosition,
                col: newCol,
                row: newRow,
              },
              velocity: nextVelocity,
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
        <IsoMinimap scene={scene} player={scene.actors[0] ?? null} />
        <IsoDebugOverlay 
          scene={scene} 
          visible={showDebug} 
          onClose={() => setShowDebug(false)} 
        />
      </div>
    </div>
  );
}
