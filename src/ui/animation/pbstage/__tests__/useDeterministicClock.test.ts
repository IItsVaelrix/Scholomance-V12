import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useDeterministicClock } from '../useDeterministicClock';

describe('useDeterministicClock', () => {
  it('freezes elapsed time at frozenAt when reducedMotion', () => {
    const { result } = renderHook(() =>
      useDeterministicClock({ reducedMotion: true, frozenAt: 1234 }),
    );
    expect(result.current.getElapsedMs()).toBe(1234);
  });

  it('accumulates only while not paused', () => {
    let now = 1000;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const { result, rerender } = renderHook(
      ({ paused }) => useDeterministicClock({ paused }),
      { initialProps: { paused: false } },
    );
    now = 1100; // +100ms running
    const a = result.current.getElapsedMs();
    rerender({ paused: true });
    now = 5000; // paused span must not count
    const b = result.current.getElapsedMs();
    expect(a).toBeGreaterThanOrEqual(100);
    expect(b).toBeCloseTo(a, 0);
  });
});
