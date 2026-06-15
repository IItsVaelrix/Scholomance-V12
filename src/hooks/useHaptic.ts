import { useRef, useCallback } from 'react';

export type HapticPattern =
  | 'tap' | 'select' | 'toggle'
  | 'open' | 'dismiss' | 'snap'
  | 'success' | 'error';

const PATTERNS: Record<HapticPattern, number[]> = {
  tap:     [8],
  select:  [12],
  toggle:  [10],
  open:    [6, 30, 2],
  dismiss: [4],
  snap:    [8],
  success: [8, 40, 16],
  error:   [20, 10, 20],
};

export function useHaptic(enabled: boolean) {
  const supportedRef = useRef<boolean | null>(null);

  const haptic = useCallback((pattern: HapticPattern) => {
    if (!enabled) return;
    if (supportedRef.current === null) {
      supportedRef.current =
        typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
    }
    if (!supportedRef.current) return;
    navigator.vibrate(PATTERNS[pattern]);
  }, [enabled]);

  return { haptic };
}
