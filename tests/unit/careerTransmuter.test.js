import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  transmuteToSigil,
  generateSigilFile,
  canGenerateSigilFile,
} from '../../src/lib/career/transmuter.js';

const HEADER = '--- SCHOLOMANCE CAREER SIGIL v11.3 ---';
const FOOTER = '[BINDING COMPLETE]';
const countOccurrences = (haystack, needle) => haystack.split(needle).length - 1;

describe('transmuteToSigil — torque map', () => {
  it('replaces low-torque verbs with high-fidelity equivalents', () => {
    const out = transmuteToSigil('Led the team.\nBuilt the API.');
    expect(out).toContain('Orchestrated');
    expect(out).toContain('Developed');
    expect(out).not.toMatch(/\bled\b/i);
    expect(out).not.toMatch(/\bbuilt\b/i);
  });

  it('matches case-insensitively', () => {
    expect(transmuteToSigil('LED the charge')).toContain('Orchestrated');
  });

  it('capitalizes a clause-leading verb but lowercases a mid-sentence one', () => {
    // Clause-leading: start of document and start of a line (after the bullet).
    const leading = transmuteToSigil('Led delivery.\n• built the pipeline.');
    expect(leading).toContain('Orchestrated');
    expect(leading).toContain('• Developed');
    // Mid-sentence: the same verb stays lowercase so the prose reads naturally.
    const inline = transmuteToSigil('Drove revenue and managed the team.');
    expect(inline).toContain('and oversaw the team');
    expect(inline).not.toContain('Oversaw');
  });
});

describe('transmuteToSigil — guards & determinism', () => {
  it('returns empty string for falsy input', () => {
    expect(transmuteToSigil('')).toBe('');
    expect(transmuteToSigil(null)).toBe('');
    expect(transmuteToSigil(undefined)).toBe('');
  });

  it('is deterministic — same input yields identical output', () => {
    const input = 'I managed a team, designed the system, and tested everything.';
    expect(transmuteToSigil(input)).toBe(transmuteToSigil(input));
  });

  it('wraps output in the Sigil header and footer', () => {
    const out = transmuteToSigil('hello world');
    expect(out.startsWith(HEADER)).toBe(true);
    expect(out.endsWith(FOOTER)).toBe(true);
  });

  it('coerces truthy non-string input instead of throwing (MINOR)', () => {
    expect(() => transmuteToSigil(42)).not.toThrow();
    expect(transmuteToSigil(42)).toContain('42');
  });

  it('returns empty string for whitespace-only input, consistently with empty input', () => {
    expect(transmuteToSigil('   \n\t  ')).toBe('');
    expect(transmuteToSigil('')).toBe('');
  });
});

// --- MAJOR 1: newline-preserving normalization ---------------------------------
describe('transmuteToSigil — preserves line structure (MAJOR 1)', () => {
  it('keeps newlines between resume lines instead of flattening to one paragraph', () => {
    const out = transmuteToSigil('Alpha Corp\nSenior Role\nDid things');
    expect(out).toContain('Alpha Corp\nSenior Role\nDid things');
  });

  it('still collapses runs of spaces/tabs within a line', () => {
    const out = transmuteToSigil('too     many\t\tspaces');
    expect(out).toContain('too many spaces');
  });

  it('caps runs of blank lines at a single blank line', () => {
    const out = transmuteToSigil('Top\n\n\n\n\nBottom');
    expect(out).toContain('Top\n\nBottom');
    expect(out).not.toMatch(/\n{3,}/);
  });
});

// --- MAJOR 2: anchor infusion runs for real-length input -----------------------
describe('transmuteToSigil — spectral anchor infusion (MAJOR 2)', () => {
  it('infuses exactly one anchor for short input', () => {
    const out = transmuteToSigil('short bullet');
    expect(out).toContain('CORE RESONANCE:');
    const resonanceLine = out.split('CORE RESONANCE:')[1];
    // a single anchor has no comma before "and Systemic Calibration"
    expect(resonanceLine).not.toMatch(/,/);
  });

  it('infuses anchors for long (>500 char) input — the primary real-world case', () => {
    const longResume = 'I led projects. '.repeat(60); // ~960 chars, the case the old gate skipped
    expect(longResume.length).toBeGreaterThan(500);
    const out = transmuteToSigil(longResume);
    expect(out).toContain('CORE RESONANCE:');
  });

  it('scales to multiple anchors for fuller resumes', () => {
    const longResume = 'I led projects. '.repeat(80); // long enough for 3 anchors
    const out = transmuteToSigil(longResume);
    const resonanceLine = out.split('CORE RESONANCE:')[1];
    // multiple anchors are comma-separated before "and Systemic Calibration"
    expect(resonanceLine).toMatch(/,/);
  });
});

// --- MAJOR 3: idempotency ------------------------------------------------------
describe('transmuteToSigil — idempotency (MAJOR 3)', () => {
  const inputs = [
    'I led the team and built the platform.',
    'Alpha Corp\nSenior Role\nManaged a team\nFixed bugs',
    'I led projects. '.repeat(60),
  ];

  inputs.forEach((input, i) => {
    it(`transmuting a Sigil reproduces it unchanged [case ${i}]`, () => {
      const once = transmuteToSigil(input);
      const twice = transmuteToSigil(once);
      expect(twice).toBe(once);
    });
  });

  it('does not nest headers, footers, or resonance lines on re-transmutation', () => {
    const twice = transmuteToSigil(transmuteToSigil('I led and managed everything here.'));
    expect(countOccurrences(twice, HEADER)).toBe(1);
    expect(countOccurrences(twice, FOOTER)).toBe(1);
    expect(countOccurrences(twice, 'CORE RESONANCE:')).toBe(1);
  });

  it('stays idempotent when the body itself contains sigil vocabulary', () => {
    // Previously broke idempotency: a mid-body "---" + "SCHOLOMANCE CAREER SIGIL"
    // separated by a "CORE RESONANCE:" run.
    const adversarial = 'a --- CORE RESONANCE: x\nSCHOLOMANCE CAREER SIGIL v11.3 b --- c';
    const once = transmuteToSigil(adversarial);
    expect(transmuteToSigil(once)).toBe(once);
  });

  it('does not strip marker-like text from the middle of the body (no data loss)', () => {
    const input = 'My core resonance: leadership. I led [BINDING COMPLETE] of the migration.';
    const out = transmuteToSigil(input);
    expect(out).toContain('core resonance: leadership'); // lowercase, mid-body — survives
    expect(out).toContain('[BINDING COMPLETE] of the migration'); // mid-body footer text survives
    // exactly one real footer (the wrapper's), at the end
    expect(out.endsWith(FOOTER)).toBe(true);
    expect(countOccurrences(out, FOOTER)).toBe(2); // the one in body + the wrapper's
  });
});

// --- PDR Keyword-Gap: preserveKeywords option ----------------------------------
describe('transmuteToSigil — preserveKeywords (PDR §12.6)', () => {
  it('retains a preserved literal term instead of swapping it (QA 11)', () => {
    const out = transmuteToSigil('I managed the team.', { preserveKeywords: ['managed'] });
    expect(out).toMatch(/\bmanaged\b/i);
    expect(out).not.toContain('Oversaw');
  });

  it('still fires non-preserved swaps (QA 12)', () => {
    const out = transmuteToSigil('I managed and built it.', { preserveKeywords: ['managed'] });
    expect(out).toMatch(/\bmanaged\b/i);
    expect(out).toContain('developed'); // "built" still swapped (mid-sentence -> lowercase)
    expect(out).not.toMatch(/\bbuilt\b/);
  });

  it('matches the preserve set by stem — JD "managing" preserves "managed" (QA 14)', () => {
    const out = transmuteToSigil('I managed the rollout.', { preserveKeywords: ['managing'] });
    expect(out).toMatch(/\bmanaged\b/i);
    expect(out).not.toContain('Oversaw');
  });

  it('ignores empty / malformed preserveKeywords entries', () => {
    const out = transmuteToSigil('I managed it.', { preserveKeywords: ['', '   ', 42, null] });
    expect(out).toContain('oversaw'); // nothing preserved -> normal swap (mid-sentence -> lowercase)
  });
});

// --- PDR Keyword-Gap: legacy output is byte-identical (QA 13) -------------------
describe('transmuteToSigil — legacy golden output (PDR §16.6)', () => {
  const goldenInputs = [
    'I led the team and built the platform.',
    'Alpha Corp\nSenior Role\nManaged a team\nFixed bugs',
    'I led projects. '.repeat(60),
    'I managed a team, designed the system, and tested everything.',
  ];

  goldenInputs.forEach((input, i) => {
    it(`no-options call is byte-identical to a default {}-options call [case ${i}]`, () => {
      // The default path must not change when preserveKeywords plumbing is present:
      // an absent option and an explicit empty options object both produce legacy output.
      expect(transmuteToSigil(input)).toBe(transmuteToSigil(input, {}));
      expect(transmuteToSigil(input)).toBe(transmuteToSigil(input, { preserveKeywords: [] }));
    });
  });
});

// --- MINOR: generateSigilFile is DOM-guarded and isolated ----------------------
describe('generateSigilFile — DOM isolation (MINOR)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('canGenerateSigilFile tracks actual capability', () => {
    const spy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
    expect(canGenerateSigilFile()).toBe(true);
    spy.mockRestore();

    const original = URL.createObjectURL;
    URL.createObjectURL = undefined;
    try {
      expect(canGenerateSigilFile()).toBe(false);
    } finally {
      URL.createObjectURL = original;
    }
  });

  it('throws a clear, descriptive error when the runtime cannot download', () => {
    const original = URL.createObjectURL;
    // Simulate a non-browser runtime (worker / SSR / bare Node).
    URL.createObjectURL = undefined;
    try {
      expect(canGenerateSigilFile()).toBe(false);
      expect(() => generateSigilFile('payload')).toThrow(/browser environment/);
    } finally {
      URL.createObjectURL = original;
    }
  });

  it('triggers a download and cleans up the object URL when supported', () => {
    const createSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});

    const returned = generateSigilFile('sigil body', 'my_sigil.txt');

    expect(returned).toBe('my_sigil.txt');
    expect(createSpy).toHaveBeenCalledOnce();
    expect(clickSpy).toHaveBeenCalledOnce();
    expect(revokeSpy).toHaveBeenCalledWith('blob:mock');
    // the temporary anchor must not linger in the DOM
    expect(document.querySelector('a[download]')).toBeNull();
  });
});
