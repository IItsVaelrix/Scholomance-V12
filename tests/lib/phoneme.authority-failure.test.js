import { describe, expect, it, vi, beforeEach } from 'vitest';
import { PhonemeEngine } from '../../codex/core/phonology/phoneme.engine.js';
import { ScholomanceDictionaryAPI } from '../../codex/core/shared/scholomanceDictionary.api.js';

describe('ensureAuthorityBatch — Oracle failure must not be silent', () => {
  beforeEach(() => {
    PhonemeEngine.authorityFailure = null;
    vi.restoreAllMocks();
  });

  it('records the failure instead of swallowing it', async () => {
    vi.spyOn(ScholomanceDictionaryAPI, 'isEnabled').mockReturnValue(true);
    vi.spyOn(ScholomanceDictionaryAPI, 'lookupBatch').mockRejectedValue(
      new Error('Dictionary Oracle timed out'),
    );

    await PhonemeEngine.ensureAuthorityBatch(['FIRE', 'DESIRE']);

    expect(PhonemeEngine.authorityFailure).not.toBeNull();
    expect(PhonemeEngine.authorityFailure.message).toContain('Dictionary Oracle timed out');
  });

  it('clears the failure on a subsequent success', async () => {
    vi.spyOn(ScholomanceDictionaryAPI, 'isEnabled').mockReturnValue(true);
    const spy = vi.spyOn(ScholomanceDictionaryAPI, 'lookupBatch');

    spy.mockRejectedValueOnce(new Error('Dictionary Oracle timed out'));
    await PhonemeEngine.ensureAuthorityBatch(['FIRE']);
    expect(PhonemeEngine.authorityFailure).not.toBeNull();

    spy.mockResolvedValueOnce({ DESIRE: { family: 'AY', phonemes: ['D', 'IH0', 'Z', 'AY1', 'ER0'] } });
    await PhonemeEngine.ensureAuthorityBatch(['DESIRE']);
    expect(PhonemeEngine.authorityFailure).toBeNull();
  });

  it('still resolves rather than throwing, so callers are unbroken', async () => {
    vi.spyOn(ScholomanceDictionaryAPI, 'isEnabled').mockReturnValue(true);
    vi.spyOn(ScholomanceDictionaryAPI, 'lookupBatch').mockRejectedValue(new Error('boom'));
    await expect(PhonemeEngine.ensureAuthorityBatch(['FIRE'])).resolves.toBeUndefined();
  });
});
