import { describe, expect, it } from 'vitest';
import {
  buildChromaticTransmutationPayload,
  hexToRgb,
  luminanceFromRgb,
  transmutePaletteColor,
  transmutePixelBrainCoordinates,
  transmutePixelBrainPalette,
} from '../../src/pages/PixelBrain/amps/chromaticTransmutationAmp.js';

describe('Chromatic Transmutation AMP', () => {
  it('parses hex colors and computes deterministic luminance', () => {
    expect(hexToRgb('#F80')).toEqual({ r: 255, g: 136, b: 0 });
    expect(luminanceFromRgb(hexToRgb('#FFFFFF'))).toBeCloseTo(1, 8);
    expect(luminanceFromRgb(hexToRgb('#000000'))).toBe(0);
  });

  it('maps fire values to icy-fire luminance anchors', () => {
    expect(transmutePaletteColor('#FFF4B8', 'icy_fire')).toBe('#F8FCFF');
    expect(transmutePaletteColor('#FFB000', 'icy_fire')).toBe('#B8F7FF');
    expect(transmutePaletteColor('#C34800', 'icy_fire')).toBe('#0EA5E9');
    expect(transmutePaletteColor('#351008', 'icy_fire')).toBe('#06131C');
    expect(transmutePaletteColor('#020101', 'icy_fire')).toBe('#02070A');
  });

  it('keeps source material as a no-op', () => {
    const palette = ['#FF3300', '#FFD280', '#190402'];
    const coordinates = [
      { x: 1, y: 2, color: '#FF3300' },
      { x: 3, y: 4, color: '#FFD280' },
    ];

    expect(transmutePixelBrainPalette(palette, 'source')).toEqual(palette);
    expect(transmutePixelBrainCoordinates(coordinates, 'source').map((coord) => coord.color))
      .toEqual(['#FF3300', '#FFD280']);
  });

  it('preserves coordinate geometry while changing material color', () => {
    const coordinates = [
      { x: 4, y: 8, snappedX: 4, snappedY: 8, z: 0, color: '#FF3300', emphasis: 0.7 },
    ];

    const [output] = transmutePixelBrainCoordinates(coordinates, 'icy_fire');
    expect(output).toMatchObject({
      x: 4,
      y: 8,
      snappedX: 4,
      snappedY: 8,
      z: 0,
      emphasis: 0.7,
      sourceColor: '#FF3300',
      chromaticMaterial: 'icy_fire',
    });
    expect(output.color).not.toBe('#FF3300');
  });

  it('builds a schema-bound render/export payload', () => {
    const sourcePalettes = [{
      key: 'img_fire',
      colors: ['#FFF4B8', '#FF3300', '#190402'],
      weights: [0.4, 0.4, 0.2],
      source: 'image',
    }];
    const sourceCoordinates = [
      { x: 0, y: 0, color: '#FFF4B8' },
      { x: 1, y: 0, color: '#190402' },
    ];

    const payload = buildChromaticTransmutationPayload({
      sourcePalettes,
      sourceCoordinates,
      material: 'icy_fire',
    });

    expect(payload).toMatchObject({
      amp: 'chromatic-transmutation',
      version: '0.1.0',
      material: 'icy_fire',
      sourcePalette: ['#FFF4B8', '#FF3300', '#190402'],
      outputPalette: ['#F8FCFF', '#0EA5E9', '#02070A'],
    });
    expect(payload.outputPalettes[0].colors).toEqual(payload.outputPalette);
    expect(payload.outputCoordinates.map((coord) => coord.color)).toEqual(['#F8FCFF', '#02070A']);
  });
});
