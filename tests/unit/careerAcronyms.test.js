import { describe, it, expect } from 'vitest';
import { analyzeAcronymCoverage, ACRONYM_MAP } from '../../src/lib/career/acronyms.js';
import { buildSigilDataArchive } from '../../src/lib/career/sigil-pipeline.js';

describe('analyzeAcronymCoverage — dual-form detection', () => {
  it('flags an acronym used without its expansion', () => {
    const report = analyzeAcronymCoverage('Built ML models for fraud detection.');
    const ml = report.gaps.find((g) => g.acronym === 'ML');
    expect(ml).toBeDefined();
    expect(ml.present).toBe('acronym');
    expect(ml.missingForm).toBe('expansion');
    expect(ml.suggestion).toContain('Machine Learning');
  });

  it('flags an expansion used without its acronym', () => {
    const report = analyzeAcronymCoverage('Led machine learning initiatives across teams.');
    const ml = report.gaps.find((g) => g.acronym === 'ML');
    expect(ml).toBeDefined();
    expect(ml.present).toBe('expansion');
    expect(ml.missingForm).toBe('acronym');
    expect(ml.suggestion).toContain('ML');
  });

  it('reports a term as covered (no gap) when both forms are present', () => {
    const report = analyzeAcronymCoverage('Machine Learning (ML) pipelines in production.');
    expect(report.gaps.find((g) => g.acronym === 'ML')).toBeUndefined();
    expect(report.covered.map((c) => c.acronym)).toContain('ML');
  });

  it('never suggests an acronym the résumé does not use in any form', () => {
    const report = analyzeAcronymCoverage('Wrote technical documentation and ran workshops.');
    expect(report.gaps).toHaveLength(0);
    expect(report.covered).toHaveLength(0);
  });

  it('tolerates slash/hyphen variants of compound acronyms (CI/CD)', () => {
    // normalizeText turns "CI/CD" into "ci cd"; the matcher must still recognize it.
    const report = analyzeAcronymCoverage('Owned the CI/CD pipeline and release cadence.');
    const cicd = report.gaps.find((g) => g.acronym === 'CI-CD');
    expect(cicd).toBeDefined();
    expect(cicd.present).toBe('acronym');
  });

  it('surfaces JD-relevant gaps before the rest, deterministically', () => {
    const resume = 'Built ML systems and SEO tooling.';
    const jd = 'Seeking expertise in machine learning and data pipelines.';
    const report = analyzeAcronymCoverage(resume, jd);
    const order = report.gaps.map((g) => g.acronym);
    // ML appears in the JD (as its expansion); SEO does not — ML must sort first.
    expect(order.indexOf('ML')).toBeLessThan(order.indexOf('SEO'));
    expect(report.gaps.find((g) => g.acronym === 'ML').inJobDescription).toBe(true);
    expect(report.gaps.find((g) => g.acronym === 'SEO').inJobDescription).toBe(false);
  });

  it('is deterministic and returns frozen output', () => {
    const a = analyzeAcronymCoverage('API and SQL work.');
    const b = analyzeAcronymCoverage('API and SQL work.');
    expect(a).toEqual(b);
    expect(Object.isFrozen(a)).toBe(true);
    expect(Object.isFrozen(a.gaps)).toBe(true);
    expect(ACRONYM_MAP.api).toBe('Application Programming Interface');
  });
});

describe('pipeline integration — acronym section in the Data Archive', () => {
  it('adds an Acronym Coverage section with the detected gap', () => {
    const { archive } = buildSigilDataArchive(
      'Built ML models and led the team.',
      'Looking for machine learning and leadership.',
    );
    const section = archive.sections.find((s) => s.id === 'acronyms');
    expect(section).toBeDefined();
    expect(section.title).toBe('Acronym Coverage');
    expect(section.entries.some((e) => e.label.includes('ML'))).toBe(true);
  });
});
