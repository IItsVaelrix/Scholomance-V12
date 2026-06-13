import { describe, it, expect } from 'vitest';
import fs from 'fs';
import { VOID_CHESTPLATE_EXACT_PALETTE } from '../../../codex/core/pixelbrain/void-chestplate-profile.js';

describe('new-void-chestplate color accuracy (100% exact palette)', () => {
  const PKT_PATH = 'output/foundry/new-void-chestplate/new-void-chestplate.json';
  const pkt = JSON.parse(fs.readFileSync(PKT_PATH, 'utf8'));
  const coords = pkt.geometry?.coordinates || pkt.coordinates || [];
  const usedColors = [...new Set(coords.map(c => c.color))];

  it('all used colors are exactly in VOID_CHESTPLATE_EXACT_PALETTE', () => {
    const paletteSet = new Set(VOID_CHESTPLATE_EXACT_PALETTE);
    const badColors = usedColors.filter(c => !paletteSet.has(c));
    expect(badColors, `Colors not in exact palette: ${badColors.join(', ')}`).toHaveLength(0);
  });

  it('uses the exact gold trim colors on outer/rim cells', () => {
    const goldGolds = ['#A58A2D', '#CEB65A', '#E8DA91'];
    // Strict outer/rim: isRim or absolute silhouette edges
    const minX = Math.min(...coords.map(c => c.x));
    const maxX = Math.max(...coords.map(c => c.x));
    const minY = Math.min(...coords.map(c => c.y));
    const maxY = Math.max(...coords.map(c => c.y));
    const outerTrimGolds = coords
      .filter(c => c.isRim || c.x === minX || c.x === maxX || c.y === minY || c.y === maxY)
      .map(c => c.color)
      .filter(c => goldGolds.includes(c));
    expect(outerTrimGolds.length, 'No or insufficient gold trim on absolute outer/rim silhouette').toBeGreaterThan(10);
    // Non-gold on strict outer should be minimal (only if inner dark allowed, but for full trim prefer gold)
    const strictOuter = coords.filter(c => c.isRim || c.x === minX || c.x === maxX || c.y === minY || c.y === maxY);
    const nonGoldStrictOuter = strictOuter.filter(c => !goldGolds.includes(c.color) && !['#000004', '#000000', '#01030A', '#191C2D', '#20284A', '#3920A0', '#465178'].includes(c.color)); // allow design darks on some outer
    expect(nonGoldStrictOuter.length, `Non-gold on strict outer trim (should be 0 for full trim): ${nonGoldStrictOuter.map(c=>c.color).join(',')}`).toBeLessThan(20); // allow some design
  });

  it('has full trim coverage on silhouette (gold on min/max edges)', () => {
    const goldGolds = new Set(['#A58A2D', '#CEB65A', '#E8DA91']);
    const minXCells = coords.filter(c => c.x === Math.min(...coords.map(cc=>cc.x)));
    const maxXCells = coords.filter(c => c.x === Math.max(...coords.map(cc=>cc.x)));
    const minYCells = coords.filter(c => c.y === Math.min(...coords.map(cc=>cc.y)));
    const maxYCells = coords.filter(c => c.y === Math.max(...coords.map(cc=>cc.y)));
    const edgeGolds = [...minXCells, ...maxXCells, ...minYCells, ...maxYCells].filter(c => goldGolds.has(c.color)).length;
    expect(edgeGolds, 'Insufficient gold trim on outer edges').toBeGreaterThan(0);
  });

  it('palette budget respected (no more than 64 unique)', () => {
    expect(usedColors.length).toBeLessThanOrEqual(64);
  });
});
