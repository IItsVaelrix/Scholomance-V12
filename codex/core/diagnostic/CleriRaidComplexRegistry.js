/**
 * CLERI RAID COMPLEX REGISTRY — Diagnostic Biology Declarations
 *
 * Declares the named diagnostic complexes that CleriRaidMind evaluates.
 * Each complex maps subunit ids to BytecodeHealth signal keys, declares
 * expected ratios, weights, and classification thresholds.
 *
 * Ratios live here — not scattered across runtime code. A future agent
 * can audit or extend complexes without spelunking through evaluators.
 *
 * Reference: ByteCode Diagnostic Synthesis PDR
 */

export const CLERI_RAID_COMPLEXES = Object.freeze([
  {
    id: 'AUTH_HANDSHAKE_COMPLEX',
    expected: {
      authSender: 2,
      identityProof: 2,
      sessionContinuity: 1,
      csrfBoundary: 1,
    },
    weights: {
      authSender: 1.4,
      identityProof: 1.4,
      sessionContinuity: 1.1,
      csrfBoundary: 1.2,
    },
    subunits: [
      { id: 'authSender', signalKey: 'AUTH_SENDER_MATCH' },
      { id: 'identityProof', signalKey: 'IDENTITY_PROOF_VALID' },
      { id: 'sessionContinuity', signalKey: 'SESSION_CONTINUITY' },
      { id: 'csrfBoundary', signalKey: 'CSRF_BOUNDARY_HEALTH' },
    ],
    thresholds: {
      limitingRatio: 0.65,
      excessRatio: 1.45,
      deviation: 0.18,
    },
  },

  {
    id: 'BYTECODE_INTEGRITY_COMPLEX',
    expected: {
      decodability: 2,
      checksum: 2,
      schema: 2,
      provenance: 1,
    },
    weights: {
      decodability: 1.5,
      checksum: 1.4,
      schema: 1.4,
      provenance: 1.0,
    },
    subunits: [
      { id: 'decodability', signalKey: 'BYTECODE_DECODABLE' },
      { id: 'checksum', signalKey: 'BYTECODE_CHECKSUM_VALID' },
      { id: 'schema', signalKey: 'BYTECODE_SCHEMA_VALID' },
      { id: 'provenance', signalKey: 'BYTECODE_PROVENANCE_VALID' },
    ],
    thresholds: {
      limitingRatio: 0.65,
      excessRatio: 1.45,
      deviation: 0.18,
    },
  },

  {
    id: 'UI_STATE_COHERENCE_COMPLEX',
    expected: {
      routeState: 1,
      viewState: 1,
      cursorState: 1,
      overlayState: 1,
    },
    weights: {
      routeState: 1.0,
      viewState: 1.0,
      cursorState: 1.2,
      overlayState: 1.1,
    },
    subunits: [
      { id: 'routeState', signalKey: 'ROUTE_STATE_HEALTH' },
      { id: 'viewState', signalKey: 'VIEW_STATE_HEALTH' },
      { id: 'cursorState', signalKey: 'CURSOR_STATE_HEALTH' },
      { id: 'overlayState', signalKey: 'OVERLAY_STATE_HEALTH' },
    ],
    thresholds: {
      limitingRatio: 0.65,
      excessRatio: 1.45,
      deviation: 0.18,
    },
  },
]);
