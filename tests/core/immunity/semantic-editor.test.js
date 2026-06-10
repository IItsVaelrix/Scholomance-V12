import { describe, it, expect } from 'vitest';
import { editCode } from '../../../codex/core/immunity/semantic-editor.js';

describe('semantic editor (meaning-policy arbiter)', () => {
  it('flags nondeterminism in a deterministic context', () => {
    const code = 'function procgenDungeon(seed){ return Math.random(); }';
    const result = editCode(code);
    expect(result.contextTags).toContain('deterministic');
    expect(result.violations.map(v => v.meaning)).toContain('nondeterminism');
    expect(result.score).toBeGreaterThan(0);
  });

  it('does NOT flag nondeterminism outside a deterministic context', () => {
    const code = 'function sparkle(){ return Math.random(); }';
    const result = editCode(code, { path: 'src/ui/animations.js' });
    expect(result.violations.map(v => v.meaning)).not.toContain('nondeterminism');
  });

  it('flags hardcoded secrets everywhere (context-independent)', () => {
    const result = editCode('const API_KEY = "sk-1234567890abcdef";');
    expect(result.violations.map(v => v.meaning)).toContain('hardcoded-secret');
  });

  it('flags an unchecked type assertion', () => {
    const result = editCode('function f(raw){ return raw as unknown as UserProfile; }');
    expect(result.violations.map(v => v.meaning)).toContain('unchecked-type-assertion');
  });

  it('returns a clean result for ordinary code', () => {
    const result = editCode('function add(a, b){ return a + b; }');
    expect(result.score).toBe(0);
    expect(result.violations).toEqual([]);
  });
});
