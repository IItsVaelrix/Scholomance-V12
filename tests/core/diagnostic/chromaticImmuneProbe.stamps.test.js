import { describe, expect, it } from 'vitest';
import { scanChromaStamps } from '../../../codex/core/diagnostic/chromaticImmuneProbe.js';

const codes = report => report.findings.map(f => f.code).sort();

describe('scanChromaStamps', () => {
  it('is silent on a healthy, fully-authoritative view', () => {
    const report = scanChromaStamps([
      'PB-CHROMA-v2-DPK64-0f03c3cAA',
      'PB-CHROMA-v2-DPK64-0f03c3cIH',
    ]);
    expect(report.findings).toEqual([]);
    expect(report.authorityHistogram).toEqual({ D: 2 });
  });

  it('detects chroma bleed — a malformed colour reaction', () => {
    const report = scanChromaStamps(['PB-CHROMA-v2-DPI64-0000000AA']);
    expect(codes(report)).toContain('CHROMA_BLEED');
  });

  it('detects THE LIE PAINTED — a committed colour with no authority behind it', () => {
    // Must be impossible. If it is ever seen, a chef bypassed the kinase.
    const report = scanChromaStamps(['PB-CHROMA-v2-GPK32-0f03c3cAA']);
    expect(codes(report)).toContain('LIE_PAINTED');
  });

  it('detects a view that lost its authority — the API is down or flooded', () => {
    const report = scanChromaStamps([
      'PB-CHROMA-v2-GSL32-0000000__',
      'PB-CHROMA-v2-GSL32-0000000__',
    ]);
    expect(codes(report)).toContain('AUTHORITY_LOST');
  });

  it('detects a torn frame — some tokens kept the dictionary, others fell back', () => {
    const report = scanChromaStamps([
      'PB-CHROMA-v2-DPK64-0f03c3cAA',
      'PB-CHROMA-v2-GSL32-0000000__',
    ]);
    expect(codes(report)).toContain('TORN_FRAME');
  });

  it('detects too many chefs in one kitchen', () => {
    const report = scanChromaStamps([
      'PB-CHROMA-v2-DPK64-0f03c3cAA',
      'PB-CHROMA-v2-DSK64-0f03c3cIH',
    ]);
    expect(codes(report)).toContain('TOO_MANY_CHEFS');
    expect(report.chefs.sort()).toEqual(['P', 'S']);
  });

  it('ignores v1 stamps instead of guessing at them', () => {
    const report = scanChromaStamps(['PB-CHROMA-0f03c3cAA', 'not a stamp']);
    expect(report.decoded).toBe(0);
    expect(report.findings).toEqual([]);
  });
});
