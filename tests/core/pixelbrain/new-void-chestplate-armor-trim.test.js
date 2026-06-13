import { describe, it, expect } from 'vitest';
import fs from 'fs';
import { VOID_CHESTPLATE_EXACT_PALETTE, VOID_CHESTPLATE_PARTS } from '../../../codex/core/pixelbrain/void-chestplate-profile.js';

const GOLD_TRIM_COLORS = ['#A58A2D', '#CEB65A', '#E8DA91'];

describe('new-void-chestplate armor trim (100% full gold trim on silhouette)', () => {
  const PKT_PATH = 'output/foundry/new-void-chestplate/new-void-chestplate.json';
  const pkt = JSON.parse(fs.readFileSync(PKT_PATH, 'utf8'));
  const coords = pkt.geometry?.coordinates || pkt.coordinates || [];

  const expectedTrimParts = VOID_CHESTPLATE_PARTS.filter(p => p.includes('_trim'));

  it('has dedicated trim parts assigned', () => {
    const usedTrimParts = new Set(
      coords
        .filter(c => c.partId && c.partId.includes('_trim'))
        .map(c => c.partId)
    );
    expectedTrimParts.forEach(part => {
      // At least the main ones should appear
      if (part.includes('pauldron') || part.includes('body') || part.includes('bottom')) {
        expect(usedTrimParts.has(part), `Missing trim part: ${part}`).toBe(true);
      }
    });
    expect(usedTrimParts.size, 'No trim parts found').toBeGreaterThan(0);
  });

  it('all trim cells use exact gold colors from palette', () => {
    const trimCells = coords.filter(c => c.partId && c.partId.includes('_trim'));
    const bad = trimCells.filter(c => !GOLD_TRIM_COLORS.includes(c.color));
    expect(bad.length, `Non-gold trim colors found: ${[...new Set(bad.map(c => c.color))].join(', ')}`).toBe(0);
  });

  it('full trim on all silhouette edges (left/right most cell per y is gold trim)', () => {
    const byY = new Map();
    coords.forEach(c => {
      if (!byY.has(c.y)) byY.set(c.y, []);
      byY.get(c.y).push(c);
    });

    let edgesChecked = 0;
    let edgesWithTrim = 0;

    byY.forEach((ycells, _y) => {
      if (ycells.length < 2) return;
      const nonCrystal = ycells.filter(c => !c.partId || !['center_core', 'top_crystal'].includes(c.partId));
      if (nonCrystal.length < 2) return;

      edgesChecked += 2;
      const minXCell = nonCrystal.reduce((a, b) => (a.x < b.x ? a : b));
      const maxXCell = nonCrystal.reduce((a, b) => (a.x > b.x ? a : b));

      const leftIsTrim = minXCell.partId && minXCell.partId.includes('_trim') && GOLD_TRIM_COLORS.includes(minXCell.color);
      const rightIsTrim = maxXCell.partId && maxXCell.partId.includes('_trim') && GOLD_TRIM_COLORS.includes(maxXCell.color);

      if (leftIsTrim) edgesWithTrim++;
      if (rightIsTrim) edgesWithTrim++;
    });

    expect(edgesWithTrim, `Only ${edgesWithTrim}/${edgesChecked} silhouette edges have full gold trim`).toBe(edgesChecked);
  });

  it('bottom is trimmed and connects left/right', () => {
    const maxY = Math.max(...coords.map(c => c.y || 0));
    const bottomCells = coords.filter(c => c.y >= maxY - 3);
    const bottomGolds = bottomCells.filter(c => GOLD_TRIM_COLORS.includes(c.color) && c.partId && c.partId.includes('_trim'));
    expect(bottomGolds.length, 'Bottom trim not connecting sides').toBeGreaterThan(5);

    // Check left and right bottom have trim
    const bottomLeft = bottomCells.filter(c => c.x < 32 && GOLD_TRIM_COLORS.includes(c.color) && c.partId && c.partId.includes('trim'));
    const bottomRight = bottomCells.filter(c => c.x > 32 && GOLD_TRIM_COLORS.includes(c.color) && c.partId && c.partId.includes('trim'));
    expect(bottomLeft.length, 'Left bottom trim missing').toBeGreaterThan(0);
    expect(bottomRight.length, 'Right bottom trim missing').toBeGreaterThan(0);
  });

  it('trim cells use only exact palette golds', () => {
    const trimCells = coords.filter(c => c.partId && c.partId.includes('_trim'));
    const paletteSet = new Set(VOID_CHESTPLATE_EXACT_PALETTE);
    const bad = trimCells.filter(c => !paletteSet.has(c.color));
    expect(bad.length, 'Trim using non-palette colors').toBe(0);
  });
});
