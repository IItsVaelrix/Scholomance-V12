/**
 * Harvest a candidate UI lexicon from the app's OWN affordance declarations.
 *
 * The lexicon must not be invented. Every entry I wrote by hand was wrong — the
 * Phase 1 phrases nobody would say, the Phase 2 patterns fitted to a single real
 * utterance. The vocabulary has to come from the app, not from a model imagining
 * what someone might say to it.
 *
 * aria-labels are the source of truth, and this is not a trick: they exist so a
 * screen-reader user knows what each control DOES, in English. A screen-reader
 * user says "collapse discography". That is not a description of the intent
 * vocabulary — it IS the intent vocabulary, written by the person who built the app.
 *
 * The property this buys: a lexicon derived from affordances can express exactly
 * what the app can do and nothing more. So Theory stops meaning "the lexicon is
 * thin" and starts meaning "no affordance exists for that" — which is a feature
 * request, not a vocabulary gap. That is a much more useful signal.
 *
 *   node bench/semantic-calculus/harvest-lexicon.mjs [--write]
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = join(dirname(fileURLToPath(import.meta.url)), 'corpus', 'harvested-lexicon.json');

/** Verbs the app actually uses, mapped to the formula they'd bind. */
const VERB_FORMULA = {
  open: 'ui.navigate.v1', show: 'ui.navigate.v1', 'go to': 'ui.navigate.v1',
  close: 'ui.collapse.v1', collapse: 'ui.collapse.v1', expand: 'ui.collapse.v1', hide: 'ui.collapse.v1',
  next: 'ui.select.v1', previous: 'ui.select.v1', select: 'ui.select.v1', play: 'ui.select.v1',
  restart: 'ui.select.v1', skip: 'ui.select.v1', seek: 'ui.select.v1', repeat: 'ui.select.v1',
  resize: 'ui.collapse.v1', toggle: 'ui.collapse.v1', pause: 'ui.select.v1',
};
const VERBS = Object.keys(VERB_FORMULA).sort((a, b) => b.length - a.length);

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '.claude', 'coverage', '__pycache__']);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(tsx|jsx|ts)$/.test(name)) out.push(p);
  }
  return out;
}

// Scope to the surface the shadow actually runs on. Harvesting the whole app
// (combat, manifold, blog) yields vocabulary for pages you are not standing on.
const SURFACES = ['src/pages/Visualiser', 'src/pages/Listen', 'src/components/shared'];
const files = SURFACES.flatMap((d) => { try { return walk(join(ROOT, d)); } catch { return []; } });

// ── 1. aria-labels: the app naming its own affordances ──────────────────────
const labels = new Set();
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  for (const m of src.matchAll(/aria-label=["']([^"']+)["']/g)) {
    const v = m[1].trim();
    // aria-label does TWO jobs: it names CONTROLS (a real affordance vocabulary)
    // and it announces STATUS on live regions ("Analyzing...", "Album not found",
    // "Anti-exploit threshold reached"). Only the first is a lexicon. Harvesting
    // both produced 215 "targets" including "beta" and "welcome to polaris".
    const isStatus = /\.{3}$|^(analyzing|loading|error|empty|no |not found|welcome|beta$)|\b(not found|initializing|reached|status|failed|pinned|now showing)\b/i.test(v);
    if (v && !v.includes('${') && v.length < 44 && !isStatus) labels.add(v);
  }
}

// ── 2. routes: the navigable surface ────────────────────────────────────────
const routes = new Set();
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  for (const m of src.matchAll(/\bpath:\s*["']([^"']+)["']/g)) {
    const v = m[1];
    if (v.startsWith('/') || /^[a-z]/.test(v)) routes.add(v.startsWith('/') ? v : `/${v}`);
  }
}

// ── 3. split labels into verb + target ──────────────────────────────────────
const actions = [];
const targets = new Set();

for (const label of labels) {
  const low = label.toLowerCase();
  const verb = VERBS.find((v) => low === v || low.startsWith(`${v} `));
  if (verb) {
    const target = low.slice(verb.length).trim().replace(/^(the|a|an)\s+/, '');
    actions.push({
      utterance: target ? `${verb} ${target}` : verb,
      verb,
      target: target || null,
      formulaId: VERB_FORMULA[verb],
      source: `aria-label:${label}`,
    });
    if (target) targets.add(target);
  }
  // NOTE: bare nouns are deliberately NOT harvested as targets. A target earns its
  // place by being the object of a verb somewhere in the UI, or by being a route.
  // Otherwise every status string becomes something the compiler thinks you can
  // ask for, which widens the guessing surface for no gain.
}

const report = {
  lexiconVersion: 'ui-lexicon-harvested-v1',
  harvestedAt: new Date().toISOString(),
  provenance: 'src/**/*.{tsx,jsx,ts} aria-label + route declarations',
  counts: { ariaLabels: labels.size, routes: routes.size, actions: actions.length, targets: targets.size },
  actions: actions.sort((a, b) => a.utterance.localeCompare(b.utterance)),
  targets: [...targets].sort(),
  routes: [...routes].sort(),
};

if (process.argv.includes('--write')) {
  writeFileSync(OUT, JSON.stringify(report, null, 2) + '\n');
  console.log(`wrote ${OUT}`);
}

const C = { b: '\x1b[1m', d: '\x1b[2m', g: '\x1b[32m', y: '\x1b[33m', r: '\x1b[0m' };
console.log(`\n${C.b}harvested from your own app${C.r}  ${C.d}(nothing invented)${C.r}`);
console.log(`  aria-labels ${labels.size}   routes ${routes.size}   ->   ${C.g}${actions.length} actions${C.r}, ${C.g}${targets.size} targets${C.r}\n`);

console.log(`${C.b}ACTIONS — things your UI says it can do${C.r}`);
for (const a of report.actions) console.log(`  ${a.utterance.padEnd(30)} ${C.d}${a.formulaId.padEnd(17)} ${a.source}${C.r}`);

console.log(`\n${C.b}TARGETS — things your UI has names for${C.r}`);
console.log('  ' + report.targets.join(', '));

console.log(`\n${C.y}Review these. Anything you would never say, delete — a lexicon entry`);
console.log(`nobody utters is dead weight that only widens the guessing surface.${C.r}`);
console.log(`${C.d}Anything you DO say that is missing here has no button either — that is a`);
console.log(`feature request, not a lexicon gap, and Theory is the correct answer for it.${C.r}\n`);
