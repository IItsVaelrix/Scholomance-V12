/**
 * IDE Runtime Stasis Promotion — gauntlet
 * Bytecode: SCHOL-ENC-BYKE-IDE-STASIS-PROMOTION
 *
 * Covers the cleanly node-testable pillars:
 *  - Pillar 3: SQLite write serialization queue (FIFO order, SQLITE_BUSY retry).
 *  - Pillar 6: idempotent & canonical formula persistence (no duplicates under
 *    parallel save; canonicalization collapses formatting variants).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createWriteQueue } from '../../../codex/server/db/sqliteWriteQueue.js';
import {
  registerFormulaProposal,
  generateCatalogId,
  canonicalizeFormula,
  closeRegistrar,
} from '../../../codex/core/modulation/planner/formula-registrar.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PRESETS_DB = path.resolve(__dirname, '../../../presets/proposed-formulas.sqlite');

function wipeRegistrarDb() {
  closeRegistrar();
  for (const suffix of ['', '-shm', '-wal']) {
    fs.rmSync(PRESETS_DB + suffix, { force: true });
  }
}

// ── Pillar 3 ─────────────────────────────────────────────────────────────────

describe('Pillar 3 — SQLite write serialization queue', () => {
  it('preserves strict FIFO execution order under concurrent enqueue', async () => {
    const queue = createWriteQueue();
    const order = [];
    const jobs = [];
    for (let i = 0; i < 12; i += 1) {
      jobs.push(
        queue.enqueue(async () => {
          // Random settle delay — order must hold regardless.
          await new Promise((r) => setTimeout(r, Math.random() * 5));
          order.push(i);
        }),
      );
    }
    await Promise.all(jobs);
    expect(order).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });

  it('retries a transient SQLITE_BUSY and ultimately resolves', async () => {
    const queue = createWriteQueue({ baseDelayMs: 1 });
    let attempts = 0;
    const result = await queue.enqueue(() => {
      attempts += 1;
      if (attempts < 3) {
        const err = new Error('database is locked');
        err.code = 'SQLITE_BUSY';
        throw err;
      }
      return 'committed';
    });
    expect(result).toBe('committed');
    expect(attempts).toBe(3);
  });

  it('a rejecting job does not break the chain for jobs queued behind it', async () => {
    const queue = createWriteQueue();
    const rejected = queue.enqueue(() => {
      throw new Error('PERMANENT_FAILURE');
    });
    const after = queue.enqueue(() => 'still-runs');

    await expect(rejected).rejects.toThrow('PERMANENT_FAILURE');
    await expect(after).resolves.toBe('still-runs');
  });
});

// ── Pillar 6 ─────────────────────────────────────────────────────────────────

describe('Pillar 6 — idempotent & canonical formula persistence', () => {
  beforeAll(() => wipeRegistrarDb());
  afterAll(() => wipeRegistrarDb());

  const baseFormula = { type: 'parametric_curve', parameters: { cx: 1, cy: 2, n: 8 } };
  const mkProposal = (formula, intent) => ({
    rationale: 'stasis gauntlet',
    confidence: 0.9,
    reviewRequired: false,
    sourceIntentHash: intent,
    proposedFormula: { role: 'shrine.altar', formula },
  });

  it('canonicalization strips undefined and preserves semantic null', () => {
    const canon = canonicalizeFormula({ type: 'parametric_curve', a: undefined, b: null, _ui: 'x' });
    expect(canon).toEqual({ type: 'parametric_curve', b: null });
  });

  it('formatting variants resolve to one deterministic catalogId', () => {
    const reordered = { parameters: { n: 8, cy: 2, cx: 1 }, type: 'parametric_curve' };
    const withUndefined = { type: 'parametric_curve', parameters: { cx: 1, cy: 2, n: 8, b: undefined } };
    const idA = generateCatalogId('shrine.altar', baseFormula, 'intent-x');
    const idB = generateCatalogId('shrine.altar', reordered, 'intent-x');
    const idC = generateCatalogId('shrine.altar', withUndefined, 'intent-x');
    expect(idA).toMatch(/^cat-[0-9a-f]{8}$/);
    expect(idB).toBe(idA);
    expect(idC).toBe(idA);
  });

  it('registration is idempotent — second save returns the existing record', () => {
    const intent = `idem-${Date.now()}`;
    const first = registerFormulaProposal(mkProposal(baseFormula, intent));
    const second = registerFormulaProposal(mkProposal(baseFormula, intent));
    expect(first.status).toBe('created');
    expect(second.status).toBe('exists');
    expect(second.catalogId).toBe(first.catalogId);
  });

  it('parallel saves of an equivalent formula register exactly one row', async () => {
    const intent = `parallel-${Date.now()}`;
    const results = await Promise.all(
      Array.from({ length: 16 }, () => Promise.resolve().then(() => registerFormulaProposal(mkProposal(baseFormula, intent)))),
    );
    const catalogIds = new Set(results.map((r) => r.catalogId));
    const created = results.filter((r) => r.status === 'created');
    expect(catalogIds.size).toBe(1);
    expect(created).toHaveLength(1);
  });

  it('a genuinely distinct formula receives a distinct catalogId', () => {
    const intent = `distinct-${Date.now()}`;
    const a = registerFormulaProposal(mkProposal(baseFormula, intent));
    const b = registerFormulaProposal(
      mkProposal({ type: 'parametric_curve', parameters: { cx: 1, cy: 2, n: 99 } }, intent),
    );
    expect(b.catalogId).not.toBe(a.catalogId);
  });
});
