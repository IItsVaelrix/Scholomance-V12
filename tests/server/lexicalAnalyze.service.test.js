import { describe, it, expect } from 'vitest';
import { createLexiconAdapter } from '../../codex/server/adapters/lexicon.sqlite.adapter.js';
import { createLexicalGraphAdapter } from '../../codex/server/adapters/lexicalGraph.sqlite.adapter.js';
import { createLexicalAnalyzeService } from '../../codex/server/services/lexicalAnalyze.service.js';

const DB = 'scholomance_dict.sqlite';
function svc() {
  return createLexicalAnalyzeService({
    lexiconAdapter: createLexiconAdapter(DB),
    lexicalGraphAdapter: createLexicalGraphAdapter(DB),
  });
}

describe('lexicalAnalyze.service', () => {
  it('produces all group keys in fixed order', () => {
    const r = svc().analyze('dark');
    expect(r.groups.map((g) => g.key)).toEqual([
      'meaning', 'related', 'oppositions', 'sound', 'phrases',
      'literary', 'symbols', 'corpus',
    ]);
  });
  it('fills meaning + sound + related for a real word', () => {
    const r = svc().analyze('dark');
    const by = Object.fromEntries(r.groups.map((g) => [g.key, g]));
    expect(by.meaning.items.length).toBeGreaterThan(0);
    expect(by.sound.items.length).toBeGreaterThan(0);
    expect(by.related.items.length).toBeGreaterThan(0);
  });
  it('oppositions + phrases are honest-empty (no fabrication)', () => {
    const r = svc().analyze('dark');
    const by = Object.fromEntries(r.groups.map((g) => [g.key, g]));
    expect(by.oppositions.items).toEqual([]);
    expect(by.oppositions.emptyReason).toMatch(/antonym/i);
    expect(by.phrases.items).toEqual([]);
    expect(by.phrases.emptyReason).toMatch(/phrase/i);
  });
  it('symbols items are flagged derived', () => {
    const r = svc().analyze('rose');
    const sym = r.groups.find((g) => g.key === 'symbols');
    for (const it of sym.items) expect(it.derived).toBe(true);
  });
});
