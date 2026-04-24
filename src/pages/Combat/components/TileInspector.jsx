import React from 'react';

/**
 * TileInspector.jsx
 *
 * Lightweight panel showing data about the currently cursor-focused tile.
 * Visibility gated by parent (hidden in pure inscribe mode when board is irrelevant).
 */
export default function TileInspector({ cellLabel, range, occupantEntity, scholarRange }) {
  const outOfRange = range != null && scholarRange != null && range > scholarRange;

  return (
    <div className="tile-inspector-panel" aria-label="Tile inspector">
      <div className="bottom-subpanel-title">TILE</div>
      <div className="tile-inspector">
        <div className="inspector-row">
          <span className="inspector-key">COORD</span>
          <span className="inspector-val">{cellLabel || '—'}</span>
        </div>
        <div className="inspector-row">
          <span className="inspector-key">OCCUPANT</span>
          <span className="inspector-val">{occupantEntity ? occupantEntity.name : 'EMPTY'}</span>
        </div>
        {occupantEntity && (
          <div className="inspector-row">
            <span className="inspector-key">AFFINITY</span>
            <span className="inspector-val">{occupantEntity.school}</span>
          </div>
        )}
        <div className="inspector-row">
          <span className="inspector-key">DIST</span>
          <span className={`inspector-val${outOfRange ? ' out-of-range' : ''}`}>
            {range ?? '—'}
          </span>
        </div>
      </div>
    </div>
  );
}
