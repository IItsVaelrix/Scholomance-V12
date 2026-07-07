import { describe, it, expect } from 'vitest';
import fs from 'fs';
import { MATERIAL_PALETTES, resolveMaterialId } from '../../../codex/core/pixelbrain/material-registry.js';
import { applyRegionFills } from '../../../codex/core/pixelbrain/region-fill-amp.js';
import { computeOutline } from '../../../codex/core/pixelbrain/silhouette-composer.js';

// Build the authoritative gold trim ramp from the material registry (body + all anchors).
// This is what outline/trim material resolution produces before selout + square amp.
function getGoldRamp() {
  const goldDef = MATERIAL_PALETTES[resolveMaterialId('gold')];
  if (!goldDef || !goldDef.anchors) return [];
  return Object.values(goldDef.anchors);
}

const GOLD_RAMP = getGoldRamp();
const GOLD_BODY = GOLD_RAMP.includes('#D4AF37') ? '#D4AF37' : null;

// Main shell parts in the forge-armor-sets generator that declare outline: { material: slots.trim }
const TRIM_PART_IDS = new Set(['helm', 'cuirass', 'gauntlets', 'greaves']);

function loadArmorPiece(pieceName) {
  const path = `output/foundry/void-sonic-armor/${pieceName}.json`;
  const pkt = JSON.parse(fs.readFileSync(path, 'utf8'));
  return pkt.geometry?.coordinates || pkt.coordinates || [];
}

describe('armor trim (outline material assignment for void-sonic set)', () => {
  describe('artifact level (generated void-sonic armor pieces)', () => {
    const pieces = ['helm', 'cuirass', 'gauntlets', 'greaves'];

    it('main shell parts that declare outline achieve 100% gold-ramp preSquare on their rims', () => {
      for (const piece of pieces) {
        const coords = loadArmorPiece(piece);
        const mainRims = coords.filter(c => c.partId === piece && c.isRim === true && c.colorProvenance?.amp !== 'pixel-aa-amp');
        expect(mainRims.length, `${piece} main part has no rims`).toBeGreaterThan(0);

        const bad = mainRims.filter(c => !GOLD_RAMP.includes(c.preSquareColor));
        expect(bad.length, `${piece} main-part rims with non-gold-ramp preSquare: ${[...new Set(bad.map(c => c.preSquareColor))].join(', ')}`).toBe(0);
      }
    });

    it('silhouette edges owned by trim-declaring parts are 100% gold-trim (preSquare in ramp)', () => {
      for (const piece of pieces) {
        const coords = loadArmorPiece(piece);
        const byY = new Map();
        coords.forEach(c => {
          if (!byY.has(c.y)) byY.set(c.y, []);
          byY.get(c.y).push(c);
        });

        let eligible = 0;
        let good = 0;

        byY.forEach(ys => {
          if (ys.length < 2) return;
          const minC = ys.reduce((a, b) => (a.x < b.x ? a : b));
          const maxC = ys.reduce((a, b) => (a.x > b.x ? a : b));

          if (TRIM_PART_IDS.has(minC.partId)) {
            eligible += 1;
            if (GOLD_RAMP.includes(minC.preSquareColor)) good += 1;
          }
          if (TRIM_PART_IDS.has(maxC.partId)) {
            eligible += 1;
            if (GOLD_RAMP.includes(maxC.preSquareColor)) good += 1;
          }
        });

        expect(eligible, `${piece} had zero eligible silhouette edges from trim parts`).toBeGreaterThan(0);
        expect(good, `${piece} only ${good}/${eligible} eligible silhouette edges carry gold trim`).toBe(eligible);
      }
    });

    it('rim cells on trimmed parts carry evidence of the outline material (preSquare or isRim + gold family)', () => {
      for (const piece of pieces) {
        const coords = loadArmorPiece(piece);
        const rimsOnTrimParts = coords.filter(c => TRIM_PART_IDS.has(c.partId) && c.isRim && c.colorProvenance?.amp !== 'pixel-aa-amp');
        expect(rimsOnTrimParts.length, `${piece} no rims on declared trim parts`).toBeGreaterThan(0);

        const nonGold = rimsOnTrimParts.filter(c => !GOLD_RAMP.includes(c.preSquareColor) && !GOLD_RAMP.includes(c.color));
        expect(nonGold.length, `${piece} rims on trim parts using non-gold colors`).toBe(0);
      }
    });
  });

  describe('region-fill-amp trim assignment (unit contract, pre-selout)', () => {
    it('parts declaring outline receive exact trim color on all structural rims (100%)', () => {
      // Minimal hand-built silhouette + template exercising the trim path.
      // Two parts: a main body that requests outline: gold, and an accent inset with only fill.
      const spec = {
        contract: 'ITEM-SPEC-v1',
        id: 'trim.unit.test.v1',
        class: 'armor',
        archetype: 'test',
        canvas: { width: 16, height: 10 },
        seed: 1,
        bands: 4,
        parts: [
          {
            id: 'body',
            fill: { material: 'onyx' },
            outline: { material: 'gold', anchor: 'body' },
          },
          {
            id: 'belt',
            fill: { material: 'black_steel' },
            // deliberately no outline/trim — inset accent
          },
        ],
      };

      // Build a simple rectangular silhouette with partOf.
      // y=0..4: body (full width 4..11)
      // y=5..7: belt inset (narrower 5..10) so global silhouette L/R at y=5 still touch body? No — we make belt edges inside.
      // To test silhouette ownership, make the belt span the full width at its rows so some global L/R belong to belt.
      const cells = [];
      const partOf = new Map();

      // body rows (wider)
      for (let y = 0; y <= 4; y += 1) {
        for (let x = 4; x <= 11; x += 1) {
          cells.push({ x, y, slot: 1 });
          partOf.set(`${x},${y}`, 'body');
        }
      }
      // belt rows — full width so silhouette edges at these y belong to belt (no trim expected)
      for (let y = 5; y <= 7; y += 1) {
        for (let x = 4; x <= 11; x += 1) {
          cells.push({ x, y, slot: 1 });
          partOf.set(`${x},${y}`, 'belt');
        }
      }
      // extra body bottom to close silhouette
      for (let x = 4; x <= 11; x += 1) {
        cells.push({ x, y: 8, slot: 1 });
        partOf.set(`${x},8`, 'body');
      }

      const silhouette = Object.freeze({
        cells: Object.freeze(cells),
        partOf,
        anchors: new Map(),
        parts: Object.freeze([{ id: 'body' }, { id: 'belt' }]),
      });

      const template = Object.freeze({
        coordinates: cells.map(c => ({ ...c })),
        bands: 4,
        isTemplate: true,
      });

      const fills = applyRegionFills({ silhouette, template, spec });

      // Collect rims that belong to the 'body' part (which declared outline).
      const bodyRims = fills.coordinates.filter(c => c.partId === 'body' && c.isRim);
      expect(bodyRims.length, 'body part produced no rims').toBeGreaterThan(0);

      const bodyRimsNonGold = bodyRims.filter(c => c.color !== GOLD_BODY);
      expect(bodyRimsNonGold.length, `body rims did not all receive exact gold body trim color; got ${[...new Set(bodyRims.map(c => c.color))].join(', ')}`).toBe(0);

      // Global silhouette L/R on body-owned rows must be trim.
      const byY = new Map();
      fills.coordinates.forEach(c => {
        if (!byY.has(c.y)) byY.set(c.y, []);
        byY.get(c.y).push(c);
      });

      let bodyOwnedEdgeChecks = 0;
      let bodyOwnedEdgeTrimmed = 0;

      byY.forEach((ys, y) => {
        if (ys.length < 2) return;
        const minC = ys.reduce((a, b) => (a.x < b.x ? a : b));
        const maxC = ys.reduce((a, b) => (a.x > b.x ? a : b));
        if (minC.partId === 'body') {
          bodyOwnedEdgeChecks += 1;
          if (minC.color === GOLD_BODY) bodyOwnedEdgeTrimmed += 1;
        }
        if (maxC.partId === 'body') {
          bodyOwnedEdgeChecks += 1;
          if (maxC.color === GOLD_BODY) bodyOwnedEdgeTrimmed += 1;
        }
      });

      expect(bodyOwnedEdgeChecks, 'no body-owned silhouette edges in unit test').toBeGreaterThan(0);
      expect(bodyOwnedEdgeTrimmed, `only ${bodyOwnedEdgeTrimmed}/${bodyOwnedEdgeChecks} body silhouette edges got trim`).toBe(bodyOwnedEdgeChecks);
    });

    it('rims on a part without outline declaration do not receive the trim color', () => {
      const spec = {
        contract: 'ITEM-SPEC-v1',
        id: 'trim.unit.nooutline.v1',
        class: 'armor',
        archetype: 'test',
        canvas: { width: 12, height: 6 },
        seed: 1,
        bands: 4,
        parts: [
          { id: 'plate', fill: { material: 'black_steel' } }, // no outline
        ],
      };

      const cells = [];
      const partOf = new Map();
      for (let y = 0; y <= 5; y += 1) {
        for (let x = 2; x <= 9; x += 1) {
          cells.push({ x, y, slot: 1 });
          partOf.set(`${x},${y}`, 'plate');
        }
      }

      const silhouette = { cells: Object.freeze(cells), partOf, anchors: new Map(), parts: [{ id: 'plate' }] };
      const template = { coordinates: cells.map(c => ({ ...c })), bands: 4, isTemplate: true };

      const fills = applyRegionFills({ silhouette, template, spec });

      const rims = fills.coordinates.filter(c => c.isRim);
      const goldOnRims = rims.filter(c => c.color === GOLD_BODY);
      expect(goldOnRims.length, 'non-trim part should not receive gold trim on its rims').toBe(0);
    });
  });
});
