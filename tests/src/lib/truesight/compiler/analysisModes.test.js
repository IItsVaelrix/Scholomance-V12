import { describe, it, expect } from 'vitest';
import {
  ANALYSIS_MODES,
  COMPILER_DEPTHS,
  resolveCompilerDepth,
  getTruesightAnalysisModeConfig,
  resolveTruesightAnalysisMode,
} from '../../../../../src/lib/truesight/compiler/analysisModes.js';

describe('ANALYSIS_MODES', () => {
  it('exports the five canonical UI mode constants', () => {
    expect(ANALYSIS_MODES.NONE).toBe('none');
    expect(ANALYSIS_MODES.ANALYZE).toBe('analyze');
    expect(ANALYSIS_MODES.ASTROLOGY).toBe('astrology');
    expect(ANALYSIS_MODES.RHYME).toBe('rhyme');
    expect(ANALYSIS_MODES.VOWEL).toBe('vowel');
  });

  it('is frozen', () => {
    expect(Object.isFrozen(ANALYSIS_MODES)).toBe(true);
  });
});

describe('COMPILER_DEPTHS', () => {
  it('exports the five canonical depth constants', () => {
    expect(COMPILER_DEPTHS.LIVE_FAST).toBe('live_fast');
    expect(COMPILER_DEPTHS.BALANCED).toBe('balanced');
    expect(COMPILER_DEPTHS.DEEP).toBe('deep_truesight');
    expect(COMPILER_DEPTHS.PIXELBRAIN).toBe('pixelbrain_transverse');
    expect(COMPILER_DEPTHS.VOID_ECHO).toBe('void_echo');
  });

  it('is frozen', () => {
    expect(Object.isFrozen(COMPILER_DEPTHS)).toBe(true);
  });
});

describe('resolveCompilerDepth', () => {
  it('returns balanced for non-string input', () => {
    expect(resolveCompilerDepth(null)).toBe('balanced');
    expect(resolveCompilerDepth(42)).toBe('balanced');
    expect(resolveCompilerDepth(undefined)).toBe('balanced');
    expect(resolveCompilerDepth({})).toBe('balanced');
  });

  it('passes through canonical depth strings unchanged', () => {
    expect(resolveCompilerDepth('live_fast')).toBe('live_fast');
    expect(resolveCompilerDepth('balanced')).toBe('balanced');
    expect(resolveCompilerDepth('deep_truesight')).toBe('deep_truesight');
    expect(resolveCompilerDepth('pixelbrain_transverse')).toBe('pixelbrain_transverse');
    expect(resolveCompilerDepth('void_echo')).toBe('void_echo');
  });

  it('maps deep-analysis UI modes to deep_truesight', () => {
    expect(resolveCompilerDepth('analyze')).toBe('deep_truesight');
    expect(resolveCompilerDepth('astrology')).toBe('deep_truesight');
  });

  it('maps lightweight UI modes to balanced', () => {
    expect(resolveCompilerDepth('rhyme')).toBe('balanced');
    expect(resolveCompilerDepth('vowel')).toBe('balanced');
    expect(resolveCompilerDepth('none')).toBe('balanced');
  });

  it('falls back to balanced for unknown strings', () => {
    expect(resolveCompilerDepth('unknown')).toBe('balanced');
    expect(resolveCompilerDepth('')).toBe('balanced');
  });
});

describe('getTruesightAnalysisModeConfig', () => {
  it('returns a config object with maxWindowSyllables and maxWindowTokenSpan', () => {
    const config = getTruesightAnalysisModeConfig('balanced');
    expect(typeof config.maxWindowSyllables).toBe('number');
    expect(typeof config.maxWindowTokenSpan).toBe('number');
    expect(config.maxWindowSyllables).toBeGreaterThan(0);
    expect(config.maxWindowTokenSpan).toBeGreaterThan(0);
  });

  it('deep mode has larger windows than live_fast', () => {
    const fast = getTruesightAnalysisModeConfig('live_fast');
    const deep = getTruesightAnalysisModeConfig('deep_truesight');
    expect(deep.maxWindowSyllables).toBeGreaterThan(fast.maxWindowSyllables);
    expect(deep.maxWindowTokenSpan).toBeGreaterThan(fast.maxWindowTokenSpan);
  });

  it('resolves UI mode aliases before looking up config', () => {
    const viaUIMode = getTruesightAnalysisModeConfig('analyze');
    const viaDepthString = getTruesightAnalysisModeConfig('deep_truesight');
    expect(viaUIMode).toEqual(viaDepthString);
  });

  it('pixelbrain depth exposes enableLatticeSnapping', () => {
    const config = getTruesightAnalysisModeConfig('pixelbrain_transverse');
    expect(config.enableLatticeSnapping).toBe(true);
  });

  it('void_echo depth exposes destructiveReencoding', () => {
    const config = getTruesightAnalysisModeConfig('void_echo');
    expect(config.destructiveReencoding).toBe(true);
  });
});

describe('resolveTruesightAnalysisMode', () => {
  it('is an alias for resolveCompilerDepth — same outputs for all inputs', () => {
    const inputs = ['analyze', 'astrology', 'rhyme', 'none', 'balanced', 'deep_truesight', null, 42, 'unknown'];
    for (const input of inputs) {
      expect(resolveTruesightAnalysisMode(input)).toBe(resolveCompilerDepth(input));
    }
  });
});
