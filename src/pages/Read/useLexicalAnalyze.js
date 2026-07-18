import { useCallback, useRef, useState } from 'react';

export function useLexicalAnalyze() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  const submit = useCallback(async (query) => {
    const q = String(query || '').trim();
    if (!q) return;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/lexical/analyze', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query: q }),
        signal: ac.signal,
      });
      if (!res.ok) throw new Error(`Analyze failed (${res.status})`);
      setResult(await res.json());
    } catch (e) {
      if (e.name !== 'AbortError') setError(e.message || 'Analyze failed');
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => { abortRef.current?.abort(); setResult(null); setError(null); }, []);
  return { result, loading, error, submit, clear };
}
