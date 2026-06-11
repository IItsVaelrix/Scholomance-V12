import { describe, expect, it } from 'vitest';
import { createPixelBrainAssetPacket } from '../../codex/core/pixelbrain/pixelbrain-asset-packet.js';
import {
  pixelBrainPacketToPixelLotusLayer,
  pixelLotusLayerToPixelBrainPacket,
} from '../../src/pixel-lotus/actor-forge/pixelbrainLayerBridge';

describe('PixelBrain layer bridge', () => {
  it('maps a PixelBrain asset packet into a Pixel Lotus actor layer', () => {
    const packet = createPixelBrainAssetPacket({
      id: 'pb_fire_robe',
      palettes: [{ key: 'robe_fire', colors: ['#FFF4B8'] }],
      material: 'icy_fire',
    });

    const layer = pixelBrainPacketToPixelLotusLayer(packet, {
      slot: 'robe',
      zIndex: 4,
      opacity: 0.75,
    });

    expect(layer).toMatchObject({
      id: 'pb_fire_robe',
      slot: 'robe',
      assetId: 'pb_fire_robe',
      zIndex: 4,
      opacity: 0.75,
      paletteId: 'robe_fire',
      materialId: 'icy_fire',
      blendMode: 'normal',
    });
  });

  it('reconstructs a PixelBrain packet from a Pixel Lotus actor layer', () => {
    const packet = pixelLotusLayerToPixelBrainPacket(
      {
        id: 'robe_layer',
        slot: 'robe',
        assetId: 'robe_asset',
        visible: true,
        locked: false,
        zIndex: 1,
        opacity: 1,
        paletteId: 'robe_palette',
        materialId: 'holy_fire',
        blendMode: 'normal',
      },
      {
        coordinates: [{ x: 1, y: 1, color: '#F59E0B' }],
        colors: ['#F59E0B'],
      }
    );

    expect(packet.kind).toBe('pixelbrain.asset.v1');
    expect(packet.source.kind).toBe('pixel-lotus');
    expect(packet.geometry.coordinates).toHaveLength(1);
    expect(packet.material.id).toBe('holy_fire');
  });
});
