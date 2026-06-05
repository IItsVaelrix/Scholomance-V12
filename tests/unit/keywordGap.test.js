import { describe, it, expect } from 'vitest';
import { analyzeKeywordGap, detectTorqueConflicts } from '../../src/lib/career/keyword-gap.js';
import { TORQUE_MAP } from '../../src/lib/career/transmuter.js';
import { STOPWORDS } from '../../src/lib/career/stopwords.js';
import { stem } from '../../src/lib/career/text-utils.js';

const findTerm = (hits, term) => hits.find((h) => h.term === term);

describe('stopwords ∩ TORQUE_MAP invariant', () => {
  it('no torque key is also a stopword (a collision makes the term unprotectable)', () => {
    // A term that is both a stopword and a torque key can never surface as a JD keyword,
    // so it can never be a torque conflict, so the transmuter rewrites it unprotected —
    // silently widening the gap this engine measures. Guarding the seam closed in fix #2.
    const collisions = Object.keys(TORQUE_MAP).filter((key) => STOPWORDS.has(key));
    expect(collisions).toEqual([]);
  });

  it('a torque-key JD term surfaces as a conflict and is not stopword-filtered', () => {
    const report = analyzeKeywordGap('I used Kafka', 'must have used kafka extensively');
    expect(report.torqueConflicts.some((c) => c.torqueKey === 'used')).toBe(true);
  });
});

describe('analyzeKeywordGap — determinism (QA 1)', () => {
  it('same input yields a deep-equal report across runs', () => {
    const resume = 'I managed a team and built a React application using TypeScript.';
    const jd = 'Seeking an engineer to manage projects and build React apps with TypeScript.';
    expect(analyzeKeywordGap(resume, jd)).toEqual(analyzeKeywordGap(resume, jd));
  });
});

describe('analyzeKeywordGap — stemmer symmetry (QA 2)', () => {
  it('résumé "managed" matches JD "managing"/"manage"', () => {
    const report = analyzeKeywordGap('I managed teams.', 'managing and manage initiatives');
    const managing = findTerm(report.jobKeywords, 'managing');
    const manage = findTerm(report.jobKeywords, 'manage');
    expect(managing?.matched).toBe(true);
    expect(manage?.matched).toBe(true);
  });
});

describe('analyzeKeywordGap — bigram extraction (QA 3)', () => {
  it('surfaces "project management" as a weighted bigram', () => {
    const report = analyzeKeywordGap('', 'project management project management experience');
    const bigram = findTerm(report.jobKeywords, 'project management');
    expect(bigram).toBeDefined();
    expect(bigram.kind).toBe('bigram');
    expect(bigram.weight).toBeGreaterThan(0);
  });

  it('omits bigrams when includeBigrams is false', () => {
    const report = analyzeKeywordGap('', 'project management role', { includeBigrams: false });
    expect(report.jobKeywords.every((h) => h.kind === 'unigram')).toBe(true);
  });

  it('does not form a bigram across a comma boundary (phrase segmentation)', () => {
    const report = analyzeKeywordGap('', 'inbound calls, ticketing systems, scheduling');
    // The phantom cross-comma bigram must not exist...
    expect(findTerm(report.jobKeywords, 'calls ticketing')).toBeUndefined();
    // ...while the legitimate in-phrase bigrams still do.
    expect(findTerm(report.jobKeywords, 'inbound calls')).toBeDefined();
    expect(findTerm(report.jobKeywords, 'ticketing systems')).toBeDefined();
  });
});

describe('analyzeKeywordGap — matched vs missing (QA 4)', () => {
  it('classifies present terms as matched and absent terms as missing', () => {
    const report = analyzeKeywordGap('I write python daily', 'python kubernetes engineer');
    const python = findTerm(report.jobKeywords, 'python');
    const kubernetes = findTerm(report.jobKeywords, 'kubernetes');
    expect(python.matched).toBe(true);
    expect(report.matched).toContainEqual(python);
    expect(kubernetes.matched).toBe(false);
    expect(report.missing).toContainEqual(kubernetes);
  });
});

describe('analyzeKeywordGap — score math (QA 5)', () => {
  it('hand-computed weighted and raw coverage match the report', () => {
    // Two distinct unigrams, each frequency 1, neither in the lexicon -> equal weight.
    // Résumé covers one of them -> 50% weighted and 50% raw.
    const report = analyzeKeywordGap('alpha', 'alpha bravo', { includeBigrams: false });
    expect(report.jobKeywords).toHaveLength(2);
    expect(report.rawScore).toBe(50);
    expect(report.score).toBe(50);
  });
});

describe('analyzeKeywordGap — divide-by-zero (QA 6)', () => {
  it('empty JD yields score 0, no NaN, and a diagnostic', () => {
    const report = analyzeKeywordGap('a full resume of accomplishments', '');
    expect(report.score).toBe(0);
    expect(report.rawScore).toBe(0);
    expect(Number.isNaN(report.score)).toBe(false);
    expect(report.jobKeywords).toHaveLength(0);
    expect(report.diagnostics.length).toBeGreaterThan(0);
  });
});

describe('analyzeKeywordGap — skills lexicon boost (QA 7)', () => {
  it('a lexicon term outranks an equal-frequency non-lexicon term', () => {
    // "python" is in the default lexicon; "frobnicate" is not. Equal frequency (1).
    const report = analyzeKeywordGap('', 'python frobnicate', { includeBigrams: false });
    const python = findTerm(report.jobKeywords, 'python');
    const other = findTerm(report.jobKeywords, 'frobnicate');
    expect(python.inSkillsLexicon).toBe(true);
    expect(other.inSkillsLexicon).toBe(false);
    expect(python.weight).toBeGreaterThan(other.weight);
    // weight-descending order places the lexicon term first
    expect(report.jobKeywords[0].term).toBe('python');
  });
});

describe('analyzeKeywordGap — stable ordering (QA 8)', () => {
  it('orders equal-weight terms alphabetically by term', () => {
    const report = analyzeKeywordGap('', 'zebra yak xerox', { includeBigrams: false });
    const terms = report.jobKeywords.map((h) => h.term);
    expect(terms).toEqual(['xerox', 'yak', 'zebra']);
  });
});

describe('analyzeKeywordGap — purity (QA 9)', () => {
  it('returns a frozen report and does not mutate inputs', () => {
    const resume = 'I managed a team.';
    const jd = 'manage a team';
    const options = { topK: 5 };
    const report = analyzeKeywordGap(resume, jd, options);
    expect(Object.isFrozen(report)).toBe(true);
    expect(Object.isFrozen(report.jobKeywords)).toBe(true);
    expect(resume).toBe('I managed a team.');
    expect(jd).toBe('manage a team');
    expect(options).toEqual({ topK: 5 });
  });
});

describe('detectTorqueConflicts (QA 10)', () => {
  it('flags JD "managed" with the torque key and replacement', () => {
    const report = analyzeKeywordGap('', 'managed large teams');
    expect(report.torqueConflicts).toContainEqual({
      jobTerm: 'managed',
      torqueKey: 'managed',
      wouldReplaceWith: 'Oversaw',
    });
  });

  it('matches by stem across JD inflections (managing -> managed key)', () => {
    const report = analyzeKeywordGap('', 'managing budgets', { includeBigrams: false });
    const conflict = report.torqueConflicts.find((c) => c.torqueKey === 'managed');
    expect(conflict).toBeDefined();
    expect(conflict.jobTerm).toBe('managing');
    expect(conflict.wouldReplaceWith).toBe('Oversaw');
  });

  it('ignores bigram keywords (unigram-only detection)', () => {
    const conflicts = detectTorqueConflicts(
      [{ term: 'managed teams', stem: 'manag team', kind: 'bigram' }],
      TORQUE_MAP,
    );
    expect(conflicts).toHaveLength(0);
  });
});
