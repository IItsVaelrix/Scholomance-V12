/**
 * synthesisErrorPolicy — how useVerseSynthesis should react when a server
 * analysis request fails.
 *
 * The failure that motivated this: under live editing the app issues many API
 * calls (spellcheck/predictor every few ms + panel analysis). The Scholomance
 * API rate-limits with HTTP 429. A 429 is NOT a network error
 * (`isNetworkError` is false for it — the server is reachable, it just refused),
 * so there is no offline cooldown; `analyzePanels` simply throws. The old catch
 * path replaced the populated analysis with the connection-less local
 * `synthesizeVerse` artifact, which empties the resonance gate and greys every
 * word ("nothing colors"). See SCD64 GATE_DATA_ABSENT (03030742...).
 *
 * Policy: a transient HTTP rejection (429 and friends) must NOT clear a
 * previously good, connection-bearing artifact. Keep the last good analysis so
 * colours persist through the blip; a bounded retry refreshes it. Only genuine
 * unavailability (network error, or no prior good artifact) falls back to local
 * synthesis + the "resonance offline" signal.
 *
 * Pure functions — no React, no DOM, no module state.
 */

/**
 * An HTTP-level rejection: the server answered with a non-2xx status (carried
 * on `error.status` by ScholomanceHttpError). Distinct from network errors
 * (connection refused, DNS, timeout/abort) which have no status.
 * @param {*} error
 * @returns {boolean}
 */
export function isHttpError(error) {
  return Number.isFinite(Number(error?.status));
}

/**
 * The specific rate-limit rejection.
 * @param {*} error
 * @returns {boolean}
 */
export function isRateLimitError(error) {
  return Number(error?.status) === 429;
}

/**
 * Does an artifact carry resonance connections (the gate's input)?
 * @param {*} artifact
 * @returns {boolean}
 */
export function artifactHasConnections(artifact) {
  const conns = artifact?.syntaxLayer?.allConnections;
  return Array.isArray(conns) && conns.length > 0;
}

/**
 * Decide whether to preserve the previous artifact instead of replacing it
 * with the connection-less local fallback.
 *
 * True only when the error is an HTTP rejection (server reachable, transient —
 * e.g. 429) AND we already hold a populated analysis worth keeping. A network
 * error, or the absence of a prior good artifact, returns false so the caller
 * degrades to local synthesis (and shows the offline signal).
 *
 * @param {*} error - The thrown synthesis error.
 * @param {*} prevArtifact - The last committed artifact (may be null).
 * @returns {boolean}
 */
export function shouldPreserveArtifactOnError(error, prevArtifact) {
  return isHttpError(error) && artifactHasConnections(prevArtifact);
}
