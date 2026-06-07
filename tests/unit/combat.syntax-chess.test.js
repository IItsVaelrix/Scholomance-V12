import { describe, expect, it } from 'vitest';
import {
  evaluateSyntacticalChess,
  SYNTACTIC_ARCHETYPE_PROFILES,
} from '../../codex/core/combat.syntax-chess.js';

const shade = {
  name: 'Resonant Shade',
  school: 'SONIC',
  syntacticProfile: SYNTACTIC_ARCHETYPE_PROFILES.SHADE_BASE,
};

const golem = {
  name: 'Iron Golem',
  school: 'WILL',
  syntacticProfile: SYNTACTIC_ARCHETYPE_PROFILES.GOLEM_BASE,
};

describe('Syntactical Chess evaluator', () => {
  it('scores light and revelation language as advantage against a Shade', () => {
    const result = evaluateSyntacticalChess({
      phrase: "Let the lantern testify against the shade and drag its veil into dawn.",
      enemy: shade,
      profile: { verseIRAmplifier: { noveltySignal: 0.8 } },
    });

    expect(result.state).toBe('advantage');
    expect(result.matchedWeaknessFamilies).toContain('LIGHT');
    expect(result.matchedWeaknessFamilies).toContain('REVELATION');
    expect(result.multiplier).toBeGreaterThan(1.1);
  });

  it('scores obscurity language as disadvantage against a Shade', () => {
    const result = evaluateSyntacticalChess({
      phrase: 'Feed the dark with deeper shadow and hide it under the void.',
      enemy: shade,
    });

    expect(result.state).toBe('disadvantage');
    expect(result.resistedFamilies).toContain('VOID');
    expect(result.multiplier).toBeLessThan(1);
  });

  it('scores rust and corrosion language as advantage against an Iron Golem', () => {
    const result = evaluateSyntacticalChess({
      phrase: 'Let rust bloom inside the iron hinge until weather splits the plate.',
      enemy: golem,
    });

    expect(result.state).toBe('advantage');
    expect(result.matchedWeaknessFamilies).toContain('CORROSION');
    expect(result.matchedWeaknessFamilies).toContain('FRACTURE');
  });

  it('keeps generic attack phrases neutral', () => {
    const result = evaluateSyntacticalChess({
      phrase: 'Strike the enemy with force.',
      enemy: shade,
    });

    expect(result.state).toBe('neutral');
    expect(result.matchedWeaknessFamilies).toHaveLength(0);
  });

  it('scores keyword soup with lower clarity than a readable counter-sentence', () => {
    const soup = evaluateSyntacticalChess({
      phrase: 'light dawn prism reveal witness glow truth',
      enemy: shade,
    });
    const sentence = evaluateSyntacticalChess({
      phrase: 'Let the prism drag the shade into witness.',
      enemy: shade,
    });

    expect(soup.components.clarityScore).toBeLessThan(sentence.components.clarityScore);
  });

  it('adds literary device value when the enemy favors that device', () => {
    const plain = evaluateSyntacticalChess({
      phrase: 'Bring dawn to the shade.',
      enemy: shade,
    });
    const crafted = evaluateSyntacticalChess({
      phrase: 'Force the hidden thing to wear morning.',
      enemy: shade,
    });

    expect(crafted.components.literaryDeviceScore).toBeGreaterThan(plain.components.literaryDeviceScore);
  });

  it('returns neutral when no enemy profile exists', () => {
    const result = evaluateSyntacticalChess({
      phrase: 'Let the lantern testify.',
      enemy: { name: 'Unknown Shape' },
    });

    expect(result.state).toBe('neutral');
    expect(result.multiplier).toBe(1);
  });

  it('clamps multiplier within the designed range', () => {
    const result = evaluateSyntacticalChess({
      phrase: 'Let the lantern testify against the shade and drag its veil into dawn while the prism names the hidden echo.',
      enemy: shade,
      profile: { verseIRAmplifier: { noveltySignal: 1 } },
    });

    expect(result.multiplier).toBeLessThanOrEqual(1.28);
    expect(result.multiplier).toBeGreaterThanOrEqual(0.82);
  });

  it('diagnostics include matched weaknesses and resisted families', () => {
    const result = evaluateSyntacticalChess({
      phrase: 'Let the lantern expose the shade, but do not feed the void.',
      enemy: shade,
    });

    expect(result.diagnostics.join(' ')).toContain('Matched');
    expect(result.diagnostics.join(' ')).toContain('reinforced enemy');
  });
});
