/**
 * The resonant-change sweep: content diff, not identity.
 *
 * buildResonanceGate returns a NEW Map every call and the effect's dep is
 * memoized on [deepAnalysis], so `prev !== next` was ALWAYS true. Every
 * debounced analysis swept and `replace()`d every word-bearing node in the
 * document — minting a fresh node for each, which defeats Lexical's structural
 * sharing, so each sweep pushed a full non-shared document copy onto a history
 * stack whose maxDepth defaults to null (unbounded, per @lexical/history's own
 * docstring). Retained nodes grew as analyses x document-size.
 *
 * Under-dirtying is the hazard these tests exist to catch: a word left painted
 * with resonance it no longer has is the annotation-per-line regression.
 */
import { describe, it, expect } from 'vitest';
import { changedCharStarts, FULL_SWEEP_THRESHOLD } from '../../../src/lib/lexical/TruesightPlugin.jsx';

const gate = (entries) => new Map(entries);

describe('changedCharStarts — the guard that used to be always-true', () => {
  it('a rebuilt gate with identical content reports NO change', () => {
    // THE FIX. Two distinct Map objects, same meaning. The old identity check
    // said "changed" here and replaced the whole document.
    const a = gate([[0, 'rhyme'], [10, 'assonance']]);
    const b = gate([[0, 'rhyme'], [10, 'assonance']]);
    expect(a).not.toBe(b); // identity differs...
    expect(changedCharStarts(a, b).size).toBe(0); // ...meaning does not
  });

  it('a tier that MOVED is reported', () => {
    const a = gate([[0, 'rhyme']]);
    const b = gate([[0, 'assonance']]);
    expect([...changedCharStarts(a, b)]).toEqual([0]);
  });

  it('a position that APPEARED is reported', () => {
    const a = gate([[0, 'rhyme']]);
    const b = gate([[0, 'rhyme'], [7, 'rhyme']]);
    expect([...changedCharStarts(a, b)]).toEqual([7]);
  });

  it('a position that VANISHED is reported — the direction easiest to drop', () => {
    // rhyme -> grey only shows up by walking the PREVIOUS gate's keys. Miss it
    // and the word stays coloured for resonance it no longer has.
    const a = gate([[0, 'rhyme'], [7, 'assonance']]);
    const b = gate([[0, 'rhyme']]);
    expect([...changedCharStarts(a, b)]).toEqual([7]);
  });

  it('an emptied gate reports every previous position', () => {
    // authorityUnavailable makes buildResonanceGate return an empty Map: every
    // coloured word must go grey.
    const a = gate([[0, 'rhyme'], [7, 'rhyme'], [12, 'assonance']]);
    expect(changedCharStarts(a, gate([])).size).toBe(3);
  });

  it('a first gate arriving after analysis reports every position', () => {
    // The async gate filling after first render — late-arriving resonance must
    // repaint, which is the case the original full sweep existed for.
    const b = gate([[0, 'rhyme'], [7, 'rhyme']]);
    expect(changedCharStarts(new Map(), b).size).toBe(2);
  });

  it('tolerates a null/undefined gate on either side', () => {
    expect(changedCharStarts(null, gate([[0, 'rhyme']])).size).toBe(1);
    expect(changedCharStarts(gate([[0, 'rhyme']]), null).size).toBe(1);
    expect(changedCharStarts(null, null).size).toBe(0);
  });
});

describe('the append case — why this is the whole fix', () => {
  it('typing at the END of a long track moves almost nothing', () => {
    // 1000 words, resonance unchanged except the new word at the tail. The old
    // code replaced all 1001 nodes; this replaces one.
    const before = new Map();
    for (let i = 0; i < 1000; i += 1) before.set(i * 5, i % 3 === 0 ? 'rhyme' : 'assonance');
    const after = new Map(before);
    after.set(5000, 'rhyme');

    const changed = changedCharStarts(before, after);
    expect(changed.size).toBe(1);
    expect(changed.size).toBeLessThan(FULL_SWEEP_THRESHOLD); // stays on the cheap path
  });

  it('editing near the TOP re-keys downstream and takes the full-sweep path', () => {
    // Inserting a character at position 0 shifts every charStart. That is a real
    // change, not a false positive — and the threshold sends it to the full
    // sweep, which is exactly the previous behaviour. No worse, never wrong.
    const before = new Map();
    for (let i = 0; i < 1000; i += 1) before.set(i * 5, 'rhyme');
    const after = new Map();
    for (let i = 0; i < 1000; i += 1) after.set(i * 5 + 1, 'rhyme');

    expect(changedCharStarts(before, after).size).toBeGreaterThan(FULL_SWEEP_THRESHOLD);
  });
});
