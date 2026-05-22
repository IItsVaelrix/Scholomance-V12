/**
 * useGrimDesign — React hook for the in-IDE GrimDesign panel.
 *
 * Debounces the intent string (400ms), calls POST /api/grimdesign/analyze,
 * and returns { signal, decisions, isLoading, error }.
 *
 * UI hook — Claude owns this. No game logic here.
 */

import { useState, useEffect, useRef } from 'react';

const DEBOUNCE_MS = 400;
const ANALYZE_URL = '/api/grimdesign/analyze';

/**
 * @param {string} intentString
 * @returns {{
 *   signal: import('../../codex/core/grimdesign/signalExtractor').GrimSignal | null,
 *   decisions: import('../../codex/core/grimdesign/decisionEngine').GrimDesignDecisions | null,
 *   isLoading: boolean,
 *   error: string | null,
 * }}
 */
export function useGrimDesign(intentString) {
  const [signal, setSignal]       = useState(null);
  const [decisions, setDecisions] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState(null);

  const debounceRef  = useRef(null);
  const abortRef     = useRef(null);

  useEffect(() => {
    const intent = typeof intentString === 'string' ? intentString.trim() : '';

    // Clear results immediately when intent is empty.
    if (!intent) {
      clearTimeout(debounceRef.current);
      abortRef.current?.abort();
      setSignal(null);
      setDecisions(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch(ANALYZE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ intent }),
          signal: controller.signal,
          credentials: 'same-origin',
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || `HTTP ${res.status}`);
        }

        const data = await res.json();
        setSignal(data.signal ?? null);
        setDecisions(data.decisions ?? null);
        setError(null);
      } catch (err) {
        if (err.name === 'AbortError') return; // superseded request — ignore
        setSignal(null);
        setDecisions(null);
        setError(err.message || 'Analysis failed');
      } finally {
        setIsLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(debounceRef.current);
    };
  }, [intentString]);

  // Cleanup abort controller on unmount.
  useEffect(() => {
    return () => {
      clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, []);

  return { signal, decisions, isLoading, error };
}
