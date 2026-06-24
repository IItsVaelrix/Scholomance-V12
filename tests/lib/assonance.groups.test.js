import { describe, it, expect } from 'vitest';
import { PhonemeEngine } from '../../codex/core/phonology/phoneme.engine.js';
import { getVowelHue, VOWEL_HUE_MAP } from '../../codex/core/phonology/vowelWheel.js';

/**
 * Assonance Group Color Test
 *
 * Verifies that the scarecrow-verse lyrics resolve to three assonance
 * groups via the vowel-family → hue pipeline, so every word lights up
 * with a distinct, deterministic color.
 *
 * Group AA (red, hue 12)          — body, copy, sloppy
 * Group AY (yellow-green, hue 72) — mind, divine, aligned, rhyme
 * Group EH (green, hue 142)       — dead, death, breath, stench
 */

function familyOf(word) {
  return PhonemeEngine.analyzeWord(word)?.vowelFamily || null;
}

function hueOf(word) {
  const family = familyOf(word);
  return family ? getVowelHue(family) : null;
}

const groupAA = ['body', 'copy', 'sloppy'];
const groupAY = ['mind', 'divine', 'aligned', 'rhyme'];
const groupEH = ['dead', 'death', 'breath', 'stench'];

describe('Assonance Group Coloring', () => {
  // ── Correct families ──────────────────────────────────────────────────
  it('maps body, copy, sloppy to AA (red-orange group)', () => {
    groupAA.forEach((w) => {
      expect(familyOf(w), `"${w}"`).toBe('AA');
    });
  });

  it('maps mind, divine, aligned, rhyme to AY (yellow-green group)', () => {
    groupAY.forEach((w) => {
      expect(familyOf(w), `"${w}"`).toBe('AY');
    });
  });

  it('maps dead, death, breath, stench to EH (green group)', () => {
    groupEH.forEach((w) => {
      expect(familyOf(w), `"${w}"`).toBe('EH');
    });
  });

  // ── Correct hues ──────────────────────────────────────────────────────
  it('AA-group words all get hue 12 (red)', () => {
    groupAA.forEach((w) => {
      expect(hueOf(w), `"${w}"`).toBe(12);
    });
  });

  it('AY-group words all get hue 72 (yellow-green)', () => {
    groupAY.forEach((w) => {
      expect(hueOf(w), `"${w}"`).toBe(72);
    });
  });

  it('EH-group words all get hue 142 (green)', () => {
    groupEH.forEach((w) => {
      expect(hueOf(w), `"${w}"`).toBe(142);
    });
  });

  // ── Every word lights up ──────────────────────────────────────────────
  it('resolves every word to a non-null hue in 0-360', () => {
    const all = [...groupAA, ...groupAY, ...groupEH];
    all.forEach((w) => {
      const h = hueOf(w);
      expect(h, `"${w}" has no hue`).toBeGreaterThanOrEqual(0);
      expect(h, `"${w}" has no hue`).toBeLessThan(360);
    });
  });

  // ── Three distinct hues across groups ─────────────────────────────────
  it('the three assonance groups have three distinct hues', () => {
    const hues = [
      hueOf(groupAA[0]),
      hueOf(groupAY[0]),
      hueOf(groupEH[0]),
    ];
    expect([...new Set(hues)]).toHaveLength(3);
  });

  // ── Every family is registered in VOWEL_HUE_MAP ───────────────────────
  it('AA, AY, and EH are all in the VOWEL_HUE_MAP', () => {
    ['AA', 'AY', 'EH'].forEach((f) => {
      expect(VOWEL_HUE_MAP[f], `"${f}" missing from VOWEL_HUE_MAP`).toBeDefined();
      expect(typeof VOWEL_HUE_MAP[f]).toBe('number');
    });
  });
});
