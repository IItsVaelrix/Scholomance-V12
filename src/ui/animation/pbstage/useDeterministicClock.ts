import { useRef } from 'react';

interface ClockOpts {
  paused?: boolean;
  reducedMotion?: boolean;
  frozenAt?: number;
}

export interface DeterministicClock {
  getElapsedMs(): number;
}

/**
 * A single monotonically-accumulating clock. It advances by real wall-clock
 * deltas ONLY while not paused, so pausing (tab hidden, element offscreen)
 * does not create a time jump. Under reducedMotion it returns a constant.
 */
export function useDeterministicClock(opts: ClockOpts = {}): DeterministicClock {
  const { paused = false, reducedMotion = false, frozenAt = 0 } = opts;
  const accumRef = useRef(0);
  const lastRef = useRef(performance.now());
  const stateRef = useRef({ paused, reducedMotion, frozenAt });
  stateRef.current = { paused, reducedMotion, frozenAt };

  const clockRef = useRef<DeterministicClock>({
    getElapsedMs() {
      const s = stateRef.current;
      if (s.reducedMotion) return s.frozenAt;
      const now = performance.now();
      if (!s.paused) accumRef.current += now - lastRef.current;
      lastRef.current = now;
      return accumRef.current;
    },
  });

  return clockRef.current;
}
