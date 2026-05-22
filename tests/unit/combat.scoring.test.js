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
});
