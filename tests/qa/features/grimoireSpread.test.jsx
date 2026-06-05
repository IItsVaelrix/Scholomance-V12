import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { GrimoireSpread } from '../../../src/pages/Grimoire/GrimoireSpread.tsx';
import { buildSigilModel, activeLyricIndex, polygonPoints, stopToCss } from '../../../src/pages/Grimoire/genomeGeometry.ts';

const sampleGenome = {
  genomeVersion: '1',
  seed: 123456,
  school: 'VOID',
  baseHue: 270,
  archetype: 'NEBULA',
  symmetry: 7,
  palette: [
    { h: 270, s: 80, l: 55 }, { h: 300, s: 70, l: 50 },
    { h: 200, s: 75, l: 60 }, { h: 45, s: 80, l: 60 },
  ],
  glyphs: ['✦', '◬', '⟁'],
  layerCount: 4,
  layers: [
    { kind: 'rings', density: 0.5, scale: 1, rotationDir: 1, phase: 0 },
    { kind: 'rays', density: 0.7, scale: 1.2, rotationDir: -1, phase: 30 },
    { kind: 'lattice', density: 0.4, scale: 0.8, rotationDir: 1, phase: 60 },
    { kind: 'petals', density: 0.6, scale: 1.1, rotationDir: 1, phase: 90 },
  ],
  motion: { baseBpm: 136, swing: 0.4, pulseGain: 0.7, driftHz: 0.06 },
  readouts: {
    engine: { name: 'GlyphCore', version: '1.0.0' },
    bytecodeSeed: '0xVEIL-136-Dm',
    semanticMap: ['Veil', 'Threshold', 'Memory'],
    coordinates: { x: -7.38, y: 13.61, z: -2.74 },
    ritualSync: { phase: 0.618, cycle: '4/7' },
  },
  checksum: 'deadbeef',
};

const sampleView = {
  artist: { handle: 'lumen-arcanum', displayName: 'Lumen Arcanum', primarySchool: 'VOID' },
  release: { id: 5, title: 'Umbrae Prophetica', coverUrl: null, publishedAt: '2025-05-03' },
  track: {
    id: 42, title: 'Echoes of the Veil', durationMs: 277000, bpm: 136,
    musicalKey: 'Dm', genre: 'Darkwave', streamUrl: 'https://x/echoes.mp3', fingerprintId: '7F3A9C1D',
  },
  leftPage: {
    lyrics: [
      { id: 1, lineIndex: 0, startMs: 0, endMs: 5000, text: 'We drift where the old stars bleed' },
      { id: 2, lineIndex: 4, startMs: 138000, endMs: 141000, text: 'Through the veil, the echoes call' },
    ],
    annotations: [
      { id: 7, startLine: 4, endLine: 4, title: 'Echoes Call', body: 'the threshold between known and forgotten' },
    ],
    provenance: {
      version: 1, origin: 'ai_assisted', model: 'suno-v3.5', promptLineage: null,
      humanEditRatio: 0.35, stemsAvailable: true, license: 'all_rights_reserved', verified: true,
    },
    tags: ['veil', 'threshold'],
  },
  rightPage: sampleGenome,
};

function renderSpread(view = sampleView) {
  return render(
    <MemoryRouter initialEntries={['/grimoire/42']}>
      <GrimoireSpread view={view} />
    </MemoryRouter>,
  );
}

describe('[UI] GrimoireSpread', () => {
  it('renders the left page: title, artist, metadata, lyrics, provenance', () => {
    renderSpread();
    expect(screen.getByText('Echoes of the Veil')).toBeInTheDocument();
    expect(screen.getByText('Lumen Arcanum')).toBeInTheDocument();
    expect(screen.getByText('Through the veil, the echoes call')).toBeInTheDocument();
    expect(screen.getByText(/Crafted with human intention and AI assistance/i)).toBeInTheDocument();
    expect(screen.getByText('✓ sealed')).toBeInTheDocument();
  });

  it('renders the right page readouts and the genome sigil', () => {
    const { container } = renderSpread();
    expect(screen.getByText('0xVEIL-136-Dm')).toBeInTheDocument();
    expect(screen.getByText('Veil')).toBeInTheDocument();
    const svg = container.querySelector('svg[data-genome-checksum="deadbeef"]');
    expect(svg).toBeTruthy();
    expect(svg.getAttribute('data-archetype')).toBe('NEBULA');
  });

  it('advances the karaoke highlight when the scrubber moves', () => {
    const { container } = renderSpread();
    // No line active at 0ms within [0,5000) → first line is active at 0.
    const scrub = container.querySelector('.t-scrub');
    fireEvent.change(scrub, { target: { value: '139000' } });
    const active = container.querySelector('.lyric-line.is-active .lyric-text');
    expect(active.textContent).toBe('Through the veil, the echoes call');
  });

  it('flags unsealed provenance when verification fails', () => {
    const tampered = { ...sampleView, leftPage: { ...sampleView.leftPage, provenance: { ...sampleView.leftPage.provenance, verified: false } } };
    renderSpread(tampered);
    expect(screen.getByText('⚠ unsealed')).toBeInTheDocument();
  });
});

describe('[UI] genome geometry (pure)', () => {
  it('buildSigilModel is deterministic and derives shape counts from the genome', () => {
    const a = buildSigilModel(sampleGenome, 600);
    const b = buildSigilModel(sampleGenome, 600);
    expect(a).toEqual(b);
    expect(a.rings).toHaveLength(sampleGenome.layers.length);
    expect(a.spokes).toHaveLength(sampleGenome.symmetry);
    expect(a.glyphMarks).toHaveLength(sampleGenome.glyphs.length);
  });

  it('stopToCss formats hsl with and without alpha', () => {
    expect(stopToCss({ h: 270, s: 80, l: 55 })).toBe('hsl(270 80% 55%)');
    expect(stopToCss({ h: 270, s: 80, l: 55 }, 0.5)).toBe('hsl(270 80% 55% / 0.5)');
  });

  it('polygonPoints emits the requested vertex count', () => {
    expect(polygonPoints(300, 300, 100, 3).split(' ')).toHaveLength(3);
    expect(polygonPoints(300, 300, 100, 6).split(' ')).toHaveLength(6);
  });

  it('activeLyricIndex resolves the line under the playhead', () => {
    const lyrics = [{ startMs: 0, endMs: 5000 }, { startMs: 138000, endMs: 141000 }];
    expect(activeLyricIndex(lyrics, 2000)).toBe(0);
    expect(activeLyricIndex(lyrics, 139000)).toBe(1);
    expect(activeLyricIndex(lyrics, 200000)).toBe(-1);
  });
});
