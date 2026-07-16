/**
 * SEMANTIC CALCULUS — cite resolution via CODE_BRAIN. NODE-ONLY.
 *
 * Fills the F6 hole: `citeGenes()` returned `[]` with the comment "Phase 3 wires
 * the real SCDNA registry". This is that wiring, against the forcefield's
 * ripgrep-backed CODE_BRAIN.
 *
 * TWO RULES, both learned the hard way today.
 *
 * 1. THE COMPILER NEVER CALLS THIS.
 *    Cites are SEALED into the act (F5). CODE_BRAIN's output depends on repo
 *    state, and repo state is not in the §3.2 determinism input list — so if
 *    compileSemanticIntent() shelled out here, the same utterance would seal
 *    different bytes after any commit and replay identity (100%, F18) would be a
 *    lie. Cites are resolved BEFORE the compile and submitted as evidence, exactly
 *    like the proposal. The compiler adjudicates; it does not investigate.
 *
 * 2. A CITE MUST SUPPORT SOMETHING.
 *    `supports` names the field a cite warrants. A cite that supports nothing is
 *    citation theatre — the ALCE failure your own paper cites, where systems emit
 *    references that do not back the claim. An empty `supports` is rejected here,
 *    not silently passed through.
 *
 * Why this is trustworthy enough to wire at all: CODE_BRAIN was, until today,
 * returning "No direct matches" for everything in every non-interactive context
 * (rg with no search path blocks on stdin, timed out at 10s, and
 * `except Exception: return []` reported the hang as an empty result). Wiring it
 * before that fix would have sealed empty cites into every act and called them
 * evidence.
 */

import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import { SEMANTIC_CALCULUS_ERRORS } from './types.ts';
import type { GeneCite } from './types.ts';
import { literalKeywordProposer, type KeywordProposer, type ProposedKeyword } from './keywordProposer.ts';

/** What CODE_BRAIN returns per hit, now that direct_brain emits real JSON. */
interface EvidenceRef {
  source: string; // "path/to/file.ts:39"
  snippet: string;
  relevance: number;
}

export interface CiteResolution {
  cites: GeneCite[];
  /** Recorded so a replay knows which brain produced the evidence. */
  resolverId: string;
  /** Which proposer supplied the keywords. Swapping it must change nothing else. */
  proposerId: string;
  /** What the model guessed. Each is a hypothesis; ripgrep is the experiment. */
  proposed: ProposedKeyword[];
  /**
   * Keywords the codebase has never heard of, AND that were actually searched.
   * A finding about the MODEL: it guessed a word that does not exist.
   */
  refuted: string[];
  /**
   * Keywords the search governor declined to run, with its reason. A finding
   * about the GOVERNOR, not the model — the guess was never tested.
   *
   * These are the opposite of `refuted` and must never be merged with it.
   * Measured: asking about button colours proposed `palette` and `color`, and the
   * governor blocked both ("SCDNA gene BUGPATTERN_COLOR_DRAGON_FRONTEND_FALLBACK
   * resolves this query"). Both came back with zero evidence, and reading that
   * zero as refutation claimed this codebase has never heard of the word "color".
   */
  unsearched: Array<{ keyword: string; reason: string }>;
  /** Non-fatal problems. A failed resolve must not masquerade as "no evidence". */
  errors: string[];
}

export const CITE_RESOLVER_ID = 'code-brain-ripgrep-v1';

/** Below this, a hit is noise: archived code, a passing mention in a doc. */
export const MIN_CITE_RELEVANCE = 0.6;

/**
 * Never cite the question.
 *
 * Measured on the first real query ("Why the visualizer has stutters?"): the top
 * cites were bench/semantic-calculus/corpus/shadow-intents.jsonl (the log the
 * utterance was captured into) and the test script that asked it. Retrieval over
 * a corpus that CONTAINS the queries will always match the queries — a perfectly
 * verifiable, perfectly circular warrant.
 *
 * These are excluded structurally rather than by relevance, because a self-match
 * is a whole-word hit in a live file and scores well by every signal we have.
 */
const SELF_REFERENTIAL =
  /\/bench\/|\/corpus\/|shadow-intents|cli-intents|\.jsonl$|-tmp\.(mjs|js|ts)$|\/labels\//;

/**
 * The instrument must not be evidence for what it measures.
 *
 * Second-order self-reference, found immediately after fixing the first: asking
 * "why does the visualizer stutter?" cited keywordProposer.ts, because the stub
 * proposer contains the string literal "BytecodeVisualiser", and citeResolver.ts,
 * because these very comments discuss "stutter". Documenting a symptom makes the
 * symptom greppable, so the tool built to find the bug becomes a hit for it.
 *
 * TRADE-OFF, stated rather than hidden: Semantic Calculus can no longer cite its
 * own source. If SC itself has a bug, this resolver will not find it. That is the
 * right way round — a measurement contaminated by its instrument is worse than a
 * measurement with a known blind spot, because the contamination is invisible and
 * the blind spot is written down here.
 */
const INSTRUMENT_SOURCE = /\/semantic-calculus\/|scholo-gate|harvest-lexicon|compile-shadow/;

/**
 * A cite must warrant a specific field, or it is decoration. These are JSON
 * pointers into the act body — the same shape F6 specifies.
 */
export type SupportPointer = string;

function digest(s: string): string {
  return crypto.createHash('sha256').update(s, 'utf8').digest('hex').toUpperCase().slice(0, 32);
}

/**
 * Ask CODE_BRAIN what in the codebase bears on this utterance.
 *
 * @param supports JSON pointer(s) into the act these cites are offered to warrant.
 *                 Required: a cite with nothing to support is rejected.
 */
export function resolveCites(
  utterance: string,
  supports: SupportPointer[],
  opts: {
    repoRoot?: string;
    python?: string;
    timeoutMs?: number;
    /**
     * Any LLM drops in here. Its contract is narrow: turn an utterance into
     * keywords. It may INVENT them — that is the point, since "stutter" must
     * become "shadowBlur" — because ripgrep refuses the ones that match nothing.
     * The model reaches; the search decides; the compiler adjudicates.
     */
    proposer?: KeywordProposer;
  } = {},
): CiteResolution {
  const errors: string[] = [];
  if (supports.length === 0) {
    // F6. Refusing here rather than returning [] keeps the failure visible: a cite
    // that supports nothing cannot be checked, so it cannot be a warrant.
    throw new Error(`${SEMANTIC_CALCULUS_ERRORS.UNTRUSTED_CITE_SOURCE}: cites must declare what they support`);
  }

  const root = opts.repoRoot ?? process.cwd();
  const python = opts.python ?? '.venv/bin/python';
  const proposer = opts.proposer ?? literalKeywordProposer;

  // The model turns the utterance into symbols. CODE_BRAIN then greps exactly
  // these, so what gets searched is auditable rather than whatever the brain's own
  // tokenizer happened to extract.
  const proposed = proposer.propose(utterance);

  const errors2: string[] = [];
  const refuted: string[] = [];
  const unsearched: Array<{ keyword: string; reason: string }> = [];
  const cites: GeneCite[] = [];
  const seen = new Set<string>();

  // ONE SEARCH PER KEYWORD. Batching them into a single query starved later
  // keywords: CODE_BRAIN caps evidence at 5 across the whole call, so the first
  // keyword consumed the budget and BytecodeVisualiser — proposed explicitly —
  // never appeared. Per-keyword also makes refutation a fact rather than an
  // inference: zero hits IS the refutation.
  for (const k of proposed) {
    let raw: string;
    try {
      raw = execFileSync(
        python,
        ['steamdeck_brain/direct_brain.py', '--action', 'brain', '--name', 'CODE_BRAIN', '--query', k.keyword],
        {
          cwd: root,
          encoding: 'utf8',
          timeout: opts.timeoutMs ?? 30_000,
          env: { ...process.env, PYTHONPATH: 'steamdeck_brain' },
          stdio: ['ignore', 'pipe', 'pipe'],
          maxBuffer: 8 * 1024 * 1024,
        },
      );
    } catch (err) {
      // A failed search is NOT a refuted keyword. Conflating them would blame the
      // model for the tool's outage — the same class of error as CODE_BRAIN's own
      // `except: return []`, which reported a hung search as "no matches".
      errors2.push(`search failed for ${k.keyword!}: ${(err as Error).message}`);
      continue;
    }

    let parsed: { result?: { evidence?: EvidenceRef[]; findings?: string[] } };
    try {
      parsed = JSON.parse(raw);
    } catch {
      errors2.push(`unparseable output for ${k.keyword}`);
      continue;
    }

    const findings = parsed.result?.findings ?? [];
    // The governor can decline a search (budget spent, or a gene already answers
    // the query). That returns cleanly with zero evidence — identical in shape to
    // a keyword the repo has never heard of, and opposite in meaning.
    const blocked = findings.find((f) => /^Search for '.*' blocked: /.test(f));
    if (blocked) {
      unsearched.push({ keyword: k.keyword, reason: blocked.replace(/^Search for '.*' blocked: /, '') });
      continue;
    }

    const why = findings[0] ?? `matched by code search for ${k.keyword}`;
    let hits = 0;
    for (const ev of parsed.result?.evidence ?? []) {
      if (typeof ev?.source !== 'string' || typeof ev?.relevance !== 'number') continue;
      if (ev.source.startsWith('<search-')) { errors2.push(ev.snippet); continue; }
      if (ev.relevance < MIN_CITE_RELEVANCE) continue;
      const path = ev.source.replace(/:\d+$/, '');
      if (SELF_REFERENTIAL.test(path) || INSTRUMENT_SOURCE.test(path)) continue;
      hits += 1;
      if (seen.has(ev.source)) continue;
      seen.add(ev.source);
      cites.push({
        stableId: ev.source,
        contentHash: digest(ev.snippet),
        // The model's reasoning, carried as provenance — a reviewer can see WHY
        // this keyword was searched, not just that it matched.
        whyMatched: `${k.keyword}: ${k.why} — ${why}`,
        trust: 'policy',
        taint: ['repo-content', `proposed-by:${proposer.id}`],
        supports: [...supports],
      });
    }
    // Searched, and the repo has never heard of it. A finding about the model.
    if (hits === 0) refuted.push(k.keyword);
  }

  cites.sort((a, b) => a.stableId.localeCompare(b.stableId));
  errors.push(...errors2);

  return { cites, resolverId: CITE_RESOLVER_ID, proposerId: proposer.id, proposed, refuted, unsearched, errors };
}

/**
 * F6 boundary check, run inside the compile on SUBMITTED cites.
 * @throws if a cite is untrusted, unsupported, or unidentifiable.
 */
export function validateCites(cites: readonly GeneCite[]): void {
  for (const c of cites) {
    if (c.trust !== 'policy' && c.trust !== 'user') {
      throw new Error(`${SEMANTIC_CALCULUS_ERRORS.UNTRUSTED_CITE_SOURCE}: ${c.stableId} trust=${c.trust}`);
    }
    if (!c.supports || c.supports.length === 0) {
      // Citation theatre: a reference that backs no specific claim.
      throw new Error(`${SEMANTIC_CALCULUS_ERRORS.UNTRUSTED_CITE_SOURCE}: ${c.stableId} supports nothing`);
    }
    if (!c.stableId || !c.contentHash) {
      throw new Error(`${SEMANTIC_CALCULUS_ERRORS.UNTRUSTED_CITE_SOURCE}: cite is unidentifiable`);
    }
  }
}
