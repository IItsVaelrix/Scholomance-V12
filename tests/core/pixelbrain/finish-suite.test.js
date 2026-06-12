import { describe, expect, it } from 'vitest';

import { sketchToSilhouette } from '../../../codex/core/pixelbrain/sketch-amp.js';
import { estimateNormals } from '../../../codex/core/pixelbrain/normal-estimation.js';
import { applySelout } from '../../../codex/core/pixelbrain/selout-amp.js';
import { applyPixelAA } from '../../../codex/core/pixelbrain/pixel-aa-amp.js';
import { applyFacets } from '../../../codex/core/pixelbrain/facet-amp.js';
import { applyDetailBudget } from '../../../codex/core/pixelbrain/detail-budget.js';
import { MATERIAL_PALETTES, resolveMaterialId } from '../../../codex/core/pixelbrain/material-registry.js';

const LIGHT = Object.freeze({ angle: Math.PI * 1.25, ambient: 0.3 }); // top-left

function registryResolver({ material, anchor }) {
  const def = MATERIAL_PALETTES[resolveMaterialId(material)];
  if (!def) return null;
  return def.anchors?.[anchor] || def.anchors?.body || null;
}

function discOccupancy(cx, cy, r) {
  const cells = [];
  for (let y = cy - r; y <= cy + r; y += 1) {
    for (let x = cx - r; x <= cx + r; x += 1) {
      if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) cells.push({ x, y });
    }
  }
  return cells;
}

describe('Directional shading (sketch-amp light mode)', () => {
  const CX = 10;
  const CY = 10;
  const disc = discOccupancy(CX, CY, 8);
  const dims = { width: 21, height: 21 };
  const Lx = Math.cos(LIGHT.angle);
  const Ly = Math.sin(LIGHT.angle);

  function halfMeans(coordinates) {
    let lit = 0; let litN = 0; let shadow = 0; let shadowN = 0;
    for (const c of coordinates) {
      const proj = (c.x - CX) * Lx + (c.y - CY) * Ly;
      if (proj > 1) { lit += c.slot; litN += 1; }
      else if (proj < -1) { shadow += c.slot; shadowN += 1; }
    }
    return { lit: lit / litN, shadow: shadow / shadowN };
  }

  it('anti-pillow: lit half outshines the shadow half on a convex form', () => {
    const template = sketchToSilhouette(disc, dims, { bands: 6, light: LIGHT });
    const { lit, shadow } = halfMeans(template.coordinates);
    expect(lit).toBeGreaterThan(shadow);
  });

  it('legacy radial mode stays symmetric along the light axis (pillow pinned)', () => {
    const template = sketchToSilhouette(disc, dims, { bands: 6 });
    const { lit, shadow } = halfMeans(template.coordinates);
    expect(Math.abs(lit - shadow)).toBeLessThan(0.15);
  });

  it('directional mode is deterministic and emits shading classes + normals', () => {
    const a = sketchToSilhouette(disc, dims, { bands: 6, light: LIGHT });
    const b = sketchToSilhouette(disc, dims, { bands: 6, light: LIGHT });
    expect(JSON.stringify(a.coordinates)).toBe(JSON.stringify(b.coordinates));
    const classes = new Set(a.coordinates.map((c) => c.shading));
    expect(classes.has('lit')).toBe(true);
    expect(classes.has('shadow')).toBe(true);
    for (const c of a.coordinates) {
      expect(Number.isFinite(c.nx)).toBe(true);
      expect(Number.isFinite(c.ny)).toBe(true);
    }
  });

  it('legacy mode output is unchanged by the directional feature (no light option)', () => {
    const template = sketchToSilhouette(disc, dims, { bands: 6 });
    for (const c of template.coordinates) {
      expect(c.shading).toBe('core');
      expect(c.nx).toBe(0);
      expect(c.ny).toBe(0);
    }
  });
});

describe('Normal estimation', () => {
  it('rim normals on a cone field point outward', () => {
    const W = 21; const H = 21; const CX = 10; const CY = 10; const R = 8;
    const dist = new Float32Array(W * H);
    for (let y = 0; y < H; y += 1) {
      for (let x = 0; x < W; x += 1) {
        const r = Math.hypot(x - CX, y - CY);
        dist[y * W + x] = Math.max(0, R - r);
      }
    }
    const normals = estimateNormals(dist, W, H);
    let checked = 0;
    for (let y = 0; y < H; y += 1) {
      for (let x = 0; x < W; x += 1) {
        const i = y * W + x;
        const r = Math.hypot(x - CX, y - CY);
        if (dist[i] <= 0 || r < 3) continue; // skip background and apex region
        const radial = { x: (x - CX) / r, y: (y - CY) / r };
        const dot = normals[i].nx * radial.x + normals[i].ny * radial.y;
        expect(dot, `cell ${x},${y}`).toBeGreaterThan(0.5);
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(50);
  });

  it('zero-distance (background) cells get a null normal', () => {
    const dist = new Float32Array(9); // all zero
    const normals = estimateNormals(dist, 3, 3);
    for (const n of normals) expect(n).toEqual({ nx: 0, ny: 0 });
  });
});

describe('Selout AMP', () => {
  const spec = { parts: [{ id: 'p', outline: { material: 'sapphire' }, fill: { material: 'black_steel' } }] };
  const mkFills = () => ({
    coordinates: [
      // lit rim: normal aligned with top-left light (-0.707, -0.707)
      { x: 0, y: 0, color: '#0F52BA', isRim: true, partId: 'p', nx: -0.707, ny: -0.707 },
      // shadow rim: normal opposed
      { x: 5, y: 5, color: '#0F52BA', isRim: true, partId: 'p', nx: 0.707, ny: 0.707 },
      // neutral rim: perpendicular normal → unchanged
      { x: 0, y: 5, color: '#0F52BA', isRim: true, partId: 'p', nx: -0.707, ny: 0.707 },
      // interior: untouched
      { x: 2, y: 2, color: '#101017', isRim: false, partId: 'p', nx: 0, ny: 0 },
    ],
  });

  it('shifts only rim anchors by orientation, keeping the declared material', () => {
    const out = applySelout(mkFills(), spec, registryResolver, LIGHT);
    const sapphire = MATERIAL_PALETTES.sapphire.anchors;
    expect(out.coordinates[0].color).toBe(sapphire.body);   // lit → body
    expect(out.coordinates[1].color).toBe(sapphire.void);   // shadow → void
    expect(out.coordinates[2].color).toBe('#0F52BA');       // neutral → declared
    expect(out.coordinates[3].color).toBe('#101017');       // interior untouched
  });

  it('preserves geometry: no cells added or removed', () => {
    const out = applySelout(mkFills(), spec, registryResolver, LIGHT);
    expect(out.coordinates.length).toBe(4);
  });

  it('is a documented no-op without light options (current forge behavior)', () => {
    // ITEM-SPEC-v1 carries no `light` field, so the foundry invokes this pass
    // with undefined and it must be the identity. If this test starts failing
    // because `light` became a spec field, delete this case and pin the new
    // contract instead.
    const fills = mkFills();
    const out = applySelout(fills, spec, registryResolver, undefined);
    expect(out).toBe(fills);
  });
});

describe('Pixel AA AMP', () => {
  // Plus-shaped fixture: (2,1) is interior with an empty diagonal at (1,0)
  // and rim neighbors (1,1) and (2,0) that do not both continue → stair-step.
  const mkFills = () => ({
    coordinates: [
      { x: 2, y: 0, color: '#1D5FD6', isRim: true, isMotif: false, partId: 'p' },
      { x: 1, y: 1, color: '#1D5FD6', isRim: true, isMotif: false, partId: 'p' },
      { x: 2, y: 1, color: '#101017', isRim: false, isMotif: false, partId: 'p' },
      { x: 3, y: 1, color: '#1D5FD6', isRim: true, isMotif: false, partId: 'p' },
      { x: 2, y: 2, color: '#1D5FD6', isRim: true, isMotif: false, partId: 'p' },
    ],
  });

  it('blends the inner corner of a stair-step toward its rim neighbors', () => {
    const out = applyPixelAA(mkFills(), {});
    const inner = out.coordinates.find((c) => c.x === 2 && c.y === 1);
    // 50/50 blend of interior #101017 with the average of the two rim colors (#1D5FD6)
    expect(inner.color).not.toBe('#101017');
    const expected = '#'
      + Math.round((0x10 + 0x1d) / 2).toString(16).padStart(2, '0')
      + Math.round((0x10 + 0x5f) / 2).toString(16).padStart(2, '0')
      + Math.round((0x17 + 0xd6) / 2).toString(16).padStart(2, '0');
    expect(inner.color.toLowerCase()).toBe(expected.toLowerCase());
  });

  it('never adds, removes, or moves cells, and never recolors the rim', () => {
    const fills = mkFills();
    const out = applyPixelAA(fills, {});
    expect(out.coordinates.length).toBe(fills.coordinates.length);
    for (let i = 0; i < out.coordinates.length; i += 1) {
      expect(out.coordinates[i].x).toBe(fills.coordinates[i].x);
      expect(out.coordinates[i].y).toBe(fills.coordinates[i].y);
      if (fills.coordinates[i].isRim) {
        expect(out.coordinates[i].color).toBe(fills.coordinates[i].color);
      }
    }
  });

  it('exempts motif cells from blending', () => {
    const fills = mkFills();
    fills.coordinates[2] = { ...fills.coordinates[2], isMotif: true };
    const out = applyPixelAA(fills, {});
    expect(out.coordinates[2].color).toBe('#101017');
  });
});

describe('Facet AMP', () => {
  // 5×5 diamond gem: rim ring + 3×3 interior, faceted shading declared on the
  // raw part (note: normalizeItemSpec currently strips `shading`, so this is
  // only reachable with a hand-built spec — see the dormancy report).
  const mkFills = () => {
    const coordinates = [];
    for (let y = 0; y < 5; y += 1) {
      for (let x = 0; x < 5; x += 1) {
        const isRim = x === 0 || y === 0 || x === 4 || y === 4;
        coordinates.push({ x, y, color: '#C9DAE6', isRim, isMotif: false, partId: 'gem' });
      }
    }
    return { coordinates };
  };
  const spec = { parts: [{ id: 'gem', shading: 'faceted', fill: { material: 'diamond' } }] };

  it('shades interior facets flat with hard tonal breaks from the registry ramp', () => {
    const out = applyFacets(mkFills(), spec, registryResolver, LIGHT);
    const interior = out.coordinates.filter((c) => !c.isRim);
    const tones = new Set(interior.map((c) => c.color));
    expect(tones.size).toBeGreaterThanOrEqual(2);
    const anchors = new Set(Object.values(MATERIAL_PALETTES.diamond.anchors));
    for (const c of interior) expect(anchors.has(c.color), c.color).toBe(true);
  });

  it('is deterministic and leaves rim/geometry untouched', () => {
    const a = applyFacets(mkFills(), spec, registryResolver, LIGHT);
    const b = applyFacets(mkFills(), spec, registryResolver, LIGHT);
    expect(JSON.stringify(a.coordinates)).toBe(JSON.stringify(b.coordinates));
    for (const c of a.coordinates.filter((c) => c.isRim)) {
      expect(c.color).toBe('#C9DAE6');
    }
  });

  it('is a documented no-op without light options (current forge behavior)', () => {
    const fills = mkFills();
    expect(applyFacets(fills, spec, registryResolver, undefined)).toBe(fills);
  });
});

describe('Detail budget', () => {
  const part = { motif: { kind: 'bolt' } };

  it('grants motif + glow at interior width ≥ 7', () => {
    expect(applyDetailBudget(part, 7)).toEqual({ allowCore: true, allowGlow: true, simplifyToPoints: false });
  });

  it('drops the glow shell at width 4–6', () => {
    expect(applyDetailBudget(part, 5)).toEqual({ allowCore: true, allowGlow: false, simplifyToPoints: false });
  });

  it('reduces to single-pixel accents at width ≤ 3', () => {
    expect(applyDetailBudget(part, 3)).toEqual({ allowCore: true, allowGlow: false, simplifyToPoints: true });
  });

  it('denies everything for parts without a motif', () => {
    expect(applyDetailBudget({ id: 'plain' }, 10)).toEqual({ allowCore: false, allowGlow: false, simplifyToPoints: false });
  });
});
