import { describe, expect, it } from 'vitest';
import {
  CHROMA_COLLAPSE_THRESHOLD,
  buildChromaKinase,
  phosphorylateToken,
} from '../../../codex/core/shared/truesight/color/chroma.kinase.js';
import { decodeChromaBytecode } from '../../../codex/core/shared/truesight/color/chroma.bytecode.js';

const tokenFrom = source => ({
  text: 'bold',
  phonemes: ['B', 'AA1', 'L', 'D'],
  phoneticDiagnostics: { source },
});

const goodColour = () => ({ hex: '#4466CC', h: 240, s: 60, l: 60, nucleus: 'AA' });

const kinaseFor = (token, resolve = goodColour) =>
  buildChromaKinase(token, { chef: 'P', resolve });

describe('chroma kinase', () => {
  it('uses the same collapse threshold as qbit phosphorylation', () => {
    expect(CHROMA_COLLAPSE_THRESHOLD).toBe(0.51);
  });

  it('commits a colour backed by the dictionary', () => {
    const token = tokenFrom('scholomance_dictionary');
    const result = phosphorylateToken(token, kinaseFor(token));

    expect(result.committed).toBe(true);
    expect(result.color).toBe('#4466CC');
    expect(result.reason).toBe('K');
    expect(result.confidence).toBe(1);
  });

  it('REFUSES a guess — the colour would be a lie', () => {
    const token = tokenFrom('heuristic_fallback');
    const result = phosphorylateToken(token, kinaseFor(token));

    expect(result.committed).toBe(false);
    expect(result.reason).toBe('L');
    expect(result.color).toBeNull();
    expect(result.confidence).toBe(0.5);
  });

  it('refuses at 0.50 and commits at 0.51 — the exact boundary', () => {
    const token = tokenFrom('scholomance_dictionary');
    const kinase = kinaseFor(token);

    expect(phosphorylateToken(token, kinase, { threshold: 1.01 }).reason).toBe('L');
    expect(phosphorylateToken(token, kinase, { threshold: 1 }).reason).toBe('K');
  });

  it('refuses a malformed colour as an invalid reaction', () => {
    const token = tokenFrom('scholomance_dictionary');
    const kinase = kinaseFor(token, () => ({ hex: '#NaNNaN', h: NaN, s: 0, l: 0, nucleus: 'AA' }));
    const result = phosphorylateToken(token, kinase);

    expect(result.committed).toBe(false);
    expect(result.reason).toBe('I');
  });

  it('refuses a token with no phonemes as missing substrate', () => {
    const token = { text: 'bold', phonemes: [], phoneticDiagnostics: { source: 'unresolved' } };
    const result = phosphorylateToken(token, kinaseFor(token));

    expect(result.committed).toBe(false);
    expect(result.reason).toBe('M');
  });

  it('stamps every outcome, painted or grey', () => {
    const painted = tokenFrom('scholomance_dictionary');
    const refused = tokenFrom('heuristic_fallback');

    const a = decodeChromaBytecode(phosphorylateToken(painted, kinaseFor(painted)).bytecode);
    const b = decodeChromaBytecode(phosphorylateToken(refused, kinaseFor(refused)).bytecode);

    expect(a).toMatchObject({ authority: 'D', chef: 'P', reason: 'K', committed: true });
    expect(b).toMatchObject({ authority: 'G', chef: 'P', reason: 'L', committed: false });
  });

  it('never lets a chef claim to be another chef', () => {
    const token = tokenFrom('scholomance_dictionary');
    const sonic = buildChromaKinase(token, { chef: 'S', resolve: goodColour });
    expect(decodeChromaBytecode(phosphorylateToken(token, sonic).bytecode).chef).toBe('S');
  });
});
