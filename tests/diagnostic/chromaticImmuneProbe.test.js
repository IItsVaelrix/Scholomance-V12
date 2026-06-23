import { describe, it, expect } from 'vitest';
import {
  validateColor,
  traceChromaProvenance,
  shedChromaExosome,
  sweepChromaCorpus,
  runChromaticScan,
  summarizeChromaReport,
} from '../../codex/core/diagnostic/chromaticImmuneProbe.js';
import { HEALTH_CODES } from '../../codex/core/diagnostic/diagnostic-constants.js';
import { resolveVerseIrColor, VERSE_IR_PALETTE_FAMILIES } from '../../codex/core/shared/truesight/color/pcaChroma.js';

describe('Chromatic Immune Probe — forensics', () => {
  it('validateColor rejects the exact corruptions the pipeline emits', () => {
    expect(validateColor('#1980e6').valid).toBe(true);
    expect(validateColor('#NaNNaNNaN').valid).toBe(false);
    expect(validateColor('hsl(NaN, NaN%, NaN%)').valid).toBe(false);
    expect(validateColor(null).valid).toBe(false);
    expect(validateColor('').valid).toBe(false);
  });

  it('traces a phase-driven lightness leak to its root input', () => {
    const sample = {
      input: { family: 'AA', school: 'SONIC', phase: NaN },
      hex: '#NaNNaNNaN',
      oklch: { l: null, c: 0.223, h: 213.7 }, // only lightness died
      projection: { pc1: 0.4, pc2: -0.2, radius: 0.45 },
    };
    const p = traceChromaProvenance(sample);
    expect(p.nonFiniteFields).toContain('oklch.l');
    expect(p.suspectStage).toBe('LIGHTNESS');
    expect(p.rootInputs.join(' ')).toMatch(/phase/i);
  });

  it('sheds a CRITICAL CHROMA_BLEED exosome with intricate provenance', () => {
    const exo = shedChromaExosome({
      input: { family: 'AA', school: 'SONIC', phase: NaN },
      word: 'archive', domIndex: 7,
      hex: '#NaNNaNNaN',
      oklch: { l: null, c: 0.223, h: 213.7 },
      projection: { pc1: 0.4, pc2: -0.2, radius: 0.45 },
    });
    expect(exo.code).toBe(HEALTH_CODES.TRUESIGHT_CHROMA_BLEED);
    expect(exo.context.renderedColor).toBe('#NaNNaNNaN');
    expect(exo.context.suspectStage).toBe('LIGHTNESS');
    expect(exo.context.word).toBe('archive');
    expect(exo.checksum).toMatch(/^[0-9a-f]{8}$/);
  });

  it('produces deterministic RNA for the same corruption', () => {
    const mk = () => shedChromaExosome({
      input: { family: 'AA', school: 'SONIC', phase: NaN }, hex: '#NaNNaNNaN',
      oklch: { l: null, c: 0.223, h: 213.7 }, projection: { pc1: 0.4, pc2: -0.2, radius: 0.45 },
    });
    expect(mk().checksum).toBe(mk().checksum);
  });
});

describe('Chromatic Immune Probe — corpus fidelity (the live bug)', () => {
  it('the VerseIR color engine never bleeds a non-finite color for ANY input', () => {
    const samples = sweepChromaCorpus(resolveVerseIrColor, {
      families: VERSE_IR_PALETTE_FAMILIES,
      schools: [null, 'SONIC', 'VOID', 'GLINT'],
      // Degenerate runtime ticks a fragile clamp would leak on:
      phases: [0, 0.25, 0.5, 0.75, NaN, Infinity, undefined],
    });
    const report = runChromaticScan(samples);
     
    console.log('\n' + summarizeChromaReport(report));
    if (!report.healthy) {
       
      console.log('PATIENT-ZERO ' + JSON.stringify(report.patientZero.representative, null, 2));
    }
    expect(report.healthy, summarizeChromaReport(report)).toBe(true);
  });
});
