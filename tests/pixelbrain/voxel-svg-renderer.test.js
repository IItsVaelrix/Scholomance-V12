import { describe, it, expect } from 'vitest';
import { renderFacesToSVG } from '../../codex/core/pixelbrain/voxel-svg-renderer.js';

function makeFace(type, x, y, z, materialId, tileSize = 16) {
  const hw = tileSize;
  const hh = tileSize / 2;
  const sx = (x - z) * tileSize;
  const sy = (x + z) * hh - y * tileSize;
  return { type, x, y, z, materialId, sx, sy, sortKey: 0, energy: 0.5, energyType: 0 };
}

describe('renderFacesToSVG', () => {
  it('returns a valid SVG string', () => {
    const faces = [makeFace('top', 0, 0, 0, 2)];
    const svg = renderFacesToSVG(faces);
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
  });

  it('returns empty-body SVG for empty face array', () => {
    const svg = renderFacesToSVG([]);
    expect(svg).toContain('<svg');
    expect(svg).not.toContain('<polygon');
  });

  it('generates a polygon for each non-void face', () => {
    const faces = [
      makeFace('top', 0, 0, 0, 2),
      makeFace('left', 0, 0, 0, 2),
      makeFace('right', 0, 0, 0, 2),
    ];
    const svg = renderFacesToSVG(faces);
    const count = (svg.match(/<polygon/g) || []).length;
    expect(count).toBe(3);  // +1 for background rect is <rect> not <polygon>
  });

  it('skips void materialId (0) — no polygon rendered', () => {
    const faces = [makeFace('top', 0, 0, 0, 0)]; // materialId 0 = void
    const svg = renderFacesToSVG(faces);
    expect(svg).not.toContain('<polygon');
  });

  it('each polygon has a fill attribute', () => {
    const faces = [makeFace('top', 2, 0, 2, 3)];
    const svg = renderFacesToSVG(faces);
    expect(svg).toContain('fill="');
  });

  it('top face is lighter than left face (lighter tones on top)', () => {
    const top = makeFace('top', 0, 0, 0, 2);
    const left = makeFace('left', 0, 0, 0, 2);
    const svgTop = renderFacesToSVG([top]);
    const svgLeft = renderFacesToSVG([left]);
    const fillTop = svgTop.match(/fill="(#[0-9a-fA-F]+)"/)?.[1];
    const fillLeft = svgLeft.match(/fill="(#[0-9a-fA-F]+)"/)?.[1];
    expect(fillTop).toBeDefined();
    expect(fillLeft).toBeDefined();
    // Parse brightness: top should be numerically brighter (higher hex value)
    const hexVal = (h) => parseInt(h.slice(1), 16);
    expect(hexVal(fillTop)).toBeGreaterThan(hexVal(fillLeft));
  });

  it('SVG includes a viewBox attribute', () => {
    const faces = [makeFace('top', 3, 0, 3, 2)];
    const svg = renderFacesToSVG(faces);
    expect(svg).toContain('viewBox=');
  });
});
