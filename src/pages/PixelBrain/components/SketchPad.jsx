/**
 * SKETCH PAD - Blank-Canvas Silhouette Authoring
 *
 * A from-scratch paint surface. Brush cells to draw a silhouette, optionally
 * mirror across an axis, then COMMIT - the page runs the Sketch AMP
 * (distance-transform auto-shading) and hands the result to the template/fill
 * pipeline. Drag to paint, Shift-drag (or right-drag) to erase.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

const GRID_W = 32;
const GRID_H = 32;
const ZOOM = 7;
const PAINT_COLOR = '#C9A227';

export function SketchPad({ onCommit, disabled = false }) {
  const canvasRef = useRef(null);
  const occupiedRef = useRef(new Set());
  const paintingRef = useRef(false);
  const [symmetry, setSymmetry] = useState('vertical');
  const [count, setCount] = useState(0);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= GRID_W; x += 1) {
      ctx.beginPath();
      ctx.moveTo(x * ZOOM + 0.5, 0);
      ctx.lineTo(x * ZOOM + 0.5, GRID_H * ZOOM);
      ctx.stroke();
    }
    for (let y = 0; y <= GRID_H; y += 1) {
      ctx.beginPath();
      ctx.moveTo(0, y * ZOOM + 0.5);
      ctx.lineTo(GRID_W * ZOOM, y * ZOOM + 0.5);
      ctx.stroke();
    }

    // Symmetry axis hint
    ctx.strokeStyle = 'rgba(120,180,255,0.35)';
    ctx.lineWidth = 1;
    if (symmetry === 'vertical') {
      const ax = (GRID_W / 2) * ZOOM + 0.5;
      ctx.beginPath();
      ctx.moveTo(ax, 0);
      ctx.lineTo(ax, GRID_H * ZOOM);
      ctx.stroke();
    } else if (symmetry === 'horizontal') {
      const ay = (GRID_H / 2) * ZOOM + 0.5;
      ctx.beginPath();
      ctx.moveTo(0, ay);
      ctx.lineTo(GRID_W * ZOOM, ay);
      ctx.stroke();
    }

    // Painted cells (+ live mirror preview)
    ctx.fillStyle = PAINT_COLOR;
    occupiedRef.current.forEach((key) => {
      const [x, y] = key.split(',').map(Number);
      ctx.fillRect(x * ZOOM, y * ZOOM, ZOOM, ZOOM);
      if (symmetry === 'vertical') {
        ctx.fillRect((GRID_W - 1 - x) * ZOOM, y * ZOOM, ZOOM, ZOOM);
      } else if (symmetry === 'horizontal') {
        ctx.fillRect(x * ZOOM, (GRID_H - 1 - y) * ZOOM, ZOOM, ZOOM);
      }
    });
  }, [symmetry]);

  useEffect(() => { redraw(); }, [redraw]);

  const cellFromEvent = (event) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.floor((event.clientX - rect.left) / ZOOM),
      y: Math.floor((event.clientY - rect.top) / ZOOM),
    };
  };

  const paintAt = useCallback((event, erase) => {
    const { x, y } = cellFromEvent(event);
    if (x < 0 || x >= GRID_W || y < 0 || y >= GRID_H) return;
    const key = `${x},${y}`;
    if (erase) occupiedRef.current.delete(key);
    else occupiedRef.current.add(key);
    setCount(occupiedRef.current.size);
    redraw();
  }, [redraw]);

  const handleDown = useCallback((event) => {
    if (disabled) return;
    event.preventDefault();
    paintingRef.current = true;
    paintAt(event, event.shiftKey || event.button === 2);
  }, [disabled, paintAt]);

  const handleMove = useCallback((event) => {
    if (!paintingRef.current) return;
    paintAt(event, event.shiftKey || event.buttons === 2);
  }, [paintAt]);

  const handleUp = useCallback(() => { paintingRef.current = false; }, []);

  const handleClear = useCallback(() => {
    occupiedRef.current = new Set();
    setCount(0);
    redraw();
  }, [redraw]);

  const handleCommit = useCallback(() => {
    const occupied = [...occupiedRef.current].map((key) => {
      const [x, y] = key.split(',').map(Number);
      return { x, y };
    });
    onCommit({ occupied, dimensions: { width: GRID_W, height: GRID_H }, symmetry });
  }, [onCommit, symmetry]);

  return (
    <div className="sketch-pad grimoire-panel">
      <div className="section-header">
        <span className="header-icon">✎</span>
        <span>SKETCH AMP: SILHOUETTE</span>
        <span className="telemetry-text" style={{ marginLeft: 'auto', opacity: 0.7 }}>{count}px</span>
      </div>

      <div className="section-label telemetry-text" style={{ marginBottom: '4px' }}>
        Drag to paint · Shift-drag to erase
      </div>

      <canvas
        ref={canvasRef}
        width={GRID_W * ZOOM}
        height={GRID_H * ZOOM}
        onMouseDown={handleDown}
        onMouseMove={handleMove}
        onMouseUp={handleUp}
        onMouseLeave={handleUp}
        onContextMenu={(e) => e.preventDefault()}
        style={{
          display: 'block',
          width: '100%',
          imageRendering: 'pixelated',
          border: '1px solid #333',
          background: '#0a0a12',
          cursor: disabled ? 'not-allowed' : 'crosshair',
          touchAction: 'none',
        }}
      />

      <div className="section-label telemetry-text" style={{ margin: '8px 0 4px' }}>Mirror</div>
      <div style={{ display: 'flex', gap: '4px' }}>
        {['none', 'vertical', 'horizontal'].map((mode) => (
          <button
            key={mode}
            className={`style-btn ${symmetry === mode ? 'active' : ''}`}
            onClick={() => setSymmetry(mode)}
            type="button"
            style={{ flex: 1, fontSize: '11px' }}
          >
            {mode.toUpperCase()}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
        <button
          className="transmute-ignite-btn"
          onClick={handleClear}
          type="button"
          style={{ flex: 1 }}
        >
          CLEAR
        </button>
        <button
          className="transmute-ignite-btn"
          onClick={handleCommit}
          disabled={disabled || count === 0}
          type="button"
          style={{ flex: 2 }}
        >
          COMMIT_SKETCH → ASSET
        </button>
      </div>
    </div>
  );
}
