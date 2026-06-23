import { describe, expect, it, vi } from 'vitest';
import { resolveOOVSubject, createOOVResolver } from '../../../codex/core/microprocessors/nlu/oov-resolver.js';

// Fake adapter: deterministic, offline. meansLike returns a canned ranked list.
const fakeAdapter = (neighborsByWord) => ({
  meansLike: vi.fn(async (word) => neighborsByWord[word] ?? []),
});

describe('resolveOOVSubject', () => {
  it('maps an OOV word to the first meaning-neighbor that is a known subject', async () => {
    // reggaeton -> [salsa, punta, warrior, ...]; 'warrior' is the first known subject
    const adapter = fakeAdapter({ reggaeton: ['salsa', 'punta', 'warrior', 'dragon'] });
    const result = await resolveOOVSubject('reggaeton', adapter);
    expect(result).toEqual({ original: 'reggaeton', resolvedTo: 'warrior', via: 'datamuse:meansLike' });
  });

  it('returns null when no neighbor is a known subject', async () => {
    const adapter = fakeAdapter({ blorptastic: ['flibber', 'wibble', 'splork'] });
    const result = await resolveOOVSubject('blorptastic', adapter);
    expect(result).toBeNull();
  });

  it('returns null when meansLike returns an empty list', async () => {
    const adapter = fakeAdapter({});
    const result = await resolveOOVSubject('nothingburger', adapter);
    expect(result).toBeNull();
  });

  it('memoizes repeated lookups of the same word (single network round-trip)', async () => {
    const adapter = fakeAdapter({ reggaeton: ['warrior'] });
    const resolver = createOOVResolver(adapter);
    await resolver('reggaeton');
    await resolver('reggaeton');
    expect(adapter.meansLike).toHaveBeenCalledTimes(1);
  });
});
