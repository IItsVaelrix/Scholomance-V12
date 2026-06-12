import { describe, expect, it } from 'vitest';
import {
  buildSquareSharpnessContrastPayload,
  enhanceSquaresForRender,
} from '../../../codex/core/pixelbrain/square-sharpness-contrast-amp.js';

describe('Square Sharpness Contrast AMP', () => {
  it('preserves source coordinates while enhancing output coordinates', () => {
    const coordinates = [
      { x: 1, y: 1, color: '#7DD3FC', emphasis: 0.5 },
      { x: 2, y: 1, color: '#F8FCFF', emphasis: 0.5 },
    ];

    const output = enhanceSquaresForRender(coordinates, { material: 'icy_fire' });

    expect(output).toHaveLength(2);
    expect(coordinates[0].color).toBe('#7DD3FC');
    expect(output[0]).toMatchObject({
      preSquareColor: '#7DD3FC',
      squareAmp: 'square-sharpness-contrast',
      squareAmpMaterial: 'icy_fire',
    });
  });

  it('darkens silhouette edges for icy fire without crushing white cores', () => {
    const coordinates = [
      { x: 1, y: 1, color: '#0EA5E9', emphasis: 0.5 },
      { x: 2, y: 1, color: '#F8FCFF', emphasis: 0.5 },
      { x: 2, y: 2, color: '#7DD3FC', emphasis: 0.5 },
    ];

    const output = enhanceSquaresForRender(coordinates, { material: 'icy_fire' });
    const edge = output.find((coord) => coord.x === 1 && coord.y === 1);
    const highlight = output.find((coord) => coord.color === '#F8FCFF' || coord.preSquareColor === '#F8FCFF');

    expect(edge.color).not.toBe('#0EA5E9');
    expect(edge.squareAmpClass).toContain('edge');
    expect(highlight.color).toBe('#F8FCFF');
    expect(highlight.emphasis).toBeGreaterThanOrEqual(0.86);
  });

  it('reduces isolated non-highlight sample emphasis', () => {
    const [isolated] = enhanceSquaresForRender([
      { x: 10, y: 10, color: '#5F6670', emphasis: 0.8 },
    ], { material: 'icy_fire' });

    expect(isolated.squareAmpClass).toContain('isolated');
    expect(isolated.squareAmpClass).not.toContain('isolated-accent');
    expect(isolated.emphasis).toBeLessThan(0.8);
  });

  it('preserves isolated high-intensity accents as glints instead of damping them', () => {
    const [blueGlint] = enhanceSquaresForRender([
      {
        x: 10,
        y: 10,
        color: '#005CFF',
        emphasis: 0.55,
        colorIntensity: {
          rating: 0.92,
          band: 'extreme',
          role: 'cold_chroma',
        },
      },
    ], { material: 'void_ice' });

    expect(blueGlint.squareAmpClass).toContain('isolated');
    expect(blueGlint.squareAmpClass).toContain('isolated-accent');
    expect(blueGlint.emphasis).toBeGreaterThan(0.8);
    expect(blueGlint.squareAmpIntensityRating).toBe(0.92);
  });

  it('uses fallback saturation/luminance to preserve intense accents before the intensity microprocessor exists', () => {
    const [whiteGlint] = enhanceSquaresForRender([
      { x: 4, y: 4, color: '#FFFFFF', emphasis: 0.45 },
    ], { material: 'source' });

    expect(whiteGlint.squareAmpClass).toContain('isolated-accent');
    expect(whiteGlint.emphasis).toBeGreaterThan(0.8);
    expect(whiteGlint.squareAmpIntensityRating).toBe(1);
  });

  it('builds a deterministic payload for preview/export consumers', () => {
    const coordinates = [
      { x: 1, y: 1, color: '#0EA5E9', emphasis: 0.5 },
      { x: 2, y: 1, color: '#F8FCFF', emphasis: 0.5 },
    ];

    const payloadA = buildSquareSharpnessContrastPayload({
      coordinates,
      material: 'icy_fire',
      canvas: { width: 32, height: 48 },
    });
    const payloadB = buildSquareSharpnessContrastPayload({
      coordinates,
      material: 'icy_fire',
      canvas: { width: 32, height: 48 },
    });

    expect(payloadA).toMatchObject({
      amp: 'square-sharpness-contrast',
      version: '0.2.0',
      material: 'icy_fire',
      diagnostics: { coordinateCount: 2 },
    });
    expect(payloadA.inputHash).toBe(payloadB.inputHash);
    expect(payloadA.outputCoordinates).toEqual(payloadB.outputCoordinates);
  });
});
