/**
 * SCDL Exporters
 *
 * Dispatcher and implementations for SCDL export targets:
 *   - json   → raw lattice JSON string
 *   - svg    → SVG with one <rect> per coordinate
 *   - phaser → Phaser texture config JSON
 *   - png    → stub (signals render-pipeline delegation)
 */

import { emitLattice } from './scdl.lattice-emitter.js';

/**
 * Export a compiled asset to one or more targets.
 *
 * @param {object} packet  - PixelBrainAssetPacket
 * @param {string[]} targets - e.g. ['json', 'svg', 'phaser']
 * @param {object} [ast]   - Optional: original SCDL AST
 * @returns {Record<string, {ok:boolean, output:string|object, mimeType:string}>}
 */
export function exportSCDL(packet, targets, ast) {
  const lattice = emitLattice(packet, ast);
  const results = {};

  for (const target of targets) {
    switch (target) {
      case 'json':   results[target] = exportJSON(lattice);   break;
      case 'svg':    results[target] = exportSVG(lattice);    break;
      case 'phaser': results[target] = exportPhaser(lattice); break;
      case 'png':    results[target] = exportPNGStub(lattice); break;
      default:
        results[target] = {
          ok: false,
          output: `Unknown export target '${target}'`,
          mimeType: 'text/plain',
        };
    }
  }

  return results;
}

// ─── JSON ─────────────────────────────────────────────────────────────────────

function exportJSON(lattice) {
  return {
    ok:       true,
    output:   JSON.stringify(lattice, null, 2),
    mimeType: 'application/json',
  };
}

// ─── SVG ──────────────────────────────────────────────────────────────────────

function exportSVG(lattice) {
  const { width, height } = lattice.canvas;
  const coords = lattice.geometry.coordinates;

  // Deduplicate by (x,y) — last write wins (mirrors are on top)
  const pixelMap = new Map();
  for (const c of coords) {
    pixelMap.set(`${c.x},${c.y}`, c.color);
  }

  const rects = [];
  for (const [key, color] of pixelMap) {
    const [x, y] = key.split(',').map(Number);
    rects.push(`  <rect x="${x}" y="${y}" width="1" height="1" fill="${color}"/>`);
  }

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges">`,
    ...rects,
    `</svg>`,
  ].join('\n');

  return {
    ok:       true,
    output:   svg,
    mimeType: 'image/svg+xml',
  };
}

// ─── Phaser ───────────────────────────────────────────────────────────────────

/**
 * Phaser texture config.
 * Colors are 32-bit integers (r<<16 | g<<8 | b) for direct Phaser
 * `Graphics.fillStyle(color)` consumption.
 */
function exportPhaser(lattice) {
  const { width, height } = lattice.canvas;
  const coords = lattice.geometry.coordinates;

  const pixels = [];
  const seen = new Map();

  for (const c of coords) {
    const key = `${c.x},${c.y}`;
    seen.set(key, {
      x:     c.x,
      y:     c.y,
      color: _hexToInt(c.color),
    });
  }

  for (const entry of seen.values()) pixels.push(entry);

  // Build integer palette
  const paletteInts = {};
  for (const [name, hex] of Object.entries(lattice._paletteMap || {})) {
    paletteInts[name] = _hexToInt(hex);
  }

  const config = {
    type:    'scdl-phaser-v1',
    key:     lattice.source?.id || 'scdl-asset',
    assetId: lattice.id,
    canvas:  { width, height },
    pixels,
    parts:   (lattice.parts || []).map(p => ({
      id:       p.id,
      material: p.material,
    })),
    intentOps: (lattice.parts || []).flatMap(p => p.intentOps || []),
  };

  return {
    ok:       true,
    output:   JSON.stringify(config, null, 2),
    mimeType: 'application/json',
  };
}

// ─── PNG (stub) ───────────────────────────────────────────────────────────────

function exportPNGStub(lattice) {
  return {
    ok:       true,
    output:   JSON.stringify({
      type:     'scdl-png-stub-v1',
      message:  'PNG rendering delegates to render-fidelity-pipeline.js',
      assetId:  lattice.id,
      canvas:   lattice.canvas,
      pixelCount: lattice.geometry.coordinates.length,
    }, null, 2),
    mimeType: 'application/json',
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function _hexToInt(hex) {
  const raw = String(hex || '#000000').replace('#', '');
  const normalized = raw.length === 3
    ? raw.split('').map(c => c + c).join('')
    : raw;
  return parseInt(normalized.padEnd(6, '0'), 16) || 0;
}
