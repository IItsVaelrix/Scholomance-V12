import { describe, expect, it } from 'vitest';
import {
  encodeChromaBytecode,
  decodeChromaBytecode
} from '../../../codex/core/shared/truesight/color/chroma.bytecode.js';

const COMMITTED = {
  authority: 'D', chef: 'P', reason: 'K', confidence: 1,
  h: 240, s: 60, l: 60, nucleus: 'AA'
};

describe('PB-CHROMA v2', () => {
  it('encodes a committed dictionary colour', () => {
    expect(encodeChromaBytecode(COMMITTED)).toBe('PB-CHROMA-v2-DPK64-0f03c3cAA');
  });

  it('round-trips every field', () => {
    expect(decodeChromaBytecode(encodeChromaBytecode(COMMITTED))).toEqual({
      version: 2, authority: 'D', chef: 'P', reason: 'K', confidence: 1,
      h: 240, s: 60, l: 60, nucleus: 'AA', committed: true
    });
  });

  it('stamps a refused guess — no colour, but a full account of why', () => {
    const refused = encodeChromaBytecode({
      authority: 'G', chef: 'S', reason: 'L', confidence: 0.5,
      h: 0, s: 0, l: 0, nucleus: null
    });
    // hue(3) + sat(2) + lit(2) = seven hex digits, all zero, then the null nucleus.
    expect(refused).toBe('PB-CHROMA-v2-GSL32-0000000__');

    const decoded = decodeChromaBytecode(refused);
    expect(decoded.committed).toBe(false);
    expect(decoded.reason).toBe('L');
    expect(decoded.authority).toBe('G');
    expect(decoded.nucleus).toBeNull();
  });

  it('round-trips across every authority, chef, and reason', () => {
    for (const authority of ['D', 'O', 'C', 'G', 'U', 'X']) {
      for (const chef of ['P', 'S', 'Q', 'A', 'N']) {
        for (const reason of ['K', 'M', 'I', 'L']) {
          const encoded = encodeChromaBytecode({
            authority, chef, reason, confidence: 0.8, h: 12, s: 34, l: 56, nucleus: 'IH'
          });
          const decoded = decodeChromaBytecode(encoded);
          expect(decoded, encoded).toMatchObject({ authority, chef, reason });
        }
      }
    }
  });

  it('refuses to decode a v1 stamp, so a probe can tell an old producer from a new one', () => {
    expect(decodeChromaBytecode('PB-CHROMA-0f03c3cAA')).toBeNull();
    expect(decodeChromaBytecode('PB-CHROMA-0000050__')).toBeNull();
  });

  it('refuses garbage rather than inventing a provenance', () => {
    for (const junk of ['', null, undefined, 'PB-CHROMA-v2-', 'PB-CHROMA-v2-ZZZ99-000000__', 'hsl(0,0%,0%)']) {
      expect(decodeChromaBytecode(junk), String(junk)).toBeNull();
    }
  });
});
