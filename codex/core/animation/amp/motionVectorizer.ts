/**
 * Motion Vectorizer
 * 
 * Translates continuous animation trajectory curves into static, 
 * high-dimensional Float32 vectors suitable for TurboQuant WASM ingestion.
 * 
 * Dimensions: 64 time slices * 4 components [x, y, scale, opacity] = 256 dimensions.
 */

import { ResolvedMotionOutput } from '../contracts/animation.types.ts';

/**
 * Calculates easing progress given a normalized time t and easing name
 */
export function getEasingProgress(t: number, easing: string): number {
  const norm = easing.toLowerCase().trim();
  
  if (norm === 'linear') {
    return t;
  }
  
  if (norm === 'ease-in') {
    return t * t;
  }
  
  if (norm === 'ease-in-out') {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }
  
  if (norm === 'bounce') {
    // Basic bounce curve approximation
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  }
  
  // Default is ease-out (quadratic decay)
  return 1 - (1 - t) * (1 - t);
}

/**
 * Samples a ResolvedMotionOutput over 64 time slices into a 256-dimensional vector
 * 
 * @param output The resolved motion output to vectorize
 * @param dimension Default target dimension size (must be 256)
 * @returns Float32Array of sampled trajectories
 */
export function vectorizeMotion(output: ResolvedMotionOutput, dimension = 256): Float32Array {
  const vector = new Float32Array(dimension);
  const timeSlices = Math.floor(dimension / 4); // 64 slices
  const values = output.values;
  const easing = values.easing;
  
  // Extract target states
  const targetX = values.translateX;
  const targetY = values.translateY;
  const targetScale = values.scale;
  const targetOpacity = values.opacity;
  
  // Starting baselines
  const startX = 0;
  const startY = 0;
  const startScale = 1.0;
  const startOpacity = 1.0;
  
  // Normalization scaling factors to prevent translation from dominating similarity
  const MAX_TRANSLATE_X = 1000.0;
  const MAX_TRANSLATE_Y = 1000.0;
  const MAX_SCALE_DELTA = 4.0; // scale - 1.0 ranges from 0 to 4.0 (max scale 5.0)
  
  for (let i = 0; i < timeSlices; i++) {
    // Normalized time t from 0.0 to 1.0 (inclusive of start and end)
    const t = timeSlices > 1 ? i / (timeSlices - 1) : 0;
    const progress = getEasingProgress(t, easing);
    
    // Interpolated values
    const x = startX + (targetX - startX) * progress;
    const y = startY + (targetY - startY) * progress;
    const scale = startScale + (targetScale - startScale) * progress;
    const opacity = startOpacity + (targetOpacity - startOpacity) * progress;
    
    // Pack sequentially in 4-tuple segments with channel delta normalization
    const offset = i * 4;
    vector[offset] = x / MAX_TRANSLATE_X;
    vector[offset + 1] = y / MAX_TRANSLATE_Y;
    vector[offset + 2] = (scale - startScale) / MAX_SCALE_DELTA;
    vector[offset + 3] = opacity - startOpacity;
  }
  
  return vector;
}
