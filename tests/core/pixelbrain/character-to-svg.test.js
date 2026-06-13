import { describe, it, expect } from 'vitest';
import { characterToSVG } from '../../../codex/core/pixelbrain/character-to-svg.js';

// Minimal character fills — matches applyCharacterFills() output shape.
// A 3-cell "body" region: two interior cells + one outline cell.
const MOCK_FILLS = {
  coordinates: [
    { x: 1, y: 1, partId: 'body', color: '#aaaaaa', isOutline: false },
    { x: 1, y: 2, partId: 'body', color: '#aaaaaa', isOutline: false },
    { x: 1, y: 3, partId: 'body', color: '#1a1a20', isOutline: true  },
  ],
  palette: ['#1a1a20', '#aaaaaa'],
  partColors: { body: '#aaaaaa' },
  diagnostics: { totalCells: 3, uniqueColors: 2, rimCells: 1 },
};

const MOCK_SPEC = {
  contract: 'CHARACTER-SPEC-v1',
  canvas: { width: 4, height: 6 },
  combatProfile: { school: 'VOID' },
};

describe('characterToSVG', () => {
  it('returns a non-empty string starting with <svg', () => {
    const svg = characterToSVG(MOCK_FILLS, MOCK_SPEC, {});
    expect(typeof svg).toBe('string');
    expect(svg.trimStart()).toMatch(/^<svg/);
  });

  it('viewBox matches canvas dimensions × scale', () => {
    const svg = characterToSVG(MOCK_FILLS, MOCK_SPEC, { scale: 1 });
    expect(svg).toContain('viewBox="0 0 4 6"');
  });

  it('width and height attributes match canvas × scale', () => {
    const svg = characterToSVG(MOCK_FILLS, MOCK_SPEC, { scale: 4 });
    expect(svg).toContain('width="16"');
    expect(svg).toContain('height="24"');
  });

  it('root element has pb-character class', () => {
    const svg = characterToSVG(MOCK_FILLS, MOCK_SPEC, {});
    expect(svg).toContain('pb-character');
  });

  it('root element has school class from combatProfile.school', () => {
    const svg = characterToSVG(MOCK_FILLS, MOCK_SPEC, {});
    expect(svg).toContain('school-void');
  });

  it('contains a fill path for the body part', () => {
    const svg = characterToSVG(MOCK_FILLS, MOCK_SPEC, {});
    expect(svg).toContain('pb-part-body');
  });

  it('contains an outline path with stroke attribute', () => {
    const svg = characterToSVG(MOCK_FILLS, MOCK_SPEC, {});
    expect(svg).toContain('pb-outline');
    expect(svg).toContain('stroke=');
  });

  it('twoTone=false omits the pb-shading group', () => {
    const svg = characterToSVG(MOCK_FILLS, MOCK_SPEC, { twoTone: false });
    expect(svg).not.toContain('pb-shading');
  });

  it('is deterministic — same input → same output 50 times', () => {
    const first = characterToSVG(MOCK_FILLS, MOCK_SPEC, {});
    for (let i = 0; i < 49; i++) {
      expect(characterToSVG(MOCK_FILLS, MOCK_SPEC, {})).toBe(first);
    }
  });

  it('handles missing canvas on spec — defaults to 32×48 viewBox at scale 1', () => {
    const specNoCanvas = { contract: 'CHARACTER-SPEC-v1', combatProfile: { school: 'SONIC' } };
    const svg = characterToSVG(MOCK_FILLS, specNoCanvas, { scale: 1 });
    expect(svg).toContain('viewBox="0 0 32 48"');
  });

  it('handles empty coordinates without throwing', () => {
    const emptyFills = { ...MOCK_FILLS, coordinates: [] };
    expect(() => characterToSVG(emptyFills, MOCK_SPEC, {})).not.toThrow();
  });
});
