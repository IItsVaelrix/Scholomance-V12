import { useCallback } from 'react';
import { EqBand } from './useEqBands';

export interface EqPresetV2 {
  id: string;
  name: string;
  version: "2.0";
  bands: Array<{
    enabled: boolean;
    filterType: EqBand['filterType'];
    channel: EqBand['channel'];
    freq: number;
    gain: number;
    q: number;
  }>;
}

export function useEqPreset(
  bands: EqBand[],
  setBands: (bands: EqBand[]) => void
) {
  const exportPreset = useCallback((name: string): string => {
    const preset: EqPresetV2 = {
      id: crypto.randomUUID(),
      name,
      version: "2.0",
      bands: bands.map(({ enabled, filterType, channel, freq, gain, q }) => ({
        enabled,
        filterType,
        channel,
        freq,
        gain,
        q,
      })),
    };
    return JSON.stringify(preset, null, 2);
  }, [bands]);

  const loadPreset = useCallback((jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString) as Partial<EqPresetV2>;
      if (parsed.version !== "2.0") {
        throw new Error("Unsupported preset version. Expected 2.0");
      }
      if (!Array.isArray(parsed.bands)) {
        throw new Error("Invalid preset format: bands array missing");
      }

      // Map parsed bands back to our internal state structure
      setBands(parsed.bands.map((b, i) => ({
        id: `band-${i + 1}`,
        enabled: b.enabled ?? true,
        filterType: b.filterType ?? 'Bell',
        channel: b.channel ?? 'Stereo',
        freq: b.freq ?? 1000,
        gain: b.gain ?? 0,
        q: b.q ?? 1.0,
      })));
      return true;
    } catch (err) {
      console.error("Failed to load preset:", err);
      return false;
    }
  }, [setBands]);

  return { exportPreset, loadPreset };
}
