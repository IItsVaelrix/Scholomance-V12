import { useState, useEffect, useRef } from 'react';
import { getAmbientPlayerService } from '../lib/ambient/ambientPlayer.service.js';

/**
 * useSonicAnalysis — Centralized real-time audio detection.
 * Consumes the authoritative analysis from AmbientPlayerService.
 */
export function useSonicAnalysis(isPlaying: boolean) {
  const [detectedSchoolId, setDetectedSchoolId] = useState<string | null>(null);
  const rafIdRef = useRef<number>();

  useEffect(() => {
    if (!isPlaying) {
      setDetectedSchoolId(null);
      return;
    }

    const service = getAmbientPlayerService();
    let cancelled = false;

    const analyze = async () => {
      if (cancelled) return;
      //authoritative detection from service (locked fingerprint)
      const id = await service.getDetectedSchoolId();
      if (cancelled) return;
      setDetectedSchoolId((previousId) => {
        // Hold the last valid detected school instead of resetting to null on every quiet frame
        if (id) {
          return previousId === id ? previousId : id;
        }
        return previousId;
      });

      if (!cancelled) {
        rafIdRef.current = requestAnimationFrame(analyze);
      }
    };

    analyze();
    return () => {
      cancelled = true;
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [isPlaying]);

  return { detectedSchoolId };
}
