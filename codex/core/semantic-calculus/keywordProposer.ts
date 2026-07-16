/**
 * SEMANTIC CALCULUS — keyword proposal for cite resolution. ISOMORPHIC.
 *
 * The seam where a model bridges the gap grep cannot cross.
 *
 * Measured: "BytecodeVisualiser shadowBlur stutter" cites the real bug site;
 * "Why the visualizer has stutters?" cites a CSS file. Same question, same repo.
 * Your code spells it Visualiser, the utterance said visualizer, and "stutter" is
 * a SYMPTOM — it appears nowhere in the source. Grep needs the symbol; a human
 * gives you the sensation. No amount of ranking fixes that; it is a vocabulary
 * gap, and closing it is exactly what a language model is for.
 *
 * THE INVERSION THAT MAKES THIS SAFE
 * ----------------------------------
 * proposer.ts enforces a CLOSED WORLD: rank the npm scripts that exist, never
 * invent one. Keywords are the opposite — the model MUST invent `shadowBlur` from
 * "stutter", or it has done nothing.
 *
 * So what refuses it? **ripgrep does.** A proposed keyword that matches no file
 * produces no cite. The model may guess anything; only guesses that resolve to a
 * real file:line become evidence. The guess is a hypothesis and the grep is the
 * experiment — and a refuted keyword is recorded, not silently dropped, because
 * "the model guessed `stutter` and the codebase has never heard of it" is a
 * finding about the model, not noise.
 *
 * Nothing here decides anything. Keywords are submitted to a search; the search
 * decides; the compiler adjudicates what the search returned.
 */

export interface ProposedKeyword {
  /** The symbol to search for. May be invented — ripgrep is the check. */
  keyword: string;
  /** Why the model thinks this bears on the utterance. Audit only, never authority. */
  why: string;
  /** 0..1. The model's own confidence — miscalibrated by nature, so advisory only. */
  confidence: number;
}

export interface KeywordProposer {
  id: string;
  propose(utterance: string): ProposedKeyword[];
}

/** Bound: an unbounded keyword list is an unbounded search. */
export const MAX_KEYWORDS = 6;

const STOP = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'has', 'have', 'had',
  'do', 'does', 'did', 'why', 'what', 'how', 'when', 'where', 'who', 'which',
  'my', 'your', 'our', 'it', 'this', 'that', 'with', 'for', 'and', 'or', 'to',
  'in', 'on', 'at', 'of', 'from', 'by', 'fix', 'bug', 'code', 'error', 'problem',
  'issue', 'please', 'can', 'you', 'i', 'me', 'there', 'some', 'any',
]);

/**
 * Deterministic reference proposer: the words of the utterance, minus stopwords.
 *
 * This is what CODE_BRAIN already does internally, made explicit so it can be a
 * CONTROL ARM. It is the reason "Why the visualizer has stutters?" fails — it
 * proposes `visualizer` and `stutters`, neither of which is in the source. Any
 * model proposer must beat this, or it is buying nondeterminism for nothing.
 */
export const literalKeywordProposer: KeywordProposer = {
  id: 'literal-tokens-v1',
  propose(utterance) {
    const seen = new Set<string>();
    const out: ProposedKeyword[] = [];
    for (const raw of String(utterance ?? '').split(/[^A-Za-z0-9_]+/)) {
      const w = raw.trim();
      if (w.length < 3 || STOP.has(w.toLowerCase()) || seen.has(w.toLowerCase())) continue;
      seen.add(w.toLowerCase());
      out.push({ keyword: w, why: 'literal token from the utterance', confidence: 0.5 });
      if (out.length >= MAX_KEYWORDS) break;
    }
    return out;
  },
};

/**
 * Compose proposers. The literal tokens are always worth searching — a model that
 * only proposes clever synonyms would miss an utterance that already named the
 * symbol. Union, deduped, model first (it goes into the search budget first).
 */
export function composeProposers(...proposers: KeywordProposer[]): KeywordProposer {
  return {
    id: proposers.map((p) => p.id).join('+'),
    propose(utterance) {
      const seen = new Set<string>();
      const out: ProposedKeyword[] = [];
      for (const p of proposers) {
        for (const k of p.propose(utterance)) {
          const key = k.keyword.toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          out.push(k);
          if (out.length >= MAX_KEYWORDS) return out;
        }
      }
      return out;
    },
  };
}

/**
 * A stand-in for an LLM proposer, so the seam is exercised and testable without a
 * model. It encodes a handful of symptom -> symbol mappings a real model would
 * know for free.
 *
 * This is NOT a lexicon and must never grow into one. It exists to prove that
 * swapping the proposer changes the outcome and nothing else — the same
 * demonstration as lexicalProposer vs a real ranker on the CLI gate. A hand-kept
 * synonym table would be me inventing vocabulary again, which has failed every
 * time today.
 */
export const stubSemanticKeywordProposer: KeywordProposer = {
  id: 'stub-semantic-keywords-v1',
  propose(utterance) {
    const u = utterance.toLowerCase();
    const out: ProposedKeyword[] = [];
    const add = (keyword: string, why: string, confidence: number) => {
      if (out.length < MAX_KEYWORDS) out.push({ keyword, why, confidence });
    };
    // Symptom -> symbol. The gap grep cannot cross.
    if (/stutter|jitter|lag|frame ?rate|fps|janky|choppy/.test(u)) {
      add('shadowBlur', 'canvas shadowBlur is the usual per-frame fill-rate cost behind stutter', 0.8);
      add('requestAnimationFrame', 'frame loop is where stutter originates', 0.6);
    }
    // Spelling: the codebase is British, the utterance often is not.
    if (/visuali[sz]er/.test(u)) {
      add('BytecodeVisualiser', 'the app spells it "Visualiser"; the utterance said "visualizer"', 0.9);
    }
    if (/karaoke|lyric/.test(u)) add('AlbumLyrics', 'karaoke text is rendered by the lyrics component', 0.7);
    if (/colou?r|palette/.test(u)) add('palette', 'colour work resolves through the palette', 0.5);
    return out;
  },
};
