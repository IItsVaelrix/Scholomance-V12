export const MANIFOLD_WORKLET_MESSAGES = Object.freeze({
  PREPARE: 'MANIFOLD_PREPARE',
  LOAD_PROGRAM: 'MANIFOLD_LOAD_PROGRAM',
  SET_MACROS: 'MANIFOLD_SET_MACROS',
  FREEZE: 'MANIFOLD_FREEZE',
  PANIC: 'MANIFOLD_PANIC',
  EVENT_BATCH: 'MANIFOLD_EVENT_BATCH',
  STATUS: 'MANIFOLD_STATUS',
});

export function createManifoldMessage(type, payload = {}) {
  return {
    type,
    payload,
  };
}
