/**
 * SEMANTIC EDITOR — the meaning-policy arbiter ("the editor we hired").
 *
 * The syntactic Harkov model checks ARRANGEMENT. This checks MEANING-IN-CONTEXT:
 * it binds a construct to what it MEANS, infers the context's intent, and flags
 * meanings the context does not allow. It is NOT omniscient — it judges against
 * an explicit, growing policy (the style guide below), exactly like a copy editor
 * works against a style guide rather than vibes.
 *
 * forbiddenIn: ['*'] = forbidden everywhere; otherwise forbidden only when one of
 * the listed context tags is inferred for the code.
 */
export const MEANING_RULES = Object.freeze([
  { id: 'nondeterminism', meaning: 'nondeterminism', forbiddenIn: ['deterministic'],
    pattern: /\bMath\.random\s*\(/ },
  { id: 'wall-clock', meaning: 'wall-clock-time', forbiddenIn: ['deterministic', 'test'],
    pattern: /\b(Date\.now\s*\(|new\s+Date\s*\()/ },
  { id: 'hardcoded-secret-literal', meaning: 'hardcoded-secret', forbiddenIn: ['*'],
    pattern: /(['"`])(sk-[a-z0-9]{8,}|ghp_[a-z0-9]{8,}|Bearer\s+\S{8,})\1/i },
  { id: 'hardcoded-secret-assign', meaning: 'hardcoded-secret', forbiddenIn: ['*'],
    pattern: /\b(password|secret|api[_-]?key|token)\b\s*[:=]\s*['"`][^'"`]{6,}['"`]/i },
  { id: 'unsafe-cast', meaning: 'unchecked-type-assertion', forbiddenIn: ['*'],
    pattern: /\bas\s+unknown\s+as\b/ },
  { id: 'swallowed-error', meaning: 'swallowed-error', forbiddenIn: ['*'],
    pattern: /catch\s*\([^)]*\)\s*\{\s*(\/\/[^\n]*\s*)?\}/ },
]);

/**
 * Infer the intent tags of a scope from its code and (optional) path hint.
 * Deliberately small and explicit; grows as the style guide grows.
 */
export function inferContextTags(code, hints = {}) {
  const tags = new Set();
  const haystack = `${hints.path || ''} ${code}`;
  if (/\b(combat|procgen|dungeon|seed|deterministic|calculate[A-Z]\w*|simulation|replay)\b/i.test(haystack)) {
    tags.add('deterministic');
  }
  if (/(\.test\.|\.spec\.|\bexpect\s*\(|\bdescribe\s*\(|\bit\s*\()/i.test(haystack)) {
    tags.add('test');
  }
  return tags;
}

/**
 * Edit a snippet: report meaning-policy violations and a semantic-anomaly score.
 * @param {string} code
 * @param {{path?: string}} [hints]
 * @returns {{ violations: {rule:string, meaning:string}[], score: number, contextTags: string[] }}
 */
export function editCode(code, hints = {}) {
  if (typeof code !== 'string' || code.length === 0) {
    return { violations: [], score: 0, contextTags: [] };
  }
  const tags = inferContextTags(code, hints);
  const violations = [];
  for (const rule of MEANING_RULES) {
    if (!rule.pattern.test(code)) continue;
    const forbidden = rule.forbiddenIn.includes('*') || rule.forbiddenIn.some(t => tags.has(t));
    if (forbidden) {
      violations.push({ rule: rule.id, meaning: rule.meaning });
    }
  }
  return { violations, score: violations.length, contextTags: [...tags] };
}
