import { describe, it, expect } from 'vitest';
import * as mod from '../../../../../codex/core/shared/truesight/bytecodeRenderer.js';

describe('codex/core/shared/truesight/bytecodeRenderer', () => {
  it('exports decodeBytecode as a function', () => {
    expect(typeof mod.decodeBytecode).toBe('function');
  });
});
