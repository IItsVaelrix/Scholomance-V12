import { describe, expect, it } from 'vitest';
import { buildCombatRundown } from '../../codex/core/combat.exegesis.js';

function makeBattleState(overrides = {}) {
  return {
    phase: 'victory',
    round: 3,
    playerTurnIndex: 3,
    spentLeylineIds: [],
    history: [],
    ...overrides,
  };
}

describe('Codex Core — Combat Exegesis', () => {
  it('uses the weighted CODEX impressiveness formula for player casts', () => {
    const rundown = buildCombatRundown(makeBattleState({
      spentLeylineIds: ['ley-1'],
      history: [{
        type: 'PLAYER_CAST',
        entityId: 'player',
        actionType: 'cast',
        phrase: 'golden syntax binds the night',
        damageDealt: 150,
        healingDone: 0,
        mpCost: 10,
        wasSupercharged: true,
        playerHpAtCast: 20,
        playerMaxHpAtCast: 100,
        profile: {
          rhymeQuality: 100,
          verseIRMultiplier: 100,
          affinity: 'SONIC',
        },
      }],
    }));

    expect(rundown.mostImpressiveSpell.codexScore).toBe(86.4);
    expect(rundown.mostImpressiveSpell.scoreComponents).toMatchObject({
      damageScore: 100,
      healingScore: 0,
      rhymeScore: 100,
      verseIRScore: 100,
      leylineScore: 100,
      clutchScore: 80,
      efficiencyScore: 100,
    });
    expect(rundown.grade).toBe('S');
  });

  it('derives combat-wide stats from history and spent leylines', () => {
    const rundown = buildCombatRundown(makeBattleState({
      round: 5,
      spentLeylineIds: ['ley-1', 'ley-2'],
      history: [
        {
          entityId: 'player',
          actionType: 'cast',
          phrase: 'first strike',
          damageMap: [{ targetId: 'opponent', amount: 60 }],
          healingDone: 0,
          mpCost: 10,
          profile: { rhymeQuality: 0.5, verseIRMultiplier: 1.06 },
        },
        {
          entityId: 'opponent',
          actionType: 'cast',
          damageMap: [{ targetId: 'player', amount: 25 }],
        },
      ],
    }));

    expect(rundown.stats).toMatchObject({
      turnsTaken: 5,
      totalDamageDealt: 60,
      totalDamageTaken: 25,
      leylinesExtracted: 2,
      highestRhymeQuality: 0.5,
      highestVerseIRMultiplier: 1.06,
    });
  });

  it('triggers Oracle marginalia for defeat and labels entropy', () => {
    const rundown = buildCombatRundown(makeBattleState({
      phase: 'defeat',
      history: [],
    }));

    expect(rundown.grade).toBe('D');
    expect(rundown.oracleMessage).toMatchObject({
      triggered: true,
      word: 'ENTROPY',
      tooltip: {
        category: 'Syntactic Decay',
      },
    });
  });

  it('triggers clutch marginalia for low-health victory casts', () => {
    const rundown = buildCombatRundown(makeBattleState({
      history: [{
        type: 'PLAYER_CAST',
        phrase: 'the last meter holds',
        damageDealt: 10,
        healingDone: 0,
        mpCost: 10,
        playerHpAtCast: 15,
        playerMaxHpAtCast: 100,
        profile: { rhymeQuality: 0, verseIRMultiplier: 1 },
      }],
    }));

    expect(rundown.oracleMessage.triggered).toBe(true);
    expect(rundown.oracleMessage.word).toBe('CLUTCH');
  });

  it('handles missing VerseIR data without NaN score components', () => {
    const rundown = buildCombatRundown(makeBattleState({
      history: [{
        type: 'PLAYER_CAST',
        phrase: 'plain fire',
        damageDealt: 30,
        healingDone: 0,
        mpCost: 10,
        profile: { rhymeQuality: 0.25 },
      }],
    }));

    expect(rundown.mostImpressiveSpell.codexScore).toBeGreaterThan(0);
    expect(rundown.mostImpressiveSpell.scoreComponents.verseIRScore).toBe(0);
    expect(Number.isNaN(rundown.mostImpressiveSpell.codexScore)).toBe(false);
  });
});
