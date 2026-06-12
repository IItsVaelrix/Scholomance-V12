/**
 * MOTIF ENGRAVER — interior-cell motifs driven by the ITEM-SPEC-v1 `motif`
 * field. Rasterizes waypoint-based patterns onto a target part's interior
 * cells (so the outline is never broken), with seeded lateral offsets for
 * deterministic jitter.
 *
 * Motif kinds (v1):
 *   - `bolt`      zigzag with optional `fork`, samples the host part's
 *                 centerline and offsets laterally by a seeded delta
 *   - `rune-row`  evenly-spaced marks along the host part's centerline
 *
 * Every motif cell is keyed by `core` (the engraved cell itself) or `glow`
 * (the cardinal-neighbor shell). The region-fill-amp reads these roles to
 * color the motif.
 *
 * Determinism: NO `Math.random` (the Anti-Chaos scanner forbids it). All
 * jitter is derived from `hashString(seed, segment)`, which is exposed by
 * `part-profile-library.js` as `seededJitter`.
 */

import { seededJitter } from './part-profile-library.js';
import { hashString } from './shared.js';
import { applyDetailBudget } from './detail-budget.js';

const MOTIF_KINDS = Object.freeze(['bolt', 'rune-row', 'facet', 'filigree']);

function err(reason, context) {
  const e = new Error(`motif-engraver: ${reason}`);
  e.cause = context;
  return e;
}

function toFiniteNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function rasterLine(x0, y0, x1, y1, emit) {
  let x = x0;
  let y = y0;
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    emit(x, y);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
  }
}

// ── Host part introspection ────────────────────────────────────────────

/**
 * Compute the host part's vertical centerline. For scimitar-style curved
 * blades we mirror the blade.curved centerline math; for other profiles
 * we fall back to the AABB centerline.
 */
function partCenterlineAt(partProfileId, params, t) {
  // For blade.curved, mirror the centerline quadratic.
  if (partProfileId === 'blade.curved' || partProfileId === 'blade.straight') {
    const cxBase = Math.round(toFiniteNumber(params.cx, 0));
    const sweep = partProfileId === 'blade.curved' ? toFiniteNumber(params.sweep, 0) : 0;
    const span = Array.isArray(params.span) && params.span.length === 2
      ? [Math.round(toFiniteNumber(params.span[0])), Math.round(toFiniteNumber(params.span[1]))]
      : [0, 95];
    const width = Math.max(1, toFiniteNumber(params.width, 48));
    return {
      x: cxBase + Math.round(sweep * width * t * t),
      y: span[0] + Math.round(t * (span[1] - span[0])),
    };
  }
  // AABB centerline fallback
  const span = Array.isArray(params.span) && params.span.length === 2
    ? [Math.round(toFiniteNumber(params.span[0])), Math.round(toFiniteNumber(params.span[1]))]
    : [0, 95];
  return {
    x: Math.round(toFiniteNumber(params.cx, Math.round((toFiniteNumber(params.width, 48)) / 2))),
    y: span[0] + Math.round(t * (span[1] - span[0])),
  };
}

// ── Outline-aware interior clipping ────────────────────────────────────

/**
 * Restrict a cell to a target part's interior by 4-neighbor rim check.
 * The motif MUST NOT claim a rim cell — that's the outline-closure
 * invariant. If `isRim` is true, the cell is dropped.
 */
function isInteriorCell(x, y, outlineSet) {
  return !outlineSet.has(`${x},${y}`);
}

function isPartCell(x, y, silhouette) {
  return silhouette.cells.some((c) => c.x === x && c.y === y);
}

// ── Motif: bolt ────────────────────────────────────────────────────────

/**
 * Bolt motif. Walks the host part's centerline at evenly-spaced t values,
 * offsets each waypoint by a seeded lateral delta, connects the waypoints
 * with Bresenham segments, and (if `fork` is true) draws a short branch
 * from the first waypoint toward the trailing tip.
 *
 * Returns a Map<cellKey, { role: 'core' | 'glow', partId }>.
 */
function engraveBolt({ spec, part, silhouette, outlineSet, colorResolvers }) {
  const cells = new Map();
  const waypoints = [];
  const segmentCount = Math.max(2, Math.round(toFiniteNumber(part.motif?.segments, 9)));
  const jitterMagnitude = Math.max(0, toFiniteNumber(part.motif?.jitter, 1.0));
  const seed = spec.seed >>> 0;
  for (let i = 0; i < segmentCount; i += 1) {
    const t = i / Math.max(1, segmentCount - 1);
    const { x, y } = partCenterlineAt(part.profile, part.params, t);
    const offset = Math.round(seededJitter(seed, `${part.id}::${i}`, jitterMagnitude));
    const wx = Math.round(x) + offset;
    const wy = Math.round(y);
    waypoints.push({ x: wx, y: wy });
  }

  const width = Math.max(1, toFiniteNumber(part.params?.width, 48));
  const budget = applyDetailBudget(part, width);

  if (budget.simplifyToPoints) {
    // Single-pixel accents only
    for (let i = 0; i < waypoints.length; i += 1) {
      if (!isPartCell(waypoints[i].x, waypoints[i].y, silhouette)) continue;
      if (!isInteriorCell(waypoints[i].x, waypoints[i].y, outlineSet)) continue;
      cells.set(`${waypoints[i].x},${waypoints[i].y}`, { role: 'core', partId: part.id });
    }
    return cells;
  }

  for (let i = 0; i < waypoints.length - 1; i += 1) {
    const a = waypoints[i];
    const b = waypoints[i + 1];
    rasterLine(a.x, a.y, b.x, b.y, (x, y) => {
      if (!isPartCell(x, y, silhouette)) return;
      if (!isInteriorCell(x, y, outlineSet)) return;
      cells.set(`${x},${y}`, { role: 'core', partId: part.id });
    });
  }

  if (part.motif?.fork && waypoints.length > 0) {
    // Fork: a short branch off the first waypoint toward the tip's
    // trailing edge (e.g. toward the start of the part).
    const start = waypoints[0];
    const { x: tipX, y: tipY } = partCenterlineAt(part.profile, part.params, 0.05);
    rasterLine(start.x, start.y, Math.round(tipX), Math.round(tipY), (x, y) => {
      if (!isPartCell(x, y, silhouette)) return;
      if (!isInteriorCell(x, y, outlineSet)) return;
      cells.set(`${x},${y}`, { role: 'core', partId: part.id });
    });
  }

  if (budget.allowGlow) {
    // Glow = the cardinal-neighbor shell of core cells, restricted to the
    // host part's interior. This gives the engraved look a halo without
    // touching the outline.
    const coreKeys = [...cells.keys()];
    const glowSet = new Set();
    for (const key of coreKeys) {
      const [cx, cy] = key.split(',').map(Number);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nKey = `${cx + dx},${cy + dy}`;
        if (cells.has(nKey)) continue;
        if (!isPartCell(cx + dx, cy + dy, silhouette)) continue;
        if (!isInteriorCell(cx + dx, cy + dy, outlineSet)) continue;
        glowSet.add(nKey);
      }
    }
    for (const key of glowSet) {
      cells.set(key, { role: 'glow', partId: part.id });
    }
  }
  return cells;
}

// ── Motif: rune-row ────────────────────────────────────────────────────

function engraveRuneRow({ spec, part, silhouette, outlineSet, colorResolvers }) {
  const cells = new Map();
  const count = Math.max(1, Math.round(toFiniteNumber(part.motif?.count, 5)));
  const width = Math.max(1, toFiniteNumber(part.params?.width, 48));
  const budget = applyDetailBudget(part, width);

  for (let i = 0; i < count; i += 1) {
    const t = (i + 0.5) / count;
    const { x, y } = partCenterlineAt(part.profile, part.params, t);
    
    if (budget.simplifyToPoints) {
      const cx = Math.round(x);
      const cy = Math.round(y);
      if (isPartCell(cx, cy, silhouette) && isInteriorCell(cx, cy, outlineSet)) {
        cells.set(`${cx},${cy}`, { role: 'core', partId: part.id });
      }
    } else {
      // Stamp a small cross (+ shape, 5 cells) at (x, y) — interior only.
      for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const cx = Math.round(x) + dx;
        const cy = Math.round(y) + dy;
        if (!isPartCell(cx, cy, silhouette)) continue;
        if (!isInteriorCell(cx, cy, outlineSet)) continue;
        
        // If no glow allowed, maybe don't make the cross, just a line?
        // Budget rule says "motif only (no glow shell)". The cross is the core motif.
        cells.set(`${cx},${cy}`, { role: 'core', partId: part.id });
      }
    }
  }
  return cells;
}

// ── Public entry ───────────────────────────────────────────────────────

/**
 * Engrave every part that declares a motif onto the silhouette.
 *
 * @returns {{
 *   cells: Map<cellKey, { role: 'core'|'glow', partId }>,
 *   partIds: string[],
 *   colorAnchors: string[]
 * }}
 */
export function engraveMotifs({ spec, silhouette, outline, colorResolvers = {} }) {
  if (!spec || !Array.isArray(spec.parts)) throw err('spec is required');
  if (!silhouette || !silhouette.cells) throw err('silhouette is required');
  const outlineSet = outline instanceof Set ? outline : new Set(outline || []);
  const cells = new Map();
  const partIds = [];

  for (const part of spec.parts) {
    if (!part.motif) continue;
    const kind = String(part.motif.kind || '');
    if (!MOTIF_KINDS.includes(kind)) {
      throw err(`unsupported motif.kind "${kind}"`, {
        partId: part.id, kind, allowed: MOTIF_KINDS,
      });
    }
    partIds.push(part.id);
    const args = { spec, part, silhouette, outlineSet, colorResolvers };
    let engraved = new Map();
    if (kind === 'bolt') engraved = engraveBolt(args);
    else if (kind === 'rune-row') engraved = engraveRuneRow(args);
    // facet and filigree might be handled strictly by pre-processors for volume,
    // or they could inject core cells here. For now, they return no engraved cells.
    
    for (const [key, entry] of engraved.entries()) {
      cells.set(key, entry);
    }
  }

  // Sanity: every motif cell is interior (outline-closure invariant).
  for (const key of cells.keys()) {
    if (!isInteriorCell(...key.split(',').map(Number), outlineSet)) {
      throw err('motif claimed a rim cell — outline-closure violated', { key });
    }
  }

  return Object.freeze({
    cells,
    partIds: Object.freeze([...partIds]),
    colorAnchors: Object.freeze([]),
  });
}

/**
 * Resolve the color of a motif cell. The fill-amp passes the motifCells
 * map and reads `cell.color` directly; this helper is the canonical
 * place to map `role` → `material.anchor` for the host part.
 */
export function resolveMotifColor(part, role, materialResolver) {
  if (!part.motif) return null;
  const target = role === 'core' ? part.motif.core : part.motif.glow;
  if (!target) return null;
  return materialResolver(target);
}

/**
 * Hash the motif output for stable artifact identification.
 */
export function hashMotifs(motifOutput) {
  const json = JSON.stringify(
    [...motifOutput.cells.entries()].sort(([a], [b]) => a.localeCompare(b)),
  );
  return `fnv1a_${hashString(json).toString(16).padStart(8, '0')}`;
}
