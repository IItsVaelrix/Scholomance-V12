/**
 * Permanent Regression Guard — Token lineIndex Convention
 *
 * Sibling of charStart-convention: same disease, different field.
 *
 * Two analysers describe the line a token sits on, and they name it differently:
 *   - the server panel analysis (codex/server/services/panelAnalysis.service.js)
 *     emits `lineIndex`, and it is the DEFAULT path (VITE_USE_SERVER_PANEL_ANALYSIS)
 *   - the local pipeline (codex/core/analysis.pipeline.js) emits `lineNumber`
 *
 * LexicalScrollEditor read only `lineNumber`. Under the default server path that
 * is `undefined`, so the tooltip's token carried no line. ReadPage's
 * tooltipContextLine requires an integer and falls back to "", buildResonance
 * returns no partners for an empty line, and the ritual tooltip's Resonance
 * section renders nothing — for every word, forever. It looked like the rhyme
 * predictor was a stub; it was a one-word contract mismatch.
 *
 * Both conventions are 0-based.
 */

import { describe, expect, it } from 'vitest';
import { resolveTokenLineIndex } from '../../../src/lib/lexical/charStart.js';

describe('[QA] token lineIndex convention', () => {
  it('reads the server panel analysis shape (lineIndex)', () => {
    const serverToken = { word: 'told', lineIndex: 0, wordIndex: 6, charStart: 21 };
    expect(resolveTokenLineIndex(serverToken)).toBe(0);
  });

  it('reads the local analysis pipeline shape (lineNumber)', () => {
    const localToken = { word: 'told', lineNumber: 3, wordIndex: 6, charStart: 21 };
    expect(resolveTokenLineIndex(localToken)).toBe(3);
  });

  it('keeps line 0 distinguishable from "no line"', () => {
    // The original bug hid behind a falsy check: line 0 is the FIRST line and is
    // the most common case, so any `|| fallback` here silently discards it.
    expect(resolveTokenLineIndex({ lineIndex: 0 })).toBe(0);
    expect(resolveTokenLineIndex({ lineNumber: 0 })).toBe(0);
    expect(resolveTokenLineIndex({})).toBeNull();
    expect(resolveTokenLineIndex(null)).toBeNull();
    expect(resolveTokenLineIndex(undefined)).toBeNull();
  });

  it('ignores non-integer line values rather than passing them downstream', () => {
    // tooltipContextLine gates on Number.isInteger, so a NaN or string here would
    // silently become an empty context line — the exact failure being guarded.
    expect(resolveTokenLineIndex({ lineIndex: NaN })).toBeNull();
    expect(resolveTokenLineIndex({ lineIndex: '2' })).toBeNull();
    expect(resolveTokenLineIndex({ lineIndex: 1.5 })).toBeNull();
  });

  it('prefers lineIndex when a payload somehow carries both', () => {
    // The server shape is authoritative; the local field is the compatibility leg.
    expect(resolveTokenLineIndex({ lineIndex: 1, lineNumber: 9 })).toBe(1);
  });
});
