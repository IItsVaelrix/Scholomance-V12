/**
 * IsoScene Debug Overlay
 * PDR: Pixel Lotus Actor Forge and Isometric Combat Runtime
 * 
 * Toggleable debug overlay showing cell coordinates, depth keys,
 * and actor/prop boundaries.
 */

import React from 'react';
import type { IsoScene } from '../contracts/isoScene.schema';
import { getIsoDepthSortKey } from '../math/isoProjection';
import './isoDebugOverlay.css';

interface IsoDebugOverlayProps {
  scene: IsoScene;
  visible: boolean;
  onClose?: () => void;
}

export function IsoDebugOverlay({ scene, visible, onClose }: IsoDebugOverlayProps) {
  if (!visible) return null;

  return (
    <div className="iso-debug-overlay" aria-label="Isometric debug overlay">
      <div className="iso-debug-header">
        <h3>Scene Debug</h3>
        <button
          type="button"
          className="iso-debug-close"
          onClick={onClose}
          aria-label="Close debug overlay"
        >
          ×
        </button>
      </div>
      
      <div className="iso-debug-content">
        <div className="iso-debug-section">
          <h4>Tiles ({scene.map.tiles.length})</h4>
          <div className="iso-debug-grid">
            {scene.map.tiles.slice(0, 36).map(tile => (
              <div key={tile.id} className="iso-debug-item">
                <span className="iso-debug-coord">({tile.col},{tile.row})</span>
                <span className="iso-debug-sort">depth: {getIsoDepthSortKey(tile)}</span>
                <span className="iso-debug-terrain">{tile.terrain}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="iso-debug-section">
          <h4>Actors ({scene.actors.length})</h4>
          {scene.actors.map(actor => (
            <div key={actor.id} className="iso-debug-item">
              <span className="iso-debug-coord">
                ({actor.gridPosition.col},{actor.gridPosition.row},{actor.gridPosition.z})
              </span>
              <span className="iso-debug-sort">facing: {actor.facing}</span>
              <span className="iso-debug-team">{actor.team}</span>
            </div>
          ))}
        </div>

        <div className="iso-debug-section">
          <h4>Props ({scene.props.length})</h4>
          {scene.props.map(prop => (
            <div key={prop.id} className="iso-debug-item">
              <span className="iso-debug-coord">
                ({prop.col},{prop.row}) h:{prop.height.toFixed(1)}
              </span>
              <span className="iso-debug-sort">blocks: {prop.blocksMovement ? 'yes' : 'no'}</span>
            </div>
          ))}
        </div>

        <div className="iso-debug-section">
          <h4>Projection</h4>
          <div className="iso-debug-item mono">
            tile: {scene.tileWidth}×{scene.tileHeight}
          </div>
          <div className="iso-debug-item mono">
            origin: ({scene.origin.x}, {scene.origin.y})
          </div>
        </div>
      </div>
    </div>
  );
}