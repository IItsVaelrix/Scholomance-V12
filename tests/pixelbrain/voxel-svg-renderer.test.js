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
    const fillTop = svgTop.match(/<polygon[^>]*fill="(#[0-9a-fA-F]+)"/)?.[1];
    const fillLeft = svgLeft.match(/<polygon[^>]*fill="(#[0-9a-fA-F]+)"/)?.[1];
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

  it('darkens faces when ambient occlusion metadata is enabled', () => {
    const face = { ...makeFace('top', 0, 0, 0, 2), ao: 1 };
    const svg = renderFacesToSVG([face], { ambientOcclusion: true, ambientOcclusionStrength: 0.5 });
    const fill = svg.match(/<polygon[^>]*fill="(#[0-9a-fA-F]+)"/)?.[1];
    expect(fill).toBe('#4e5258');
  });

  it('brightens faces when lighting metadata is enabled', () => {
    const face = { ...makeFace('right', 0, 0, 0, 4), light: 1 };
    const svg = renderFacesToSVG([face], { lighting: true, lightingStrength: 0.25 });
    const fill = svg.match(/<polygon[^>]*fill="(#[0-9a-fA-F]+)"/)?.[1];
    expect(fill).toBe('#46ecff');
  });

  it('adds geometric precision and edge blending when anti-aliasing is enabled', () => {
    const svg = renderFacesToSVG([makeFace('top', 0, 0, 0, 2)], { antialias: true });
    expect(svg).toContain('shape-rendering: geometricPrecision');
    expect(svg).toContain('stroke-linejoin="round"');
  });

  it('emits no gradient defs when lightPoints is empty', () => {
    const svg = renderFacesToSVG([makeFace('top', 0, 0, 0, 2)], { lightPoints: [] });
    expect(svg).not.toContain('<defs>');
    expect(svg).not.toContain('radialGradient');
  });

  it('emits radialGradient defs and screen-blend overlay when lightPoints provided', () => {
    const face = makeFace('top', 0, 0, 0, 2);
    const svg = renderFacesToSVG([face], {
      lightPoints: [{ sx: 0, sy: 0, r: 100, energy: 1.0, schoolId: 'VOID' }],
    });
    expect(svg).toContain('<defs>');
    expect(svg).toContain('radialGradient');
    expect(svg).toContain('mix-blend-mode: screen');
  });

  it('emits one gradient def per light point', () => {
    const face = makeFace('top', 0, 0, 0, 2);
    const svg = renderFacesToSVG([face], {
      lightPoints: [
        { sx: 0, sy: 0, r: 80, energy: 1.0, schoolId: 'VOID' },
        { sx: 50, sy: 30, r: 80, energy: 0.8, schoolId: 'ALCHEMY' },
      ],
    });
    const count = (svg.match(/radialGradient/g) || []).length;
    expect(count).toBeGreaterThanOrEqual(2);
  });

  it('uses school light color in the gradient stop', () => {
    const face = makeFace('top', 0, 0, 0, 2);
    const svg = renderFacesToSVG([face], {
      lightPoints: [{ sx: 0, sy: 0, r: 100, energy: 1.0, schoolId: 'PSYCHIC' }],
    });
    expect(svg).toContain('#22d3ee');
  });
});
