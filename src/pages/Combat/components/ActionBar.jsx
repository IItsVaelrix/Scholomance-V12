import React from 'react';

/**
 * ActionBar.jsx
 *
 * Tactical command surface. Replaces the plain text action-menu list.
 * Each action has a world-law glyph, label, and hotkey badge.
 *
 * Glyph semantics (ritual tactics apparatus — not generic icons):
 *   INSCRIBE ✦  — four-pointed star: active inscription, light-carving
 *   MOVE     ◈  — diamond with dot: lattice navigation, positional intent
 *   CHANNEL  ◉  — bullseye: energy focus, restoration circuit
 *   WAIT     ◌  — open circle: held breath, temporal patience
 *   FLEE     ↗  — diagonal arrow: escape vector
 */

const ACTION_DEFS = [
  { id: 'INSCRIBE', glyph: '✦', label: 'INSCRIBE', hotkey: '1', title: 'Compose and cast a verse' },
  { id: 'MOVE',     glyph: '◈', label: 'MOVE',     hotkey: '2', title: 'Move on the tactical grid' },
  { id: 'CHANNEL',  glyph: '◉', label: 'CHANNEL',  hotkey: '3', title: 'Channel energy to restore MP' },
  { id: 'WAIT',     glyph: '◌', label: 'WAIT',     hotkey: '4', title: 'End turn without acting' },
  { id: 'FLEE',     glyph: '↗', label: 'FLEE',     hotkey: '5', title: 'Escape the encounter' },
];

export default function ActionBar({ selectedAction, onActionSelect, isDisabled }) {
  return (
    <div className="action-bar" role="toolbar" aria-label="Combat actions">
      {ACTION_DEFS.map(({ id, glyph, label, hotkey, title }) => (
        <button
          key={id}
          className={`action-bar-btn${selectedAction === id ? ' is-active' : ''}`}
          onClick={() => onActionSelect(id)}
          disabled={isDisabled}
          title={title}
          aria-label={`${label} — hotkey ${hotkey}`}
          aria-pressed={selectedAction === id}
          type="button"
        >
          <span className="action-btn-hotkey" aria-hidden="true">[{hotkey}]</span>
          <span className="action-btn-glyph" aria-hidden="true">{glyph}</span>
          <span className="action-btn-label">{label}</span>
        </button>
      ))}
    </div>
  );
}
