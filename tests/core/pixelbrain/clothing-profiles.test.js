import { describe, it, expect } from 'vitest';
import '../../../codex/core/pixelbrain/character-clothing-profiles.js';
import { getPartProfile } from '../../../codex/core/pixelbrain/part-profile-library.js';

const DEFAULT_CX = 16;
const DEFAULT_SHOULDER_Y = 21;

function starboundJacket(direction = 'south', params = {}) {
  const fn = getPartProfile('character.clothing.top.starboundJacket');
  return fn(
    { cx: DEFAULT_CX, shoulderY: DEFAULT_SHOULDER_Y, ...params },
    { direction, canvas: { width: 32, height: 48 }, width: 32, height: 48 },
  );
}

describe('starboundJacket — sleeve centering', () => {
  it('south: left and right sleeves are equidistant from cx (outer edges symmetric)', () => {
    const { cells } = starboundJacket('south');

    // y = shoulderY+1 is sleeve bitmap row 0. At this row the sleeve cells are at
    // the far outer edges of the composition — the jacket body only occupies
    // cx±2 here, so the outermost cells unambiguously belong to the sleeves.
    // Left sleeve '011' → 2 cells; right sleeve '110' → 2 cells.
    const sleeveRow0Y = DEFAULT_SHOULDER_Y + 1;
    const cellsAtRow = cells.filter(c => c.y === sleeveRow0Y);
    const leftXs  = cellsAtRow.filter(c => c.x < DEFAULT_CX).map(c => c.x);
    const rightXs = cellsAtRow.filter(c => c.x > DEFAULT_CX).map(c => c.x);

    expect(leftXs.length).toBeGreaterThan(0);
    expect(rightXs.length).toBeGreaterThan(0);

    const leftOuter  = Math.min(...leftXs);   // leftmost left-sleeve cell
    const rightOuter = Math.max(...rightXs);  // rightmost right-sleeve cell

    const leftOffset  = DEFAULT_CX - leftOuter;
    const rightOffset = rightOuter - DEFAULT_CX;

    expect(
      leftOffset,
      `left sleeve outer edge at cx−${leftOffset}, right at cx+${rightOffset} — asymmetric by ${Math.abs(leftOffset - rightOffset)}px`,
    ).toBe(rightOffset);
  });
});
