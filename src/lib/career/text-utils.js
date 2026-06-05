/**
 * Shared, dependency-free text primitives for the Career analysis stack.
 *
 * This is the LEAF of the career dependency graph (PDR §6): both `transmuter.js`
 * and `keyword-gap.js` import `stem`/`normalizeText` from here so the two modules
 * use the byte-identical functions. The determinism contract (PDR §11) depends on
 * that symmetry — the résumé side and the JD side must stem the same way, and the
 * transmuter's preserve-set must stem the same way the analyzer does.
 *
 * Pure, deterministic, no I/O, no clocks, no randomness.
 */

/**
 * Lowercases and strips punctuation while keeping the characters that make up real
 * tech tokens (`c++`, `c#`, `node.js`, `ci-cd`). See PDR §12.1.
 *
 * Known limitation (documented, not a bug): keeping `.` for `node.js` means a trailing
 * sentence period can cling to a token; the stemmer and stopword pass absorb most of
 * this. Tightening tech-token handling is a Phase 2 lexicon concern.
 */
export function normalizeText(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/['’]/g, '')              // team's -> teams
    .replace(/[^a-z0-9+#.\s-]/g, ' ')  // keep tech tokens: c++, c#, node.js, ci-cd
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Light, intentionally aggressive, but SYMMETRIC stemmer (PDR §12.2). Both the résumé
 * and JD sides get the identical transform, so `managed`/`managing`/`manage` collapse
 * to one stem on both sides even when the linguistic stem is "wrong". Correctness is
 * subordinate to symmetry and determinism here; Porter is a Phase 2 option behind the
 * same interface.
 */
export function stem(token) {
  let t = token;
  if (t.length > 4 && t.endsWith('ing')) t = t.slice(0, -3);
  else if (t.length > 3 && t.endsWith('ed')) t = t.slice(0, -2);
  else if (t.length > 3 && t.endsWith('es')) t = t.slice(0, -2);
  else if (t.length > 3 && t.endsWith('s') && !t.endsWith('ss')) t = t.slice(0, -1);
  if (t.length > 4 && t.endsWith('e')) t = t.slice(0, -1); // manage/managed/managing -> manag
  return t;
}
