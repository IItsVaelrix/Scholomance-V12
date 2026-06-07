import { describe, it, expect } from 'vitest';
import { calculateCombatScore } from '../../codex/core/combat.scoring.js';

describe('Codex Core — Combat Scoring', () => {
  it('calculates damage for a basic player spell', () => {
    const scoreData = { totalScore: 50, traces: [] };
    const result = calculateCombatScore({ scoreData });

    expect(result.damage).toBeGreaterThan(0);
    expect(result.school).toBeDefined();
    expect(result.loreStats).toBeDefined();
  });

  it('correctly applies healing amounts for BLESSING act', () => {
    const scoreData = { totalScore: 50, traces: [] };
    const speakerProfile = {
      school: 'ALCHEMY',
      intent: { speechAct: 'BLESSING' }
    };
    
    const result = calculateCombatScore({ scoreData, speakerProfile });
    
    // Alchemy schools casting blessing/plea get healing
    expect(result.healing).toBeGreaterThanOrEqual(0);
  });

  it('detects syntactic collapse (failure cast)', () => {
    // Low score and low density triggers collapse
    const scoreData = { totalScore: 1, traces: [] };
    const profile = { 
      totalScore: 1, 
      tokenCount: 1, 
      schoolDensity: { ALCHEMY: 0.1 },
      school: 'ALCHEMY'
    };
    
    const result = calculateCombatScore({ 
      scoreData, 
      speakerProfile: profile 
    });
    
    expect(result.failureCast).toBe(true);
  });

  it('applies rhyme quality scaling correctly (0.92 for 0, 1.14 for 1, 1.0 for missing) — REGRESSION GUARD', () => {
    const baseScore = { totalScore: 50, traces: [] };
    
    // Test Case: missing rhymeQuality
    const resMissing = calculateCombatScore({ scoreData: baseScore });
    expect(resMissing.rhymeMultiplier).toBe(1.0);
    expect(resMissing.verbalFormMultiplier).toBeCloseTo(resMissing.verseIRMultiplier, 4);

    // Test Case: rhymeQuality = 0
    const score0 = { 
      totalScore: 50, 
      traces: [{ heuristic: 'rhyme_quality', rawScore: 0 }] 
    };
    const res0 = calculateCombatScore({ scoreData: score0 });
    expect(res0.rhymeMultiplier).toBe(0.92);

    // Test Case: rhymeQuality = 1
    const score1 = { 
      totalScore: 50, 
      traces: [{ heuristic: 'rhyme_quality', rawScore: 1 }] 
    };
    const res1 = calculateCombatScore({ scoreData: score1 });
    expect(res1.rhymeMultiplier).toBe(1.14);
  });

  it('applies verseIR novelty multiplier and clamps defensively — REGRESSION GUARD', () => {
    // Test Case: missing verseIRAmplifier
    const baseScore = { totalScore: 50, traces: [] };
    const resMissing = calculateCombatScore({ scoreData: baseScore });
    expect(resMissing.verseIRMultiplier).toBe(1.0);

    // Test Case: impactMultiplier = 1.12
    const scoreHigh = { 
      totalScore: 50, 
      traces: [],
      verseIRAmplifier: { impactMultiplier: 1.12 }
    };
    const resHigh = calculateCombatScore({ scoreData: scoreHigh });
    expect(resHigh.verseIRMultiplier).toBe(1.12);

    // Test Case: impactMultiplier = 2.0 (should clamp to 1.12)
    const scoreExtreme = { 
      totalScore: 50, 
      traces: [],
      verseIRAmplifier: { impactMultiplier: 2.0 }
    };
    const resExtreme = calculateCombatScore({ scoreData: scoreExtreme });
    expect(resExtreme.verseIRMultiplier).toBe(1.12);

    // Test Case: impactMultiplier = 0.5 (should clamp to 0.85)
    const scoreLow = { 
      totalScore: 50, 
      traces: [],
      verseIRAmplifier: { impactMultiplier: 0.5 }
    };
    const resLow = calculateCombatScore({ scoreData: scoreLow });
    expect(resLow.verseIRMultiplier).toBe(0.85);
  });

  it('scales healing using verbalFormMultiplier — REGRESSION GUARD', () => {
    const baseScoreMultiplied = {
      totalScore: 50,
      traces: [{ heuristic: 'rhyme_quality', rawScore: 1.0 }],
      verseIRAmplifier: { impactMultiplier: 1.12 }
    };

    // Calculate score with multipliers active
    const resMultiplied = calculateCombatScore({ 
      text: 'heal wound',
      scoreData: baseScoreMultiplied,
      fallbackSchool: 'ALCHEMY'
    });

    // Calculate score with neutral multipliers (no profile features)
    const resNeutral = calculateCombatScore({ 
      text: 'heal wound',
      scoreData: { totalScore: 50, traces: [] },
      fallbackSchool: 'ALCHEMY'
    });

    expect(resMultiplied.verbalFormMultiplier).toBeGreaterThan(1.0);
    expect(resMultiplied.healing).toBeGreaterThan(resNeutral.healing);
  });

  it('classifies creative spiritual medical healing as burst healing', () => {
    const result = calculateCombatScore({
      text: 'By sacred radiance, stitch the wounded flesh and restore the soul.',
      scoreData: { totalScore: 72, traces: [{ heuristic: 'syntactic_cohesion', rawScore: 0.9 }] },
      fallbackSchool: 'ALCHEMY'
    });

    expect(result.intent.healing).toBe(true);
    expect(result.intent.healingMode).toBe('BURST');
    expect(result.intent.healingCreativity).toBeGreaterThan(0.5);
    expect(result.healing).toBeGreaterThan(0);
  });

  it('classifies strictly medicinal healing as regeneration instead of burst healing', () => {
    const result = calculateCombatScore({
      text: 'Apply the bandage and ointment to the wounded flesh.',
      scoreData: { totalScore: 64, traces: [{ heuristic: 'syntactic_cohesion', rawScore: 0.82 }] },
      fallbackSchool: 'ALCHEMY'
    });

    expect(result.intent.healing).toBe(true);
    expect(result.intent.healingMode).toBe('REGEN');
    expect(result.healing).toBe(0);
    expect(result.statusEffect).toMatchObject({
      chainId: 'restorative_regimen',
      disposition: 'BUFF'
    });
    expect(result.statusEffect.magnitude).toBeGreaterThan(0);
  });

  it('correctly maps mythVal without using undefined totalMultiplier — REGRESSION GUARD', () => {
    const scoreData = {
      totalScore: 50,
      traces: [],
      verseIRAmplifier: { impactMultiplier: 1.12 }
    };

    const res = calculateCombatScore({ scoreData });
    expect(res.loreStats.MYTH.value).toBe(1.0); // mapped perfectly to max
    expect(res.loreStats.MYTH.rating).toBe('Godlike');
  });

  it('applies syntactical chess multiplier against enemy symbolic profiles', () => {
    const scoreData = { totalScore: 70, traces: [{ heuristic: 'syntactic_cohesion', rawScore: 0.9 }] };
    const defender = {
      name: 'Resonant Shade',
      school: 'SONIC',
      syntacticProfile: {
        archetype: 'SHADE',
        weaknessFamilies: ['LIGHT', 'REVELATION', 'WITNESS'],
        resistanceFamilies: ['VOID', 'OBSCURITY'],
        favoredDevices: ['antithesis', 'metaphor'],
        punishedTerms: ['shadow', 'darkness', 'void'],
        symbolicBody: ['shadow', 'silhouette', 'echo', 'veil', 'shade'],
      },
    };

    const neutral = calculateCombatScore({
      text: 'Strike the enemy with force.',
      scoreData,
      defender,
      defenderSchool: 'SONIC',
    });
    const targeted = calculateCombatScore({
      text: "Let the lantern testify against the shade and drag its veil into dawn.",
      scoreData,
      defender,
      defenderSchool: 'SONIC',
    });

    expect(targeted.syntacticalChess.state).toBe('advantage');
    expect(targeted.syntacticalChessMultiplier).toBeGreaterThan(neutral.syntacticalChessMultiplier);
    expect(targeted.damage).toBeGreaterThan(neutral.damage);
  });
});
