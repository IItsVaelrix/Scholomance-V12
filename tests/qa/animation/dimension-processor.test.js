import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DimensionProcessor } from '../../../codex/core/animation/processors/dimension-processor';
import { ViewportChannel } from '../../../src/lib/truesight/compiler/viewportBytecode';

// Mock ViewportChannel
vi.mock('../../../src/lib/truesight/compiler/viewportBytecode', () => ({
  ViewportChannel: {
    getState: vi.fn(() => ({
      width: 1920,
      height: 1080,
      deviceClass: 'desktop',
      orientation: 'landscape',
      pixelRatio: 1
    }))
  }
}));

describe('DimensionProcessor Inconsistency Fix', () => {
  let processor;

  beforeEach(() => {
    processor = new DimensionProcessor();
  });

  it('should not flatten hierarchy when parent dimensions are missing (should default to 0)', () => {
    const state = {
      intent: {
        version: 'v1.0',
        targetId: 'test',
        trigger: 'mount',
        constraints: {
          layoutConstraint: {
            id: 'test-layout',
            kind: 'container',
            widthPolicy: { type: 'parentWidth' },
            heightPolicy: { type: 'parentHeight' }
          }
        }
      },
      values: {},
      diagnostics: [],
      trace: []
    };

    const result = processor.run(state);

    // If hierarchy flattening was still happening, width would be 1920
    // With the fix, parentWidth is 0, so 100% of 0 is 0
    expect(result.values.width).toBe(0);
    expect(result.diagnostics.some(d => d.includes('LAYOUT_RESOLVED: 0x0'))).toBe(true);
  });

  it('should avoid orphaned state on compiler/runtime failure', () => {
    const state = {
      intent: {
        version: 'v1.0',
        targetId: 'test',
        trigger: 'mount',
        constraints: {
          layoutConstraint: 'invalid bytecode trigger' 
        }
      },
      values: {
        width: 100, // Previous value
        height: 100
      },
      diagnostics: [],
      trace: []
    };

    // Force a failure in the compiler or runtime if possible, 
    // or just pass something that will throw.
    // Based on dimension-formula-compiler.ts, an empty string or garbage might throw.
    state.intent.constraints.layoutConstraint = { type: 'invalid' }; 

    const result = processor.run(state);

    // Fixed: width/height should be deleted/removed if it fails
    expect(result.values.width).toBeUndefined();
    expect(result.values.height).toBeUndefined();
    expect(result.diagnostics.some(d => d.includes('LAYOUT_ERROR'))).toBe(true);
    expect(result.trace.some(t => t.processorId === 'mp.layout.dimensions' && t.changed.length === 0)).toBe(true);
  });
});
