import { renderHook } from '@testing-library/react';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { useHaptic } from '../../src/hooks/useHaptic';

describe('useHaptic', () => {
  let vibrateMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vibrateMock = vi.fn();
    Object.defineProperty(navigator, 'vibrate', {
      value: vibrateMock,
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fires tap pattern [8] when enabled', () => {
    const { result } = renderHook(() => useHaptic(true));
    result.current.haptic('tap');
    expect(vibrateMock).toHaveBeenCalledWith([8]);
  });

  it('fires success pattern [8, 40, 16] when enabled', () => {
    const { result } = renderHook(() => useHaptic(true));
    result.current.haptic('success');
    expect(vibrateMock).toHaveBeenCalledWith([8, 40, 16]);
  });

  it('fires error pattern [20, 10, 20] when enabled', () => {
    const { result } = renderHook(() => useHaptic(true));
    result.current.haptic('error');
    expect(vibrateMock).toHaveBeenCalledWith([20, 10, 20]);
  });

  it('does nothing when disabled', () => {
    const { result } = renderHook(() => useHaptic(false));
    result.current.haptic('tap');
    expect(vibrateMock).not.toHaveBeenCalled();
  });

  it('does nothing when navigator.vibrate is absent', () => {
    Object.defineProperty(navigator, 'vibrate', {
      value: undefined,
      configurable: true,
      writable: true,
    });
    const { result } = renderHook(() => useHaptic(true));
    expect(() => result.current.haptic('tap')).not.toThrow();
    expect(vibrateMock).not.toHaveBeenCalled();
  });
});
