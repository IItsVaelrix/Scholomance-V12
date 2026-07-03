/**
 * Spellweave Engine - The Syntactic Bridge
 *
 * Resolves the relationship between the Verse (energy) and the Weave (form).
 */

import { buildTokenGraph, createGraphNode, createSchoolAnchorNode } from './token-graph/build.js';
import { buildContextActivation } from './token-graph/activation.js';
import { traverseTokenGraph } from './token-graph/traverse.js';
import { scoreGraphCandidates } from './token-graph/score.js';
import { lookupSemanticToken, INTENTS } from './semantics.registry.js';
import { phoneticMatcher } from './phonetic_matcher.js';
import { tokenize } from './tokenizer.js';

/**
 * @typedef {Object} BridgeResult
 * @property {string} intent - The resolved action intent.
 * @property {string} school - The resolved school.
 * @property {number} resonance - Magnitude multiplier.
 * @property {string[]} predicates - Extracted predicates.
 * @property {string[]} objects - Extracted objects.
 * @property {boolean} collapsed - Whether the spell collapsed due to poor syntax.
 * @property {WeaveClause[]} clauses - Ordered clause parse of the weave.
 * @property {string} chainType - SINGLE | SIMULTANEOUS | SEQUENCE | SUSTAINED | MIXED.
 * @property {number} strikes - Armed clause count (multi-hit potential).
 * @property {{legalOrder: number, modifierPower: number, danglingModifiers: number, clauseCount: number}} syntax
 * @property {Array<Object>} events - Typed syntax events (WEAVE_COLLAPSE, COMBO_CHAIN).
 */

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function average(values) {
  const numericValues = (Array.isArray(values) ? values : [])
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));
  if (numericValues.length === 0) return 0;
  return numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length;
}

function uniqueTokens(text) {
  return [...new Set(tokenize(text))];
}

function buildSpellTokenNode(token) {
  const semantic = lookupSemanticToken(token);
  return createGraphNode({
    id: `lexeme:${token}`,
    token,
    normalized: token,
    nodeType: 'LEXEME',
    schoolBias: semantic?.school ? { [semantic.school]: 0.76 } : {},
    semanticTags: [
      semantic?.type || null,
      semantic?.intent || semantic?.category || null,
    ].filter(Boolean),
  });
}

function addBidirectionalEdge(edges, fromId, toId, relation, weight, evidence = []) {
  edges.push({ fromId, toId, relation, weight, evidence });
  edges.push({ fromId: toId, toId: fromId, relation, weight, evidence });
}

function buildSpellweaveGraph(verseTokens, weaveTokens, dominantSchool) {
  const nodes = [];
  const edges = [];

  verseTokens.forEach((token) => {
    nodes.push(createGraphNode({
      id: `scroll:${token}`,
      token,
      normalized: token,
      nodeType: 'SCROLL_TOKEN',
      semanticTags: buildSpellTokenNode(token).semanticTags,
      schoolBias: buildSpellTokenNode(token).schoolBias,
    }));
  });
  weaveTokens.forEach((token) => {
    nodes.push(buildSpellTokenNode(token));
  });

  const schoolAnchor = createSchoolAnchorNode(dominantSchool);
  if (schoolAnchor) nodes.push(schoolAnchor);

  weaveTokens.forEach((weaveToken) => {
    const weaveSemantic = lookupSemanticToken(weaveToken);
    const weaveNodeId = `lexeme:${weaveToken}`;

    if (weaveSemantic?.school && schoolAnchor) {
      addBidirectionalEdge(
        edges,
        weaveNodeId,
        schoolAnchor.id,
        'SCHOOL_RESONANCE',
        weaveSemantic.school === dominantSchool ? 0.88 : 0.44,
        ['weave_school_alignment'],
      );
    }

    verseTokens.forEach((verseToken) => {
      const verseSemantic = lookupSemanticToken(verseToken);
      const verseNodeId = `scroll:${verseToken}`;

      if (weaveToken === verseToken) {
        addBidirectionalEdge(
          edges,
          weaveNodeId,
          verseNodeId,
          'SEMANTIC_ASSOCIATION',
          0.96,
          ['exact_lexeme_alignment'],
        );
      }

      if (
        weaveSemantic &&
        verseSemantic &&
        (
          weaveSemantic.school === verseSemantic.school
          || weaveSemantic.intent === verseSemantic.intent
          || weaveSemantic.type === verseSemantic.type
        )
      ) {
        addBidirectionalEdge(
          edges,
          weaveNodeId,
          verseNodeId,
          'SEMANTIC_ASSOCIATION',
          0.72,
          ['semantic_registry_alignment'],
        );
      }

      if (
        weaveSemantic?.school &&
        verseSemantic?.school &&
        weaveSemantic.school === verseSemantic.school
      ) {
        addBidirectionalEdge(
          edges,
          weaveNodeId,
          verseNodeId,
          'SCHOOL_RESONANCE',
          0.68,
          ['shared_school_alignment'],
        );
      }

      if (phoneticMatcher.isSoundAlike(weaveToken, verseToken)) {
        addBidirectionalEdge(
          edges,
          weaveNodeId,
          verseNodeId,
          'PHONETIC_SIMILARITY',
          weaveToken === verseToken ? 0.7 : 0.56,
          ['phonetic_echo'],
        );
      }
    });
  });

  const predicates = weaveTokens.filter((token) => lookupSemanticToken(token)?.type === 'PREDICATE');
  const objects = weaveTokens.filter((token) => lookupSemanticToken(token)?.type === 'OBJECT');
  predicates.forEach((predicate) => {
    objects.forEach((objectToken) => {
      addBidirectionalEdge(
        edges,
        `lexeme:${predicate}`,
        `lexeme:${objectToken}`,
        'SYNTACTIC_COMPATIBILITY',
        0.8,
        ['predicate_object_binding'],
      );
    });
  });

  return buildTokenGraph({ nodes, edges });
}

function evaluateSpellweaveAlignment(verseTokens, weaveTokens, dominantSchool) {
  if (verseTokens.length === 0 || weaveTokens.length === 0) {
    return {
      graphAlignment: 0,
      semanticAlignment: 0,
      schoolResonance: 0,
      phoneticHarmony: 0,
      syntaxLegality: 0,
    };
  }

  const graph = buildSpellweaveGraph(verseTokens, weaveTokens, dominantSchool);
  const activation = buildContextActivation(graph, {
    currentSchool: dominantSchool,
    anchorTokens: weaveTokens,
    syntaxContext: {
      role: 'content',
      lineRole: 'line_end',
      stressRole: 'primary',
      rhymePolicy: 'allow',
    },
  });
  const traversed = traverseTokenGraph(graph, activation);
  const scored = scoreGraphCandidates(graph, traversed, activation);
  const verseSet = new Set(verseTokens);
  const verseCandidates = scored.filter((candidate) => verseSet.has(candidate.token));
  const topCandidates = verseCandidates.slice(0, Math.max(1, weaveTokens.length));

  const semanticAlignment = average(topCandidates.map((candidate) => candidate.semanticScore));
  const schoolResonance = average(topCandidates.map((candidate) => candidate.schoolScore));
  const phoneticHarmony = average(topCandidates.map((candidate) => candidate.phoneticScore));
  const syntaxLegality = average(topCandidates.map((candidate) => candidate.legalityScore));
  const graphAlignment = clamp(
    (semanticAlignment * 0.45)
    + (schoolResonance * 0.20)
    + (phoneticHarmony * 0.15)
    + (syntaxLegality * 0.20),
    0,
    1,
  );

  return {
    graphAlignment,
    semanticAlignment,
    schoolResonance,
    phoneticHarmony,
    syntaxLegality,
  };
}

/**
 * @typedef {Object} WeaveClause
 * @property {string[]} predicates - Predicates in spoken order.
 * @property {string[]} objects - Objects in spoken order.
 * @property {string[]} modifiers - Modifiers in spoken order.
 * @property {string[]} sequence - Role stream ('P'|'O'|'M') in spoken order.
 * @property {'legal'|'inverted'|'unfocused'|'dangling'|'collapsed'|'inert'} legality
 * @property {string|null} connector - Connector that introduced this clause.
 */

const CLAUSE_LEGALITY_PENALTIES = Object.freeze({
  legal: 0,
  inverted: 0.15,   // object spoken before its predicate — the spell recoils
  unfocused: 0.08,  // predicate with no object — force without a vessel
  dangling: 0.10,   // modifier with no predicate — intent bleeds away
  collapsed: 0,     // handled by the collapse path, not a penalty
  inert: 0,         // no semantic tokens at all
});

function createClause(connector = null) {
  return {
    predicates: [],
    objects: [],
    modifiers: [],
    sequence: [],
    legality: 'inert',
    connector,
  };
}

function resolveClauseLegality(clause) {
  if (clause.predicates.length > 3) return 'collapsed';
  const hasPredicate = clause.predicates.length > 0;
  const hasObject = clause.objects.length > 0;
  const hasModifier = clause.modifiers.length > 0;
  if (!hasPredicate && !hasObject && !hasModifier) return 'inert';
  if (!hasPredicate && hasModifier && !hasObject) return 'dangling';
  if (!hasPredicate) return 'inverted';
  if (!hasObject) return 'unfocused';
  const firstPredicate = clause.sequence.indexOf('P');
  const firstObject = clause.sequence.indexOf('O');
  return firstObject < firstPredicate ? 'inverted' : 'legal';
}

function resolveChainType(connectors) {
  if (connectors.length === 0) return 'SINGLE';
  const chainTypes = [...new Set(connectors.map((connector) => connector.chainType))];
  return chainTypes.length === 1 ? chainTypes[0] : 'MIXED';
}

/**
 * Parses the Spellweave as an ordered clause grammar:
 *   [MODIFIER]* PREDICATE [MODIFIER]* OBJECT (CONNECTOR clause)*
 * Word order is law: an object spoken before its predicate inverts the
 * clause; a modifier with nothing to bind to dangles.
 *
 * The flat `predicates`/`objects`/`tokens` fields keep the historical
 * unique-token shape for existing consumers.
 *
 * @param {string} weave
 * @returns {{
 *   predicates: string[], objects: string[], tokens: string[],
 *   clauses: WeaveClause[], chainType: string, strikes: number,
 *   syntax: { legalOrder: number, modifierPower: number, danglingModifiers: number, clauseCount: number }
 * }}
 */
export function parseWeave(weave) {
  const orderedTokens = tokenize(weave).map((token) => token.toUpperCase());
  const clauses = [];
  const connectors = [];
  let current = createClause();

  const commitClause = (clause) => {
    clause.legality = resolveClauseLegality(clause);
    if (clause.legality !== 'inert' || clause.sequence.length > 0) {
      clauses.push(clause);
    }
  };

  orderedTokens.forEach((token) => {
    const semantic = lookupSemanticToken(token);
    if (semantic?.type === 'CONNECTOR') {
      commitClause(current);
      connectors.push({ token, chainType: semantic.chainType });
      current = createClause(token);
      return;
    }
    if (semantic?.type === 'PREDICATE') {
      current.predicates.push(token);
      current.sequence.push('P');
    } else if (semantic?.type === 'OBJECT') {
      current.objects.push(token);
      current.sequence.push('O');
    } else if (semantic?.type === 'MODIFIER') {
      current.modifiers.push(token);
      current.sequence.push('M');
    }
  });
  commitClause(current);

  const activeClauses = clauses.filter((clause) => clause.legality !== 'inert');
  const legalClauses = activeClauses.filter((clause) => clause.legality === 'legal');
  const danglingModifiers = activeClauses
    .filter((clause) => clause.legality === 'dangling')
    .reduce((sum, clause) => sum + clause.modifiers.length, 0);
  const modifierPower = activeClauses.reduce((power, clause) => {
    if (clause.legality === 'dangling') return power;
    return clause.modifiers.reduce((clausePower, modifier) => {
      const scale = Number(lookupSemanticToken(modifier)?.powerScale) || 1;
      return clausePower * scale;
    }, power);
  }, 1);

  return {
    predicates: [...new Set(activeClauses.flatMap((clause) => clause.predicates))],
    objects: [...new Set(activeClauses.flatMap((clause) => clause.objects))],
    tokens: [...new Set(orderedTokens)],
    clauses,
    chainType: resolveChainType(connectors),
    strikes: Math.max(1, activeClauses.filter((clause) => clause.predicates.length > 0).length),
    syntax: {
      legalOrder: activeClauses.length > 0 ? legalClauses.length / activeClauses.length : 0,
      modifierPower: clamp(modifierPower, 1, 2),
      danglingModifiers,
      clauseCount: activeClauses.length,
    },
  };
}

function buildWeaveSyntaxEvents(parsed, collapsed) {
  const events = [];
  if (collapsed) {
    events.push({
      type: 'WEAVE_COLLAPSE',
      reason: 'clause_overload',
      clauseCount: parsed.syntax.clauseCount,
    });
  }
  if (parsed.strikes > 1) {
    events.push({
      type: 'COMBO_CHAIN',
      chainType: parsed.chainType,
      strikes: parsed.strikes,
    });
  }
  return events;
}

/**
 * Calculates the Syntactic Bridge between Verse and Weave.
 * @param {Object} params
 * @param {string} params.verse - The 300-char Verse.
 * @param {string} params.weave - The 60-100 char Spellweave.
 * @param {string} params.dominantSchool - The school identified by the Verse's vowel gravity.
 * @returns {BridgeResult}
 */
export function calculateSyntacticBridge({ verse, weave, dominantSchool }) {
  const parsed = parseWeave(weave);
  const { predicates, objects, tokens: weaveTokens, clauses, chainType, strikes, syntax } = parsed;
  const verseTokens = uniqueTokens(verse).map((token) => token.toUpperCase());
  const alignment = evaluateSpellweaveAlignment(verseTokens, weaveTokens, dominantSchool);

  // Collapse is clause-scoped: any single clause carrying more than three
  // predicates frays the weave, however the rest is structured.
  const collapsed = clauses.some((clause) => clause.legality === 'collapsed');

  if (collapsed) {
    return {
      intent: INTENTS.UTILITY,
      school: dominantSchool,
      resonance: Math.max(0.1, 0.18 + (alignment.graphAlignment * 0.32)),
      predicates,
      objects,
      collapsed: true,
      clauses,
      chainType,
      strikes: 1,
      syntax,
      events: buildWeaveSyntaxEvents(parsed, true),
    };
  }

  const firstArmedClause = clauses.find((clause) => clause.predicates.length > 0);
  const primaryPredicate = firstArmedClause?.predicates[0] || predicates[0] || 'STRIKE';
  const predicateData = lookupSemanticToken(primaryPredicate) || {
    intent: INTENTS.OFFENSIVE,
    school: dominantSchool,
  };

  let resonance = 0.55
    + (alignment.semanticAlignment * 0.35)
    + (alignment.schoolResonance * 0.25)
    + (alignment.phoneticHarmony * 0.12)
    + (alignment.syntaxLegality * 0.18);

  if (predicateData.school === dominantSchool) {
    resonance += 0.12;
  } else {
    resonance -= 0.06;
  }

  if (objects.length > 1) {
    resonance += 0.06;
  }
  if (alignment.graphAlignment > 0.75) {
    resonance += 0.08;
  } else if (alignment.graphAlignment < 0.25) {
    resonance -= 0.12;
  }

  // ── Word-order law ────────────────────────────────────────────────────
  resonance += syntax.legalOrder * 0.10;
  clauses.forEach((clause) => {
    resonance -= CLAUSE_LEGALITY_PENALTIES[clause.legality] || 0;
  });
  resonance += (syntax.modifierPower - 1) * 0.4;

  // ── Chain discipline ──────────────────────────────────────────────────
  if (chainType === 'SEQUENCE' && strikes > 1) {
    resonance += 0.04 * (strikes - 1); // combo links escalate
  } else if (chainType === 'SUSTAINED') {
    resonance *= 0.9; // channel: immediate force traded for status pressure
  }

  return {
    intent: predicateData.intent,
    school: predicateData.school,
    resonance: Math.max(0.1, resonance),
    predicates,
    objects,
    collapsed: false,
    clauses,
    chainType,
    strikes,
    syntax,
    sustained: chainType === 'SUSTAINED',
    events: buildWeaveSyntaxEvents(parsed, false),
  };
}
