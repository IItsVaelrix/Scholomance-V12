import { describe, test, expect } from 'vitest';
import {
  diagnoseLinguisticCoherence,
  generateBattleLeylines,
  getLeylinePhase,
  LEYLINE_PUZZLE_CODEX,
  scoreExtraction,
  scoreLiteraryConstraints,
  stableHash,
  stableStringify
} from '../../../codex/core/leyline.engine.js';

describe('Leyline Puzzle Codex (QA)', () => {
  test('contains the complete 50-puzzle PDF packet with stable IDs', () => {
    const ids = LEYLINE_PUZZLE_CODEX.map((entry) => entry.id);
    const expectedIds = Array.from({ length: 50 }, (_, index) => `LEY-${String(index + 1).padStart(3, '0')}`);

    expect(LEYLINE_PUZZLE_CODEX).toHaveLength(50);
    expect(new Set(ids).size).toBe(50);
    expect(ids).toEqual(expectedIds);
  });

  test('high-tier codex entries include poetic locks while low-tier entries stay vocabulary-first', () => {
    const lowTier = LEYLINE_PUZZLE_CODEX.filter((entry) => entry.stars <= 3);
    const highTier = LEYLINE_PUZZLE_CODEX.filter((entry) => entry.stars >= 4);

    expect(lowTier.every((entry) => entry.literaryConstraints === null)).toBe(true);
    expect(highTier.every((entry) => entry.literaryConstraints?.minRequired > 0)).toBe(true);
    expect(LEYLINE_PUZZLE_CODEX.find((entry) => entry.id === 'LEY-050')?.oracleSeed.word).toBe('MIRRORBORNE');
  });
});

describe('Leyline Spawning & Phase Engine (QA)', () => {
  const seed = 12345;
  const blocked = [
    { x: 4, y: 7 }, // player
    { x: 4, y: 1 }  // opponent
  ];

  test('deterministic generator: same seed produces identical leylines', () => {
    const list1 = generateBattleLeylines({ battleSeed: seed, blockedCoords: blocked });
    const list2 = generateBattleLeylines({ battleSeed: seed, blockedCoords: blocked });
    expect(list1).toEqual(list2);
  });

  test('deterministic generator: different seed produces different leylines', () => {
    const list1 = generateBattleLeylines({ battleSeed: seed, blockedCoords: blocked });
    const list2 = generateBattleLeylines({ battleSeed: 54321, blockedCoords: blocked });
    expect(list1).not.toEqual(list2);
  });

  test('generator does not spawn on blocked start cells or create duplicate coordinates', () => {
    const count = 5;
    const list = generateBattleLeylines({ battleSeed: seed, blockedCoords: blocked, count });
    
    expect(list).toHaveLength(count);
    const coordsSet = new Set();
    
    list.forEach(ley => {
      coordsSet.add(`${ley.coord.x},${ley.coord.y}`);
      expect(blocked.some(b => b.x === ley.coord.x && b.y === ley.coord.y)).toBe(false);
      expect(ley.stars).toBeGreaterThanOrEqual(1);
      expect(ley.stars).toBeLessThanOrEqual(5);
    });
    
    expect(coordsSet.size).toBe(count);
  });

  test('generated leylines preserve fixed codex puzzle data', () => {
    const [leyline] = generateBattleLeylines({ battleSeed: seed, blockedCoords: blocked, count: 1 });
    const codexEntry = LEYLINE_PUZZLE_CODEX.find((entry) => entry.id === leyline.codexId);

    expect(codexEntry).toBeTruthy();
    expect(leyline.name).toBe(codexEntry.name);
    expect(leyline.stars).toBe(codexEntry.stars);
    expect(leyline.extractionProfile.requiredTerms).toEqual(codexEntry.requiredTerms);
    expect(leyline.extractionProfile.requiredActions).toEqual(codexEntry.requiredActions);
    expect(leyline.extractionProfile.oracleSeed).toEqual(codexEntry.oracleSeed);
    expect(leyline.rewardProfile.manaMin).toBe(codexEntry.manaMin);
    expect(leyline.rewardProfile.manaMax).toBe(codexEntry.manaMax);
  });

  test('checksum is derived from canonical payload, not just ID', () => {
    const list = generateBattleLeylines({ battleSeed: seed, blockedCoords: blocked });
    const leyline = list[0];

    expect(leyline.checksum).toMatch(/^LEY-[A-F0-9]+$/);

    // Modify a field and verify checksum changes
    const modifiedLeyline = { ...leyline, stars: leyline.stars + 1 };
    const modifiedPayload = stableStringify({
      id: modifiedLeyline.id,
      codexId: modifiedLeyline.codexId,
      name: modifiedLeyline.name,
      coord: modifiedLeyline.coord,
      affinity: modifiedLeyline.affinity,
      type: modifiedLeyline.type,
      stars: modifiedLeyline.stars,
      activeTurnStart: modifiedLeyline.activeTurnStart,
      activeTurnEnd: modifiedLeyline.activeTurnEnd,
      extractionProfile: modifiedLeyline.extractionProfile,
      rewardProfile: modifiedLeyline.rewardProfile
    });
    const modifiedChecksum = `LEY-${stableHash(modifiedPayload).toString(16).toUpperCase()}`;

    expect(leyline.checksum).not.toBe(modifiedChecksum);
  });

  test('getLeylinePhase returns correct lifecycle phases based on playerTurnIndex', () => {
    const leyline = {
      id: 'ley_test_01',
      activeTurnStart: 4,
      activeTurnEnd: 6
    };

    expect(getLeylinePhase(leyline, 1)).toBe('dormant');
    expect(getLeylinePhase(leyline, 2)).toBe('dormant');
    expect(getLeylinePhase(leyline, 3)).toBe('charging'); // activeTurnStart - 1
    expect(getLeylinePhase(leyline, 4)).toBe('glowing');  // activeTurnStart
    expect(getLeylinePhase(leyline, 5)).toBe('glowing');
    expect(getLeylinePhase(leyline, 6)).toBe('fading');   // activeTurnEnd
    expect(getLeylinePhase(leyline, 7)).toBe('spent');    // after activeTurnEnd

    // spent list override
    expect(getLeylinePhase(leyline, 4, ['ley_test_01'])).toBe('spent');
  });
});

describe('Verbal Alchemy Extraction Scoring (QA)', () => {
  const mockLeyline = {
    id: 'ley_sulfur_3',
    affinity: 'ALCHEMY',
    stars: 3,
    extractionProfile: {
      domain: 'alchemy',
      minScore: 0.70,
      requiredTerms: [['sulfur', 'brimstone'], ['crucible', 'vessel', 'alembic']],
      requiredActions: [['bind', 'seal', 'contain'], ['calcine', 'distill', 'sublimate']],
      forbiddenTerms: ['fire', 'burn']
    },
    rewardProfile: {
      manaMin: 12,
      manaMax: 28,
      superchargeThreshold: 0.78,
      instabilityRisk: 0.15
    }
  };

  const playerStats = {
    school: 'ALCHEMY',
    loreRatings: {
      MYTH: 5,
      CODEX: 5,
      ALCHEMY: 5
    }
  };

  test('empty phrase scores 0 and fails', () => {
    const result = scoreExtraction('', mockLeyline, playerStats);
    expect(result.ok).toBe(false);
    expect(result.extractionScore).toBe(0);
    expect(result.result).toBe('FAILED');
    expect(result.manaExtracted).toBe(0);
  });

  test('correct terms and actions score high and trigger supercharged reward', () => {
    const phrase = 'Calcine the volatile sulfur inside a sealed crucible.';
    const result = scoreExtraction(phrase, mockLeyline, playerStats);

    expect(result.ok).toBe(true);
    expect(result.extractionScore).toBeGreaterThanOrEqual(0.78);
    expect(result.result).toBe('SUPERCHARGED');
    expect(result.manaExtracted).toBeGreaterThanOrEqual(20);
    expect(result.diagnostics.some(d => d.includes('✓'))).toBe(true);
  });

  test('synonym group matching is case-insensitive and supports alternative options', () => {
    const phrase1 = 'Sublimate the brimstone inside a sealed alembic.';
    const result1 = scoreExtraction(phrase1, mockLeyline, playerStats);

    expect(result1.ok).toBe(true);
    expect(result1.extractionScore).toBeGreaterThanOrEqual(0.70);

    const phrase2 = 'Bind the sulfur inside a sealed vessel.';
    const result2 = scoreExtraction(phrase2, mockLeyline, playerStats);

    expect(result2.ok).toBe(true);
    expect(result2.extractionScore).toBeGreaterThanOrEqual(0.70);
  });

  test('forbidden terms apply severe penalties', () => {
    const cleanPhrase = 'Calcine the volatile sulfur inside a sealed crucible.';
    const resultClean = scoreExtraction(cleanPhrase, mockLeyline, playerStats);

    const forbiddenPhrase = 'Calcine the volatile sulfur and burn it over the fire inside a sealed crucible.';
    const resultForbidden = scoreExtraction(forbiddenPhrase, mockLeyline, playerStats);

    // Forbidden word penalty reduces score below passing threshold
    expect(resultForbidden.extractionScore).toBeLessThan(resultClean.extractionScore);
    expect(resultForbidden.ok).toBe(false);
    expect(resultForbidden.result).toBe('FAILED');
    expect(resultForbidden.diagnostics.some(d => d.includes('! Forbidden word detected'))).toBe(true);
  });

  test('stat bonuses correctly scale the final score and clamp within [0, 1] bounds', () => {
    const phrase = 'Calcine the sulfur inside a crucible.';
    
    const lowStatsPlayer = {
      school: 'VOID',
      loreRatings: { MYTH: 0, CODEX: 0, ALCHEMY: 0 }
    };
    const highStatsPlayer = {
      school: 'ALCHEMY',
      loreRatings: { MYTH: 10, CODEX: 10, ALCHEMY: 10 }
    };

    const resultLow = scoreExtraction(phrase, mockLeyline, lowStatsPlayer);
    const resultHigh = scoreExtraction(phrase, mockLeyline, highStatsPlayer);

    expect(resultHigh.extractionScore).toBeGreaterThan(resultLow.extractionScore);
    expect(resultHigh.extractionScore).toBeLessThanOrEqual(1.0);
  });

  test('instability diagnostics explain exact coherence failure causes', () => {
    const albedoLeyline = {
      id: 'ley_albedo_5',
      affinity: 'WILL',
      stars: 5,
      extractionProfile: {
        domain: 'alchemy',
        minScore: 0.85,
        requiredTerms: [['albedo', 'whiteness'], ['light', 'glow', 'shine'], ['pure', 'clean']],
        requiredActions: [['separate', 'divide'], ['purify', 'cleanse']],
        forbiddenTerms: ['black', 'dark', 'mix', 'dirty', 'blend']
      },
      rewardProfile: {
        manaMin: 20,
        manaMax: 40,
        superchargeThreshold: 0.93,
        instabilityRisk: 0.25
      }
    };

    const result = scoreExtraction('albedo light pure separate purify', albedoLeyline, { school: 'WILL' });
    const unstableDiagnostic = result.diagnostics.find(d => d.includes('UNSTABLE'));

    expect(result.instability).toBe(true);
    expect(unstableDiagnostic).toContain('too few words');
    expect(unstableDiagnostic).toContain('too little connective syntax');
    expect(unstableDiagnostic).toContain('coherence');
  });

  test('coherence diagnosis calls out keyword repetition directly', () => {
    const reasons = diagnoseLinguisticCoherence('pure pure pure pure light', 0.6);

    expect(reasons.some(reason => reason.includes('pure') && reason.includes('appears 4 times'))).toBe(true);
  });

  test('literary constraint scoring detects forgiving poetic devices', () => {
    const result = scoreLiteraryConstraints(
      'Hold nothing in glass as outline answers absence',
      {
        minRequired: 3,
        allowed: ['internal_rhyme', 'assonance', 'metaphor', 'antithesis', 'meter_8_12_syllables'],
        requiresPolarityPair: true,
        meter: { minSyllables: 8, maxSyllables: 12, preferredStressPattern: null },
      }
    );

    expect(result.requiredOk).toBe(true);
    expect(result.detected).toContain('metaphor');
    expect(result.detected).toContain('antithesis');
    expect(result.detected).toContain('meter_8_12_syllables');
  });

  test('five-star extraction fails when alchemy matches but poetic lock is incomplete', () => {
    const mirrorborneLeyline = {
      id: 'ley_void_5',
      affinity: 'VOID',
      stars: 5,
      extractionProfile: {
        domain: 'verbal-alchemy',
        minScore: 0.90,
        requiredTerms: [['nothing', 'void'], ['glass', 'vessel'], ['outline']],
        requiredActions: [['hold', 'outline', 'contain']],
        forbiddenTerms: ['empty', 'meaningless', 'erase'],
        literaryConstraints: {
          minRequired: 3,
          allowed: ['internal_rhyme', 'assonance', 'metaphor', 'antithesis', 'meter_8_12_syllables'],
          requiresPolarityPair: true,
          meter: { minSyllables: 8, maxSyllables: 12, preferredStressPattern: null },
        },
      },
      rewardProfile: {
        manaMin: 44,
        manaMax: 71,
        superchargeThreshold: 0.98,
        instabilityRisk: 0.25,
      },
    };

    const failed = scoreExtraction('Hold void in glass; outline vessel', mirrorborneLeyline, { school: 'VOID' });
    const passed = scoreExtraction('Hold nothing in glass as outline answers absence', mirrorborneLeyline, { school: 'VOID' });

    expect(failed.ok).toBe(false);
    expect(failed.diagnostics.some((diagnostic) => diagnostic.includes('Literary lock incomplete'))).toBe(true);
    expect(passed.ok).toBe(true);
  });
});
