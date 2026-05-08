/**
 * Animation AMP — useAnimationSubmitter Hook
 * 
 * Provides an imperative function to submit animation intents to the AMP.
 * Ideal for use in event handlers or effects where the intent is dynamic.
 */

import { useCallback } from 'react';
import { AnimationIntent, ResolvedMotionOutput } from '../../../codex/animation/contracts/animation.types.ts';
import { processorBridge } from '../../../lib/processor-bridge.js';
import { usePrefersReducedMotion } from '../../../hooks/usePrefersReducedMotion.js';

/**
 * Hook to get a submission function for animation intents
 * 
 * @returns {Object} { submitIntent }
 */
export function useAnimationSubmitter() {
  const prefersReducedMotion = usePrefersReducedMotion();

  const submitIntent = useCallback(async (intent: AnimationIntent): Promise<ResolvedMotionOutput> => {
    // Augment intent with accessibility constraints
    const augmentedIntent = {
      ...intent,
      constraints: {
        reducedMotion: prefersReducedMotion,
        ...intent.constraints,
      }
    };

    // V12 PERFORMANCE: Offload to Microprocessor Factory via Bridge
    const result = await processorBridge.execute('amp.run', augmentedIntent);
    return result as ResolvedMotionOutput;
  }, [prefersReducedMotion]);

  return { submitIntent };
}
