// @vitest-environment jsdom
/**
 * Pillar 4 — Oracle UI Fail-Safe gauntlet
 * Bytecode: SCHOL-ENC-BYKE-IDE-STASIS-PROMOTION
 *
 * Proves useWordLookup NEVER throws for an Oracle/network failure and always
 * resolves to a stable, structured { ok, status, error{category,code,severity} }
 * payload the UI can render without unmounting the IDE frame.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWordLookup } from '../../src/hooks/useWordLookup.jsx';

const originalFetch = global.fetch;

function mockResponse({ status = 200, ok = status < 400, body = null }) {
  return {
    status,
    ok,
    json: async () => body,
  };
}

afterEach(() => {
  global.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe('Pillar 4 — Oracle UI fail-safe (useWordLookup)', () => {
  beforeEach(() => {
    // jsdom does not implement fetch — install a controllable mock.
    global.fetch = vi.fn();
  });

  it('never throws on a network failure — resolves to a structured disconnected state', async () => {
    global.fetch.mockRejectedValue(new TypeError('Failed to fetch'));
    const { result } = renderHook(() => useWordLookup());

    let returned;
    await act(async () => {
      // The promise must RESOLVE (not reject) even though the Oracle is down.
      returned = await result.current.lookup('arcana');
    });

    expect(returned).toBeNull();
    expect(result.current.ok).toBe(false);
    expect(result.current.status).toBe('disconnected');
    expect(result.current.error).toMatchObject({
      category: 'NETWORK',
      code: 'ORACLE_DISCONNECTED',
      severity: 'WARN',
    });
    expect(typeof result.current.error.message).toBe('string');
  });

  it('maps a 404 to a non-crashing not_found state', async () => {
    global.fetch.mockResolvedValue(mockResponse({ status: 404 }));
    const { result } = renderHook(() => useWordLookup());

    await act(async () => {
      await result.current.lookup('zzznotaword');
    });

    expect(result.current.status).toBe('not_found');
    expect(result.current.error.code).toBe('WORD_NOT_FOUND');
    expect(result.current.ok).toBe(false);
  });

  it('maps a 503 initializing response to a warming state (Pillar 1 gated route)', async () => {
    global.fetch.mockResolvedValue(mockResponse({ status: 503, body: { status: 'initializing' } }));
    const { result } = renderHook(() => useWordLookup());

    await act(async () => {
      await result.current.lookup('arcana');
    });

    expect(result.current.status).toBe('initializing');
    expect(result.current.error.code).toBe('ORACLE_WARMING');
  });

  it('resolves a successful lookup to a ready state with data', async () => {
    global.fetch.mockResolvedValue(
      mockResponse({ status: 200, body: { data: { word: 'arcana' }, source: 'server' } }),
    );
    const { result } = renderHook(() => useWordLookup());

    let returned;
    await act(async () => {
      returned = await result.current.lookup('arcana');
    });

    expect(returned).toEqual({ word: 'arcana' });
    expect(result.current.ok).toBe(true);
    expect(result.current.status).toBe('ready');
    expect(result.current.error).toBeNull();
  });

  it('retry re-runs the last word and recovers once the Oracle returns', async () => {
    global.fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const { result } = renderHook(() => useWordLookup());

    await act(async () => {
      await result.current.lookup('arcana');
    });
    expect(result.current.status).toBe('disconnected');

    global.fetch.mockResolvedValue(
      mockResponse({ status: 200, body: { data: { word: 'arcana' }, source: 'server' } }),
    );
    await act(async () => {
      await result.current.retry();
    });

    expect(result.current.status).toBe('ready');
    expect(result.current.ok).toBe(true);
  });
});
