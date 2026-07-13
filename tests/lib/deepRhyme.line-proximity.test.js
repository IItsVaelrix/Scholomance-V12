// @vitest-environment node
//
// A rhyme is a thing you can HEAR. Two words ninety lines apart do not rhyme in
// any sense a reader experiences — by the time you reach "behold" on line 90,
// "bold" on line 1 is long gone from the ear.
//
// The engine had no line-distance failsafe anywhere. Its two bounds were both
// bounds on WORK, not on distance:
//
//   - the phrase bucket used a sliding window over BUCKET-MEMBERSHIP order
//     (i+1 .. i+CAP), and a bucket groups by rhyme fingerprint, so two nodes
//     adjacent in the bucket can be 90 lines apart in the document;
//   - the rhyme group chained CONSECUTIVE OCCURRENCES (groupWords[i-1] ↔
//     groupWords[i]), which is consecutive in the rhyme family, not in the text.
//
// So an -old family at the top of a poem chained straight to an -old family at
// the bottom, and the resulting wordweb was both wrong (it coloured line 1 as
// rhyming with line 90) and enormous (it was the dominant term in the payload).
//
// Uses the real PhonemeEngine, so it needs the node environment — see the header
// of deepRhyme.phrase-buckets.test.js for why.
import { describe, expect, it } from 'vitest';
import {
  DeepRhymeEngine,
  MAX_CONNECTION_LINE_DISTANCE
} from '../../codex/core/rhyme-astrology/deepRhyme.engine.js';

/**
 * An -old rhyme family at the top and another ~90 lines later, with neutral
 * filler between. Nothing in the top family may reach the bottom family.
 */
function distantFamiliesVerse() {
  const lines = [
    'the knight was brave and old',
    'his armour bright and bold'
  ];
  for (let i = 0; i < 88; i += 1) {
    lines.push(`a neutral filler verse number ${i} carries nothing`);
  }
  lines.push('a prophecy the seers had long behold');
  lines.push('the ruin that the ancients had foretold');
  return lines.join('\n');
}

async function analyse(text) {
  const engine = new DeepRhymeEngine();
  return engine.analyzeDocument(text);
}

const lineDistance = connection => Math.abs(
  (connection.wordA?.lineIndex ?? 0) - (connection.wordB?.lineIndex ?? 0)
);

describe('deepRhyme line proximity failsafe', () => {
  it('exposes the window as a named bound', () => {
    expect(MAX_CONNECTION_LINE_DISTANCE).toBe(4);
  });

  it('never connects two rhyme families ninety lines apart', async () => {
    const analysis = await analyse(distantFamiliesVerse());

    const distant = analysis.allConnections.filter(c => lineDistance(c) > MAX_CONNECTION_LINE_DISTANCE);
    const described = distant.slice(0, 5).map(c =>
      `[${c.type}] line ${c.wordA.lineIndex} "${c.wordA.word}" ↔ line ${c.wordB.lineIndex} "${c.wordB.word}"`
    );

    expect(distant, `connections crossed the window:\n  ${described.join('\n  ')}`).toEqual([]);
  });

  it('does not colour bold on line 1 as rhyming with behold on line 90', async () => {
    const analysis = await analyse(distantFamiliesVerse());

    const chained = analysis.allConnections.find(c => {
      const words = [c.wordA?.word?.toLowerCase(), c.wordB?.word?.toLowerCase()];
      return words.includes('bold') && words.includes('behold');
    });

    expect(chained).toBeUndefined();
  });

  it('still connects a rhyme inside the window', async () => {
    // A plain couplet: the rhyme a reader actually hears.
    const analysis = await analyse([
      'the knight was brave and old',
      'his armour bright and bold'
    ].join('\n'));

    const oldBold = analysis.allConnections.find(c => {
      const words = [c.wordA?.word?.toLowerCase(), c.wordB?.word?.toLowerCase()];
      return words.includes('old') && words.includes('bold');
    });

    expect(oldBold).toBeTruthy();
    expect(oldBold.type).toBe('perfect');
  });

  it('connects a rhyme exactly at the window edge and refuses one past it', async () => {
    const filler = n => Array.from({ length: n }, (_, i) => `a neutral filler line ${i} carries nothing`);

    const atEdge = await analyse([
      'the knight was brave and old',
      ...filler(MAX_CONNECTION_LINE_DISTANCE - 1),
      'his armour bright and bold'
    ].join('\n'));

    const pastEdge = await analyse([
      'the knight was brave and old',
      ...filler(MAX_CONNECTION_LINE_DISTANCE),
      'his armour bright and bold'
    ].join('\n'));

    const oldBold = analysis => analysis.allConnections.find(c => {
      const words = [c.wordA?.word?.toLowerCase(), c.wordB?.word?.toLowerCase()];
      return words.includes('old') && words.includes('bold');
    });

    expect(oldBold(atEdge), 'a rhyme exactly at the window edge must survive').toBeTruthy();
    expect(oldBold(pastEdge), 'a rhyme one line past the window must not').toBeUndefined();
  });

  it('collapses the phrase_compound flood that the window was hiding', async () => {
    const analysis = await analyse(distantFamiliesVerse());

    const phrase = analysis.allConnections.filter(c => c.type === 'phrase_compound');
    // Pre-change this verse produced 6,374 connections beyond the window alone,
    // the bulk of them phrase_compound windows chaining across the whole poem.
    expect(phrase.every(c => lineDistance(c) <= MAX_CONNECTION_LINE_DISTANCE)).toBe(true);
  });
});
