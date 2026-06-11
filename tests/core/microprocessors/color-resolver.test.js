import { describe, expect, it } from 'vitest';
import { verseIRMicroprocessors } from '../../../codex/core/microprocessors/index.js';
import {
  getKnownColorNames,
  getKnownColorProcessorIds,
  lookupKnownColor,
} from '../../../codex/core/microprocessors/color/named-color-registry.js';
import { resolveKnownColor } from '../../../codex/core/microprocessors/color/ColorResolver.js';

describe('known color microprocessors', () => {
  it('resolves canonical CSS named colors', () => {
    const result = resolveKnownColor({ color: 'rebeccapurple', paletteSize: 4 });

    expect(result).toMatchObject({
      ok: true,
      processorId: 'color.resolve.rebeccapurple',
      name: 'rebeccapurple',
      canonicalName: 'rebeccapurple',
      source: 'css',
      hex: '#663399',
      rgb: { r: 102, g: 51, b: 153 },
    });
    expect(result.palette).toHaveLength(4);
    expect(result.byteMap).toEqual({
      0: result.palette[0],
      1: result.palette[1],
      2: result.palette[2],
      3: result.palette[3],
    });
  });

  it('resolves Scholomance aliases through explicit metadata', () => {
    const alias = lookupKnownColor('blood');
    const result = resolveKnownColor({ color: 'blood' });

    expect(alias).toMatchObject({
      name: 'blood',
      canonicalName: 'red',
      aliasOf: 'red',
      source: 'alias',
      hex: '#FF0000',
    });
    expect(result).toMatchObject({
      ok: true,
      name: 'blood',
      canonicalName: 'red',
      aliasOf: 'red',
      source: 'alias',
      hex: '#FF0000',
    });
  });

  it('resolves school anchors as known colors', () => {
    const result = resolveKnownColor({ color: 'sonic' });

    expect(result).toMatchObject({
      ok: true,
      name: 'sonic',
      canonicalName: 'sonic',
      source: 'school',
      hex: '#1AB4A8',
    });
  });

  it('resolves hex and RGB payloads without a registry entry', () => {
    expect(resolveKnownColor({ color: '#C7D2FE' })).toMatchObject({
      ok: true,
      source: 'hex',
      hex: '#C7D2FE',
      rgb: { r: 199, g: 210, b: 254 },
    });

    expect(resolveKnownColor({ rgb: { r: 14, g: 165, b: 233 } })).toMatchObject({
      ok: true,
      source: 'rgb',
      hex: '#0EA5E9',
      rgb: { r: 14, g: 165, b: 233 },
    });
  });

  it('registers generated microprocessors for every known color', async () => {
    const names = getKnownColorNames();
    const ids = getKnownColorProcessorIds();
    const registered = verseIRMicroprocessors.list();

    expect(names.length).toBeGreaterThan(140);
    expect(ids.every((id) => registered.includes(id))).toBe(true);

    const red = await verseIRMicroprocessors.execute('color.resolve.red', { paletteSize: 2 });
    const lavender = await verseIRMicroprocessors.execute('color.resolve.lavender', { paletteSize: 2 });
    const blood = await verseIRMicroprocessors.execute('color.resolve.blood', { paletteSize: 2 });

    expect(red.hex).toBe('#FF0000');
    expect(lavender.hex).toBe('#E6E6FA');
    expect(blood).toMatchObject({ hex: '#FF0000', aliasOf: 'red' });
  });

  it('returns a stable error payload for unknown colors', async () => {
    const result = await verseIRMicroprocessors.execute('color.resolve', { color: 'not-a-real-color' });

    expect(result).toMatchObject({
      ok: false,
      error: 'UNKNOWN_COLOR',
      requested: 'not-a-real-color',
    });
  });
});
