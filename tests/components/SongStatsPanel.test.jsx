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
      secondary: {
        uniqueLemmaCount: 26,
        surfaceTypeCount: 28,
        tokenCount: 48,
      },
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
    expect(screen.getByText('Provisional')).toBeTruthy();
    expect(screen.getByRole('tooltip')).toHaveTextContent(
      'Measures technical concentration, not artistic quality, emotional impact, or song effectiveness.',
    );
    expect(screen.getByText('CODEx Rhyme Density')).toBeTruthy();
    expect(screen.getByText(/RD_C 1\.42/)).toBeTruthy();
    expect(screen.getByText(/Malmi baseline 0\.71/)).toBeTruthy();
    expect(screen.getByText('CODEx Lexical Diversity')).toBeTruthy();
    expect(screen.getByText(/54\.17 per 100 words/)).toBeTruthy();
    expect(screen.getByText(/26 lemmas · 28 types · 48 tokens/)).toBeTruthy();
    expect(screen.getByText('Flow')).toBeTruthy();
    expect(screen.getByText(/SPS 3\.28/)).toBeTruthy();
    expect(screen.getByText(/Syncopation proxy 0\.34/)).toBeTruthy();
    expect(screen.getByText('Estimated')).toBeTruthy();
    expect(screen.getByText(/48 words/)).toBeTruthy();
    expect(screen.getByText(/window 24/)).toBeTruthy();
    expect(screen.getByText(/weights 40\/35\/25/)).toBeTruthy();
    expect(screen.getByText(/song-stats-v1/)).toBeTruthy();
    expect(screen.getByText(/cal-2026-07-18/)).toBeTruthy();
    expect(screen.getByLabelText('CODEx Song Stats')).toBeTruthy();

    expect(screen.queryByText('Phoneme Density')).toBeNull();
    expect(screen.queryByText('Alliteration')).toBeNull();
    expect(screen.queryByText('Rhyme Quality')).toBeNull();
  });

  it('renders em dashes for N<8 empty pillars and shows the top diagnostic', () => {
    const shortStats = {
      ...estimatedStats,
      wordCount: 3,
      pillars: {
        rhymeDensity: {
          ...estimatedStats.pillars.rhymeDensity,
          value: 0,
          secondary: { malmiDensity: 0 },
          diagnostics: [{
            code: 'need_more_lyrics',
            message: 'At least 8 words are required for song stats.',
            severity: 'warning',
          }],
        },
        uniqueVocabulary: {
          ...estimatedStats.pillars.uniqueVocabulary,
          value: 0,
          secondary: { uniqueLemmaCount: 0, surfaceTypeCount: 0, tokenCount: 0 },
        },
        flowAlignment: {
          ...estimatedStats.pillars.flowAlignment,
          value: 0,
          secondary: { stressDisplacementProxy: 0 },
          diagnostics: [{
            code: 'estimated_one_bar_per_line',
            message: 'Estimated flow assumes one bar for each nonempty lyric source line.',
            severity: 'info',
          }],
        },
      },
      composite: {
        ...estimatedStats.composite,
        total0to100: null,
        band: null,
      },
    };

    render(<SongStatsPanel stats={shortStats} visible />);

    expect(screen.getByText('RD_C —')).toBeTruthy();
    expect(screen.getByText(/— per 100 words/)).toBeTruthy();
    expect(screen.getByText('SPS —')).toBeTruthy();
    expect(screen.queryByText(/RD_C 0\.00/)).toBeNull();
    expect(screen.getByText('need_more_lyrics')).toBeTruthy();
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

    expect(screen.getByText(/Syncopation index 0\.22/)).toBeTruthy();
    expect(screen.getByText('Aligned')).toBeTruthy();
    const explanation = screen.getByRole('button', { name: 'About Technical Density' });
    const tooltip = screen.getByRole('tooltip');
    expect(explanation).toHaveAttribute('aria-describedby', tooltip.id);
    explanation.focus();
    expect(explanation).toHaveFocus();
    expect(tooltip).toHaveTextContent(
      'Measures technical concentration, not artistic quality, emotional impact, or song effectiveness.',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Close song statistics' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('renders unavailable Technical Density as an em dash', () => {
    const unavailableStats = {
      ...estimatedStats,
      composite: {
        ...estimatedStats.composite,
        total0to100: null,
        band: null,
      },
    };

    render(<SongStatsPanel stats={unavailableStats} visible />);

    expect(screen.getByText('— · Unscored')).toBeTruthy();
    expect(screen.queryByText(/0\.0 · Unscored/)).toBeNull();
  });

  it('stays unmounted when hidden', () => {
    const { container } = render(<SongStatsPanel stats={estimatedStats} visible={false} />);
    expect(container).toBeEmptyDOMElement();
  });
});
