/**
 * The Phonemegram of Color (Study1 §Phonemegram applied to TrueSight).
 *
 * Adapts Ratnanather et al. (2021) phoneme-accuracy methodology to color:
 *   - Confusion matrix: pairwise color ΔE vs pairwise phoneme similarity.
 *   - Pearson correlation between the two — the headline PhD-worthy number.
 *   - Per-feature partitioning: do colors preserve each phonological feature?
 *
 * If the color system is "perceptually accurate", then phonemes that sound
 * similar should look similar. We measure that explicitly.
 */
import { describe, it, expect } from 'vitest';
import { resolveVerseIrColor, VERSE_IR_PALETTE_FAMILIES } from '../../../src/lib/truesight/color/pcaChroma.js';
import { deltaE } from '../../../src/lib/truesight/color/oklch.js';
import { PhoneticSimilarity } from '../../../codex/core/phonology/phoneticSimilarity.js';
import { PHONOLOGICAL_FEATURES_V1 } from '../../../codex/core/phonology/phoneme.constants.js';

const VOWEL_FAMILIES = [
  'IY', 'IH', 'EY', 'EH', 'AE',
  'AA', 'AH', 'AO', 'OW', 'UH',
  'UW', 'ER', 'AY', 'AW', 'OY',
];

function pearson(xs, ys) {
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx2 = 0, dy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    num += dx * dy;
    dx2 += dx * dx;
    dy2 += dy * dy;
  }
  return num / Math.sqrt(dx2 * dy2);
}

describe('colorPhonemegram — PhD-worthy color accuracy', () => {
  const colors = Object.fromEntries(
    VOWEL_FAMILIES.map((f) => [f, resolveVerseIrColor(f, 'SONIC').oklch])
  );

  it('every vowel family resolves to a unique OKLCh point (no 180° collisions)', () => {
    const seen = new Map();
    for (const family of VOWEL_FAMILIES) {
      const c = colors[family];
      expect(c).toBeDefined();
      expect(Number.isFinite(c.l) && Number.isFinite(c.c) && Number.isFinite(c.h)).toBe(true);

      // Assert minimum ΔE from every other family — true uniqueness.
      for (const [otherFamily, otherColor] of seen) {
        const dE = deltaE(c, otherColor);
        expect(dE, `${family} vs ${otherFamily} too similar (ΔE=${dE.toFixed(3)})`).toBeGreaterThan(0.005);
      }
      seen.set(family, c);
    }
  });

  it('phoneme similarity correlates with color similarity (Pearson r ≥ 0.30)', () => {
    const xs = []; // phoneme similarity (0..1)
    const ys = []; // color closeness = 1 - normalized ΔE

    let maxDE = 0;
    const pairs = [];
    for (let i = 0; i < VOWEL_FAMILIES.length; i++) {
      for (let j = i + 1; j < VOWEL_FAMILIES.length; j++) {
        const a = VOWEL_FAMILIES[i];
        const b = VOWEL_FAMILIES[j];
        const sim = PhoneticSimilarity.getVowelSimilarity(a, b);
        const dE = deltaE(colors[a], colors[b]);
        pairs.push({ sim, dE });
        if (dE > maxDE) maxDE = dE;
      }
    }
    for (const { sim, dE } of pairs) {
      xs.push(sim);
      ys.push(1 - (dE / maxDE));
    }

    const r = pearson(xs, ys);

    // Floor: positive correlation. The Sonic similarity matrix is sparse, so
    // many pairs report 0 similarity — this dampens r. The PCA-derived color
    // path still must trend with the perceptual data, not against it.
    expect(r, `Pearson r = ${r.toFixed(3)}`).toBeGreaterThan(0.30);
  });

  it('per-feature partitioning: vowel HEIGHT clusters separate in color space', () => {
    const heightGroups = { 0: [], 1: [], 2: [] };
    for (const f of VOWEL_FAMILIES) {
      const h = PHONOLOGICAL_FEATURES_V1[f]?.height;
      if (h !== undefined) heightGroups[h].push(f);
    }

    // Mean intra-group ΔE vs mean inter-group ΔE
    const avgPair = (families) => {
      let sum = 0, n = 0;
      for (let i = 0; i < families.length; i++) {
        for (let j = i + 1; j < families.length; j++) {
          sum += deltaE(colors[families[i]], colors[families[j]]);
          n++;
        }
      }
      return n ? sum / n : 0;
    };

    let intra = 0, intraN = 0;
    for (const fams of Object.values(heightGroups)) {
      if (fams.length >= 2) {
        intra += avgPair(fams);
        intraN++;
      }
    }
    intra /= intraN;

    const inter = avgPair(VOWEL_FAMILIES);

    expect(intra, `intra=${intra.toFixed(3)} inter=${inter.toFixed(3)}`).toBeLessThan(inter);
  });

  it('per-feature partitioning: vowel PLACE (front/central/back) separates in hue', () => {
    const placeGroups = { 0: [], 1: [], 2: [] };
    for (const f of VOWEL_FAMILIES) {
      const p = PHONOLOGICAL_FEATURES_V1[f]?.place;
      if (p !== undefined) placeGroups[p].push(f);
    }

    // For each group, hue should be reasonably tight (front vowels cluster, back vowels cluster).
    const hueSpread = (families) => {
      if (families.length < 2) return 0;
      const hues = families.map((f) => colors[f].h);
      // Circular variance
      const sumSin = hues.reduce((a, h) => a + Math.sin((h * Math.PI) / 180), 0) / hues.length;
      const sumCos = hues.reduce((a, h) => a + Math.cos((h * Math.PI) / 180), 0) / hues.length;
      return 1 - Math.hypot(sumSin, sumCos); // 0 = tight, 1 = uniform
    };

    const front = hueSpread(placeGroups[0]);
    const central = hueSpread(placeGroups[1]);
    const back = hueSpread(placeGroups[2]);
    const overall = hueSpread(VOWEL_FAMILIES);

    // Each group should be tighter than the full set.
    const meanGroup = (front + central + back) / 3;
    expect(meanGroup, `mean group spread=${meanGroup.toFixed(3)}, overall=${overall.toFixed(3)}`)
      .toBeLessThan(overall);
  });

  it('school anchoring: same family yields different hues across schools', () => {
    const ae_sonic = resolveVerseIrColor('AE', 'SONIC').oklch.h;
    const ae_psychic = resolveVerseIrColor('AE', 'PSYCHIC').oklch.h;
    const ae_void = resolveVerseIrColor('AE', 'VOID').oklch.h;

    const distinct = new Set([
      Math.round(ae_sonic),
      Math.round(ae_psychic),
      Math.round(ae_void),
    ]);
    expect(distinct.size, 'AE must shift hue per school').toBeGreaterThan(1);
  });
});
