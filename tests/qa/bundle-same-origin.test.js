/* @vitest-environment node */
import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * The client must ALWAYS talk to the API same-origin — in dev (Vite proxies /api,
 * /auth, /collab to the server) and in prod (Fastify serves bundle and API from one
 * origin). It cannot be otherwise: the CSP is connect-src 'self'.
 *
 * This guards a real outage. `.env` used to set VITE_API_BASE_URL=http://localhost:5173.
 * Vite inlines VITE_* vars at BUILD time, so any local `npm run build` baked that dev
 * origin into the production bundle. Every call then went cross-origin and CSP blocked
 * it — including GET /auth/csrf-token, which is what GRANTS the guest lexicon session.
 * Result: /api/lexicon/lookup-batch returned 401, the phoneme engine lost its authority
 * data, and TrueSight rendered nothing. It surfaced as "Dictionary Oracle timed out",
 * which named the wrong subsystem and cost hours.
 *
 * Two layers of defence:
 *   1. No source file may read VITE_API_BASE_URL (always runs).
 *   2. If a build exists, no bundled asset may contain a hardcoded localhost origin.
 */

const SOURCE_DIRS = ['src', 'codex'];

describe('bundle must be same-origin', () => {
  it('no source file reads VITE_API_BASE_URL', () => {
    // Comments explaining WHY it was removed are fine; actual reads are not.
    const out = execSync(
      `grep -rn "VITE_API_BASE_URL" ${SOURCE_DIRS.join(' ')} --include=*.js --include=*.jsx --include=*.ts --include=*.tsx ` +
      `| grep -vE "^[^:]+:[0-9]+:\\s*(//|\\*|/\\*)" || true`,
      { encoding: 'utf8' },
    ).trim();

    expect(
      out,
      'VITE_API_BASE_URL is read somewhere. It is an absolute origin baked in at build ' +
      'time; a dev value in it silently breaks production. Use same-origin relative paths.',
    ).toBe('');
  });

  it('no built asset hardcodes OUR dev or API origin', () => {
    const assets = path.join('dist', 'assets');
    if (!existsSync(assets)) {
      // No build in the tree — nothing to check. The source guard above still ran.
      return;
    }

    // Only OUR origins. Vendor bundles legitimately mention localhost (Remotion's
    // dev proxy template, a library's window.location fallback) and are not a risk:
    // nothing routes our API through them.
    const OUR_ORIGINS = [
      'localhost:5173', // the Vite dev origin — the one that actually caused the outage
      'localhost:5174',
      'localhost:8080', // the API origin — must be reached same-origin, never absolutely
    ];

    const offenders = readdirSync(assets)
      .filter((f) => f.endsWith('.js'))
      .flatMap((f) => {
        const body = readFileSync(path.join(assets, f), 'utf8');
        return OUR_ORIGINS.filter((o) => body.includes(o)).map((o) => `${f} → ${o}`);
      });

    expect(
      offenders,
      `Built assets hardcode one of our origins: ${offenders.join(', ')}. ` +
      'A dev/API URL was inlined into the bundle at build time. CSP (connect-src \'self\') ' +
      'blocks every call to it, including /auth/csrf-token — which is what GRANTS the guest ' +
      'lexicon session. The result is 401s from the dictionary and blank TrueSight, reported ' +
      'misleadingly as "Dictionary Oracle timed out".',
    ).toEqual([]);
  });
});
