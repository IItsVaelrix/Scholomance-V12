// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { compileVerseToIR } from '../../../codex/core/shared/truesight/compiler/compileVerseToIR.js';
import { synthesizeVerse } from '../../../codex/core/shared/truesight/compiler/VerseSynthesis.js';

const VERSE = readFileSync('tests/fixtures/rhyme/dense-verse.txt', 'utf8');

function byText(tokens, text) {
  return tokens.find(token => token.text === text);
}

function hasLineGroup(groups, expectedLines) {
  return [...groups.values()].some(lines =>
    expectedLines.every(line => lines.includes(line))
  );
}

describe('canonical rhyme source of truth', () => {
  it('promotes VerseIR rhyme keys onto tokens instead of hiding them in nested analysis', () => {
    const ir = compileVerseToIR(VERSE);
    const sight = byText(ir.tokens, 'sight');
    const light = byText(ir.tokens, 'light');

    expect(sight.rhymeKey).toBe('IH-GT');
    expect(light.rhymeKey).toBe('IH-GT');
    expect(sight.wordIndex).toBe(sight.tokenIndexInLine);
  });

  it('builds line-end rhyme groups from the canonical VerseIR rhyme keys', () => {
    const ir = compileVerseToIR(VERSE);

    expect(ir.rhyme.schemePattern).not.toBe('');
    expect(hasLineGroup(ir.rhyme.rhymeGroups, [2, 3])).toBe(true); // desire / entire
    expect(hasLineGroup(ir.rhyme.rhymeGroups, [4, 5])).toBe(true); // sight / light
  });

  it('makes VerseSynthesis consume the canonical VerseIR rhyme contract', () => {
    const artifact = synthesizeVerse(VERSE, {});

    expect(artifact.scheme.pattern).not.toBe('');
    expect(hasLineGroup(artifact.scheme.groups, [2, 3])).toBe(true);
    expect(hasLineGroup(artifact.scheme.groups, [4, 5])).toBe(true);
  });

  it('keys the resonance palette by canonical token identity and canonical rhyme key', () => {
    const artifact = synthesizeVerse(VERSE, {});
    const sight = artifact.verseIR.tokens.find(token => token.text === 'sight');
    const light = artifact.verseIR.tokens.find(token => token.text === 'light');
    const sightIdentity = `${sight.lineIndex}:${sight.tokenIndexInLine}:${sight.charStart}`;
    const lightIdentity = `${light.lineIndex}:${light.tokenIndexInLine}:${light.charStart}`;

    expect(artifact.rhymeColorRegistry.get(sightIdentity)).toBeTruthy();
    expect(artifact.rhymeColorRegistry.get(sightIdentity))
      .toBe(artifact.rhymeColorRegistry.get(lightIdentity));
  });
});
