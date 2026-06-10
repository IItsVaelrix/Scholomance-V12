import { describe, it, expect } from 'vitest';
import { tokenizeToStates } from '../../../codex/core/immunity/syntax-tokenizer.js';

describe('tokenizeToStates', () => {
  it('produces an ordered AST node-type sequence', () => {
    const states = tokenizeToStates('const x = f();');
    expect(states[0]).toBe('Program');
    expect(states).toContain('VariableDeclaration');
    expect(states).toContain('CallExpression');
  });

  it('is name-agnostic: two snippets with different identifiers but identical structure produce identical states', () => {
    const a = tokenizeToStates('function foo(bar){ return bar.baz; }');
    const b = tokenizeToStates('function qux(zap){ return zap.wob; }');
    expect(a).toEqual(b);
  });

  it('parses TypeScript and JSX without throwing', () => {
    expect(tokenizeToStates('const x: number = 1;').length).toBeGreaterThan(0);
    expect(tokenizeToStates('const el = <div className="a">hi</div>;').length).toBeGreaterThan(0);
  });

  it('returns [] for empty or non-string input', () => {
    expect(tokenizeToStates('')).toEqual([]);
    expect(tokenizeToStates(null)).toEqual([]);
    expect(tokenizeToStates(42)).toEqual([]);
  });
});
