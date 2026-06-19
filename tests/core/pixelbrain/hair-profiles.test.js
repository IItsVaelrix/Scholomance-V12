import { describe, it, expect } from 'vitest';
import '../../../codex/core/pixelbrain/character-hair-profiles.js';
import { getPartProfile } from '../../../codex/core/pixelbrain/part-profile-library.js';

const STREAK = 'neon_mint_signal';
const DEFAULT_CX = 16;
const DEFAULT_TOP_Y = 2;
const HAIR_BLOCK_END_ROW = DEFAULT_TOP_Y + 6; // topY+6

function cometSweep(direction, params = {}) {
  const fn = getPartProfile('character.hair.cometSweep');
  return fn(
    { cx: DEFAULT_CX, topY: DEFAULT_TOP_Y, ...params },
    { direction, canvas: { width: 32, height: 48 }, width: 32, height: 48 },
  );
}

// ─── Hair Rim ─────────────────────────────────────────────────────────────────

describe('cometSweep — top hair rim', () => {
  it('south: hair rim tapers — each row is no wider than the row above it', () => {
    // The rim should curve inward as it descends, never staying flat for more
    // than one row. A flat cap reads as a boxy rectangle at 1x.
    const { cells } = cometSweep('south');
    const rimRows = [];
    for (let y = DEFAULT_TOP_Y; y <= DEFAULT_TOP_Y + 6; y += 1) {
      const xs = cells.filter(c => c.y === y).map(c => c.x);
      const hw = xs.length > 0 ? Math.max(...xs) - DEFAULT_CX : 0;
      rimRows.push(hw);
    }
    // No two consecutive rows should share the same halfW (monotone taper required)
    for (let i = 1; i < rimRows.length; i += 1) {
      expect(
        rimRows[i],
        `hair rim plateau: rows ${i - 1} and ${i} both have halfW=${rimRows[i]}`,
      ).toBeLessThanOrEqual(rimRows[i - 1]);
    }
    // And the top must actually narrow somewhere in the first 4 rows
    expect(rimRows[3]).toBeLessThan(rimRows[0]);
  });

  it('south: hair rim width at topY respects headHalfW param', () => {
    // When headHalfW is passed, the rim at topY should be close to headHalfW,
    // not always default-6-based. Passing headHalfW=4 should produce a narrower rim.
    const narrow = cometSweep('south', { headHalfW: 4 });
    const wide   = cometSweep('south', { headHalfW: 8 });

    const rimWidth = ({ cells }) => {
      const xs = cells.filter(c => c.y === DEFAULT_TOP_Y).map(c => c.x);
      return Math.max(...xs) - Math.min(...xs) + 1;
    };

    expect(rimWidth(narrow)).toBeLessThan(rimWidth(wide));
  });
});

// ─── Hair Flow ────────────────────────────────────────────────────────────────

describe('cometSweep — hair flow consistency', () => {
  it('south: streak accent sits on the right side of the hair block', () => {
    const { cells } = cometSweep('south');
    const streakCells = cells.filter(c =>
      c.y >= DEFAULT_TOP_Y && c.y <= HAIR_BLOCK_END_ROW && c.color === STREAK,
    );
    expect(streakCells.length).toBeGreaterThan(0);
    expect(streakCells.every(c => c.x >= DEFAULT_CX)).toBe(true);
  });

  it('north: streak accent sits on the LEFT side (model-space match with south)', () => {
    // In back view the character's model-right becomes screen-left.
    // The comet sweeps in the same direction relative to the character,
    // so the accent must land at dx < 0 (screen-left) in north view.
    const { cells } = cometSweep('north');
    const streakCells = cells.filter(c =>
      c.y >= DEFAULT_TOP_Y && c.y <= HAIR_BLOCK_END_ROW && c.color === STREAK,
    );
    expect(streakCells.length).toBeGreaterThan(0);
    expect(
      streakCells.every(c => c.x <= DEFAULT_CX),
      'north streak should be on left side (x ≤ cx), but found cells to the right',
    ).toBe(true);
  });

  it('north: no cells in the two gap rows between hair block and wings (matches south)', () => {
    // South wings start at topY+9, leaving rows topY+7 and topY+8 empty.
    // North must do the same so the gap/wing read is consistent across views.
    const GAP_Y1 = DEFAULT_TOP_Y + 7;
    const GAP_Y2 = DEFAULT_TOP_Y + 8;

    const { cells: southCells } = cometSweep('south');
    const { cells: northCells } = cometSweep('north');

    // Verify south already has the gap (sanity)
    expect(southCells.filter(c => c.y === GAP_Y1)).toHaveLength(0);
    expect(southCells.filter(c => c.y === GAP_Y2)).toHaveLength(0);

    // North must also have the gap
    expect(
      northCells.filter(c => c.y === GAP_Y1),
      `north has cells at gap row y=${GAP_Y1} — wings start too early`,
    ).toHaveLength(0);
    expect(
      northCells.filter(c => c.y === GAP_Y2),
      `north has cells at gap row y=${GAP_Y2} — wings start too early`,
    ).toHaveLength(0);
  });
});
