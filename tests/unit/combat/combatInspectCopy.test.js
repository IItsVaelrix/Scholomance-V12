import { describe, expect, it } from 'vitest';
import { buildInspectPresentation } from '../../../src/game/combat/combatInspectCopy.js';

describe('buildInspectPresentation', () => {
  it('describes an active obelisk with the electricity hint', () => {
    const copy = buildInspectPresentation({ isGrid: true, isObelisk: true, obeliskState: 'active' });
    expect(copy.title).toBe('Central Obelisk');
    expect(copy.characterLine).toContain('electricity');
  });

  it('describes a brazier sentinel robot', () => {
    const copy = buildInspectPresentation({
      isSentinel: true,
      sentinelLabel: 'Sentinel α',
      tx: 2,
      ty: 4,
      hp: 28,
      sentinelIntelligence: 58,
      sentinelAggroed: true,
    });
    expect(copy.title).toBe('Sentinel α');
    expect(copy.details.join(' ')).toContain('Integrity: 28');
    expect(copy.details.join(' ')).toContain('INT: 58');
    expect(copy.details.join(' ')).toContain('tactical');
    expect(copy.details.join(' ')).toContain('aggro');
    expect(copy.characterLine).toContain('tower');
  });

  it('describes a leyline node with affinity dialogue', () => {
    const copy = buildInspectPresentation({
      isGrid: true,
      leyline: { affinity: 'SONIC', id: 'ley-1' },
      tx: 2,
      ty: 3,
    });
    expect(copy.title).toBe('Leyline Node');
    expect(copy.characterLine).toContain('SONIC');
  });
});