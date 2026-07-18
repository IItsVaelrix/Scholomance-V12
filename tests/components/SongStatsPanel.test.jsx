// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SongStatsPanel from '../../src/components/SongStatsPanel';

const estimatedStats = {
  wordCount: 48,
  pillars: {
    rhymeDensity: {
      id: 'rhyme_density',
      value: 1.42,
      unit: 'rd_c',
      secondary: { malmiDensity: 0.71 },
      normalized01: 0.71,
      fidelity: 'exact',
      confidence01: 0.96,
      coverage01: 0.96,
      diagnostics: [],
    },
    uniqueVocabulary: {
      id: 'unique_vocabulary',
      value: 54.17,
      unit: '/100w',
      normalized01: 0.9,
      fidelity: 'exact',
      confidence01: 1,
      coverage01: 1,
      diagnostics: [],
    },
    flowAlignment: {
      id: 'flow_alignment',
      value: 3.28,
      unit: 'sps',
      secondary: { stressDisplacementProxy: 0.34 },
      normalized01: 0.33,
      fidelity: 'estimated',
      confidence01: 0.7,
      coverage01: 0.94,
      diagnostics: [],
    },
  },
  composite: {
    label: 'technical_density',
    total0to100: 68.4,
    band: 'Adept',
    provisional: true,
    weights: {
      rhymeDensity: 0.4,
      uniqueVocabulary: 0.35,
      flowAlignment: 0.25,
    },
  },
  meta: {
    engineVersion: 'song-stats-v1',
    calibrationVersion: 'cal-2026-07-18',
    sourceFingerprint: 'sha256:test',
    rhymeWindow: 24,
    fidelitySummary: 'estimated',
    assumptions: {
      estimatedBpm: 90,
      beatsPerLine: 4,
      lineRepresentsBar: true,
    },
  },
};

afterEach(cleanup);

describe('SongStatsPanel', () => {
  it('renders the CODEx song-stat pillars without legacy heuristics', () => {
    render(<SongStatsPanel stats={estimatedStats} visible />);

    expect(screen.getByText('Technical Density')).toBeTruthy();
    expect(screen.getByText(/68\.4 · Adept/)).toBeTruthy();
    expect(screen.getByText('Provisional')).toHaveAttribute(
      'title',
      expect.stringMatching(/not artistic quality/i),
    );
    expect(screen.getByText('CODEx Rhyme Density')).toBeTruthy();
    expect(screen.getByText(/RD_C 1\.42/)).toBeTruthy();
    expect(screen.getByText(/Malmi baseline 0\.71/)).toBeTruthy();
    expect(screen.getByText('CODEx Lexical Diversity')).toBeTruthy();
    expect(screen.getByText(/54\.17 per 100 words/)).toBeTruthy();
    expect(screen.getByText('Flow')).toBeTruthy();
    expect(screen.getByText(/SPS 3\.28/)).toBeTruthy();
    expect(screen.getByText(/Syncopation proxy 0\.34/)).toBeTruthy();
    expect(screen.getByText('Estimated')).toBeTruthy();
    expect(screen.getByText(/48 words/)).toBeTruthy();
    expect(screen.getByText(/window 24/)).toBeTruthy();
    expect(screen.getByText(/weights 40\/35\/25/)).toBeTruthy();
    expect(screen.getByText(/song-stats-v1/)).toBeTruthy();
    expect(screen.getByText(/cal-2026-07-18/)).toBeTruthy();

    expect(screen.queryByText('Phoneme Density')).toBeNull();
    expect(screen.queryByText('Alliteration')).toBeNull();
    expect(screen.queryByText('Rhyme Quality')).toBeNull();
  });

  it('renders aligned syncopation and invokes close', () => {
    const onClose = vi.fn();
    const alignedStats = {
      ...estimatedStats,
      pillars: {
        ...estimatedStats.pillars,
        flowAlignment: {
          ...estimatedStats.pillars.flowAlignment,
          fidelity: 'aligned',
          secondary: { syncopationIndex: 0.22 },
        },
      },
      composite: { ...estimatedStats.composite, provisional: false },
      meta: { ...estimatedStats.meta, fidelitySummary: 'aligned' },
    };

    render(<SongStatsPanel stats={alignedStats} visible onClose={onClose} />);

    expect(screen.getByText(/Syncopation 0\.22/)).toBeTruthy();
    expect(screen.getByText('Aligned')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Close song statistics' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('stays unmounted when hidden', () => {
    const { container } = render(<SongStatsPanel stats={estimatedStats} visible={false} />);
    expect(container).toBeEmptyDOMElement();
  });
});
