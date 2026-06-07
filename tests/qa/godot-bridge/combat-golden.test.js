import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

import {
  createInitialCombatState,
  applyCombatCommand,
  canonicalizeCombatState,
} from '../../../src/pages/Combat/combatGoldenHarness.js';

const UPDATE_GOLDEN = process.env.UPDATE_GOLDEN === '1';

function runScenario1() {
  const FIXTURE_PATH = path.resolve('tests/qa/fixtures/golden-combat-sequence-1-basic-loop.json');
  
  const commands = [
    { actorId: 'player', command: 'MOVE 1 0' },
    { actorId: 'player', command: 'CHANNEL LUMEN' },
    { 
      actorId: 'player', 
      command: 'CAST MEND self',
      resolvedSpell: {
        spellId: 'mend', school: 'LUMEN', intent: 'heal', power: 12, cost: { mp: 4, ap: 1 },
        targeting: { mode: 'unit', range: 4 },
        effects: [{ kind: 'HEAL', amount: 12, scalingBasis: 'resolved_spell_power' }]
      }
    },
    { 
      actorId: 'opponent', 
      command: 'COUNTER BASIC_STRIKE player',
      resolvedSpell: {
        spellId: 'basic_strike', school: 'SONIC', intent: 'damage', power: 15, cost: { mp: 5, ap: 1 },
        targeting: { mode: 'unit', range: 2 },
        effects: [{ kind: 'DAMAGE', amount: 15, scalingBasis: 'resolved_spell_power' }]
      }
    },
  ];

  let state = createInitialCombatState({ seed: 'TEST_SEED_1' });

  const snapshots = [canonicalizeCombatState(state, { step: 0 })];

  commands.forEach((entry, index) => {
    state = applyCombatCommand(state, entry);
    snapshots.push(canonicalizeCombatState(state, { step: index + 1 }));
  });

  const actual = {
    schema: 'SCHOLO_COMBAT_GOLDEN_v1',
    scenarioId: 'golden-combat-sequence-1-basic-loop',
    seed: 'TEST_SEED_1',
    engine: { source: 'js', version: 1 },
    commands,
    snapshots,
  };

  if (UPDATE_GOLDEN) {
    fs.writeFileSync(FIXTURE_PATH, `${JSON.stringify(actual, null, 2)}\n`);
    return actual; // return actual to make the test pass immediately upon creation
  }

  const expected = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8'));
  return { actual, expected };
}

function runScenario2() {
  const FIXTURE_PATH = path.resolve('tests/qa/fixtures/golden-combat-sequence-2-status-effects.json');
  
  const commands = [
    { actorId: 'player', command: 'MOVE 1 0' },
    { actorId: 'player', command: 'CHANNEL VOID' }, // Should add Resonance charge
    { 
      actorId: 'player', 
      command: 'CAST CURSE opponent',
      resolvedSpell: {
        spellId: 'curse', school: 'VOID', intent: 'debuff', power: 10, cost: { mp: 10, ap: 1 },
        targeting: { mode: 'unit', range: 4 },
        effects: [
          { kind: 'STATUS', type: 'POISON_SNARE', magnitude: 0.5, duration: 3 }
        ]
      }
    },
    { actorId: 'opponent', command: 'END_TURN' },
    { actorId: 'player', command: 'END_TURN' }
  ];

  let state = createInitialCombatState({ seed: 'TEST_SEED_2' });
  const snapshots = [canonicalizeCombatState(state, { step: 0 })];

  commands.forEach((entry, index) => {
    state = applyCombatCommand(state, entry);
    snapshots.push(canonicalizeCombatState(state, { step: index + 1 }));
  });

  const actual = {
    schema: 'SCHOLO_COMBAT_GOLDEN_v1',
    scenarioId: 'golden-combat-sequence-2-status-effects',
    seed: 'TEST_SEED_2',
    engine: { source: 'js', version: 1 },
    commands,
    snapshots,
  };

  if (UPDATE_GOLDEN) {
    fs.writeFileSync(FIXTURE_PATH, `${JSON.stringify(actual, null, 2)}\n`);
    return actual;
  }

  const expected = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8'));
  return { actual, expected };
}

function runScenario3() {
  const FIXTURE_PATH = path.resolve('tests/qa/fixtures/golden-combat-sequence-3-pathing-blockers.json');
  
  const commands = [
    { actorId: 'player', command: 'MOVE 0 1' },
    { actorId: 'player', command: 'MOVE 0 1' } // Hit a blocker or edge
  ];

  let state = createInitialCombatState({ seed: 'TEST_SEED_3' });
  const snapshots = [canonicalizeCombatState(state, { step: 0 })];

  commands.forEach((entry, index) => {
    state = applyCombatCommand(state, entry);
    snapshots.push(canonicalizeCombatState(state, { step: index + 1 }));
  });

  const actual = {
    schema: 'SCHOLO_COMBAT_GOLDEN_v1',
    scenarioId: 'golden-combat-sequence-3-pathing-blockers',
    seed: 'TEST_SEED_3',
    engine: { source: 'js', version: 1 },
    commands,
    snapshots,
  };

  if (UPDATE_GOLDEN) {
    fs.writeFileSync(FIXTURE_PATH, `${JSON.stringify(actual, null, 2)}\n`);
    return actual;
  }

  const expected = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8'));
  return { actual, expected };
}

describe('Godot bridge combat golden output', () => {
  test('golden-combat-sequence-1-basic-loop', () => {
    const result = runScenario1();
    if (!UPDATE_GOLDEN) {
      expect(result.actual).toEqual(result.expected);
    }
  });

  test('golden-combat-sequence-2-status-effects', () => {
    const result = runScenario2();
    if (!UPDATE_GOLDEN) {
      expect(result.actual).toEqual(result.expected);
    }
  });

  test('golden-combat-sequence-3-pathing-blockers', () => {
    const result = runScenario3();
    if (!UPDATE_GOLDEN) {
      expect(result.actual).toEqual(result.expected);
    }
  });
});
