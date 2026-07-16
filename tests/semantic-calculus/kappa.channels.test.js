/**
 * P6 — three independent agreement channels.
 *
 * The claim under test: kappa_kind, kappa_warrant and kappa_justification
 * measure different failures and must never collapse into one number.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  cohensKappa,
  readLabels,
  CHANNELS,
  KINDS,
  CUT_KINDS,
  WARRANTS,
  JUSTIFICATIONS,
} from '../../bench/semantic-calculus/kappa.mjs';

let dir;
const write = (name, rows) => {
  const p = join(dir, name);
  writeFileSync(p, rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
  return p;
};

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'kappa-channels-'));
});
afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('P6 — the channel taxonomy', () => {
  it('kind carries the five rev-6 members and neither cut kind', () => {
    expect(KINDS).toEqual(['Do', 'Clarify', 'Probe', 'Theory', 'Hypothesis']);
    for (const cut of CUT_KINDS) expect(KINDS).not.toContain(cut);
  });

  it('warrant mirrors WarrantKind plus none', () => {
    for (const w of ['lexicon', 'model', 'observation', 'human', 'gene']) {
      expect(WARRANTS).toContain(w);
    }
    expect(WARRANTS).toContain('none');
  });

  it('justification is a three-way judgement, unsure included', () => {
    expect(JUSTIFICATIONS).toEqual(['yes', 'no', 'unsure']);
  });

  it('declares exactly the three channels, each with its own categories', () => {
    expect(CHANNELS.map((c) => c.key)).toEqual(['kind', 'warrant', 'justification']);
    expect(CHANNELS.find((c) => c.key === 'kind').categories).toBe(KINDS);
    expect(CHANNELS.find((c) => c.key === 'justification').categories).toBe(JUSTIFICATIONS);
  });
});

describe('P6 — rev-5 labels are refused, never re-projected', () => {
  it('refuses Forbidden/Escalate against the five-kind taxonomy', () => {
    const p = write('legacy.jsonl', [
      { id: 'a', kind: 'Do' },
      { id: 'b', kind: 'Escalate' },
    ]);
    // Projecting Escalate onto Do would invent a label the rater never gave.
    expect(() => readLabels(p)).toThrow(/rev-5 kinds/);
  });

  it('scores them under --legacy for reproducing the historical measurement', () => {
    const p = write('legacy2.jsonl', [
      { id: 'a', kind: 'Do' },
      { id: 'b', kind: 'Escalate' },
    ]);
    const parsed = readLabels(p, { legacy: true });
    expect(parsed.byChannel.get('kind').get('b')).toBe('Escalate');
  });

  it('names an out-of-vocabulary warrant rather than silently dropping it', () => {
    const p = write('badwarrant.jsonl', [{ id: 'a', warrant: 'vibes' }]);
    expect(() => readLabels(p)).toThrow(/non-warrant label "vibes"/);
  });
});

describe('P6 — channels are scored independently', () => {
  it('a rater who answered only kind contributes to kind alone', () => {
    const p = write('kindonly.jsonl', [
      { id: 'a', kind: 'Do' },
      { id: 'b', kind: 'Theory' },
    ]);
    const parsed = readLabels(p);
    expect(parsed.byChannel.get('kind').size).toBe(2);
    expect(parsed.byChannel.get('warrant').size).toBe(0);
    expect(parsed.byChannel.get('justification').size).toBe(0);
  });

  it('reads all three channels off one row and keeps them separate', () => {
    const p = write('all3.jsonl', [
      { id: 'a', kind: 'Probe', warrant: 'observation', justification: 'no' },
    ]);
    const parsed = readLabels(p);
    expect(parsed.byChannel.get('kind').get('a')).toBe('Probe');
    expect(parsed.byChannel.get('warrant').get('a')).toBe('observation');
    expect(parsed.byChannel.get('justification').get('a')).toBe('no');
  });

  it('THE POINT: kind can be perfect while justification is catastrophic', () => {
    // Two raters agree completely on what was said, and not at all on whether
    // the cites support the conclusion. A single averaged score would hide it —
    // this is a system classifying confidently and justifying decoratively.
    const ids = Array.from({ length: 20 }, (_, i) => `i${i}`);
    const rowsA = ids.map((id, i) => ({
      id,
      kind: i % 2 ? 'Do' : 'Probe',
      justification: i % 2 ? 'yes' : 'no',
    }));
    const rowsB = ids.map((id, i) => ({
      id,
      kind: i % 2 ? 'Do' : 'Probe',
      justification: i % 2 ? 'no' : 'yes',
    }));
    const a = readLabels(write('a3.jsonl', rowsA));
    const b = readLabels(write('b3.jsonl', rowsB));

    const kKind = cohensKappa(a.byChannel.get('kind'), b.byChannel.get('kind'), KINDS);
    const kJust = cohensKappa(
      a.byChannel.get('justification'),
      b.byChannel.get('justification'),
      JUSTIFICATIONS,
    );

    expect(kKind.kappa).toBeCloseTo(1, 6);
    expect(kJust.kappa).toBeLessThan(0); // worse than chance
    // The two numbers must be free to diverge completely.
    expect(kKind.kappa - kJust.kappa).toBeGreaterThan(1.5);
  });

  it('a category neither rater used is absent, not a failing boundary', () => {
    // Regression: 'model'/'human'/'gene'/'none' never appear in a small warrant
    // corpus, so their one-vs-rest kappa is a division by nothing. Counting them
    // as failures produced "kappa 1.000 / per-category FAIL", which is
    // incoherent and trains you to ignore the gate.
    const rows = (v) => [
      { id: 'a', warrant: 'lexicon' },
      { id: 'b', warrant: v },
    ];
    const a = readLabels(write('wa.jsonl', rows('observation')));
    const b = readLabels(write('wb.jsonl', rows('observation')));
    const r = cohensKappa(a.byChannel.get('warrant'), b.byChannel.get('warrant'), WARRANTS);

    expect(r.kappa).toBeCloseTo(1, 6);
    for (const unused of ['model', 'human', 'gene', 'none']) {
      expect(r.byCategory[unused].nA).toBe(0);
      expect(r.byCategory[unused].nB).toBe(0);
    }
    // A category ONE rater used is a different animal and must still be scored.
    const c = readLabels(write('wc.jsonl', rows('human')));
    const r2 = cohensKappa(a.byChannel.get('warrant'), c.byChannel.get('warrant'), WARRANTS);
    expect(r2.byCategory.human.nB).toBe(1);
    expect(r2.byCategory.human.kappa).toBeLessThan(0.6);
  });

  it('an unmeasured channel scores n=0 rather than agreement', () => {
    const a = readLabels(write('a4.jsonl', [{ id: 'x', kind: 'Do' }]));
    const b = readLabels(write('b4.jsonl', [{ id: 'x', kind: 'Do' }]));
    const kWarrant = cohensKappa(a.byChannel.get('warrant'), b.byChannel.get('warrant'), WARRANTS);
    expect(kWarrant.n).toBe(0);
    // NaN fails `>= gate`, so silence can never be reported as a pass.
    expect(Number.isNaN(kWarrant.kappa)).toBe(true);
  });
});
