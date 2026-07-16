import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';

/**
 * Guard: the browser half of the compiler must import no node builtins.
 *
 * This exists because I wrote "kind.ts is crypto-free" in a comment and it was
 * fiction. kind.ts -> trustPartition.ts -> `import crypto from 'node:crypto'`, and
 * the shadow overlay imported trustPartition.ts directly too. The page crashed on
 * load.
 *
 * The part that makes this test load-bearing rather than pedantic: `vite build`
 * PASSED. Rollup tree-shook the unused crypto out of the production bundle, so the
 * build was green and proved nothing. Only the dev server — which serves modules
 * unbundled — exposed it, as `__vite-browser-external:node:crypto`, a stub that
 * throws on access.
 *
 * A green production build is not evidence of browser safety. This walks the real
 * import graph instead of trusting a comment.
 */

const SC = resolve(__dirname, '../../codex/core/semantic-calculus');

/** Entry points that MUST run in a browser (Vite transpiles them for the overlay). */
const BROWSER_ENTRIES = ['kind.ts', 'trustPartition.ts', 'lexiconUi.ts', 'formulaRegistry.ts', 'types.ts'];

/** Node-only by design. Nothing above may reach these. */
const NODE_ONLY = new Set(['seal.ts', 'contextDigest.ts', 'compiler.ts']);

function importsOf(file) {
  const src = readFileSync(file, 'utf8');
  const out = [];
  for (const m of src.matchAll(/^\s*import\s+(?:type\s+)?[^'"]*from\s+['"]([^'"]+)['"]/gm)) {
    out.push(m[1]);
  }
  return out;
}

/** Follow relative imports transitively; report every module reached. */
function graph(entry, seen = new Map()) {
  const file = join(SC, entry);
  if (seen.has(entry) || !existsSync(file)) return seen;
  const imports = importsOf(file);
  seen.set(entry, imports);
  for (const spec of imports) {
    if (spec.startsWith('.')) {
      const rel = resolve(dirname(file), spec).replace(`${SC}/`, '');
      graph(rel, seen);
    }
  }
  return seen;
}

describe('isomorphic guard — the browser half imports no node builtins', () => {
  for (const entry of BROWSER_ENTRIES) {
    it(`${entry} reaches no node: builtin, transitively`, () => {
      const reached = graph(entry);
      const offenders = [];
      for (const [mod, imports] of reached) {
        for (const spec of imports) {
          if (spec.startsWith('node:') || spec === 'crypto' || spec === 'fs' || spec === 'path') {
            offenders.push(`${mod} -> ${spec}`);
          }
        }
      }
      expect(offenders, `node builtin reachable from ${entry}:\n  ${offenders.join('\n  ')}`).toEqual([]);
    });

    it(`${entry} reaches no node-only module`, () => {
      const reached = [...graph(entry).keys()];
      const leaked = reached.filter((m) => NODE_ONLY.has(m));
      expect(leaked, `${entry} pulls node-only module(s): ${leaked.join(', ')}`).toEqual([]);
    });
  }

  it('the node-only modules really are node-only (sanity: this guard can fail)', () => {
    // If seal.ts stopped importing crypto, the guard above would pass vacuously.
    const sealImports = importsOf(join(SC, 'seal.ts'));
    expect(sealImports).toContain('node:crypto');
  });

  it('kind.ts still provides everything the overlay needs', async () => {
    const kind = await import('../../codex/core/semantic-calculus/kind.ts');
    const trust = await import('../../codex/core/semantic-calculus/trustPartition.ts');
    expect(typeof kind.selectKind).toBe('function');
    expect(typeof trust.emptyContext).toBe('function');
    // The exact call the overlay makes, through the exact modules it imports.
    const d = kind.selectKind('open it', {
      ...trust.emptyContext(),
      user: { route: '/visualiser/album/grimoire-vol-1', selection: '3' },
    });
    expect(d.kind).toBe('Clarify');
  });
});
