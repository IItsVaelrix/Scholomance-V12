import { describe, expect, it } from 'vitest';
import { computeEnchantSuccess, resolveEnchant, ENCHANT_FLOOR, ENCHANT_CEIL } from '../../../src/game/combat/enchantResolver.js';

const rng = (v) => () => v; // deterministic

describe('computeEnchantSuccess', () => {
  it('maps high cohesion near the ceiling and low near the floor', () => {
    expect(computeEnchantSuccess({ cohesionScore: 1 }, rng(0)).probability).toBeCloseTo(ENCHANT_CEIL, 5);
    expect(computeEnchantSuccess({ cohesionScore: 0 }, rng(0)).probability).toBeCloseTo(ENCHANT_FLOOR, 5);
  });

  it('failureCast forces probability 0 (always fizzles)', () => {
    const r = computeEnchantSuccess({ cohesionScore: 1, failureCast: true }, rng(0));
    expect(r.probability).toBe(0);
    expect(r.success).toBe(false);
  });

  it('success follows the injected rng deterministically', () => {
    const sd = { cohesionScore: 0.5 }; // prob = 0.10 + 0.88*0.5 = 0.54
    expect(computeEnchantSuccess(sd, rng(0.53)).success).toBe(true);
    expect(computeEnchantSuccess(sd, rng(0.55)).success).toBe(false);
  });

  it('missing cohesionScore is treated as lowest quality, not a crash', () => {
    expect(computeEnchantSuccess({}, rng(0)).probability).toBeCloseTo(ENCHANT_FLOOR, 5);
  });
});

describe('resolveEnchant', () => {
  it('returns element:null when no trigger matches (plain swing)', () => {
    expect(resolveEnchant({ text: 'a calm river', weave: '' }, { cohesionScore: 1 }, rng(0))).toEqual({ element: null });
  });

  it('returns the matched element with success outcome when a trigger matches', () => {
    const out = resolveEnchant({ text: 'unleash the flame', weave: '' }, { cohesionScore: 1 }, rng(0));
    expect(out.element.id).toBe('element_fire');
    expect(out.success).toBe(true);
  });

  it('matches against verse and weave combined', () => {
    const out = resolveEnchant({ text: 'strike now', weave: 'enchant burn' }, { cohesionScore: 1 }, rng(0));
    expect(out.element.id).toBe('element_fire');
  });
});
