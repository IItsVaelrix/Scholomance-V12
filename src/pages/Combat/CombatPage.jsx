import React, { useState, useRef, useEffect } from 'react';
import ArenaCombatView from './ArenaCombatView.jsx';
import { calculateCombatScore } from '../../../codex/core/combat.scoring.js';
import { Sparkles, Zap, Trash2 } from 'lucide-react';
import '../DivWand/DivWandPage.css'; // Reuse the sleek DivWand CSS

export default function CombatPage() {
  const [verse, setVerse] = useState('');
  const [weave, setWeave] = useState('');
  const [terminalLogs, setTerminalLogs] = useState([]);
  const terminalRef = useRef(null);
  
  const [tooltip, setTooltip] = useState(null);
  const [combatStats, setCombatStats] = useState(null);

  useEffect(() => {
    const onStats = (e) => {
      if (e && e.detail) setCombatStats(e.detail);
    };
    window.addEventListener('combat-stats-changed', onStats);
    return () => window.removeEventListener('combat-stats-changed', onStats);
  }, []);

  // Feed the current incantation (verse + weave) to the Phaser scene so a swing
  // can be enchanted. Respond to the scene's request, and push on every change.
  useEffect(() => {
    const emit = () => window.dispatchEvent(new CustomEvent('incantation-state', { detail: { verse, weave } }));
    const onRequest = () => emit();
    window.addEventListener('request-incantation-state', onRequest);
    emit(); // push current value now (covers scene mounting before/after this effect)
    return () => window.removeEventListener('request-incantation-state', onRequest);
  }, [verse, weave]);

  useEffect(() => {
    const handleGlobalClick = (e) => {
      // Close tooltip on left click (e.button === 0)
      if (e.button === 0) {
        setTooltip(null);
      }
    };
    window.addEventListener('mousedown', handleGlobalClick);
    return () => window.removeEventListener('mousedown', handleGlobalClick);
  }, []);

  // Dragging state
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const handlePointerDown = (e) => {
    // Only drag if clicking on the header background, not buttons
    if (e.target.tagName.toLowerCase() === 'button' || e.target.closest('button')) return;
    
    isDragging.current = true;
    dragStart.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    e.target.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isDragging.current) return;
    setPos({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y
    });
  };

  const handlePointerUp = (e) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    e.target.releasePointerCapture(e.pointerId);
  };

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalLogs]);

  const handleCast = () => {
    try {
      const result = calculateCombatScore({ text: verse, weave });
      const ts = new Date().toISOString().split('T')[1].slice(0, 8);
      
      // Emit to Phaser Arena
      window.dispatchEvent(new CustomEvent('combat-cast', { 
        detail: { ...result, text: verse, weave } 
      }));
      
      const newLogs = [];
      newLogs.push({ type: 'info', text: `[CAST] Verse: "${verse}" | Weave: "${weave}"`, ts });
      
      if (result.failureCast) {
        newLogs.push({ type: 'error', text: `SYNTACTIC COLLAPSE! The weave has frayed.`, ts });
      } else {
        // Intercept Enchantment request
        const weaveStr = (weave || '').toLowerCase();
        const textStr = (verse || '').toLowerCase();
        if (weaveStr.includes('enchant') && weaveStr.includes('flame') && textStr.includes('incinerator blade')) {
           result.damage = (result.damage || 0) + 200;
           result.commentary = (result.commentary || '') + " [🔥 Incinerator Blade Active: Burn Damage applied!]";
        }

        const intentStr = result.intent.bridgeIntent || result.intent.speechAct || 'UNKNOWN';
        newLogs.push({ type: 'success', text: `Intent: ${intentStr} | Damage: ${result.damage} | School: ${result.school}`, ts });
        if (result.commentary) {
          newLogs.push({ type: 'info', text: `Analysis: ${result.commentary}`, ts });
        }
      }
      
      setTerminalLogs(prev => [...prev, ...newLogs]);
    } catch (e) {
      setTerminalLogs(prev => [...prev, { type: 'error', text: `Engine Error: ${e.message}`, ts: new Date().toISOString().split('T')[1].slice(0, 8) }]);
    }
  };

  const handleArenaCast = (action) => {
    console.log('[Combat] Action from arena:', action);
    const ts = new Date().toISOString().split('T')[1].slice(0, 8);
    
    if (action.type === 'error') {
      setTerminalLogs(prev => [...prev, { type: 'error', text: `Phaser Input Crash: ${action.text}`, ts }]);
      return;
    }
    
    let text = `Inspected Tile (${action.tx}, ${action.ty})`;
    let title = 'Combat Grid';
    let details = [];
    
    if (action.isIsland) {
      text = `Inspected Void Terrain [Elevation: ${action.height}] at (${action.tx}, ${action.ty})`;
      title = 'Void Terrain';
      details.push(`Elevation: ${action.height}`);
      details.push(`Coordinate: (${action.tx}, ${action.ty})`);
    } else if (action.isGrid) {
      if (action.isObelisk) {
        text += ' — [CENTRAL OBELISK]';
        title = 'Central Obelisk';
        details.push('Immovable Structure');
      } else if (action.leyline) {
        text += ` — [LEYLINE NODE: ${action.leyline.affinity}]`;
        title = 'Leyline Node';
        details.push(`Affinity: ${action.leyline.affinity}`);
        details.push(`Node ID: ${action.leyline.id}`);
      } else {
        text += ' — [EMPTY COMBAT GRID]';
        title = 'Empty Tile';
        details.push('Ready for deployment.');
      }
    }
    
    setTerminalLogs(prev => [...prev, { type: 'info', text, ts }]);
    
    if (action.screenX && action.screenY) {
      setTooltip({
        x: action.screenX,
        y: action.screenY,
        title,
        details
      });
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden' }}>
      {/* 3D Battlefield Background */}
      <ArenaCombatView onCast={handleArenaCast} />
      
      {/* Tooltip Overlay */}
      {tooltip && (
        <div style={{
          position: 'absolute',
          left: tooltip.x + 15,
          top: tooltip.y + 15,
          background: 'rgba(5, 8, 15, 0.95)',
          border: '1px solid rgba(100, 200, 255, 0.4)',
          borderRadius: 8,
          padding: 12,
          color: '#fff',
          boxShadow: '0 4px 20px rgba(0,0,0,0.8), inset 0 0 10px rgba(0, 255, 255, 0.1)',
          pointerEvents: 'none',
          zIndex: 1000,
          minWidth: 180,
          backdropFilter: 'blur(8px)',
          fontFamily: 'var(--dw-font-sans, sans-serif)'
        }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, color: '#00ffff', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 4 }}>
            {tooltip.title}
          </h4>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: 12, color: '#aaa', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {tooltip.details.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Combat Stat Tree — Slice 1 readout */}
      {combatStats && (
        <div style={{
          position: 'absolute',
          top: 24,
          left: 24,
          zIndex: 200,
          background: 'linear-gradient(135deg, rgba(9,15,30,0.85), rgba(5,8,15,0.95))',
          border: '1px solid rgba(0,255,255,0.25)',
          borderRadius: 12,
          padding: '12px 16px',
          color: '#e6faff',
          fontFamily: 'var(--dw-font-mono, monospace)',
          fontSize: 13,
          backdropFilter: 'blur(12px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6), inset 0 0 16px rgba(0,255,255,0.08)',
          minWidth: 190,
        }}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 8, letterSpacing: 0.5 }}>
            <span>MP <b style={{ color: '#00ffff' }}>{combatStats.movementPointsRemaining}</b>/{combatStats.movementPoints}</span>
            <span>ATK <b style={{ color: '#ffcc66' }}>{combatStats.attackPoints}</b></span>
            <span>RNG <b style={{ color: '#aaffcc' }}>{combatStats.attackRange}</b></span>
          </div>
          {combatStats.dummyHp != null && (
            <div style={{ marginBottom: 8, opacity: 0.85 }}>
              Dummy HP <b style={{ color: '#ff88aa' }}>{combatStats.dummyHp}</b>/{combatStats.dummyMaxHp}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('combat-attack'))}
              disabled={combatStats.attackUsed}
              style={{
                flex: 1, padding: '6px 10px', borderRadius: 6, cursor: combatStats.attackUsed ? 'not-allowed' : 'pointer',
                border: '1px solid rgba(255,204,102,0.4)', background: combatStats.attackUsed ? 'rgba(60,60,60,0.4)' : 'rgba(255,204,102,0.15)',
                color: combatStats.attackUsed ? '#888' : '#ffcc66', fontFamily: 'inherit', fontSize: 12,
              }}
            >
              Attack (F)
            </button>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('combat-endturn'))}
              style={{
                flex: 1, padding: '6px 10px', borderRadius: 6, cursor: 'pointer',
                border: '1px solid rgba(0,255,255,0.4)', background: 'rgba(0,255,255,0.12)',
                color: '#00ffff', fontFamily: 'inherit', fontSize: 12,
              }}
            >
              End Turn (Space)
            </button>
          </div>
        </div>
      )}

      {/* DivWand HUD Overlay */}
      <div className="dw-container" style={{
        position: 'absolute',
        bottom: 32,
        left: '50%',
        transform: `translate(calc(-50% + ${pos.x}px), ${pos.y}px)`,
        width: 800,
        height: 350,
        minWidth: 400,
        minHeight: 200,
        background: 'linear-gradient(135deg, rgba(9, 15, 30, 0.85) 0%, rgba(5, 8, 15, 0.95) 100%)',
        backdropFilter: 'blur(24px) saturate(150%)',
        WebkitBackdropFilter: 'blur(24px) saturate(150%)',
        border: '1px solid rgba(0, 255, 255, 0.2)',
        borderRadius: 16,
        boxShadow: '0 24px 64px rgba(0,0,0,0.8), inset 0 0 32px rgba(0, 255, 255, 0.1), 0 0 12px rgba(0, 255, 255, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        resize: 'both',
        overflow: 'hidden',
        zIndex: 100
      }}>
        <header 
          className="dw-header" 
          style={{ background: 'rgba(5, 8, 15, 0.6)', cursor: 'grab', userSelect: 'none' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <div className="dw-header-title">
            <Sparkles className="dw-header-icon" size={16} aria-hidden="true" />
            <h1 className="dw-header-h1">DivWand HUD</h1>
            <span className="dw-header-sub">Spellweave Syntactic Bridge</span>
          </div>
          <div className="dw-header-actions">
            <button
              className="dw-btn dw-btn--primary"
              onClick={handleCast}
              disabled={!verse.trim()}
              title="Invoke Spellweave"
            >
              <Zap size={13} aria-hidden="true" />
              Invoke
            </button>
          </div>
        </header>

        <div className="dw-body" style={{ flexDirection: 'row', background: 'transparent' }}>
          {/* Input Pane */}
          <div className="dw-pane dw-pane--editor" style={{ flex: 1.2, background: 'transparent' }}>
            <div className="dw-pane-bar" style={{ background: 'transparent' }}>
              <span className="dw-pane-label">Verse (Incantation)</span>
            </div>
            <div className="dw-textarea-wrap" style={{ height: 80, minHeight: 80, background: 'rgba(0,0,0,0.4)', borderRadius: 6, margin: '0 12px' }}>
              <textarea
                className="dw-textarea"
                value={verse}
                onChange={e => setVerse(e.target.value)}
                placeholder="Speak your verse to shape the aether..."
                style={{ fontSize: 14, background: 'transparent' }}
              />
            </div>
            <div className="dw-pane-bar" style={{ background: 'transparent', marginTop: 4 }}>
              <span className="dw-pane-label">Weave (Predicate Object)</span>
            </div>
            <div className="dw-textarea-wrap" style={{ height: 40, minHeight: 40, background: 'rgba(0,0,0,0.4)', borderRadius: 6, margin: '0 12px 12px 12px', display: 'flex', alignItems: 'center' }}>
              <input
                value={weave}
                onChange={e => setWeave(e.target.value)}
                placeholder="e.g. STRIKE VOID"
                style={{ fontSize: 14, background: 'transparent', border: 'none', color: '#fff', outline: 'none', width: '100%', padding: '8px 12px', fontFamily: 'var(--dw-font-mono)' }}
              />
            </div>
          </div>

          {/* Terminal / Output Pane */}
          <div className="dw-pane dw-pane--terminal" style={{ flex: 0.8, borderLeft: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)' }}>
            <div className="dw-terminal" style={{ height: '100%', background: 'transparent' }}>
              <div className="dw-terminal-header" style={{ background: 'transparent' }}>
                <span className="dw-terminal-label">Syntactic Feedback</span>
                <button className="dw-tool-btn" onClick={() => setTerminalLogs([])}>
                  <Trash2 size={12} /> Clear
                </button>
              </div>
              <div className="dw-terminal-content" ref={terminalRef} style={{ padding: '0 12px 12px 12px', flex: 1, overflowY: 'auto', position: 'relative' }}>
                {/* CRT Scanline Overlay */}
                <div style={{
                  position: 'absolute',
                  top: 0, left: 0, right: 0, bottom: 0,
                  background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))',
                  backgroundSize: '100% 4px, 6px 100%',
                  pointerEvents: 'none',
                  zIndex: 10
                }} />
                
                <div style={{ position: 'relative', zIndex: 11, textShadow: '0 0 4px rgba(0,255,255,0.4)' }}>
                  {terminalLogs.length === 0 && <span className="dw-terminal-line dw-terminal-line--info" style={{ opacity: 0.5 }}>Awaiting invocation...</span>}
                  {terminalLogs.map((log, i) => (
                    <div key={i} className={`dw-terminal-line dw-terminal-line--${log.type}`}>
                      <span className="dw-terminal-ts" style={{ color: '#0ff' }}>[{log.ts}]</span> <span style={{ color: log.type === 'error' ? '#ff3366' : '#fff' }}>{log.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
