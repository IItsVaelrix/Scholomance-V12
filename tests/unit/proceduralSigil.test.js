import { describe, it, expect } from 'vitest';
import { buildSigil, SIGIL_VIEWBOX } from '../../src/pages/Read/proceduralSigil.js';

const specs = (...pairs) => pairs.map(([token, manner]) => ({ token, manner }));

describe('buildSigil', () => {
  it('is deterministic — same phoneme texture yields an identical sigil', () => {
    const texture = specs(['k', 'plosive'], ['æ', 'vowel'], ['t', 'plosive']);
    const a = buildSigil(texture, 'cat');
    const b = buildSigil(texture.map((s) => ({ ...s })), 'cat');
    expect(a.strokes).toEqual(b.strokes);
    expect(a.seed).toBe(b.seed);
  });

  it('diverges when the phoneme texture differs', () => {
    const cat = buildSigil(specs(['k', 'plosive'], ['æ', 'vowel'], ['t', 'plosive']), 'cat');
    const dog = buildSigil(specs(['d', 'plosive'], ['ɔ', 'vowel'], ['g', 'plosive']), 'dog');
    expect(cat.seed).not.toBe(dog.seed);
    expect(cat.strokes).not.toEqual(dog.strokes);
  });

  it('produces one ring stroke per phoneme plus a central core stroke', () => {
    const sigil = buildSigil(specs(['m', 'nasal'], ['ə', 'vowel'], ['n', 'nasal']), 'man');
    expect(sigil.nodeCount).toBe(3);
    expect(sigil.strokes).toHaveLength(4); // 3 ring edges + 1 core
    expect(sigil.strokes.at(-1).kind).toBe('core');
  });

  it('cycles short words up to a closeable figure (min 3 nodes)', () => {
    const sigil = buildSigil(specs(['eɪ', 'vowel']), 'a');
    expect(sigil.nodeCount).toBe(3);
    expect(sigil.strokes.length).toBeGreaterThanOrEqual(4);
  });

  it('caps long words so the sigil stays a glyph (max 9 nodes)', () => {
    const long = specs(...Array.from({ length: 18 }, (_, i) => [`p${i}`, 'fricative']));
    const sigil = buildSigil(long, 'antidisestablishmentarian');
    expect(sigil.nodeCount).toBe(9);
  });

  it('emits valid path strings within the declared viewBox field', () => {
    const sigil = buildSigil(specs(['s', 'fricative'], ['i', 'vowel'], ['ɡ', 'plosive'], ['l', 'approximant']), 'sigil');
    expect(sigil.viewBox).toBe(SIGIL_VIEWBOX);
    for (const stroke of sigil.strokes) {
      expect(stroke.d).toMatch(/^M /);
      const coords = stroke.d.match(/-?\d+(\.\d+)?/g).map(Number);
      for (const n of coords) {
        expect(n).toBeGreaterThanOrEqual(-20);
        expect(n).toBeLessThanOrEqual(SIGIL_VIEWBOX + 20);
      }
    }
  });

  it('returns an empty sigil for no phonemes', () => {
    expect(buildSigil([], '').strokes).toHaveLength(0);
    expect(buildSigil(undefined, '').strokes).toHaveLength(0);
  });
});
