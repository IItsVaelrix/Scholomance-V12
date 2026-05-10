import { describe, it, expect, vi } from 'vitest';
import { normalizeAnimationIntent } from '../../codex/core/animation/amp/normalizeAnimationIntent.ts';

describe('Codex Core — Animation AMP — NormalizeIntent', () => {
  it('normalizes basic intent into default working state', async () => {
    const intent = { version: '1.0.0', targetId: 'test-target' };
    const state = await normalizeAnimationIntent(intent);

    expect(state.intent).toBe(intent);
    expect(state.values.durationMs).toBe(300);
    expect(state.flags.gpuAccelerated).toBe(true);
    expect(state.trace.length).toBe(1);
    expect(state.trace[0].processorId).toBe('amp.normalize');
  });

  it('successfully logs preset application diagnostics', async () => {
    const intent = { version: '1.0.0', targetId: 'test-target', preset: 'pulse' };
    const state = await normalizeAnimationIntent(intent);

    // If preset not found, it adds a diagnostic
    expect(state.diagnostics.length).toBeGreaterThan(0);
    expect(state.diagnostics[0]).toContain('Preset');
  });
});
