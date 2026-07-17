import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import React from 'react';

vi.mock('../../../hooks/usePrefersReducedMotion.js', () => ({
  usePrefersReducedMotion: () => false,
}));

vi.mock('../../../lib/phaser/phaser-runtime.adapter.js', () => ({
  mountPhaserGame: vi.fn(async () => null),
}));

vi.mock('../../../lib/ambient/ambientPlayer.service.js', () => ({
  getAmbientPlayerService: () => null,
}));

vi.mock('../../../lib/cache/backgroundCache', () => ({
  cacheBackground: vi.fn(async () => undefined),
}));

/**
 * Regression: Listen chamber must not mount the broken Tier-A PBShaderStage.
 * It sat at the HTML canvas default 300×150, burned a WebGL2 context + rAF,
 * and duplicated atmosphere Phaser already paints. Mandala (BytecodeVisualiser)
 * stays; this stage does not.
 */
describe('AlchemicalLabBackground — no Tier-A shader canvas', () => {
  afterEach(() => cleanup());

  it('renders only the Phaser mount under alchemical-lab-background', async () => {
    const { AlchemicalLabBackground } = await import('../AlchemicalLabBackground');
    const { container } = render(<AlchemicalLabBackground signalLevel={0.2} />);
    const root = container.querySelector('.alchemical-lab-background');
    expect(root).toBeTruthy();
    expect(root.querySelector('.alchemical-lab-phaser')).toBeTruthy();
    // No second atmosphere surface — PBShaderStage was the only sibling canvas host.
    expect(root.querySelectorAll('canvas')).toHaveLength(0);
    expect(root.children).toHaveLength(1);
  });
});
