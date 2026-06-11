import { useEffect, useState } from 'react';
import { parseAlignment, type LyricAlignment } from '../utils/lyricAlignment';

export function useLyricAlignment(trackId: string): LyricAlignment | null {
  const [alignment, setAlignment] = useState<LyricAlignment | null>(null);

  useEffect(() => {
    let cancelled = false;
    setAlignment(null);
    const url = `${import.meta.env.BASE_URL}data/alignment/${trackId}.alignment-v1.json`;
    (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) {
          if (!cancelled) console.info(`[lyricAlignment] no artifact for ${trackId} (HTTP ${res.status}) — estimated sync`);
          return;
        }
        const parsed = parseAlignment(await res.json());
        if (!parsed || parsed.trackId !== trackId) {
          // The artifact exists but is unusable — louder than "missing", because
          // it means the pipeline shipped something the validator rejects.
          if (!cancelled) console.warn(`[lyricAlignment] artifact for ${trackId} rejected (schema or trackId mismatch) — estimated sync`);
          return;
        }
        if (!cancelled) setAlignment(parsed);
      } catch {
        if (!cancelled) console.info(`[lyricAlignment] artifact fetch failed for ${trackId} — estimated sync`);
      }
    })();
    return () => { cancelled = true; };
  }, [trackId]);

  return alignment;
}
