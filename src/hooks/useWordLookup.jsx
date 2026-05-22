/**
 * useWordLookup Hook
 *
 * Pillar 4 (Oracle UI Fail-Safe): this hook NEVER throws for an Oracle/network
 * failure. Every outcome — success, not-found, denied, timeout, disconnect,
 * initializing — resolves to a stable, structured state the UI can render
 * without unmounting. Consumers read `status`, `ok`, and the structured
 * `error` ({ category, code, severity, message }).
 */

import { useState, useCallback, useRef } from 'react';
import { on, emit } from '../../codex/runtime/eventBus.js';
import { EVENTS } from '../../codex/runtime/wordLookupPipeline.js';
import { parseBooleanEnvFlag } from './useCODExPipeline.jsx';
import { buildAuthorityUrl } from '../lib/apiUrl.js';

const LOOKUP_TIMEOUT_MS = 10000;

const USE_SERVER_WORD_LOOKUP = parseBooleanEnvFlag(import.meta.env.VITE_USE_SERVER_WORD_LOOKUP, true);
const ENABLE_LOCAL_WORD_LOOKUP_FALLBACK = parseBooleanEnvFlag(
  import.meta.env.VITE_ENABLE_LOCAL_WORD_LOOKUP_FALLBACK,
  false,
);

/** Builds a structured, render-safe Oracle error payload. */
function makeOracleError(category, code, severity, message) {
  return { category, code, severity, message };
}

const ORACLE_ERRORS = {
  NOT_FOUND: makeOracleError('NOT_FOUND', 'WORD_NOT_FOUND', 'INFO', 'Word not found in the archive.'),
  DENIED: makeOracleError('AUTH', 'LEXICON_ACCESS_DENIED', 'WARN', 'Lexicon access denied.'),
  WARMING: makeOracleError('INITIALIZING', 'ORACLE_WARMING', 'INFO', 'The Oracle is warming. Try again shortly.'),
  TIMEOUT: makeOracleError('TIMEOUT', 'ORACLE_TIMEOUT', 'WARN', 'The Oracle did not answer in time.'),
  DISCONNECTED: makeOracleError('NETWORK', 'ORACLE_DISCONNECTED', 'WARN', 'The Lexicon Oracle is disconnected.'),
  FAULT: makeOracleError('UNKNOWN', 'ORACLE_FAULT', 'WARN', 'The Oracle connection faltered.'),
};

// Statuses that represent a transport failure worth a runtime fallback / retry.
const TRANSPORT_FAILURE_STATUSES = new Set(['disconnected', 'timeout', 'error']);

async function lookupWordFromServer(word) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS);

  const path = `/api/word-lookup/${encodeURIComponent(word)}`;
  let endpoint = buildAuthorityUrl(path);
  if (endpoint.startsWith('/') && typeof window !== 'undefined') {
    endpoint = `${window.location.origin}${endpoint}`;
  }

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      credentials: 'include',
      signal: controller.signal,
    });

    if (response.status === 404) {
      return { data: null, source: 'server', status: 'not_found', error: ORACLE_ERRORS.NOT_FOUND };
    }
    if (response.status === 401 || response.status === 403) {
      return { data: null, source: 'server', status: 'denied', error: ORACLE_ERRORS.DENIED };
    }
    if (response.status === 503) {
      // Pillar 1 gated route: the Oracle subsystem is still hydrating.
      let initializing = false;
      try {
        const body = await response.json();
        initializing = body?.status === 'initializing';
      } catch {
        initializing = false;
      }
      return initializing
        ? { data: null, source: 'server', status: 'initializing', error: ORACLE_ERRORS.WARMING }
        : { data: null, source: 'server', status: 'disconnected', error: ORACLE_ERRORS.DISCONNECTED };
    }
    if (!response.ok) {
      return {
        data: null,
        source: 'server',
        status: 'error',
        error: { ...ORACLE_ERRORS.FAULT, message: `The Oracle connection faltered (${response.status}).` },
      };
    }

    const payload = await response.json();
    const data = payload?.data ?? null;
    return {
      data,
      source: payload?.source ?? 'server',
      status: data ? 'ready' : 'not_found',
      error: data ? null : ORACLE_ERRORS.NOT_FOUND,
    };
  } catch (error) {
    if (error?.name === 'AbortError') {
      return { data: null, source: 'server', status: 'timeout', error: ORACLE_ERRORS.TIMEOUT };
    }
    if (error instanceof TypeError) {
      // fetch() rejects with a TypeError on a network-level failure.
      return { data: null, source: 'server', status: 'disconnected', error: ORACLE_ERRORS.DISCONNECTED };
    }
    return {
      data: null,
      source: 'server',
      status: 'error',
      error: { ...ORACLE_ERRORS.FAULT, message: error?.message || ORACLE_ERRORS.FAULT.message },
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

function lookupWordFromRuntime(word, requestId) {
  return new Promise((resolve) => {
    let isDone = false;
    let timeoutId = null;
    let unsubscribeResult = null;
    let unsubscribeError = null;

    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (unsubscribeResult) unsubscribeResult();
      if (unsubscribeError) unsubscribeError();
    };

    unsubscribeResult = on(EVENTS.RESPONSE, (payload) => {
      if (payload.requestId !== requestId || isDone) return;
      isDone = true;
      cleanup();
      const data = payload.data ?? null;
      resolve({
        data,
        source: payload.source ?? 'runtime',
        status: data ? 'ready' : 'not_found',
        error: data ? null : ORACLE_ERRORS.NOT_FOUND,
      });
    });

    unsubscribeError = on(`${EVENTS.RESPONSE}:error`, (payload) => {
      if (payload.requestId !== requestId || isDone) return;
      isDone = true;
      cleanup();
      resolve({
        data: null,
        source: 'runtime',
        status: 'error',
        error: { ...ORACLE_ERRORS.FAULT, message: payload.error || ORACLE_ERRORS.FAULT.message },
      });
    });

    timeoutId = setTimeout(() => {
      if (isDone) return;
      isDone = true;
      cleanup();
      resolve({ data: null, source: 'runtime', status: 'timeout', error: ORACLE_ERRORS.TIMEOUT });
    }, LOOKUP_TIMEOUT_MS);

    emit(EVENTS.REQUEST, {
      word,
      requestId,
      responseEvent: EVENTS.RESPONSE,
    });
  });
}

export function useWordLookup() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [source, setSource] = useState(null);
  const requestIdCounterRef = useRef(0);
  const activeRequestIdRef = useRef(null);
  const lastWordRef = useRef('');

  const lookup = useCallback(async (word) => {
    const trimmedWord = String(word || '').trim();
    if (!trimmedWord) {
      activeRequestIdRef.current = null;
      setIsLoading(false);
      setData(null);
      setSource(null);
      setStatus('idle');
      setError('Empty word');
      return null;
    }
    lastWordRef.current = trimmedWord;

    requestIdCounterRef.current += 1;
    const requestId = `lookup_${requestIdCounterRef.current}`;
    activeRequestIdRef.current = requestId;
    setIsLoading(true);
    setStatus('loading');
    setError(null);

    const applyStateIfCurrent = (result) => {
      if (activeRequestIdRef.current !== requestId) return;
      setIsLoading(false);
      setData(result.data ?? null);
      setSource(result.source ?? null);
      setStatus(result.status ?? 'idle');
      setError(result.error ?? null);
    };

    try {
      let result;
      if (USE_SERVER_WORD_LOOKUP) {
        result = await lookupWordFromServer(trimmedWord);
        // Only a transport failure justifies the local runtime fallback.
        if (TRANSPORT_FAILURE_STATUSES.has(result.status) && ENABLE_LOCAL_WORD_LOOKUP_FALLBACK) {
          const runtimeResult = await lookupWordFromRuntime(trimmedWord, requestId);
          if (runtimeResult.status === 'ready') {
            result = runtimeResult;
          }
        }
      } else {
        result = await lookupWordFromRuntime(trimmedWord, requestId);
      }

      applyStateIfCurrent(result);
      return result.data ?? null;
    } catch (unexpected) {
      // The hook must never throw — map any surprise into a stable state.
      applyStateIfCurrent({
        data: null,
        source: null,
        status: 'error',
        error: { ...ORACLE_ERRORS.FAULT, message: unexpected?.message || ORACLE_ERRORS.FAULT.message },
      });
      return null;
    }
  }, []);

  const retry = useCallback(() => {
    if (lastWordRef.current) {
      return lookup(lastWordRef.current);
    }
    return Promise.resolve(null);
  }, [lookup]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
    setStatus('idle');
    setSource(null);
    activeRequestIdRef.current = null;
    lastWordRef.current = '';
  }, []);

  return {
    lookup,
    retry,
    data,
    isLoading,
    status,
    ok: status === 'ready',
    error,
    source,
    clearError,
    reset,
  };
}

export default useWordLookup;
