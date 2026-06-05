import { describe, it, expect } from 'vitest';
import { buildKeywordAwareSigil } from '../../src/lib/career/sigil-pipeline.js';

describe('buildKeywordAwareSigil — shape & conflict preservation (QA 15)', () => {
  it('returns { sigil, report } and does not swap any JD-conflicting term', () => {
    const resume = 'I managed a team and built the platform.';
    const jd = 'We need someone who managed teams and led initiatives.';
    const { sigil, report } = buildKeywordAwareSigil(resume, jd);

    expect(typeof sigil).toBe('string');
    expect(report.schemaVersion).toBe(1);

    // "managed" is a JD keyword and a torque conflict -> preserved literally.
    expect(report.torqueConflicts.some((c) => c.torqueKey === 'managed')).toBe(true);
    expect(sigil).toMatch(/\bmanaged\b/i);
    expect(sigil).not.toContain('Oversaw');

    // "built" is NOT in the JD, so it is still swapped (mid-sentence -> lowercase).
    expect(sigil).toContain('developed');
    expect(sigil).not.toMatch(/\bbuilt\b/);
  });
});

describe('buildKeywordAwareSigil — end-to-end determinism (QA 16)', () => {
  it('same (resume, jd) yields identical sigil and report', () => {
    const resume = 'I designed and tested the system.';
    const jd = 'Looking for someone who designed and tested production systems.';
    const a = buildKeywordAwareSigil(resume, jd);
    const b = buildKeywordAwareSigil(resume, jd);
    expect(a.sigil).toBe(b.sigil);
    expect(a.report).toEqual(b.report);
  });
});

describe('buildKeywordAwareSigil — score reflects raw résumé (QA 17)', () => {
  it('analysis runs on the untransmuted résumé', () => {
    // The résumé literally says "managed"; the JD asks for "managed". The score must
    // credit that match — it is computed before any swap could erase it.
    const resume = 'I managed engineers.';
    const jd = 'manage engineers and ship features';
    const { report } = buildKeywordAwareSigil(resume, jd);
    const managed = report.jobKeywords.find((h) => h.term === 'manage');
    expect(managed?.matched).toBe(true);
    expect(report.score).toBeGreaterThan(0);
  });
});
