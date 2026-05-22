/**
 * Bridge: Scholomance deterministic RNG for UI and client services.
 * UI surfaces must import from here, not from codex/* (eslint no-restricted-imports).
 */
export { mulberry32, freshSeed, freshRng, uniform } from '../../../codex/core/shared/math/seededRng.js';
