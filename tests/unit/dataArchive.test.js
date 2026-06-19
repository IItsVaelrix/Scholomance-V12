import { describe, it, expect } from 'vitest';
import { transmuteToSigil, transmuteToSigilWithProvenance } from '../../src/lib/career/transmuter.js';
import { buildKeywordAwareSigil, buildSigilDataArchive } from '../../src/lib/career/sigil-pipeline.js';
import { assembleDataArchive } from '../../src/lib/career/data-archive.js';

const RESUME = [
  'Managed high-volume inbound customer inquiries.',
  'Built the platform and improved resolution time.',
].join('\n');
const JD = 'We need someone who managed teams and led support operations.';

const sectionById = (archive, id) => archive.sections.find((s) => s.id === id);

describe('transmuteToSigilWithProvenance', () => {
  it('produces a sigil byte-identical to transmuteToSigil', () => {
    const { sigil } = transmuteToSigilWithProvenance(RESUME);
    expect(sigil).toBe(transmuteToSigil(RESUME));
  });

  it('itemizes each verb swap with position and capitalization', () => {
    const { changes } = transmuteToSigilWithProvenance('Built the API.');
    const swap = changes.find((c) => c.type === 'verb_swap');
    expect(swap).toMatchObject({
      from: 'Built',
      to: 'Developed',
      lineNumber: 1,
      capitalization: 'clause-leading',
    });
    expect(swap.reason).toContain('object-agnostic');
  });

  it('records a mid-sentence swap as lowercased', () => {
    const { changes } = transmuteToSigilWithProvenance('I built the API.');
    const swap = changes.find((c) => c.type === 'verb_swap');
    expect(swap.to).toBe('developed');
    expect(swap.capitalization).toBe('mid-sentence');
  });

  it('records the anchor infusion', () => {
    const { changes } = transmuteToSigilWithProvenance(RESUME);
    const anchor = changes.find((c) => c.type === 'anchor_infusion');
    expect(anchor).toBeDefined();
    expect(Array.isArray(anchor.anchors)).toBe(true);
    expect(anchor.anchors.length).toBeGreaterThan(0);
  });

  it('emits no changes for empty input', () => {
    expect(transmuteToSigilWithProvenance('')).toEqual({ sigil: '', changes: [] });
  });
});

describe('buildSigilDataArchive', () => {
  it('returns a sigil identical to buildKeywordAwareSigil', () => {
    const a = buildSigilDataArchive(RESUME, JD);
    const b = buildKeywordAwareSigil(RESUME, JD);
    expect(a.sigil).toBe(b.sigil);
  });

  it('assembles all archive sections in order', () => {
    const { archive } = buildSigilDataArchive(RESUME, JD);
    expect(archive.sections.map((s) => s.id)).toEqual([
      'verbs',
      'preserved',
      'alignment',
      'acronyms',
      'boundary_warnings',
      'anchors',
      'legibility',
    ]);
  });

  it('verb section reflects the actual swaps (built -> Developed)', () => {
    const { archive } = buildSigilDataArchive(RESUME, JD);
    const verbs = sectionById(archive, 'verbs');
    expect(verbs.entries.some((e) => e.label.includes('Developed'))).toBe(true);
  });

  it('preserved section explains protected JD keywords', () => {
    const { archive } = buildSigilDataArchive(RESUME, JD);
    const preserved = sectionById(archive, 'preserved');
    // "managed" is in the JD and is a torque key -> preserved.
    expect(preserved.entries.some((e) => e.label === 'managed')).toBe(true);
    expect(preserved.entries[0].reason).toContain('ATS');
  });

  it('alignment section carries the real score', () => {
    const { archive, report } = buildSigilDataArchive(RESUME, JD);
    expect(archive.alignmentScore).toBe(report.score);
    expect(sectionById(archive, 'alignment').meta.score).toBe(report.score);
  });

  it('is deterministic', () => {
    expect(buildSigilDataArchive(RESUME, JD)).toEqual(buildSigilDataArchive(RESUME, JD));
  });

  it('derives resonance anchors from JD-matched keywords (not generic placeholders)', () => {
    const resume = 'I managed a team and built the platform.';
    const jd = 'managed a team and built the platform';
    const { sigil, archive } = buildSigilDataArchive(resume, jd);
    // JD path drops the ceremonial generic tail entirely.
    expect(sigil).not.toContain('Systemic Calibration');
    expect(sigil).toMatch(/CORE RESONANCE: Specialized in .+\./);
    const anchors = archive.sections.find((s) => s.id === 'anchors');
    expect(anchors.entries.length).toBeGreaterThan(0);
    expect(anchors.entries[0].reason).toContain('BOTH your');
  });

  it('falls back to generic anchors when there is no JD overlap', () => {
    // No JD => no matched keywords => generic placeholder anchors + legacy tail.
    const { sigil } = buildSigilDataArchive('Built the platform.', '');
    expect(sigil).toContain('and Systemic Calibration.');
  });

  it('flags an unpunctuated JD keyword run as a boundary warning', () => {
    // No commas between the skills -> one long content run the arbiter flags.
    const jd = 'inbound calls ticketing systems scheduling troubleshooting crm escalations';
    const { archive } = buildSigilDataArchive('inbound calls and ticketing.', jd);
    const warnings = archive.sections.find((s) => s.id === 'boundary_warnings');
    expect(warnings.entries.length).toBeGreaterThan(0);
    expect(warnings.entries[0].reason).toContain('no internal punctuation');
  });

  it('does NOT flag a properly comma-separated JD list', () => {
    const jd = 'inbound calls, ticketing systems, scheduling, troubleshooting, crm';
    const { archive } = buildSigilDataArchive('inbound calls and ticketing.', jd);
    const warnings = archive.sections.find((s) => s.id === 'boundary_warnings');
    expect(warnings.entries).toHaveLength(0);
  });

  it('dedupes a unigram anchor subsumed by a bigram anchor', () => {
    const { archive } = buildSigilDataArchive(
      'Customer support across customer support channels with customer focus.',
      'customer support representative; customer support experience required.',
    );
    const anchors = archive.sections.find((s) => s.id === 'anchors').entries.map((e) => e.label);
    // "Customer Support" should appear, the bare "Customer" echo should not.
    expect(anchors).toContain('Customer Support');
    expect(anchors).not.toContain('Customer');
  });
});

describe('assembleDataArchive (pure)', () => {
  it('handles empty inputs without throwing', () => {
    const archive = assembleDataArchive();
    expect(archive.schemaVersion).toBe(1);
    expect(archive.sections).toHaveLength(7);
    expect(archive.alignmentScore).toBeNull();
  });

  it('flags a stuffed legibility line in the legibility section', () => {
    const legibility = {
      legibilityScore: 0.3,
      flagged: [{ text: 'Resonance Optimization Scalable Infrastructure', legibilityScore: 0.2 }],
      lines: [],
    };
    const section = assembleDataArchive({ legibility }).sections.find((s) => s.id === 'legibility');
    expect(section.entries).toHaveLength(1);
    expect(section.entries[0].reason).toContain('keyword pile');
  });
});
