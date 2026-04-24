/**
 * syntacticIntegrity.js
 * 
 * UI-layer heuristic for detecting "Syntactic Collapse" in Spell Weaves.
 * Real predicate/object parsing lives in codex/core/spellweave.engine.js.
 */

const SPELL_PREDICATES = new Set([
  'mend','heal','cure','bind','burn','sear','freeze','scorch','drown',
  'shatter','dispel','shield','strike','smite','curse','bless','drain',
  'summon','banish','conjure','transmute','silence','rend','pierce',
  'fortify','restore','draw','wrap','cloak','reveal','unmake','remake',
  'push','pull','lift','crush','seal','open','break','lock','slow',
  'haste','blind','stun','charm','fear','weaken','empower','protect',
]);

const CONNECTIVE_WORDS = new Set([
  'the','a','an','my','your','his','her','their','our','its',
  'of','for','from','into','through','upon','against','within',
  'this','that','these','those',
]);

export function getSyntacticIntegrity(weave) {
  if (!weave || weave.trim().length < 3) return { status: null, label: '' };

  const tokens = weave.toLowerCase().trim().split(/\s+/);
  const predicates = tokens.filter(t => SPELL_PREDICATES.has(t));

  // Grocery List: 2+ predicates stacked without connective structure → Syntactic Collapse
  const hasConnective = tokens.some(t => CONNECTIVE_WORDS.has(t));
  if (predicates.length >= 2 && !hasConnective) {
    return { status: 'RED', label: 'SYNTACTIC COLLAPSE' };
  }

  if (predicates.length === 0) {
    return { status: 'YELLOW', label: 'NO PREDICATE' };
  }

  // Has predicate — check for object (content word after predicate)
  const pIdx = tokens.findIndex(t => SPELL_PREDICATES.has(t));
  const afterPredicate = tokens.slice(pIdx + 1);
  const contentWords = afterPredicate.filter(
    t => t.length > 2 && !CONNECTIVE_WORDS.has(t) && !SPELL_PREDICATES.has(t)
  );

  if (contentWords.length === 0) {
    return { status: 'YELLOW', label: 'INCOMPLETE' };
  }

  return { status: 'GREEN', label: 'BRIDGE STABLE' };
}
