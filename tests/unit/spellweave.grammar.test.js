import { describe, expect, it } from 'vitest';
import { parseWeave, calculateSyntacticBridge } from '../../codex/core/spellweave.engine.js';

describe('parseWeave clause grammar', () => {
  it('parses a legal PREDICATE→OBJECT clause', () => {
    const parsed = parseWeave('strike the flesh');
    expect(parsed.clauses).toHaveLength(1);
    expect(parsed.clauses[0].predicates).toEqual(['STRIKE']);
    expect(parsed.clauses[0].objects).toEqual(['FLESH']);
    expect(parsed.clauses[0].legality).toBe('legal');
    expect(parsed.chainType).toBe('SINGLE');
    expect(parsed.strikes).toBe(1);
  });

  it('marks an object spoken before its predicate as inverted', () => {
    const parsed = parseWeave('the flesh strike');
    expect(parsed.clauses[0].legality).toBe('inverted');
  });

  it('marks a predicate with no object as unfocused', () => {
    const parsed = parseWeave('strike');
    expect(parsed.clauses[0].legality).toBe('unfocused');
  });

  it('marks a modifier with nothing to bind to as dangling', () => {
    const parsed = parseWeave('swift the wind');
    expect(parsed.clauses[0].legality).toBe('dangling');
    expect(parsed.syntax.danglingModifiers).toBe(1);
  });

  it('splits clauses on connectors and reports the chain type', () => {
    const parsed = parseWeave('swift strike the flesh then shatter the stone');
    expect(parsed.clauses).toHaveLength(2);
    expect(parsed.clauses[0].modifiers).toEqual(['SWIFT']);
    expect(parsed.clauses[0].legality).toBe('legal');
    expect(parsed.clauses[1].predicates).toEqual(['SHATTER']);
    expect(parsed.chainType).toBe('SEQUENCE');
    expect(parsed.strikes).toBe(2);
  });

  it('reports MIXED when connectors disagree', () => {
    const parsed = parseWeave('strike the flesh and shatter the stone then consume the soul');
    expect(parsed.chainType).toBe('MIXED');
    expect(parsed.strikes).toBe(3);
  });

  it('keeps the historical flat fields', () => {
    const parsed = parseWeave('strike the flesh then strike the stone');
    expect(parsed.predicates).toEqual(['STRIKE']);
    expect(parsed.objects).toEqual(['FLESH', 'STONE']);
    expect(parsed.tokens).toContain('STRIKE');
  });

  it('scales modifier power from the registry', () => {
    const parsed = parseWeave('utter strike the flesh');
    expect(parsed.syntax.modifierPower).toBeCloseTo(1.25, 5);
  });
});

describe('calculateSyntacticBridge word-order law', () => {
  const base = { verse: 'The iron bell answers the hollow dark.', dominantSchool: 'WILL' };

  it('rewards legal order over inverted order for the same lexemes', () => {
    const legal = calculateSyntacticBridge({ ...base, weave: 'strike the flesh' });
    const inverted = calculateSyntacticBridge({ ...base, weave: 'the flesh strike' });
    expect(legal.resonance).toBeGreaterThan(inverted.resonance);
  });

  it('collapses only when a single clause overloads', () => {
    const overloaded = calculateSyntacticBridge({ ...base, weave: 'strike shatter consume ignite the flesh' });
    expect(overloaded.collapsed).toBe(true);
    expect(overloaded.events.some((event) => event.type === 'WEAVE_COLLAPSE')).toBe(true);

    const chained = calculateSyntacticBridge({
      ...base,
      weave: 'strike the flesh then shatter the stone then consume the soul then ignite the fire',
    });
    expect(chained.collapsed).toBe(false);
    expect(chained.strikes).toBe(4);
  });

  it('escalates SEQUENCE combos and emits a COMBO_CHAIN event', () => {
    const single = calculateSyntacticBridge({ ...base, weave: 'strike the flesh' });
    const combo = calculateSyntacticBridge({ ...base, weave: 'strike the flesh then strike the stone' });
    expect(combo.resonance).toBeGreaterThan(single.resonance - 0.001);
    expect(combo.events.some((event) => event.type === 'COMBO_CHAIN' && event.strikes === 2)).toBe(true);
  });

  it('marks SUSTAINED channels', () => {
    const sustained = calculateSyntacticBridge({ ...base, weave: 'strike the flesh while shield the soul' });
    expect(sustained.chainType).toBe('SUSTAINED');
    expect(sustained.sustained).toBe(true);
  });

  it('resolves the primary predicate in spoken order', () => {
    const bridge = calculateSyntacticBridge({ ...base, weave: 'mend the flesh then strike the stone' });
    expect(bridge.intent).toBe('HEALING');
  });

  it('is deterministic', () => {
    const first = calculateSyntacticBridge({ ...base, weave: 'utter strike the flesh then shatter the stone' });
    const second = calculateSyntacticBridge({ ...base, weave: 'utter strike the flesh then shatter the stone' });
    expect(second).toEqual(first);
  });
});
