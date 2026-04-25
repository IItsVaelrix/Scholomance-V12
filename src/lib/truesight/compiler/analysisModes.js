/**
 * Canonical Analysis Modes for Truesight
 * 
 * Defines the unified mode registry used by UI, Toolbar, and Compiler.
 */
export const ANALYSIS_MODES = Object.freeze({
  // Feature Modes
  NONE: 'none',
  RHYME: 'rhyme',
  ANALYZE: 'analyze',
  ASTROLOGY: 'astrology',
  
  // Authoritative / Special Render Modes
  PIXELBRAIN: 'pixelbrain_transverse',
  VOID_ECHO: 'void_echo',
  
  // Performance / Depth Levels (Compiler specific)
  LIVE_FAST: 'live_fast',
  BALANCED: 'balanced',
  DEEP: 'deep_truesight',
});

/**
 * Backward compatibility alias for the compiler's internal depth configs
 */
export const TRUESIGHT_ANALYSIS_MODES = Object.freeze({
  LIVE_FAST: ANALYSIS_MODES.LIVE_FAST,
  BALANCED: ANALYSIS_MODES.BALANCED,
  DEEP_TRUESIGHT: ANALYSIS_MODES.DEEP,
  PIXELBRAIN_TRANSVERSE: ANALYSIS_MODES.PIXELBRAIN,
  VOID_ECHO: ANALYSIS_MODES.VOID_ECHO,
});

const DEFAULT_MODE = TRUESIGHT_ANALYSIS_MODES.BALANCED;

const MODE_CONFIGS = Object.freeze({
  [TRUESIGHT_ANALYSIS_MODES.LIVE_FAST]: Object.freeze({
    id: TRUESIGHT_ANALYSIS_MODES.LIVE_FAST,
    maxWindowSyllables: 3,
    maxWindowTokenSpan: 3,
  }),
  [TRUESIGHT_ANALYSIS_MODES.BALANCED]: Object.freeze({
    id: TRUESIGHT_ANALYSIS_MODES.BALANCED,
    maxWindowSyllables: 4,
    maxWindowTokenSpan: 4,
  }),
  [TRUESIGHT_ANALYSIS_MODES.DEEP_TRUESIGHT]: Object.freeze({
    id: TRUESIGHT_ANALYSIS_MODES.DEEP_TRUESIGHT,
    maxWindowSyllables: 5,
    maxWindowTokenSpan: 6,
  }),
  [TRUESIGHT_ANALYSIS_MODES.PIXELBRAIN_TRANSVERSE]: Object.freeze({
    id: TRUESIGHT_ANALYSIS_MODES.PIXELBRAIN_TRANSVERSE,
    maxWindowSyllables: 8,
    maxWindowTokenSpan: 12,
    enableLatticeSnapping: true,
  }),
  [TRUESIGHT_ANALYSIS_MODES.VOID_ECHO]: Object.freeze({
    id: TRUESIGHT_ANALYSIS_MODES.VOID_ECHO,
    maxWindowSyllables: 10,
    maxWindowTokenSpan: 16,
    destructiveReencoding: true,
  }),
});

export function resolveTruesightAnalysisMode(mode) {
  if (typeof mode !== 'string') {
    return DEFAULT_MODE;
  }

  return MODE_CONFIGS[mode] ? mode : DEFAULT_MODE;
}

export function getTruesightAnalysisModeConfig(mode) {
  return MODE_CONFIGS[resolveTruesightAnalysisMode(mode)];
}
