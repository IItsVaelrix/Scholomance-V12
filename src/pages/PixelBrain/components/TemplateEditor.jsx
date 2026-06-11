/**
 * TEMPLATE EDITOR — Lattice Grid editing surface
 *
 * UI SPEC:
 * - World-law connection: the lattice is spatial bytecode — this surface is
 *   where its legal grid points (rectangular, isometric, hexagonal, circular,
 *   fibonacci dialects) become paintable glyph cells. The grid the player
 *   sees is the same lattice the engine snaps, hit-tests and fills against:
 *   one authority, rendered.
 * - Data consumed: template-grid-engine via the Cell Wall adapter
 *   (pixelbrain.adapter.js). This component never imports codex/ directly.
 * - State: grid object in a ref (mutable engine model); tool/colour/zoom/
 *   grid-type/symmetry/cursor in React state.
 * - Accessibility: every control labelled; tool and symmetry toggles expose
 *   aria-pressed; the canvas is a keyboard surface (arrows move the cell
 *   cursor, Enter/Space applies the tool, Delete erases).
 * - Animation: none — static editing surface (TemplateEditor.css disables
 *   CRT effects so the lattice stays legible).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createTemplateGrid,
  generateGridPreview,
  getCellAtPosition,
  getCellOrigin,
  getGridMetrics,
  setCell,
  clearCell,
  floodFill,
  toggleSymmetryAxis,
  applySymmetry,
  exportToAseprite,
  importFromAseprite,
  templateGridToPixelBrainAssetPacket,
  GRID_TYPES,
} from '../../../lib/pixelbrain.adapter.js';
import '../TemplateEditor.css';

const SPRITE_W = 160;
const SPRITE_H = 144;
const ZOOM_STEPS = [1, 2, 4, 8];
const MAX_IMPORT_DIM = 1024;

const TOOLS = [
  { id: 'paint', label: 'PAINT' },
  { id: 'erase', label: 'ERASE' },
  { id: 'fill', label: 'FILL' },
];

const SYMMETRY_AXES = [
  { id: 'vertical', label: 'MIRROR_V' },
  { id: 'horizontal', label: 'MIRROR_H' },
  { id: 'diagonal', label: 'MIRROR_D' },
];

const GRID_TYPE_OPTIONS = Object.values(GRID_TYPES);

function traceHexPath(ctx, cx, cy, radius) {
  for (let i = 0; i < 6; i++) {
    // Pointy-top vertices every 60°, starting at 30° — engine orientation
    const a = Math.PI / 6 + (i / 6) * Math.PI * 2;
    const px = cx + Math.cos(a) * radius;
    const py = cy + Math.sin(a) * radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

export function TemplateEditor({ onCommitAsset } = {}) {
  const canvasRef = useRef(null);
  const gridRef = useRef(null);
  const paintingRef = useRef(false);

  const [tool, setTool] = useState('paint');
  const [brushColor, setBrushColor] = useState('#C9A227');
  const [gridType, setGridType] = useState(GRID_TYPES.HEXAGONAL);
  const [cellSize, setCellSize] = useState(8);
  const [zoom, setZoom] = useState(4);
  const [axes, setAxes] = useState([]);
  const [cursor, setCursor] = useState({ col: 0, row: 0 });
  const [revision, setRevision] = useState(0);
  const [fault, setFault] = useState(null);

  // (Re)build the lattice when its dialect changes. Skipped when the ref was
  // already replaced with a matching grid (import path).
  useEffect(() => {
    const current = gridRef.current;
    if (current && current.gridType === gridType && current.cellSize === cellSize) {
      return;
    }
    gridRef.current = createTemplateGrid({
      width: SPRITE_W,
      height: SPRITE_H,
      cellSize,
      gridType,
      snapStrength: 1,
    });
    setAxes([]);
    setCursor({ col: 0, row: 0 });
    setRevision(r => r + 1);
  }, [gridType, cellSize]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const grid = gridRef.current;
    if (!canvas || !grid) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = grid.width * zoom;
    canvas.height = grid.height * zoom;
    ctx.imageSmoothingEnabled = false;

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const metrics = getGridMetrics(grid);
    const layer = grid.layers[0];

    // Painted cells
    if (layer) {
      layer.cells.forEach(cell => {
        ctx.fillStyle = cell.color;
        if (metrics.hexRadius) {
          ctx.beginPath();
          traceHexPath(ctx, cell.x * zoom, cell.y * zoom, metrics.hexRadius * zoom);
          ctx.fill();
        } else {
          ctx.fillRect(cell.x * zoom, cell.y * zoom, metrics.cellSize * zoom, metrics.cellSize * zoom);
        }
      });
    }

    // Lattice preview — golden amber, the engine's own line set
    ctx.strokeStyle = 'rgba(201, 162, 39, 0.35)';
    ctx.lineWidth = 1;
    generateGridPreview(grid).forEach(line => {
      ctx.beginPath();
      ctx.moveTo(line.x1 * zoom, line.y1 * zoom);
      ctx.lineTo(line.x2 * zoom, line.y2 * zoom);
      ctx.stroke();
    });

    // Symmetry axes
    if (grid.symmetryAxes.length > 0) {
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.6)';
      ctx.setLineDash([6, 4]);
      grid.symmetryAxes.forEach(axis => {
        ctx.beginPath();
        if (axis === 'vertical') {
          ctx.moveTo((grid.width / 2) * zoom, 0);
          ctx.lineTo((grid.width / 2) * zoom, canvas.height);
        } else if (axis === 'horizontal') {
          ctx.moveTo(0, (grid.height / 2) * zoom);
          ctx.lineTo(canvas.width, (grid.height / 2) * zoom);
        } else {
          ctx.moveTo(0, 0);
          ctx.lineTo(canvas.width, canvas.height);
        }
        ctx.stroke();
      });
      ctx.setLineDash([]);
    }

    // Keyboard cursor
    const origin = getCellOrigin(grid, cursor.col, cursor.row);
    ctx.strokeStyle = '#2ddbde';
    ctx.lineWidth = 2;
    if (metrics.hexRadius) {
      ctx.beginPath();
      traceHexPath(ctx, origin.x * zoom, origin.y * zoom, metrics.hexRadius * zoom);
      ctx.stroke();
    } else {
      ctx.strokeRect(origin.x * zoom, origin.y * zoom, metrics.cellSize * zoom, metrics.cellSize * zoom);
    }
  }, [zoom, cursor]);

  useEffect(() => {
    draw();
  }, [draw, revision]);

  // Mirror about cell centres so symmetry targets stay on-lattice for every
  // grid dialect (hex cells are already centre-addressed).
  const targetsFor = useCallback((grid, cell) => {
    let center = { x: cell.x, y: cell.y };
    if (grid.gridType !== GRID_TYPES.HEXAGONAL) {
      center = { x: cell.x + grid.cellSize / 2, y: cell.y + grid.cellSize / 2 };
    }
    const points = grid.symmetryAxes.length > 0 ? applySymmetry([center], grid) : [center];
    const seen = new Set();
    const targets = [];
    points.forEach(p => {
      const resolved = getCellAtPosition(grid, p.x, p.y);
      if (!resolved) return;
      const inBounds = resolved.col >= 0 && resolved.row >= 0
        && resolved.col < grid.cols && resolved.row < grid.rows;
      if (!inBounds) return;
      const key = `${resolved.col},${resolved.row}`;
      if (seen.has(key)) return;
      seen.add(key);
      targets.push(resolved);
    });
    return targets;
  }, []);

  const applyTool = useCallback((cell) => {
    const grid = gridRef.current;
    const layer = grid?.layers[0];
    if (!grid || !layer) return;

    targetsFor(grid, cell).forEach(target => {
      if (tool === 'paint') {
        setCell(layer, target.x, target.y, brushColor);
      } else if (tool === 'erase') {
        clearCell(layer, target.x, target.y);
      } else {
        floodFill(grid, layer, target.x, target.y, brushColor);
      }
    });
    setCursor({ col: cell.col, row: cell.row });
    setRevision(r => r + 1);
  }, [tool, brushColor, targetsFor]);

  const cellFromEvent = useCallback((e) => {
    const canvas = canvasRef.current;
    const grid = gridRef.current;
    if (!canvas || !grid) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width > 0 ? canvas.width / rect.width : 1;
    const scaleY = rect.height > 0 ? canvas.height / rect.height : 1;
    const x = ((e.clientX - rect.left) * scaleX) / zoom;
    const y = ((e.clientY - rect.top) * scaleY) / zoom;
    const cell = getCellAtPosition(grid, x, y);
    const inBounds = cell.col >= 0 && cell.row >= 0
      && cell.col < grid.cols && cell.row < grid.rows;
    return inBounds ? cell : null;
  }, [zoom]);

  const handlePointerDown = useCallback((e) => {
    paintingRef.current = true;
    const cell = cellFromEvent(e);
    if (cell) applyTool(cell);
  }, [cellFromEvent, applyTool]);

  const handlePointerMove = useCallback((e) => {
    if (!paintingRef.current || tool === 'fill') return;
    const cell = cellFromEvent(e);
    if (cell) applyTool(cell);
  }, [cellFromEvent, applyTool, tool]);

  const stopPainting = useCallback(() => {
    paintingRef.current = false;
  }, []);

  const handleKeyDown = useCallback((e) => {
    const grid = gridRef.current;
    if (!grid) return;
    const moves = {
      ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1],
    };
    if (moves[e.key]) {
      e.preventDefault();
      const [dc, dr] = moves[e.key];
      setCursor(c => ({
        col: Math.min(grid.cols - 1, Math.max(0, c.col + dc)),
        row: Math.min(grid.rows - 1, Math.max(0, c.row + dr)),
      }));
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const origin = getCellOrigin(grid, cursor.col, cursor.row);
      applyTool({ col: cursor.col, row: cursor.row, x: origin.x, y: origin.y });
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      const layer = grid.layers[0];
      const origin = getCellOrigin(grid, cursor.col, cursor.row);
      if (layer) clearCell(layer, origin.x, origin.y);
      setRevision(r => r + 1);
    }
  }, [cursor, applyTool]);

  const handleToggleAxis = useCallback((axis) => {
    const grid = gridRef.current;
    if (!grid) return;
    toggleSymmetryAxis(grid, axis);
    setAxes([...grid.symmetryAxes]);
    setRevision(r => r + 1);
  }, []);

  const stepZoom = useCallback((dir) => {
    setZoom(z => {
      const idx = ZOOM_STEPS.indexOf(z) + dir;
      return ZOOM_STEPS[Math.min(ZOOM_STEPS.length - 1, Math.max(0, idx))];
    });
  }, []);

  const handleExport = useCallback(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const data = exportToAseprite(grid);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lattice_template_${grid.gridType}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleCommitAsset = useCallback(() => {
    const grid = gridRef.current;
    if (!grid) return;
    try {
      const packet = templateGridToPixelBrainAssetPacket(grid, {
        sourceId: `${grid.gridType}-${grid.cellSize}`,
        label: `${grid.gridType} lattice template`,
      });
      setFault(null);
      if (typeof onCommitAsset === 'function') {
        onCommitAsset(packet);
      }
    } catch (err) {
      setFault(`PACKET_FAULT: ${err.message}`);
    }
  }, [onCommitAsset]);

  const handleImportFile = useCallback((e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        const result = importFromAseprite(data);
        if (!result.ok) {
          setFault(`IMPORT_FAULT: ${result.error || 'INVALID_IMPORT'}`);
          return;
        }
        const grid = result.template;
        gridRef.current = grid;
        setGridType(grid.gridType);
        setCellSize(grid.cellSize);
        setAxes([...grid.symmetryAxes]);
        setCursor({ col: 0, row: 0 });
        setFault(null);
        setRevision(r => r + 1);
      } catch (err) {
        setFault(`IMPORT_FAULT: ${err.message}`);
      }
    };
    reader.readAsText(file);
  }, []);

  const activeGrid = gridRef.current;
  const cellCount = activeGrid?.layers[0]?.cells.size ?? 0;

  return (
    <div className="template-editor">
      <section className="editor-canvas-panel" aria-label="Lattice canvas">
        <div className="canvas-container">
          <canvas
            ref={canvasRef}
            className="editor-canvas editor-canvas--interactive"
            tabIndex={0}
            aria-label={`Lattice template canvas, ${gridType} grid. Arrow keys move the cell cursor, Enter applies the ${tool} tool, Delete erases.`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={stopPainting}
            onPointerLeave={stopPainting}
            onKeyDown={handleKeyDown}
          />
        </div>
        <div className="zoom-controls">
          <button type="button" onClick={() => stepZoom(-1)} aria-label="Zoom out">−</button>
          <span aria-live="polite">{zoom}×</span>
          <button type="button" onClick={() => stepZoom(1)} aria-label="Zoom in">+</button>
        </div>
        <div className="editor-status-line telemetry-text" aria-live="polite">
          {activeGrid ? `${activeGrid.cols}×${activeGrid.rows} · ${gridType.toUpperCase()} · CELLS: ${cellCount}` : 'FORGING_LATTICE...'}
          {fault ? ` · ${fault}` : ''}
        </div>
      </section>

      <aside className="editor-controls-panel" aria-label="Lattice tools">
        <div className="tool-selector" role="group" aria-label="Editing tool">
          {TOOLS.map(t => (
            <button
              key={t.id}
              type="button"
              className={tool === t.id ? 'active' : ''}
              aria-pressed={tool === t.id}
              onClick={() => setTool(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="color-picker">
          <h4 id="template-brush-color">Brush Glyph Colour</h4>
          <input
            type="color"
            value={brushColor}
            aria-labelledby="template-brush-color"
            onChange={(e) => setBrushColor(e.target.value.toUpperCase())}
          />
          <span>{brushColor}</span>
        </div>

        <div className="grid-selector">
          <h4>Grid Dialect</h4>
          <div className="grid-type-buttons" role="group" aria-label="Grid type">
            {GRID_TYPE_OPTIONS.map(type => (
              <button
                key={type}
                type="button"
                className={gridType === type ? 'active' : ''}
                aria-pressed={gridType === type}
                onClick={() => setGridType(type)}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="formula-params">
          <h4>Lattice Parameters</h4>
          <div className="param-slider">
            <label htmlFor="template-cell-size">Cell Size</label>
            <input
              id="template-cell-size"
              type="range"
              min="4"
              max="32"
              step="2"
              value={cellSize}
              onChange={(e) => setCellSize(parseInt(e.target.value, 10))}
            />
            <span className="param-value">{cellSize}px</span>
          </div>
        </div>

        <div className="symmetry-toggles" role="group" aria-label="Symmetry axes">
          <h4>Symmetry</h4>
          {SYMMETRY_AXES.map(axis => (
            <button
              key={axis.id}
              type="button"
              className={axes.includes(axis.id) ? 'active' : ''}
              aria-pressed={axes.includes(axis.id)}
              onClick={() => handleToggleAxis(axis.id)}
            >
              {axis.label}
            </button>
          ))}
        </div>

        <button type="button" className="export-btn" onClick={handleExport}>
          EXPORT_TEMPLATE_JSON
        </button>
        <button type="button" className="export-btn" onClick={handleCommitAsset}>
          COMMIT_AS_ASSET_PACKET
        </button>
        <label className="import-label" htmlFor="template-import-input">
          IMPORT_TEMPLATE_JSON
        </label>
        <input
          id="template-import-input"
          type="file"
          accept="application/json"
          className="import-input"
          onChange={handleImportFile}
        />
      </aside>
    </div>
  );
}

export default TemplateEditor;
