/**
 * Animation AMP — useResolvedMotion Hook
 * 
 * Consumes the resolved motion output from an active animation by targetId.
 * 
 * @see ARCH_CONTRACT_OVERLAY_INTEGRITY.md - Layer separation requirements
 */

import { useState, useEffect } from 'react';
import { getActiveAnimation } from '../../../lib/amp-client.js';
import type { ResolvedMotionOutput } from '../../../types/animation';

/**
 * Hook to consume a resolved motion output for a given targetId
 * 
 * @param targetId - The unique identifier of the animation target
 * @param pollingIntervalMs - Frequency to poll for updates (default 100ms)
 * @returns Resolved motion output or null if no active animation found
 */
export function useResolvedMotion(
  targetId: string | null,
  pollingIntervalMs: number = 100
): ResolvedMotionOutput | null {
  const [motion, setMotion] = useState<ResolvedMotionOutput | null>(null);

  useEffect(() => {
    if (!targetId) {
      if (motion) setMotion(null);
      return;
    }

    // Polling for updates
    const fetchMotion = async () => {
      const current = await getActiveAnimation(targetId);
      if (current !== motion) {
        setMotion(current || null);
      }
    };

    // Initial check
    fetchMotion();

    // Set up polling
    const interval = setInterval(fetchMotion, pollingIntervalMs);

    return () => {
      clearInterval(interval);
    };
  }, [targetId, pollingIntervalMs, motion]);

  return motion;
}
