/**
 * Authoritative combat cast scoring — VerseIR + combat profile + defender chess.
 *
 * Primary path: POST /api/combat/score (server VerseIR amplifiers).
 * Browser fallback: analyzeText + combat scoring engine (no Node-only VerseIR stack).
 */
import { analyzeText } from '../../../codex/core/analysis.pipeline.js';
import { MIN_COMBAT_DAMAGE } from '../../../codex/core/combat.balance.js';
import { normalizeCombatScore } from '../../../codex/core/combat.scoring.js';
import { evaluateSyntacticalChess } from '../../../codex/core/combat.syntax-chess.js';
import { createCombatScoringEngine } from '../../../codex/core/scoring.defaults.js';
import { scoreCombatScroll } from '../../lib/combatApi.js';

let sharedScoringEngine = null;

function getCombatScoringEngine() {
  if (!sharedScoringEngine) {
    sharedScoringEngine = createCombatScoringEngine();
  }
  return sharedScoringEngine;
}

/**
 * Re-score syntactical chess against a concrete defender profile.
 *
 * @param {object} scoreData
 * @param {object} params
 * @param {string} params.verse
 * @param {object | null} [params.defender]
 * @param {object | null} [params.verseIR]
 */
export function enrichDefenderSyntacticalChess(scoreData, {
  verse = '',
  defender = null,
  verseIR = null,
} = {}) {
  if (!scoreData || !defender) return scoreData;

  const syntacticalChess = evaluateSyntacticalChess({
    phrase: verse,
    enemy: defender,
    verseIR: verseIR || scoreData?.verseIR || scoreData?.verseIRAmplifier || null,
    profile: scoreData,
  });

  const priorMultiplier = Number(scoreData?.syntacticalChessMultiplier) || 1;
  const rawDamage = Number(scoreData?.damage) || 0;
  const baseDamage = priorMultiplier > 0 ? rawDamage / priorMultiplier : rawDamage;

  return {
    ...scoreData,
    damage: Math.max(MIN_COMBAT_DAMAGE, Math.round(baseDamage * syntacticalChess.multiplier)),
    syntacticalChess,
    syntacticalChessMultiplier: syntacticalChess.multiplier,
    commentary: [scoreData?.commentary || '', ...syntacticalChess.diagnostics].filter(Boolean).join(' '),
  };
}

async function scoreCombatCastLocally({
  verse = '',
  weave = '',
  defender = null,
  defenderSchool = null,
  scoringEngine = getCombatScoringEngine(),
} = {}) {
  const analyzedDoc = analyzeText(verse);
  const baseScoreData = await scoringEngine.calculateScore(analyzedDoc);
  const scoreData = normalizeCombatScore(baseScoreData, {
    scrollText: verse,
    weave,
    analyzedDoc,
    defender,
    defenderSchool: defender?.school ?? defenderSchool ?? null,
    speakerId: 'combat:player',
    speakerType: 'PLAYER',
  });

  const tokenWeights = analyzedDoc.parsed?.tokenWeights ?? null;

  return {
    analyzedDoc,
    verseIR: null,
    scoreData: enrichDefenderSyntacticalChess(
      tokenWeights ? { ...scoreData, tokenWeights } : scoreData,
      { verse, defender },
    ),
  };
}

/**
 * @param {object} params
 * @param {string} [params.verse]
 * @param {string} [params.weave]
 * @param {object | null} [params.defender]
 * @param {string | null} [params.defenderSchool]
 * @param {import('../../../codex/core/scoring.engine.js').createScoringEngine} [params.scoringEngine]
 */
export async function resolveCombatCastScore({
  verse = '',
  weave = '',
  defender = null,
  defenderSchool = null,
  scoringEngine = null,
} = {}) {
  const engine = scoringEngine || getCombatScoringEngine();

  try {
    const apiScoreData = await scoreCombatScroll({
      scrollText: verse,
      weave,
      opponentSchool: defender?.school ?? defenderSchool ?? undefined,
    });

    const verseIR = apiScoreData?.verseIR
      || (apiScoreData?.verseIRAmplifier ? { verseIRAmplifier: apiScoreData.verseIRAmplifier } : null);

    return {
      analyzedDoc: null,
      verseIR,
      scoreData: enrichDefenderSyntacticalChess(apiScoreData, {
        verse,
        defender,
        verseIR,
      }),
    };
  } catch (error) {
    console.warn('[combatCastScoring] Combat score API failed; using browser-safe local scoring.', error);
  }

  return scoreCombatCastLocally({
    verse,
    weave,
    defender,
    defenderSchool,
    scoringEngine: engine,
  });
}