import { describe, expect, it } from 'vitest';

import { importFromPixelBrainAssetPacket } from '../../../codex/core/pixelbrain/template-grid-engine.js';
import { templateGridToPixelBrainAssetPacket } from '../../../codex/core/pixelbrain/template-grid-asset-bridge.js';
import { forgeVoidChestplate } from '../../../scripts/generate-void-chestplate.mjs';

function layerCounts(grid) {
  return Object.fromEntries(grid.layers.map((layer) => [layer.name, layer.cells.size]));
}

describe('PixelBrain Editor asset-packet import', () => {
  it('loads the VOID chestplate packet as exact editable PixelBrain layers', () => {
    const { editorAssetPacket } = forgeVoidChestplate();
    const grid = importFromPixelBrainAssetPacket(editorAssetPacket);
    const counts = layerCounts(grid);

    expect(grid.ok).toBe(true);
    expect(grid.width).toBe(64);
    expect(grid.height).toBe(80);
    expect(grid.cellSize).toBe(1);
    expect(grid.gridType).toBe('rectangular');
    expect(grid.layers.map((layer) => layer.name)).toEqual([
      'body',
      'center_core',
      'collar',
      // 'emblem' joined the manifest when the heraldry zero-cell fix landed
      // (2026-06-12): the emblem now stamps real cells with its own partId.
      'emblem',
      'harness',
      'left_pauldron',
      'lower_drop',
      'mantle',
      'right_pauldron',
      'rune_channels',
      'top_crystal',
    ]);

    expect(counts.body).toBeGreaterThan(500);
    expect(counts.center_core).toBeGreaterThan(20);
    expect(counts.harness).toBeGreaterThan(50);
    expect(counts.mantle).toBeGreaterThan(100);
    expect(counts.top_crystal).toBeGreaterThan(20);
    expect(counts.lower_drop).toBeGreaterThan(10);
    expect(counts.rune_channels).toBeGreaterThan(10);
    expect(grid.palette).toEqual(expect.arrayContaining([
      '#01030A',
      '#07091A',
      '#111633',
      '#A58A2D',
      '#6B35B8',
      '#A66BE0',
      '#7463E8',
    ]));
  });

  it('commits imported editor layers back into a valid asset packet', () => {
    const { editorAssetPacket } = forgeVoidChestplate();
    const grid = importFromPixelBrainAssetPacket(editorAssetPacket);
    const packet = templateGridToPixelBrainAssetPacket(grid, {
      sourceId: 'void.chestplate.sovereign.editor',
      label: 'VOID Chestplate Editor Packet',
      palettes: [{ id: 'void-chestplate-exact', colors: grid.palette }],
    });

    expect(packet.kind).toBe('pixelbrain.asset.v1');
    expect(packet.canvas.width).toBe(64);
    expect(packet.canvas.height).toBe(80);
    expect(packet.geometry.coordinates.length).toBe(
      grid.layers.reduce((sum, layer) => sum + layer.cells.size, 0),
    );
    expect(packet.palette.sourcePalette[0].colors).toEqual(expect.arrayContaining(grid.palette.slice(0, 5)));
  });
});
