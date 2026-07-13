// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runSynthesis } from '../../../codex/core/microprocessors/nlu/synthesisProcessor.js';
import { PhonemeEngine } from '../../../codex/core/phonology/phoneme.engine.js';
import { ScholomanceDictionaryAPI } from '../../../codex/core/shared/scholomanceDictionary.api.js';
import { decodeChromaBytecode } from '../../../codex/core/shared/truesight/color/chroma.bytecode.js';

describe('synthesis processor authority prewarm', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    PhonemeEngine.clearCache();
    PhonemeEngine.authorityFailure = null;
  });

  it('connects the Scholomance Dictionary API to canonical VerseIR before synthesis', async () => {
    vi.spyOn(ScholomanceDictionaryAPI, 'isEnabled').mockReturnValue(true);
    vi.spyOn(ScholomanceDictionaryAPI, 'lookupBatch').mockResolvedValue({
      SIGHT: { family: 'AY', phonemes: ['S', 'AY1', 'T'] },
      LIGHT: { family: 'AY', phonemes: ['L', 'AY1', 'T'] },
    });

    const artifact = await runSynthesis({
      text: 'the bright and burning heart of sight\nthe smoke of night ignites the light',
      options: {},
    });

    const sight = artifact.verseIR.tokens.find(token => token.text === 'sight');
    const light = artifact.verseIR.tokens.find(token => token.text === 'light');
    const sightStamp = decodeChromaBytecode(sight.precomputed.chroma.bytecode);
    const lightStamp = decodeChromaBytecode(light.precomputed.chroma.bytecode);

    expect(sight.rhymeKey).toBe('AY-T');
    expect(light.rhymeKey).toBe('AY-T');
    expect(sight.phoneticDiagnostics.source).toBe('scholomance_dictionary');
    expect(light.phoneticDiagnostics.source).toBe('scholomance_dictionary');
    expect(sightStamp).toMatchObject({ authority: 'D', committed: true });
    expect(lightStamp).toMatchObject({ authority: 'D', committed: true });
    expect(artifact.verseIR.rhyme.schemePattern).toBe('AA');
  });
});
