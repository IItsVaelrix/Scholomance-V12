/**
 * PRION LIBRARY
 *
 * A prion is a structural defect defined by PRESENCE plus ABSENCE: the anchor is
 * there, the cure is not.
 *
 * ── Read this before adding one ───────────────────────────────────────────────
 * The previous library expressed each prion as a bag-of-words "hypothesis" scored
 * by cosine similarity, and listed the MISSING token as a search term
 * ("...silent swallow throw rethrow"). Cosine treats every token as evidence FOR a
 * match, so it scored healthy code above the bug — on a minimal fixture it
 * preferred a correct rethrow (42.4%) to a swallowed catch (0.1%). It hunted the
 * cure and reported it as the disease.
 *
 *   forbids ≠ "a word in the query"
 *   forbids  = "if this appears, it is NOT a prion — score zero"
 *
 * ── What this mechanism can and cannot see ────────────────────────────────────
 * Rules match TOKENS (camelCase-split, lowercased). They can express
 * "addEventListener without removeEventListener". They CANNOT see punctuation or
 * syntax: `arr[0]` without a bounds check, `?.`, `===` on floats, an empty block.
 * Those need an AST, not a token set — do not fake them here. A prion that cannot
 * be stated honestly in requires/forbids does not belong in this file.
 */

export const PRION_LIBRARY = Object.freeze({
  'silent-failure-swallowed-error': {
    anchor: 'catch',
    requires: ['catch'],
    // If ANY of these appear near the catch, the error is being surfaced somehow.
    forbids: ['throw', 'rethrow', 'reject', 'warn', 'error'],
    windowChars: 400,
    description: 'catch block that neither rethrows nor reports — the error vanishes',
    // This is exactly the defect that hid a production outage in phoneme.engine.js:
    // `catch (_e) { /* noop — best-effort */ }` swallowed a Dictionary Oracle failure,
    // and every word silently fell back to spelling-based guessing.
  },

  'async-call-without-await': {
    anchor: 'fetch',
    requires: ['async', 'fetch'],
    forbids: ['await', 'then', 'catch'],
    windowChars: 400,
    description: 'async function calls fetch but neither awaits nor chains it',
  },

  'unseeded-rng-in-deterministic-path': {
    anchor: 'Math.random',
    requires: ['math', 'random'],
    // `exempt` is this repo's sanctioned-escape marker; seedrandom/seed = a real seed.
    forbids: ['seed', 'seedrandom', 'exempt'],
    windowChars: 300,
    description: 'Math.random with no seed and no EXEMPT marker in a deterministic path',
  },

});

/**
 * PAIRED-CALL PRIONS — `register(KEY)` present, `unregister(KEY)` absent.
 *
 * These need a CAPTURE, not a token set. The token version of
 * "addEventListener without removeEventListener" returned ZERO hits on a codebase
 * where exactly that bug had just been fixed: CombatArenaScene registers a dozen
 * listeners and removes most of them, so a nearby cleanup masked the one it forgot.
 * Asking "does the word removeEventListener appear?" is useless. Asking "does
 * removeEventListener('equipment-changed') appear?" finds it instantly.
 *
 * Validated against git history: run over the PRE-FIX CombatArenaScene.js and
 * PolarisForestScene.js, this rule finds `equipment-changed` at lines 621 and 347 —
 * the exact leak that pinned 224 detached DOM nodes per visit and took a heap-graph
 * walk to locate — and reports the fixed files as clean.
 *
 * registerRe MUST carry /g and exactly ONE capture group: the key.
 */
export const PAIRED_CALL_PRIONS = Object.freeze({
  'listener-without-cleanup': {
    // ONLY long-lived targets. A listener on a short-lived object you also destroy is
    // not a leak — `worker.addEventListener('message', ...)` followed by
    // `worker.terminate()` dies with the worker. The danger is registering on a target
    // that OUTLIVES the registrant: window, document, globalThis. That is precisely
    // what today's real leak was — window.addEventListener('equipment-changed', ...)
    // inside a Phaser scene, whose closure then pinned the scene, the game, the canvas
    // and the entire detached CombatPage DOM.
    registerRe: /(?:window|document|globalThis)\s*\.\s*addEventListener\s*\(\s*['"`]([\w:.-]+)['"`]/g,
    cure: 'removeEventListener',
    // `{ once: true }` removes the listener after it fires. Self-cleaning, not a defect.
    exemptRe: /once\s*:\s*true/,
    description: "window/document.addEventListener('X') with no removeEventListener('X') — the closure leaks",
  },

  'interval-without-clear': {
    registerRe: /(?:const|let|var)\s+([\w.]+)\s*=\s*setInterval\s*\(/g,
    cure: 'clearInterval',
    aliasable: true, // a timer handle is a value and gets reassigned into refs/arrays
    description: 'setInterval assigned to a handle that is never cleared — the timer outlives its owner',
  },

  'raf-without-cancel': {
    // Capture the FULL handle, not just the property. `rafRef.current = rAF(...)` must
    // capture `rafRef.current`, or the cure check looks for cancelAnimationFrame(current)
    // and every ref-stored loop reports as a false positive.
    registerRe: /([\w.]+)\s*=\s*requestAnimationFrame\s*\(/g,
    cure: 'cancelAnimationFrame',
    aliasable: true,
    description: 'requestAnimationFrame handle never cancelled — the loop survives unmount',
  },
});
