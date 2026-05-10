import { describe, it, expect } from 'vitest';
import { prefixProvider } from '../../../../src/lib/pls/providers/prefixProvider.js';

describe('prefixProvider', () => {
  it('blends prefix and bigram evidence and includes contextual candidates', async () => {
    const context = { prefix: 'li', prevWord: 'the' };
    const engines = {
      trie: {
        predict: () => ['light', 'lime', 'line'],
        predictNext: () => ['line', 'light', 'life'],
      },
    };

    const results = await prefixProvider(context, engines);
    const tokens = results.map((row) => row.token);

    expect(tokens).toContain('light');
    expect(tokens).toContain('line');
    expect(tokens).toContain('life');
    expect(tokens.indexOf('light')).toBeLessThan(tokens.indexOf('life'));
  });

  it('falls back to next-word predictions when prefix is empty', async () => {
    const context = { prefix: '', prevWord: 'the' };
    const engines = {
      trie: {
        predict: () => [],
        predictNext: () => ['night', 'void'],
      },
    };

    const results = await prefixProvider(context, engines);
    expect(results.map((row) => row.token)).toEqual(['night', 'void']);
  });
});
