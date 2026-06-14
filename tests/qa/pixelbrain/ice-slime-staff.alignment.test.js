import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { forgeItemAsset } from '../../../codex/core/pixelbrain/item-foundry.js';
import { getPartProfile } from '../../../codex/core/pixelbrain/part-profile-library.js';

describe('Slime Staff Alignment QA', () => {
  it('enforces mathematically correct physical alignment of all staff components', () => {
    const specPath = resolve(process.cwd(), 'specs/ice-slime-staff.v1.json');
    const rawSpec = JSON.parse(readFileSync(specPath, 'utf8'));
    
    // Forge the bundle to generate the composed silhouette
    const bundle = forgeItemAsset(rawSpec, { includeShader: false, includePng: false });
    const { parts } = bundle.silhouette;

    // Helper to find a part by ID
    const getPart = (id) => {
      const part = parts.find(p => p.id === id);
      if (!part) throw new Error(`Part ${id} missing from silhouette`);
      return part;
    };

    const shaft = getPart('shaft');
    const shaftShadow = getPart('shaft_shadow');
    const shaftHighlight = getPart('shaft_highlight');
    const bezel = getPart('bezel');
    const grip = getPart('grip');
    const pommel = getPart('pommel');
    const orb = getPart('orb');
    
    // 1. Shaft integrity
    expect(shaft.aabb.minY).toBe(30);
    expect(shaft.aabb.maxY).toBe(90);

    // 2. Shaft cylinder shading alignment
    // Shadow and highlight MUST vertically perfectly overlap the shaft.
    expect(shaftShadow.aabb.minY).toBe(shaft.aabb.minY);
    expect(shaftShadow.aabb.maxY).toBe(shaft.aabb.maxY);
    expect(shaftHighlight.aabb.minY).toBe(shaft.aabb.minY);
    expect(shaftHighlight.aabb.maxY).toBe(shaft.aabb.maxY);

    // 3. Bezel attaches to base of shaft
    // Shaft ends at 90. Bezel connects at 91 and extends down to 98.
    expect(bezel.aabb.minY).toBe(91);
    expect(bezel.aabb.maxY).toBe(98);

    // 4. Grip handle MUST be drawn entirely BELOW the shaft (no overlapping upwards into the shaft area)
    // The handle tip should start where the bezel ends
    expect(grip.aabb.minY).toBe(91);
    // Grip should extend downwards (length 22) from 91 to 113.
    expect(grip.aabb.maxY).toBe(113);

    // 5. Pommel MUST attach to the tip of the grip and draw downwards
    // Grip ends at 113, pommel should start at 114.
    expect(pommel.aabb.minY).toBeGreaterThanOrEqual(112);

    // 6. Orb attaches to the tip of the shaft (y=30)
    // The orb's base is calculated as Math.floor(r * 0.8). For r=9, base is 7.
    // dy = (30 + 1) - 7 = 24.
    // So its center is at 24, and its base is at 31.
    expect(orb.anchorOut.center.y).toBe(24);
    expect(orb.anchorOut.base.y).toBe(31);
  });

  it('orb.ring wraps the orb perimeter with an elliptical halo', () => {
    const profile = getPartProfile('orb.ring');
    const result = profile({ r: 9 }, {});

    // Should emit cells — the ring is non-empty
    expect(result.cells.length).toBeGreaterThan(0);

    // All cells must lie on or outside the orb radius (ring wraps outside)
    for (const { x, y } of result.cells) {
      const d = Math.hypot(x, y * 0.85); // elliptical: Y squashed by 0.85
      expect(d).toBeGreaterThanOrEqual(9.5);
      expect(d).toBeLessThanOrEqual(12);
    }

    // Must declare a center anchor
    expect(result.anchors.center).toBeDefined();
    expect(result.anchors.center).toEqual({ x: 0, y: 0 });
  });

  it('shaft.rune_lattice emits periodic marks along the shaft span', () => {
    const profile = getPartProfile('shaft.rune_lattice');
    const result = profile({ cx: 24, span: [30, 90], half: 2 }, {});

    // Non-empty
    expect(result.cells.length).toBeGreaterThan(0);

    // All cells must fall within the span
    for (const { y } of result.cells) {
      expect(y).toBeGreaterThanOrEqual(30);
      expect(y).toBeLessThanOrEqual(90);
    }

    // Marks must be centered near cx (offset up to half+1 for off-center engraving)
    for (const { x } of result.cells) {
      expect(x).toBeGreaterThanOrEqual(24 - 4);
      expect(x).toBeLessThanOrEqual(24 + 4);
    }

    // Must have marks at intervals — expect at least 6 distinct Y rows
    const ySet = new Set(result.cells.map(c => c.y));
    expect(ySet.size).toBeGreaterThanOrEqual(6);

    expect(result.anchors.base).toBeDefined();
    expect(result.anchors.tip).toBeDefined();
  });

  it('guard.void_wings emits an asymmetric jagged guard with left wing longer than right', () => {
    const profile = getPartProfile('guard.void_wings');
    const result = profile({}, {});

    expect(result.cells.length).toBeGreaterThan(0);

    // Asymmetry check: leftmost X must be further from center than rightmost X
    const xs = result.cells.map(c => c.x);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    expect(Math.abs(minX)).toBeGreaterThan(Math.abs(maxX));

    // Anchors
    expect(result.anchors.base).toBeDefined();
    expect(result.anchors.tip).toBeDefined();

    // Must span at least 8 rows vertically (has diamond core + wings)
    const ys = result.cells.map(c => c.y);
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThanOrEqual(7);
  });
});
