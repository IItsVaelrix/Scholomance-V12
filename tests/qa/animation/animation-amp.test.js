import { describe, it, expect } from 'vitest';
import { runAnimationAmp } from '../../../codex/core/animation/amp/runAnimationAmp';
import { DimensionCompiler } from '../../../codex/core/pixelbrain/dimension-formula-compiler';

describe('Animation AMP — Connection & Integration', () => {
  const compiler = new DimensionCompiler();

  it('successfully resolves layout constraints through the microprocessor pipeline', async () => {
    // 1. Create a layout constraint (e.g., a square logo)
    const layout = compiler.canonicalize(compiler.parse('100x100'));

    // 2. Create an animation intent with this constraint
    const intent = {
      version: 'v1.0',
      targetId: 'logo-asset',
      trigger: 'mount',
      constraints: {
        layoutConstraint: layout
      }
    };

    // 3. Run the AMP
    const output = await runAnimationAmp(intent);

    // 4. Validate connection
    expect(output.success).toBe(true);
    expect(output.values.width).toBe(100);
    expect(output.values.height).toBe(100);
    expect(output.trace.some(t => t.processorId === 'mp.layout.dimensions')).toBe(true);
  });

  it('routes to the correct renderer based on target type', async () => {
    const phaserIntent = {
      version: 'v1.0',
      targetId: 'sprite-1',
      targetType: 'phaser',
      trigger: 'idle'
    };

    const output = await runAnimationAmp(phaserIntent);
    expect(output.renderer).toBe('phaser');
  });

  it('applies default motion values when no processors modify them', async () => {
    const intent = {
      version: 'v1.0',
      targetId: 'simple-box',
      trigger: 'hover'
    };

    const output = await runAnimationAmp(intent);
    expect(output.values.opacity).toBe(1);
    expect(output.values.scale).toBe(1.05);
    expect(output.values.durationMs).toBe(200);
  });
});
