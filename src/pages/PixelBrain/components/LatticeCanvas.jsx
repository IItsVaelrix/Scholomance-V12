/**
 * LATTICE CANVAS
 *
 * Drives the full lattice pipeline that the "LATTICE COMPILER" panel was named
 * for but never wired: image analysis → generateLatticeGrid (which runs the
 * Symmetry AMP + Coord-Symmetry AMP internally) → renderLattice (cells, grid,
 * symmetry overlay) → click-to-paint → export.
 *
 * All core access goes through the Cell Wall adapter - this component never
 * imports codex/ directly.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  generateLatticeGrid,
  renderLattice,
  resolveLatticeClick,
  paintCell,
  clearLatticeCell,
  exportLatticeToAseprite,
} from '../../../lib/pixelbrain.adapter.js';

const ZOOM = 2; // integer multiplier - keeps pixels crisp in the narrow panel

export function LatticeCanvas({ analysis, brushColor = '#C9A227' }) {
  const canvasRef = useRef(null);
  const latticeRef = useRef(null);
  const [meta, setMeta] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | building | ready | error
  const [error, setError] = useState(null);

  const draw = useCallback(() => {
    if (canvasRef.current && latticeRef.current) {
      renderLattice(canvasRef.current, latticeRef.current, ZOOM);
    }
  }, []);

  // Build the lattice whenever a fresh analysis (with pixel data) arrives.
  useEffect(() => {
    let cancelled = false;

    if (!analysis?.pixelData || !analysis?.dimensions) {
      latticeRef.current = null;
      setMeta(null);
      setStatus('idle');
      return undefined;
    }

    setStatus('building');
    setError(null);

    (async () => {
      try {
        const lattice = await generateLatticeGrid(analysis);
        if (cancelled) return;
        latticeRef.current = lattice;
        setMeta({
          cols: lattice.cols,
          rows: lattice.rows,
          cellSize: lattice.cellSize,
          cellCount: lattice.cells.size,
          symmetryType: lattice.symmetry?.significant ? lattice.symmetry.type : 'none',
          symmetryConfidence: Number(lattice.symmetry?.confidence ?? 0),
        });
        setStatus('ready');
        draw();
      } catch (err) {
        if (cancelled) return;
        console.error('[LatticeCanvas] build failed:', err);
        setError(err.message || 'Lattice build failed');
        setStatus('error');
      }
    })();

    return () => { cancelled = true; };
  }, [analysis, draw]);

  // Click to paint; Shift-click to erase.
  const handleClick = useCallback((e) => {
    const lattice = latticeRef.current;
    const canvas = canvasRef.current;
    if (!lattice || !canvas) return;

    const rect = canvas.getBoundingClientRect();
    const { col, row } = resolveLatticeClick(e.clientX, e.clientY, rect, lattice, ZOOM);
    if (col < 0 || row < 0) return;

    if (e.shiftKey) {
      clearLatticeCell(lattice, col, row);
    } else {
      paintCell(lattice, col, row, brushColor);
    }
    draw();
  }, [brushColor, draw]);

  // Export the painted lattice to a centered Aseprite-compatible PNG.
  const handleExport = useCallback(() => {
    const lattice = latticeRef.current;
    if (!lattice) return;

    const aseprite = exportLatticeToAseprite(lattice);
    const { width, height, pixelData } = aseprite;
    if (!width || !height) return;

    const off = document.createElement('canvas');
    off.width = width;
    off.height = height;
    const ctx = off.getContext('2d');
    ctx.putImageData(new ImageData(new Uint8ClampedArray(pixelData), width, height), 0, 0);

    const link = document.createElement('a');
    link.href = off.toDataURL('image/png');
    link.download = `lattice_${Date.now()}.png`;
    link.click();
  }, []);

  return (
    <div className="lattice-canvas">
      <div className="terminal-header telemetry-text">
        0xL_LATTICE_GRID
        {meta && (
          <span style={{ float: 'right', opacity: 0.8 }}>
            {meta.cols}×{meta.rows} · sym:{meta.symmetryType}
            {meta.symmetryType !== 'none' ? ` (${meta.symmetryConfidence.toFixed(2)})` : ''}
          </span>
        )}
      </div>

      <div
        style={{
          maxHeight: '260px',
          overflow: 'auto',
          background: '#000',
          border: '1px solid #333',
          padding: '4px',
        }}
      >
        {status === 'idle' && (
          <div className="telemetry-text" style={{ padding: '24px 8px', opacity: 0.6 }}>
            AWAITING_ANALYSIS...
          </div>
        )}
        {status === 'building' && (
          <div className="telemetry-text" style={{ padding: '24px 8px', opacity: 0.8 }}>
            COMPILING_LATTICE...
          </div>
        )}
        {status === 'error' && (
          <div className="telemetry-text" style={{ padding: '24px 8px', color: '#FF5555' }}>
            LATTICE_FAULT: {error}
          </div>
        )}
        <canvas
          ref={canvasRef}
          onClick={handleClick}
          style={{
            display: status === 'ready' ? 'block' : 'none',
            imageRendering: 'pixelated',
            cursor: 'crosshair',
          }}
        />
      </div>

      <button
        className="transmute-ignite-btn"
        onClick={handleExport}
        disabled={status !== 'ready'}
        type="button"
        style={{ marginTop: '8px' }}
      >
        EXPORT_LATTICE_PNG
      </button>
    </div>
  );
}
