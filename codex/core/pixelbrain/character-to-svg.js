/**
 * CHARACTER-TO-SVG
 * Converts applyCharacterFills() output into a styled SVG string.
 *
 * Input fills shape:
 *   { coordinates: [{ x, y, color, partId, isOutline }], palette, partColors, diagnostics }
 *
 * Layers (bottom to top):
 *   1. pb-fills    — one <path> per partId, base fill color
 *   2. pb-shading  — one <path> per partId for the 1-cell inner shadow fringe
 *   3. pb-outlines — single <path> for all outline cells
 */

import { traceBoundary } from './cell-boundary-tracer.js';
import { buildPath, buildPathElement, buildSVGElement } from './svg-path-builder.js';

/**
 * Convert hex color to RGB, then to HSL, darken the lightness, and back to hex.
 * @param {string} hex   — e.g. "#aabbcc"
 * @param {number} amount — lightness reduction (0.0-1.0)
 * @returns {string} darkened hex color
 */
function darkenHex(hex, amount) {
  // Parse hex to RGB [0, 1]
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  let l = (max + min) / 2;

  // RGB to HSL
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }

  // Darken lightness
  l = Math.max(0, l - amount);

  // HSL back to RGB
  function hue2rgb(p, q, t) {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  }

  let nr, ng, nb;
  if (s === 0) {
    nr = ng = nb = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    nr = hue2rgb(p, q, h + 1 / 3);
    ng = hue2rgb(p, q, h);
    nb = hue2rgb(p, q, h - 1 / 3);
  }

  const toHex = (v) => Math.round(v * 255).toString(16).padStart(2, '0');
  return `#${toHex(nr)}${toHex(ng)}${toHex(nb)}`;
}

/**
 * Convert a coordinate array to a Set of "x,y" keys for fast adjacency checks.
 */
function cellsToKeySet(cells) {
  const s = new Set();
  for (const c of cells) {
    s.add(`${c.x},${c.y}`);
  }
  return s;
}

/**
 * Get the fill color for a part — prefer non-outline cells, fall back to any cell.
 */
function getFillColor(cells) {
  const nonOutline = cells.find((c) => !c.isOutline);
  return (nonOutline ?? cells[0])?.color ?? '#888888';
}

/**
 * Convert character fills to an SVG string.
 *
 * @param {object} fills      — output of applyCharacterFills()
 * @param {object} spec       — CHARACTER-SPEC-v1
 * @param {object} [options]
 * @param {number} [options.scale=8]          — pixels per cell in output SVG
 * @param {boolean} [options.twoTone=true]    — render shadow fringe
 * @param {number} [options.strokeWidth=1.5]  — outline stroke width
 * @param {boolean} [options.smooth=true]     — Catmull-Rom smoothing
 * @returns {string}  Complete SVG markup
 */
export function characterToSVG(fills, spec, options = {}) {
  const { scale = 8, twoTone = true, strokeWidth = 1.5, smooth = true } = options;

  // Compute SVG dimensions
  const svgWidth = (spec?.canvas?.width ?? 32) * scale;
  const svgHeight = (spec?.canvas?.height ?? 48) * scale;

  // School class (e.g., "school-void", "school-sonic")
  const school = spec?.combatProfile?.school?.toLowerCase() ?? 'unknown';

  // Group coordinates by partId and collect all outline cells
  const partAllCells = new Map(); // partId → all cells (incl. outline)
  const partOutlineCells = new Map(); // partId → outline cells only
  const allOutlineCells = [];

  for (const cell of fills.coordinates || []) {
    if (!partAllCells.has(cell.partId)) {
      partAllCells.set(cell.partId, []);
      partOutlineCells.set(cell.partId, []);
    }
    partAllCells.get(cell.partId).push(cell);
    if (cell.isOutline) {
      partOutlineCells.get(cell.partId).push(cell);
      allOutlineCells.push(cell);
    }
  }

  // ── Layer 1: fill paths ──────────────────────────────────────────────
  const fillPaths = [];
  for (const [partId, cells] of partAllCells) {
    if (cells.length === 0) continue;
    const fillColor = getFillColor(cells);
    const keySet = cellsToKeySet(cells);
    const trace = traceBoundary(keySet, { smooth });
    const d = buildPath(trace, { smooth, scale });
    if (d) {
      fillPaths.push(
        buildPathElement({ d, fill: fillColor, className: `pb-part-${partId}` })
      );
    }
  }

  // ── Layer 2: shadow fringe (cells adjacent to outline, inside the shape) ──
  const shadowPaths = [];
  if (twoTone) {
    for (const [partId, cells] of partAllCells) {
      const outlineCells = partOutlineCells.get(partId) || [];
      if (outlineCells.length === 0) continue;

      const allKeySet = cellsToKeySet(cells);
      const outlineKeySet = cellsToKeySet(outlineCells);
      const fillColor = getFillColor(cells);

      // Collect cells that are NOT outline but ARE adjacent to an outline cell
      const shadowKeys = new Set();
      for (const key of outlineKeySet) {
        const [x, y] = key.split(',').map(Number);
        // Check 4-adjacency (up, down, left, right)
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const nk = `${x + dx},${y + dy}`;
          if (allKeySet.has(nk) && !outlineKeySet.has(nk)) {
            shadowKeys.add(nk);
          }
        }
      }

      if (shadowKeys.size === 0) continue;

      const shadowColor = darkenHex(fillColor, 0.28);
      const trace = traceBoundary(shadowKeys, { smooth });
      const d = buildPath(trace, { smooth, scale });
      if (d) {
        shadowPaths.push(
          buildPathElement({ d, fill: shadowColor, className: `pb-part-${partId}-shadow` })
        );
      }
    }
  }

  // ── Layer 3: ink outline (all outline cells as one path) ──────────────
  let outlineLayerPath = '';
  if (allOutlineCells.length > 0) {
    const outlineColor = allOutlineCells[0]?.color ?? '#1a1a20';
    const outlineKeySet = cellsToKeySet(allOutlineCells);
    const trace = traceBoundary(outlineKeySet, { smooth });
    const d = buildPath(trace, { smooth, scale });
    if (d) {
      outlineLayerPath = buildPathElement({
        d,
        fill: 'none',
        stroke: outlineColor,
        strokeWidth,
        className: 'pb-outline',
      });
    }
  }

  // ── Assemble ─────────────────────────────────────────────────────────
  const fillLayer = buildSVGElement('g', { class: 'pb-fills' }, fillPaths.join(''));

  const shadowLayer =
    twoTone && shadowPaths.length > 0
      ? buildSVGElement(
          'g',
          { class: 'pb-shading', opacity: '0.45' },
          shadowPaths.join('')
        )
      : '';

  const outlineLayer = buildSVGElement('g', { class: 'pb-outlines' }, outlineLayerPath);

  return buildSVGElement(
    'svg',
    {
      xmlns: 'http://www.w3.org/2000/svg',
      viewBox: `0 0 ${svgWidth} ${svgHeight}`,
      width: svgWidth,
      height: svgHeight,
      class: `pb-character school-${school}`,
    },
    fillLayer + shadowLayer + outlineLayer
  );
}
