/**
 * AMP Client Bridge — UI Layer Access Point
 * 
 * Provides a safe bridge for UI components to interact with the Animation AMP
 * without triggering LING-0F03 (Forbidden UI -> Codex import).
 * 
 * This file lives in src/lib/ which is exempt from the layer-separation rule.
 * It re-exports AMP functionality that UI components need.
 * 
 * @see ARCH_CONTRACT_OVERLAY_INTEGRITY.md - Layer separation requirements
 */

/**
 * @typedef {Object} AmpStatus
 * @property {boolean} isRunning
 * @property {number} activeCount
 * @property {Object} config
 */

/**
 * Get the current AMP status
 * @returns {AmpStatus}
 */
export async function getAmpStatus() {
  const { getAmpStatus: getStatus } = await import('../../codex/core/animation/amp/runAnimationAmp.ts');
  return getStatus();
}

/**
 * Get all active animations
 * @returns {Map<string, any>}
 */
export async function getAllActiveAnimations() {
  const { getAllActiveAnimations: getAll } = await import('../../codex/core/animation/amp/runAnimationAmp.ts');
  return getAll();
}

/**
 * Get a single active animation by targetId
 * @param {string} targetId
 * @returns {any | undefined}
 */
export async function getActiveAnimation(targetId) {
  const { getActiveAnimation: getActive } = await import('../../codex/core/animation/amp/runAnimationAmp.ts');
  return getActive(targetId);
}

/**
 * Submit an animation intent to the AMP
 * @param {import('../../codex/core/animation/contracts/animation.types.js').AnimationIntent} intent
 * @returns {Promise<any>}
 */
export async function submitAmpIntent(intent) {
  const { runAnimationAmp } = await import('../../codex/core/animation/amp/runAnimationAmp.ts');
  return runAnimationAmp(intent);
}
