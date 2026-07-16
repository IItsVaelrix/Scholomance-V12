import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { useAnimationIntent } from '../useAnimationIntent';

vi.mock('../../../../lib/amp-client.js', () => ({
  submitAmpIntent: vi.fn(async () => ({ ok: true, motion: { glow: 1 } })),
}));

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useAnimationIntent', () => {
  it('submits once per stable intent, not on every render', async () => {
    const { submitAmpIntent } = await import('../../../../lib/amp-client.js');

    // The hook computes `JSON.stringify(...)` once near the top of every
    // execution of its main effect (to build the intent hash). Spying on
    // it gives a clean proxy for "how many times did the effect body run",
    // which is what the motion-in-deps bug actually inflates — the
    // submitAmpIntent count alone can't see it, because the pre-existing
    // hash guard blocks a second *submit* even when the effect re-runs.
    const stringifySpy = vi.spyOn(JSON, 'stringify');

    const intent = { targetId: 'x', preset: 'p', trigger: 'mount', state: {} } as any;
    const { rerender } = renderHook(() => useAnimationIntent(intent, true));
    await Promise.resolve();
    rerender(); rerender(); rerender();
    await Promise.resolve();

    // Product invariant: only one network-ish submission per stable intent.
    expect((submitAmpIntent as any).mock.calls.length).toBe(1);

    // Regression guard: the effect body itself must also only have run
    // once for this settled intent. With `motion` back in the effect's
    // dependency array, resolving `setMotion(result)` inside the effect
    // changes `motion`'s identity, which re-triggers the same effect one
    // extra time (it then bails out via the hash guard, but not before
    // computing JSON.stringify again) — so this call count is 2 on the
    // buggy code and 1 on the fixed code.
    expect(stringifySpy.mock.calls.length).toBe(1);

    // Further confirmation that things are truly stable: once settled,
    // additional re-renders with the same intent must not cause any more
    // effect executions at all.
    stringifySpy.mockClear();
    rerender(); rerender(); rerender();
    await Promise.resolve();
    expect(stringifySpy.mock.calls.length).toBe(0);
  });
});
