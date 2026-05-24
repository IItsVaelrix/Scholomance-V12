import { describe, it, expect } from 'vitest';
import * as bytecodeRendererModule from '../../../../src/lib/truesight/bytecodeRenderer.js';

describe('bytecodeRenderer re-export', () => {
  it('exports decodeBytecode as a function', () => {
    expect(typeof bytecodeRendererModule.decodeBytecode).toBe('function');
  });
});
