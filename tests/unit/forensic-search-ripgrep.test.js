/**
 * Regression: forensicSearch must use a real, vendored ripgrep binary.
 *
 * Before this fix the service shelled out to a bare `rg`, which does not exist
 * on this host (the interactive `rg` is a Claude Code shell-function shim, not a
 * binary). Every call fell into the pure-JS node fallback that walks the entire
 * repo per call — turning the hybrid search (two forensic passes) into a ~30s
 * operation that tripped the gateway with a 502. The fallback's glob handling
 * was also broken (substring match, not a real glob), so includePattern
 * silently matched nothing.
 *
 * With @vscode/ripgrep vendored and wired in, forensic search runs on the real
 * engine, fast, with correct glob semantics.
 */
import { describe, it, expect } from 'vitest';
import { forensicSearch } from '../../codex/server/services/codebaseSearch.service.js';

describe('forensicSearch uses vendored ripgrep', () => {
  it('finds a known literal and reports the ripgrep engine', async () => {
    const res = await forensicSearch('forensicSearch', { includePattern: '*.js', limit: 5 });
    expect(res.metadata.engine).toBe('ripgrep-forensic');
    expect(res.results.length).toBeGreaterThan(0);
    expect(res.results.every((r) => r.file_path.endsWith('.js'))).toBe(true);
  });

  it('returns quickly (not a full-tree node walk)', async () => {
    const res = await forensicSearch('forensicSearch', { includePattern: '*.js', limit: 5 });
    expect(res.metadata.duration_ms).toBeLessThan(5000);
  });
});

describe('forensicSearch limit is a TOTAL cap (not per-file)', () => {
  it('caps total results at the requested limit, not limit-per-file', async () => {
    // "import" matches thousands of lines across hundreds of files. With the
    // old `rg --max-count` semantics this returned limit*fileCount results.
    const res = await forensicSearch('import', { includePattern: '*.js', limit: 5 });
    expect(res.results.length).toBe(5);
  });

  it('defaults to a 50-100 result window', async () => {
    const res = await forensicSearch('import', { includePattern: '*.js' });
    expect(res.results.length).toBeGreaterThanOrEqual(50);
    expect(res.results.length).toBeLessThanOrEqual(100);
  });
});
