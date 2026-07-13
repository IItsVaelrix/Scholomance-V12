// @vitest-environment node
//
// THE COLOR_DRAGON LAW, made executable.
//
// "Rendering them is not a degraded mode, it is a lie: love/move and though/tough
//  get opposite vowel families." — buildResonanceGate.js
import { afterEach, describe, expect, it } from 'vitest';
import { PhonemeEngine } from '../../../codex/core/phonology/phoneme.engine.js';
import { synthesizeVerse } from '../../../codex/core/shared/truesight/compiler/VerseSynthesis.js';
import { decodeChromaBytecode } from '../../../codex/core/shared/truesight/color/chroma.bytecode.js';

const VERSE = 'the knight was brave and old';

afterEach(() => {
  PhonemeEngine.authorityFailure = null;
});

describe('the COLOR_DRAGON law', () => {
  it('paints NOTHING it cannot justify', () => {
    const artifact = synthesizeVerse(VERSE, {});
    for (const token of artifact.verseIR?.tokens || []) {
      const stamp = decodeChromaBytecode(token.precomputed.chroma.bytecode);
      if (!stamp.committed) {
        expect(token.precomputed.hex, `${token.text} was painted on authority ${stamp.authority}`)
          .toBeNull();
      }
    }
  });

  it('a guess is never painted, however confident it looks', () => {
    const artifact = synthesizeVerse(VERSE, {});
    for (const token of artifact.verseIR?.tokens || []) {
      const stamp = decodeChromaBytecode(token.precomputed.chroma.bytecode);
      if (['G', 'U', 'X'].includes(stamp.authority)) {
        expect(token.precomputed.hex, `${token.text} is a guess and was painted`).toBeNull();
      }
    }
  });

  it('an honestly grey token and a sick one are distinguishable from the stamp alone', () => {
    const artifact = synthesizeVerse(VERSE, {});
    const stamps = (artifact.verseIR?.tokens || [])
      .map(t => decodeChromaBytecode(t.precomputed.chroma.bytecode));

    for (const stamp of stamps.filter(s => !s.committed)) {
      // Every refusal names itself. None is silent.
      expect(['M', 'I', 'L']).toContain(stamp.reason);
    }
  });
});
