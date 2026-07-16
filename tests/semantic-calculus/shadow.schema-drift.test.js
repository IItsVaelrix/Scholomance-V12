/**
 * P6 — the shadow corpus must describe the compiler that produced it.
 *
 * The rev 7 dependency check named schema drift between the frontend shadow act,
 * the backend capture schema and the stored corpus as the highest regression
 * risk. The failure is quiet: the route keeps accepting rows, the enum members
 * just stop meaning the same thing, and the corpus measures a compiler that no
 * longer exists.
 *
 * These tests read the enums out of both files and compare them. They are
 * deliberately textual — importing the route pulls in fastify, and the point is
 * to compare the DECLARATIONS, not two copies of one runtime object.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { selectKind } from '../../codex/core/semantic-calculus/kind.ts';

const TYPES = readFileSync('codex/core/semantic-calculus/types.ts', 'utf8');
const ROUTE = readFileSync('codex/server/routes/semanticShadow.routes.js', 'utf8');

const members = (src, re) => {
  const m = src.match(re);
  if (!m) throw new Error(`schema-drift test could not find its target: ${re}`);
  return (m[1].match(/'[a-z_]+'/gi) ?? []).map((s) => s.replace(/'/g, ''));
};

const ctx = (over = {}) => ({ policy: {}, user: {}, untrusted: {}, derived: {}, ...over });

describe('P6 — capture schema tracks types.ts', () => {
  it('EpistemicGap members match the route enum exactly, in order', () => {
    const inTypes = members(TYPES, /export type EpistemicGap =([\s\S]*?);/);
    const inRoute = members(ROUTE, /gap: z\.enum\(\[([^\]]+)\]/);
    expect(inTypes.length).toBeGreaterThan(0);
    expect(inRoute).toEqual(inTypes);
  });

  it('EpistemicMethod members match', () => {
    const inTypes = members(TYPES, /export type EpistemicMethod =([\s\S]*?);/);
    const inRoute = members(ROUTE, /method: z\.enum\(\[([^\]]+)\]/);
    expect(inRoute).toEqual(inTypes);
  });

  it('WarrantKind members match', () => {
    const inTypes = members(TYPES, /export type WarrantKind =([\s\S]*?);/);
    const inRoute = members(ROUTE, /warrantRequired: z\.array\(z\.enum\(\[([^\]]+)\]/);
    expect(inRoute).toEqual(inTypes);
  });

  it('ActPhase members match', () => {
    const inTypes = members(TYPES, /export type ActPhase =([\s\S]*?);/);
    const inRoute = members(ROUTE, /clientPhase: z\.enum\(\[([^\]]+)\]/);
    expect(inRoute).toEqual(inTypes);
  });

  it('CalculusKind members match the clientKind enum', () => {
    const inTypes = members(TYPES, /export type CalculusKind =([\s\S]*?);/).filter(
      (x) => /^[A-Z]/.test(x),
    );
    const inRoute = members(ROUTE, /clientKind: z\.enum\(\[([^\]]+)\]/);
    expect(inRoute).toEqual(inTypes);
  });
});

describe('P6 — what the overlay actually sends is what the route accepts', () => {
  const GAPS = members(ROUTE, /gap: z\.enum\(\[([^\]]+)\]/);
  const METHODS = members(ROUTE, /method: z\.enum\(\[([^\]]+)\]/);
  const WARRANTS = members(ROUTE, /warrantRequired: z\.array\(z\.enum\(\[([^\]]+)\]/);
  const PHASES = members(ROUTE, /clientPhase: z\.enum\(\[([^\]]+)\]/);

  const cases = [
    ['why does Listen stutter?', ctx({ user: { route: '/listen' } })],
    ['open albums', ctx()],
    ['open it', ctx({ user: { route: '/visualiser/album/grimoire-vol-1' } })],
    ['what is a session word', ctx()],
    ['infernal plumed helm', ctx()],
  ];

  for (const [utterance, context] of cases) {
    it(`"${utterance}" produces a capturable epistemic payload`, () => {
      const d = selectKind(utterance, context);
      expect(GAPS).toContain(d.epistemic.gap);
      expect(METHODS).toContain(d.epistemic.method);
      expect(PHASES).toContain(d.phase);
      for (const w of [...d.epistemic.warrantRequired, ...d.epistemic.warrantPresent]) {
        expect(WARRANTS).toContain(w);
      }
    });
  }
});
