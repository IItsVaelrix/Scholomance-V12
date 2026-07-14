/**
 * Self-targeting dictionary authority.
 *
 * PhonemeEngine and DeepRhymeEngine resolve pronunciations through a
 * ScholomanceDictionaryAPI whose default transport is `fetch`. That is correct
 * in the browser and wrong everywhere else: in a Node process (the server, a
 * script, a test) there is no origin to fetch from, the lookup throws, and both
 * engines fall back to guessing phonemes from spelling. The guesses are not
 * flagged as guesses — "bottle" comes back as B AA1 T T L instead of
 * B AA1 T AH0 L — so rhyme analysis does not degrade, it lies.
 *
 * Any in-process caller holds the dictionary already. This serves lookupBatch
 * straight from the lexicon adapter, so the engines get real CMU phonemes
 * instead of spelling heuristics.
 *
 * Shape matches what PhonemeEngine.primeAuthorityBatch and
 * DeepRhymeEngine.primeRhymeFamilies expect:
 *   { lookupBatch(words) -> { families: { WORD: { family, phonemes } } } }
 */

import { createLexiconAdapter } from './lexicon.sqlite.adapter.js';

function resolveLexiconDbPath() {
  const raw = process.env.SCHOLOMANCE_DICT_PATH;
  if (raw && raw.trim()) return raw.trim();
  return './scholomance_dict.sqlite';
}

let cachedLexiconAdapter = null;

/** The adapter is a read-only sqlite handle; one per process is enough. */
export function getLexiconAdapterForRhyme({ log = console } = {}) {
  if (cachedLexiconAdapter) return cachedLexiconAdapter;
  cachedLexiconAdapter = createLexiconAdapter(resolveLexiconDbPath(), { log });
  return cachedLexiconAdapter;
}

/** Test seam: drop the cached handle so a fresh path can be resolved. */
export function resetLexiconAdapterForRhyme() {
  try {
    cachedLexiconAdapter?.close?.();
  } catch {
    /* the handle is already gone; nothing to release */
  }
  cachedLexiconAdapter = null;
}

export function buildSelfDictionaryAPI({ log, adapter } = {}) {
  return {
    isEnabled() {
      return true;
    },
    async lookupBatch(words) {
      const lexicon = adapter || getLexiconAdapterForRhyme({ log: log || console });
      const list = Array.isArray(words) ? words.filter(Boolean) : [];
      if (list.length === 0) return { families: {} };
      try {
        const families = lexicon.batchLookupFamilies(list);
        return { families: families || {} };
      } catch (err) {
        log?.warn?.(
          { err: err?.message || String(err) },
          '[SelfDictionaryAuthority] batchLookupFamilies failed; rhyme engine will fall back to local scoring',
        );
        return { families: {} };
      }
    },
  };
}
