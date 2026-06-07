import { useState, useEffect, useCallback } from 'react';

export type FilterType = 'Bell' | 'LowShelf' | 'HighShelf' | 'LowPass' | 'HighPass' | 'BandPass' | 'Notch' | 'Tilt';
export type ChannelKind = 'Stereo' | 'Mid' | 'Side' | 'Left' | 'Right';

export interface EqBand {
  id: string;
  enabled: boolean;
  filterType: FilterType;
  channel: ChannelKind;
  freq: number;
  gain: number;
  q: number;
  school?: string;
}

const DEFAULT_BANDS: EqBand[] = Array.from({ length: 6 }).map((_, i) => ({
  id: `band-${i + 1}`,
  enabled: true,
  filterType: 'Bell',
  channel: 'Stereo',
  freq: 1000,
  gain: 0,
  q: 1.0,
}));

export function useEqBands() {
  const [bands, setBands] = useState<EqBand[]>(() => {
    try {
      const stored = localStorage.getItem('scholocandy-bands');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (err) {
      console.warn('Failed to load bands from localStorage', err);
    }
    return DEFAULT_BANDS;
  });

  useEffect(() => {
    try {
      localStorage.setItem('scholocandy-bands', JSON.stringify(bands));
    } catch (err) {
      console.warn('Failed to save bands to localStorage', err);
    }
  }, [bands]);

  const updateBand = useCallback((id: string, updates: Partial<EqBand>) => {
    setBands((prev) =>
      prev.map((band) => (band.id === id ? { ...band, ...updates } : band))
    );
  }, []);

  const resetBands = useCallback(() => {
    setBands(DEFAULT_BANDS);
  }, []);

  return { bands, setBands, updateBand, resetBands };
}
