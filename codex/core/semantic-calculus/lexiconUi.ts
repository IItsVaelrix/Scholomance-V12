/**
 * SEMANTIC CALCULUS — UI guinea-pig lexicon (Phase 2: PARAMETRIC binds).
 *
 * Phase 1 bound whole phrases with pre-baked payloads:
 *
 *     'open albums': { formulaId: 'ui.navigate.v1', payload: { route: '/albums' } }
 *
 * That table can only ever produce an exact hit (Do) or a miss (Theory). There is
 * no slot to leave unresolved, so CLARIFY WAS UNREACHABLE — measured 2026-07-16
 * against a real Visualiser session: "open it" on /visualiser/album/grimoire-vol-1
 * returned Theory with the album id sitting in the route. The architecture's
 * central safety valve (Clarify instead of a soft Do) had no code path.
 *
 * Patterns are parametric now. A phrase binds a FORMULA with named slots; each
 * slot resolves separately. All slots resolved -> Do. Any slot unresolved -> Clarify.
 *
 * The deictic rule is the point: "it"/"that"/"this" bind the verb but NOT the
 * target. Resolving them from state would be the soft Do this whole architecture
 * exists to prevent (SEMANTIC_KIND_CLARIFY_UNDERSPECIFIED forbids it explicitly).
 * State supplies CANDIDATES for the question, never the answer.
 */

import type { TrustPartitionedContext } from './types.ts';

export const LEXICON_VERSION = 'ui-lexicon-v2-harvested';

export interface LexiconPattern {
  /** `{slot}` marks a named hole. Everything else is literal. */
  pattern: string;
  formulaId: string;
  /** Slots that must resolve before this can be a Do. */
  requiredSlots: string[];
  /** Slots pre-bound by the phrase itself (e.g. "collapse sidebar" fixes target). */
  fixed?: Record<string, unknown>;
  /** Provenance. 'aria-label' = harvested from a real control; 'hand' = I wrote it. */
  source: 'aria-label' | 'route' | 'hand';
}

/**
 * Matched longest-literal-first (see bindPattern), NOT in declaration order.
 * Declaration order is a trap: 'show {target}' would otherwise swallow
 * 'show me that' and capture target="me that".
 * Deliberately small. This is a guinea pig, not a product vocabulary — and the
 * shadow corpus, not my imagination, is what should grow it.
 */
const PATTERNS: readonly LexiconPattern[] = Object.freeze([
  // ── HARVESTED from aria-labels (bench/semantic-calculus/harvest-lexicon.mjs) ──
  // Every verb below is one your UI has a button for. Nothing here was invented:
  // if the app cannot do it, it is not in the lexicon, and saying it yields Theory.
  // That makes Theory mean "no affordance exists" (a feature request) rather than
  // "the vocabulary is thin" (my imagination failing).
  { pattern: 'close {target}', formulaId: 'ui.collapse.v1', requiredSlots: ['target'], source: 'aria-label' },
  { pattern: 'collapse {target}', formulaId: 'ui.collapse.v1', requiredSlots: ['target'], source: 'aria-label' },
  { pattern: 'expand {target}', formulaId: 'ui.collapse.v1', requiredSlots: ['target'], source: 'aria-label' },
  { pattern: 'next {target}', formulaId: 'ui.select.v1', requiredSlots: ['target'], source: 'aria-label' },
  { pattern: 'pause {target}', formulaId: 'ui.select.v1', requiredSlots: ['target'], source: 'aria-label' },
  { pattern: 'play {target}', formulaId: 'ui.select.v1', requiredSlots: ['target'], source: 'aria-label' },
  { pattern: 'previous {target}', formulaId: 'ui.select.v1', requiredSlots: ['target'], source: 'aria-label' },
  { pattern: 'repeat {target}', formulaId: 'ui.select.v1', requiredSlots: ['target'], source: 'aria-label' },
  { pattern: 'restart {target}', formulaId: 'ui.select.v1', requiredSlots: ['target'], source: 'aria-label' },
  { pattern: 'seek {target}', formulaId: 'ui.select.v1', requiredSlots: ['target'], source: 'aria-label' },
  { pattern: 'skip {target}', formulaId: 'ui.select.v1', requiredSlots: ['target'], source: 'aria-label' },
  { pattern: 'repeat', formulaId: 'ui.select.v1', requiredSlots: [], fixed: { target: 'repeat' }, source: 'aria-label' },
  { pattern: 'restart', formulaId: 'ui.select.v1', requiredSlots: [], fixed: { target: 'restart' }, source: 'aria-label' },
  { pattern: 'seek', formulaId: 'ui.select.v1', requiredSlots: [], fixed: { target: 'seek' }, source: 'aria-label' },

  // ── navigation: from the router, not from aria-labels ────────────────────
  { pattern: 'go to {target}', formulaId: 'ui.navigate.v1', requiredSlots: ['target'], source: 'route' },
  { pattern: 'open {target}', formulaId: 'ui.navigate.v1', requiredSlots: ['target'], source: 'route' },
  { pattern: 'show {target}', formulaId: 'ui.navigate.v1', requiredSlots: ['target'], source: 'route' },
  { pattern: 'show me {target}', formulaId: 'ui.navigate.v1', requiredSlots: ['target'], source: 'route' },

  // ── inspection (read-only -> Probe) ──────────────────────────────────────
  { pattern: 'what is {target}', formulaId: 'ui.inspect.v1', requiredSlots: ['target'], source: 'hand' },
  { pattern: 'what album is this', formulaId: 'ui.inspect.v1', requiredSlots: [], fixed: { target: 'current-album' }, source: 'hand' },
]);

/** Known referents for the `target` slot. Route values are literal app routes. */
const TARGETS: Readonly<Record<string, unknown>> = Object.freeze({
  // ── HARVESTED: things your UI names as the object of a verb ──────────────
  'album': { component: 'album' },
  'discography': { component: 'discography' },
  'panel': { component: 'panel' },
  'station': { component: 'station' },
  'track': { component: 'track' },
  'transmission': { component: 'transmission' },
  'the album': { component: 'album' },
  'the discography': { component: 'discography' },
  'the track': { component: 'track' },
  'the panel': { component: 'panel' },
  // ── routes ───────────────────────────────────────────────────────────────
  albums: { route: '/albums' },
  'the albums': { route: '/albums' },
  visualiser: { route: '/visualiser' },
  'the visualiser': { route: '/visualiser' },
  listen: { route: '/listen' },
});

/**
 * Pronouns and demonstratives. These bind the VERB but never the TARGET.
 * Resolving one from state is exactly the soft Do the doctrine forbids: state
 * supplies candidates for the question, never the answer.
 */
const DEICTIC = new Set(['it', 'that', 'this', 'them', 'those', 'the other one', 'there', 'here']);

export function normalizeUtterance(utterance: string): string {
  return String(utterance ?? '')
    .normalize('NFC')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.!?]+$/, '');
}

function patternToRegex(pattern: string): { re: RegExp; slots: string[] } {
  const slots: string[] = [];
  const source = pattern
    .split(/(\{[a-z]+\})/)
    .map((part) => {
      const m = /^\{([a-z]+)\}$/.exec(part);
      if (m) {
        slots.push(m[1]);
        return '(.+?)';
      }
      return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('');
  return { re: new RegExp(`^${source}$`), slots };
}

/**
 * `deictic`         — the referent EXISTS, we just cannot tell which. Bounded
 *                     question, state offers candidates -> Clarify.
 * `unknown-referent`— the word names no concept the lexicon has. There is nothing
 *                     to disambiguate; offering "the album" would be a non-sequitur.
 *                     This is an unbound concept -> Theory, and it deposits.
 */
export type SlotResolution =
  | { resolved: true; value: unknown }
  | { resolved: false; reason: 'deictic' | 'unknown-referent'; raw: string; candidates: string[] };

/** Candidates come from state and are offered in the QUESTION, never auto-applied. */
function candidatesFromState(context: TrustPartitionedContext): string[] {
  const user = (context.user ?? {}) as Record<string, unknown>;
  const route = String(user.route ?? '');
  const out: string[] = [];
  const album = /\/visualiser\/album\/([^/?#]+)/.exec(route)?.[1];
  if (album) out.push(`the album (${album})`);
  if (user.selection) out.push(`the selected track (${user.selection})`);
  if (user.panel) out.push(`the ${user.panel} panel`);
  return out;
}

export function resolveSlot(raw: string, context: TrustPartitionedContext): SlotResolution {
  const key = normalizeUtterance(raw);
  if (DEICTIC.has(key)) {
    return { resolved: false, reason: 'deictic', raw: key, candidates: candidatesFromState(context) };
  }
  if (key in TARGETS) return { resolved: true, value: TARGETS[key] };
  // No state candidates: we are not asking "which one", we are admitting we do
  // not know the word. That is a Theory deposit, not a bounded question.
  return { resolved: false, reason: 'unknown-referent', raw: key, candidates: [] };
}

export interface LexiconMatch {
  formulaId: string;
  payload: Record<string, unknown>;
  /** Slots the phrase named but whose referent did not resolve. */
  unresolved: Array<{ slot: string; reason: string; raw: string; candidates: string[] }>;
}

/**
 * Match an utterance against the parametric lexicon.
 *
 * Returns `undefined` only when NO pattern matched — that is a true lexicon miss
 * (Theory). A pattern match with unresolved slots is NOT a miss: the verb bound
 * and the target did not, which is Clarify.
 */
export function bindPattern(utterance: string, context: TrustPartitionedContext): LexiconMatch | undefined {
  const text = normalizeUtterance(utterance);
  // Longest literal prefix wins: 'show me {target}' must beat 'show {target}'.
  const ordered = [...PATTERNS].sort(
    (a, b) => b.pattern.replace(/\{[a-z]+\}/g, '').length - a.pattern.replace(/\{[a-z]+\}/g, '').length,
  );
  for (const entry of ordered) {
    const { re, slots } = patternToRegex(entry.pattern);
    const m = re.exec(text);
    if (!m) continue;

    const payload: Record<string, unknown> = { ...(entry.fixed ?? {}) };
    const unresolved: LexiconMatch['unresolved'] = [];

    slots.forEach((slot, i) => {
      const resolution = resolveSlot(m[i + 1], context);
      if (resolution.resolved) payload[slot] = resolution.value;
      else {
        unresolved.push({
          slot,
          reason: resolution.reason,
          raw: resolution.raw,
          candidates: resolution.candidates,
        });
      }
    });

    return { formulaId: entry.formulaId, payload, unresolved };
  }
  return undefined;
}

export function lexiconSize(): number {
  return PATTERNS.length;
}

/** Every referent the lexicon knows. Useful for the shadow report's coverage math. */
export function knownTargets(): string[] {
  return Object.keys(TARGETS);
}
