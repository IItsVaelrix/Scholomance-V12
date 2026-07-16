import { describe, it, expect } from 'vitest';
import { cohensKappa } from '../../bench/semantic-calculus/kappa.mjs';

/** Build two rater maps from parallel label arrays. */
const raters = (a, b) => [
  new Map(a.map((k, i) => [`i${i}`, k])),
  new Map(b.map((k, i) => [`i${i}`, k])),
];

describe("Cohen's kappa — verified against known worked examples", () => {
  it('Wikipedia worked example: 20/5/10/15 -> kappa = 0.4', () => {
    // Classic 2x2: both say yes 20, A yes/B no 5, A no/B yes 10, both no 15.
    // po = 35/50 = 0.70 ; pe = (0.5*0.6)+(0.5*0.4) = 0.50 ; k = 0.4
    const a = [...Array(20).fill('yes'), ...Array(5).fill('yes'), ...Array(10).fill('no'), ...Array(15).fill('no')];
    const b = [...Array(20).fill('yes'), ...Array(5).fill('no'), ...Array(10).fill('yes'), ...Array(15).fill('no')];
    const r = cohensKappa(...raters(a, b), ['yes', 'no']);
    expect(r.po).toBeCloseTo(0.7, 10);
    expect(r.pe).toBeCloseTo(0.5, 10);
    expect(r.kappa).toBeCloseTo(0.4, 10);
  });

  it('perfect agreement -> kappa = 1', () => {
    const a = ['Do', 'Theory', 'Clarify', 'Do', 'Probe'];
    const r = cohensKappa(...raters(a, [...a]));
    expect(r.kappa).toBeCloseTo(1, 10);
  });

  it('THE FAILURE MODE: both raters always say "Do" -> 100% agreement, kappa 0', () => {
    // Chance already explains them. This is why raw accuracy is not enough —
    // "Do" is the tempting default and it would look like total success.
    const a = Array(50).fill('Do');
    const r = cohensKappa(...raters(a, [...a]));
    expect(r.po).toBe(1);
    expect(r.kappa).toBeNaN(); // pe === 1: agreement is definitionally chance
  });

  it('systematic disagreement -> negative kappa (worse than chance)', () => {
    const a = ['Do', 'Theory', 'Do', 'Theory'];
    const b = ['Theory', 'Do', 'Theory', 'Do'];
    const r = cohensKappa(...raters(a, b), ['Do', 'Theory']);
    expect(r.kappa).toBeLessThan(0);
  });

  it('chance-level agreement -> kappa ~ 0', () => {
    // A alternates, B alternates on a different period: agreement ~= chance.
    const a = Array.from({ length: 100 }, (_, i) => (i % 2 ? 'Do' : 'Theory'));
    const b = Array.from({ length: 100 }, (_, i) => (Math.floor(i / 2) % 2 ? 'Do' : 'Theory'));
    const r = cohensKappa(...raters(a, b), ['Do', 'Theory']);
    expect(Math.abs(r.kappa)).toBeLessThan(0.05);
  });

  it('kappa is symmetric', () => {
    // 'Escalate' here until rev 6 cut it — a law.decision, never an act type.
    const a = ['Do', 'Theory', 'Clarify', 'Do', 'Probe', 'Theory'];
    const b = ['Do', 'Clarify', 'Clarify', 'Hypothesis', 'Probe', 'Theory'];
    const [ma, mb] = raters(a, b);
    expect(cohensKappa(ma, mb).kappa).toBeCloseTo(cohensKappa(mb, ma).kappa, 10);
  });

  it('a label outside the category set is named, not a TypeError', () => {
    // Three channels now share this function with different category sets, so
    // handing it the wrong ones is a live mistake. It used to die on
    // `matrix[x][y]` with "cannot read properties of undefined".
    const [ma, mb] = raters(['Do', 'Escalate'], ['Do', 'Do']);
    expect(() => cohensKappa(ma, mb)).toThrow(/Escalate/);
  });

  it('only scores overlapping items', () => {
    const ma = new Map([['x', 'Do'], ['y', 'Theory'], ['z', 'Probe']]);
    const mb = new Map([['x', 'Do'], ['y', 'Theory']]);
    expect(cohensKappa(ma, mb).n).toBe(2);
  });

  it('per-kind kappa isolates the failing boundary', () => {
    // Perfect on Do; Theory/Hypothesis systematically swapped.
    const a = ['Do', 'Do', 'Do', 'Do', 'Theory', 'Theory', 'Hypothesis', 'Hypothesis'];
    const b = ['Do', 'Do', 'Do', 'Do', 'Hypothesis', 'Hypothesis', 'Theory', 'Theory'];
    const r = cohensKappa(...raters(a, b));
    expect(r.byCategory.Do.kappa).toBeCloseTo(1, 10);
    expect(r.byCategory.Theory.kappa).toBeLessThan(0);
    expect(r.byCategory.Hypothesis.kappa).toBeLessThan(0);
  });

  it('flags the degenerate case explicitly rather than reporting success', () => {
    // A single item, or any corpus where neither rater discriminated, has pe=1.
    // The gate must not pass on it: NaN >= 0.7 is false, which is the point.
    const r = cohensKappa(new Map([['x', 'Do']]), new Map([['x', 'Do']]));
    expect(r.degenerate).toBe(true);
    expect(r.kappa).toBeNaN();
    expect(r.kappa >= 0.7).toBe(false); // gate FAILS, as it must
  });

  it('real discrimination is not flagged degenerate', () => {
    const a = ['Do', 'Theory', 'Do', 'Clarify'];
    const b = ['Do', 'Theory', 'Clarify', 'Clarify'];
    const r = cohensKappa(...raters(a, b));
    expect(r.degenerate).toBe(false);
    expect(Number.isNaN(r.kappa)).toBe(false);
  });
});
