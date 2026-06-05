import { describe, it, expect } from 'vitest';
import { analyzeResumeLegibility, runAtsHmmPass } from '../../codex/core/career/ats-hmm/index.js';
import { tokenizeResume, ATS_FUNCTION_WORDS } from '../../codex/core/career/ats-hmm/atsSyntaxTokens.js';
import { buildAtsArbiterSummary } from '../../codex/core/career/ats-hmm/atsArbiter.model.js';

// A natural résumé bullet (verb-led, glued by prepositions/conjunctions) vs. the exact
// keyword-stuffed "CORE RESONANCE" line the old transmuter appended.
const NATURAL_BULLET =
  'Oversaw high-volume inbound customer inquiries via email, resolving issues accurately and within service-level expectations.';
const STUFFED_LINE =
  'Resonance Optimization High-Fidelity Scalable Infrastructure Distributed Consensus Systemic Calibration';

const lineFor = (report, needle) => report.lines.find((l) => l.text.includes(needle));

describe('ATS legibility arbiter', () => {
  it('ranks a keyword-stuffed line strictly below a natural bullet', () => {
    const report = analyzeResumeLegibility(`${NATURAL_BULLET}\n${STUFFED_LINE}`);
    const natural = lineFor(report, 'Oversaw');
    const stuffed = lineFor(report, 'Resonance');
    expect(natural.legibilityScore).toBeGreaterThan(stuffed.legibilityScore);
  });

  it('flags an obvious noun-pile as keyword_stuffed', () => {
    const report = analyzeResumeLegibility(STUFFED_LINE);
    const stuffed = lineFor(report, 'Resonance');
    expect(stuffed.verdict).toBe('keyword_stuffed');
    expect(stuffed.signals.functionRatio).toBe(0); // zero connective tissue
    expect(report.flagged).toHaveLength(1);
  });

  it('does not flag a natural bullet', () => {
    const report = analyzeResumeLegibility(NATURAL_BULLET);
    const natural = lineFor(report, 'Oversaw');
    expect(natural.verdict).not.toBe('keyword_stuffed');
    expect(report.flagged).toHaveLength(0);
  });

  it('detects numeric metric tokens as a quantification signal', () => {
    const report = analyzeResumeLegibility('Reduced average handle time by 23% across 1,200 weekly tickets.');
    const line = report.lines[0];
    expect(line.signals.metricCount).toBeGreaterThanOrEqual(2);
  });

  it('treats short heading lines as fragments, not stuffing', () => {
    const report = analyzeResumeLegibility('PROFESSIONAL EXPERIENCE');
    expect(report.lines[0].verdict).toBe('fragment');
    expect(report.flagged).toHaveLength(0);
  });

  it('is deterministic — identical input yields identical report', () => {
    const text = `${NATURAL_BULLET}\n${STUFFED_LINE}`;
    expect(analyzeResumeLegibility(text)).toEqual(analyzeResumeLegibility(text));
  });

  it('returns an empty, safe report for empty input', () => {
    const report = analyzeResumeLegibility('');
    expect(report.tokenCount).toBe(0);
    expect(report.lines).toHaveLength(0);
    expect(report.legibilityScore).toBe(1);
  });

  it('pass refines roles but the pure builder stays callable in isolation', () => {
    const tokens = tokenizeResume(NATURAL_BULLET);
    const { perTokenLogProbByLine } = runAtsHmmPass(tokens, ATS_FUNCTION_WORDS);
    const summary = buildAtsArbiterSummary(tokens, perTokenLogProbByLine);
    expect(summary.model).toBe('ats_legibility_arbiter');
    expect(summary.tokenCount).toBe(tokens.length);
  });
});
