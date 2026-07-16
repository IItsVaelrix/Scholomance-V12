/**
 * SEMANTIC CALCULUS — the CLI lexicon. NODE-ONLY (reads package.json).
 *
 * The guinea pig should have been this from the start, and the reason is not
 * subtle: nobody text-drives a UI they can click, so the Visualiser produced no
 * utterances and every risk class there was `reversible_ui`. LAW, Escalate,
 * capability and the margin were all decoration on a surface with no danger and
 * no users. Measured: 5/5 real shadow captures were development requests, 0/5
 * were UI commands.
 *
 * A CLI inverts all of it:
 *   - the utterances exist, because typing is the only way to use it
 *   - the lexicon is a MANIFEST you already wrote (package.json scripts), not
 *     something a model imagined or scraped out of aria-labels
 *   - the risk classes are real: `lint` reads, `dev` mutates reversibly,
 *     `deploy` ships your local dist to production
 *   - the margin is real: "run the tests" has six candidates
 *
 * Nothing here is invented. If it is not a script in package.json, it is not in
 * the lexicon, and saying it yields Theory — which now means "you have no command
 * for that", a genuine gap, rather than "my imagination was small".
 */

import { readFileSync } from 'node:fs';
import crypto from 'node:crypto';
import type { Consequence, RiskProfile } from './types.ts';

export interface CliEntry {
  /** The npm script name — the closed-world key a proposer may rank. */
  key: string;
  /** What it actually runs. Classified from this, not from the name. */
  command: string;
  consequence: Consequence;
  effect: 'read' | 'mutate';
}

/**
 * Classified from the COMMAND, not the label. `test:visual:full` sounds read-only
 * and shells out to a browser; `assets:armrig` sounds harmless and writes files.
 * Reading the name is how you get a confident wrong answer.
 */
function classify(name: string, cmd: string): { consequence: Consequence; effect: 'read' | 'mutate' } {
  const s = `${name} ${cmd}`.toLowerCase();

  // Irreversible or outward-facing. These leave the machine or destroy state.
  if (/\bdeploy\b|\bpublish\b|push\s+--force|\bgh\s+release|netlify|vercel|s3\s+sync|scp\b|rsync\b/.test(s)) {
    return { consequence: 'destructive', effect: 'mutate' };
  }
  if (/\brm\s+-rf|\bdrop\b|--force\b|\breset\s+--hard|\bprune\b/.test(s)) {
    return { consequence: 'destructive', effect: 'mutate' };
  }
  // Touches credentials or user data.
  if (/\bauth\b|\btoken\b|\bsecret\b|\bcredential\b/.test(s)
    || (/\.env\b/.test(s) && !/--env-file/.test(s))) {
    return { consequence: 'security', effect: 'mutate' };
  }
  // Read-only: reports, checks, listings. Nothing changes.
  if (/^(lint|typecheck|check|audit|report|list|status|diagnos|verify|inspect|print)/.test(name)
    || /\btsc --noEmit\b|--dry-run\b|\beslint\b(?!.*--fix)/.test(s)) {
    return { consequence: 'reversible_ui', effect: 'read' };
  }
  // Tests: they run code and can write fixtures, but they are safe to re-run.
  if (/^test|^vitest|^pytest/.test(name) || /\bvitest\b|\bpytest\b|\bplaywright\b/.test(s)) {
    return { consequence: 'reversible_ui', effect: 'read' };
  }
  // Everything else writes something and is re-runnable.
  return { consequence: 'reversible_ui', effect: 'mutate' };
}

const RISK: Record<Consequence, RiskProfile> = {
  reversible_ui: {
    consequence: 'reversible_ui',
    minMargin: 0.15,
    requiredCites: [],
    allowedFallback: 'Clarify',
    confirmationPolicy: 'none',
  },
  destructive: {
    // A wide margin bar: to run `deploy` the top candidate must beat its rival by
    // a mile. Anything closer is a question, not a decision.
    consequence: 'destructive',
    minMargin: 0.5,
    requiredCites: [],
    // An ACT TYPE, not a verdict (F19). LAW escalates; the fallback asks.
    allowedFallback: 'Clarify',
    confirmationPolicy: 'two_phase',
  },
  security: {
    consequence: 'security',
    minMargin: 0.5,
    requiredCites: [],
    allowedFallback: 'Clarify',
    confirmationPolicy: 'two_phase',
  },
  financial: {
    consequence: 'financial',
    minMargin: 0.6,
    requiredCites: [],
    allowedFallback: 'Clarify',
    confirmationPolicy: 'two_phase',
  },
  privacy: {
    consequence: 'privacy',
    minMargin: 0.5,
    requiredCites: [],
    allowedFallback: 'Clarify',
    confirmationPolicy: 'two_phase',
  },
};

export function riskFor(consequence: Consequence): RiskProfile {
  return RISK[consequence];
}

export interface CliLexicon {
  entries: CliEntry[];
  /** Content hash of the manifest. A determinism input — the lexicon IS the pkg. */
  version: string;
}

export function loadCliLexicon(pkgPath = 'package.json'): CliLexicon {
  const raw = readFileSync(pkgPath, 'utf8');
  const scripts: Record<string, string> = JSON.parse(raw).scripts ?? {};
  const entries = Object.entries(scripts)
    .map(([key, command]) => ({ key, command, ...classify(key, command) }))
    .sort((a, b) => a.key.localeCompare(b.key));
  return {
    entries,
    version: `pkg-scripts-${crypto.createHash('sha256').update(JSON.stringify(scripts)).digest('hex').slice(0, 12)}`,
  };
}

/** The closed world a proposer may rank. It may not add to this. */
export function knownKeys(lex: CliLexicon): string[] {
  return lex.entries.map((e) => e.key);
}

export function entryFor(lex: CliLexicon, key: string): CliEntry | undefined {
  return lex.entries.find((e) => e.key === key);
}
