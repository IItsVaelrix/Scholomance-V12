import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useAnimationIntent } from '../useAnimationIntent';

vi.mock('../../../../lib/amp-client.js', () => ({
  submitAmpIntent: vi.fn(async () => ({ ok: true, motion: { glow: 1 } })),
}));

describe('useAnimationIntent', () => {
  it('submits once per stable intent, not on every render', async () => {
    const { submitAmpIntent } = await import('../../../../lib/amp-client.js');
    const intent = { targetId: 'x', preset: 'p', trigger: 'mount', state: {} } as any;
    const { rerender } = renderHook(() => useAnimationIntent(intent, true));
    await Promise.resolve();
    rerender(); rerender(); rerender();
    await Promise.resolve();
    expect((submitAmpIntent as any).mock.calls.length).toBe(1);
  });
});
