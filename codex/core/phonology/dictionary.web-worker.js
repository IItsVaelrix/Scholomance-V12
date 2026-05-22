/**
 * Pillar 2 — Off-thread dictionary parser (browser Web Worker).
 *
 * Fetches and parses the phoneme dictionary, rhyme rules, and corpus inside a
 * Web Worker so dictionary hydration never freezes the page's main thread. The
 * parsed payload is posted back to the PhonemeEngine once.
 */

async function loadDictionaries() {
  const [dict, rules, corpus] = await Promise.allSettled([
    fetch('/phoneme_dictionary_v2.json').then((res) => res.json()),
    fetch('/rhyme_matching_rules_v2.json').then((res) => res.json()),
    fetch('/corpus.json').then((res) => res.json()),
  ]);

  return {
    ok: true,
    dict: dict.status === 'fulfilled' ? dict.value : null,
    rules: rules.status === 'fulfilled' ? rules.value : null,
    corpus: corpus.status === 'fulfilled' ? corpus.value : null,
    errors: {
      dict: dict.status === 'rejected' ? String(dict.reason) : null,
      rules: rules.status === 'rejected' ? String(rules.reason) : null,
      corpus: corpus.status === 'rejected' ? String(corpus.reason) : null,
    },
  };
}

loadDictionaries()
  .then((payload) => self.postMessage(payload))
  .catch((err) => self.postMessage({ ok: false, error: String(err) }));
