import { describe, it, expect } from 'vitest';
import {
  ANALYSIS_MODES,
  COMPILER_DEPTHS,
  resolveCompilerDepth,
  getTruesightAnalysisModeConfig,
  resolveTruesightAnalysisMode,
} from '../../../../../../codex/core/shared/truesight/compiler/analysisModes.js';

describe('codex analysisModes', () => {
  it('ANALYSIS_MODES exports five canonical constants', () => {
    expect(ANALYSIS_MODES.NONE).toBe('none');
    expect(ANALYSIS_MODES.ANALYZE).toBe('analyze');
    expect(ANALYSIS_MODES.ASTROLOGY).toBe('astrology');
    expect(ANALYSIS_MODES.RHYME).toBe('rhyme');
    expect(ANALYSIS_MODES.VOWEL).toBe('vowel');
  });

  it('COMPILER_DEPTHS exports five depth constants', () => {
    expect(COMPILER_DEPTHS.BALANCED).toBe('balanced');
    expect(COMPILER_DEPTHS.DEEP).toBe('deep_truesight');
  });

  it('resolveCompilerDepth returns balanced for unknown input', () => {
    expect(resolveCompilerDepth(null)).toBe('balanced');
    expect(resolveCompilerDepth('unknown')).toBe('balanced');
  });

  it('resolveCompilerDepth maps analyze to deep_truesight', () => {
    expect(resolveCompilerDepth('analyze')).toBe('deep_truesight');
  });

  it('getTruesightAnalysisModeConfig returns config with window sizes', () => {
    const config = getTruesightAnalysisModeConfig('balanced');
    expect(typeof config.maxWindowSyllables).toBe('number');
    expect(typeof config.maxWindowTokenSpan).toBe('number');
  });

  it('resolveTruesightAnalysisMode is an alias for resolveCompilerDepth', () => {
    expect(resolveTruesightAnalysisMode('analyze')).toBe(resolveCompilerDepth('analyze'));
  });
});
