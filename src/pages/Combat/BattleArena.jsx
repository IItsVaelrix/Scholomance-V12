import { forwardRef } from 'react';

/**
 * BattleArena.jsx
 *
 * Phase 5: Phaser is gone!
 * Visuals are entirely routed to the native Godot Client.
 */
const BattleArena = forwardRef(function BattleArena(
  { arenaSchool, tileViewModels, renderedUnits, cursorTile, onSelectCell, onReady },
  ref
) {
  // We can call onReady immediately since there's no asset loading here anymore
  if (onReady) {
    // defer slightly to avoid set-state-during-render
    setTimeout(onReady, 0);
  }

  return (
    <div className="arena-grid-container" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      backgroundColor: 'rgba(0,0,0,0.5)',
      color: 'var(--combat-accent)',
      fontFamily: 'monospace',
      textAlign: 'center',
      border: '1px solid var(--combat-accent)'
    }}>
      <div>
        <h3>NEURAL LINK ACTIVE</h3>
        <p>Visual output routed to external Godot process.</p>
        <p style={{ opacity: 0.5, fontSize: '0.8rem', marginTop: '1rem' }}>Run `npm run godot:combat`</p>
      </div>
    </div>
  );
});

export default BattleArena;
