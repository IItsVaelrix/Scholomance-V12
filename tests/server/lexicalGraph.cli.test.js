import { describe, expect, it } from 'vitest';
import { openWriteDatabase } from '../../scripts/lexical-graph.mjs';

describe('[Server] lexicalGraph.cli', () => {
  it('openWriteDatabase rejects a missing db path (fileMustExist)', () => {
    expect(() => openWriteDatabase('/nonexistent/path/to/missing.sqlite')).toThrow();
  });
});
