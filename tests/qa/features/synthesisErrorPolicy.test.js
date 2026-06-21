/**
 * Regression guard — a 429 (or any HTTP rejection) must NOT clear a populated
 * resonance gate. Pins the policy that drives useVerseSynthesis' catch path so
 * "nothing colors" cannot regress under rate-limit pressure (SCD64
 * GATE_DATA_ABSENT 03030742...).
 */
import { describe, it, expect } from 'vitest';
import {
  isHttpError,
  isRateLimitError,
  artifactHasConnections,
  shouldPreserveArtifactOnError,
} from '../../../src/lib/truesight/synthesisErrorPolicy.js';

const httpError = (status) => Object.assign(new Error(`Scholomance API error: ${status}`), { status });
const networkError = () => new Error('Failed to fetch');
const timeoutError = () => new Error('Dictionary Oracle timed out');

const populatedArtifact = {
  syntaxLayer: { allConnections: [{ score: 1, wordA: { charStart: 0 }, wordB: { charStart: 4 } }] },
};
const emptyArtifact = { syntaxLayer: { allConnections: [] } };
const fallbackArtifact = { syntaxLayer: { enabled: true, tokens: [{}] } }; // no allConnections

describe('synthesisErrorPolicy', () => {
  it('classifies HTTP vs network errors by status presence', () => {
    expect(isHttpError(httpError(429))).toBe(true);
    expect(isHttpError(httpError(500))).toBe(true);
    expect(isHttpError(networkError())).toBe(false);
    expect(isHttpError(timeoutError())).toBe(false);
    expect(isHttpError(null)).toBe(false);
  });

  it('identifies the 429 rate-limit specifically', () => {
    expect(isRateLimitError(httpError(429))).toBe(true);
    expect(isRateLimitError(httpError(503))).toBe(false);
    expect(isRateLimitError(networkError())).toBe(false);
  });

  it('detects whether an artifact carries gate connections', () => {
    expect(artifactHasConnections(populatedArtifact)).toBe(true);
    expect(artifactHasConnections(emptyArtifact)).toBe(false);
    expect(artifactHasConnections(fallbackArtifact)).toBe(false);
    expect(artifactHasConnections(null)).toBe(false);
  });

  it('PRESERVES a populated gate on a 429 (the core fix)', () => {
    expect(shouldPreserveArtifactOnError(httpError(429), populatedArtifact)).toBe(true);
  });

  it('preserves on any HTTP rejection when a good artifact exists', () => {
    expect(shouldPreserveArtifactOnError(httpError(503), populatedArtifact)).toBe(true);
  });

  it('does NOT preserve on a network error (genuine offline -> local fallback + signal)', () => {
    expect(shouldPreserveArtifactOnError(networkError(), populatedArtifact)).toBe(false);
    expect(shouldPreserveArtifactOnError(timeoutError(), populatedArtifact)).toBe(false);
  });

  it('does NOT preserve when there is no prior populated artifact (nothing to keep)', () => {
    expect(shouldPreserveArtifactOnError(httpError(429), null)).toBe(false);
    expect(shouldPreserveArtifactOnError(httpError(429), emptyArtifact)).toBe(false);
    expect(shouldPreserveArtifactOnError(httpError(429), fallbackArtifact)).toBe(false);
  });
});
