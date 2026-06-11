import { describe, expect, it, beforeEach } from 'vitest';
import {
  createPixelBrainAssetPacket,
  derivePixelBrainExportPacket,
  derivePixelBrainRenderPacket,
} from '../../../codex/core/pixelbrain/pixelbrain-asset-packet.js';
import { resolvePixelBrainPaletteAuthority } from '../../../codex/core/pixelbrain/palette-authority-bridge.js';
import { runPixelBrainOperationPipeline } from '../../../codex/core/pixelbrain/pixelbrain-operation-pipeline.js';
import {
  registerPixelBrainShaderUniformProvider,
} from '../../../codex/core/pixelbrain/pixelbrain-shader-uniform-providers.js';
import { templateGridToPixelBrainAssetPacket } from '../../../codex/core/pixelbrain/template-grid-asset-bridge.js';
import {
  createTemplateGrid,
  GRID_TYPES,
  setCell,
} from '../../../codex/core/pixelbrain/template-grid-engine.js';
import {
  clearUniformRegistry,
  resolveShaderUniforms,
} from '../../../codex/core/pixelbrain/shader-uniform-registry.js';
import { processorBridge } from '../../../src/lib/engine.adapter.js';

describe('PixelBrain connective tissue seven systems', () => {
  beforeEach(() => {
    clearUniformRegistry();
  });

  it('normalizes a deterministic asset packet and derives material render/export packets', () => {
    const packet = createPixelBrainAssetPacket({
      source: { kind: 'test', id: 'fire' },
      canvas: { width: 8, height: 8, gridSize: 1 },
      coordinates: [{ x: 1, y: 2, color: '#FFF4B8' }],
      palettes: [{ key: 'fire', colors: ['#FFF4B8', '#190402'] }],
      bytecode: 'VW-WILL-RARE-HARMONIC',
    });

    expect(packet.kind).toBe('pixelbrain.asset.v1');
    expect(packet.geometry.coordinates[0]).toMatchObject({ x: 1, y: 2, snappedX: 1, snappedY: 2 });
    expect(packet.palette.sourcePalette[0].byteMap[0]).toBe('#FFF4B8');

    const render = derivePixelBrainRenderPacket(packet, { material: 'icy_fire' });
    expect(render.kind).toBe('pixelbrain.render.v1');
    expect(render.coordinates[0]).toMatchObject({
      color: '#F8FCFF',
      sourceColor: '#FFF4B8',
      chromaticMaterial: 'icy_fire',
    });

    const exported = derivePixelBrainExportPacket(packet, 'json', { material: 'icy_fire' });
    expect(exported).toMatchObject({
      kind: 'pixelbrain.export.v1',
      target: 'json',
      material: { id: 'icy_fire' },
    });
  });

  it('bridges bytecode palette authority into a material palette', () => {
    const authority = resolvePixelBrainPaletteAuthority({
      bytecode: 'VW-VOID-RARE-HARMONIC',
      material: 'void_ice',
    });

    expect(authority.ok).toBe(true);
    expect(authority.semanticPalette.length).toBeGreaterThan(0);
    expect(authority.materialPalette.length).toBe(authority.sourcePalette.length);
    expect(authority.byteMap[0]).toBe(authority.materialPalette[0]);
  });

  it('turns a template grid into a PixelBrain asset packet', () => {
    const grid = createTemplateGrid({
      width: 16,
      height: 16,
      cellSize: 8,
      gridType: GRID_TYPES.RECTANGULAR,
    });
    setCell(grid.layers[0], 8, 8, '#C9A227');

    const packet = templateGridToPixelBrainAssetPacket(grid);

    expect(packet.kind).toBe('pixelbrain.asset.v1');
    expect(packet.geometry.mode).toBe('template-grid');
    expect(packet.geometry.coordinates).toHaveLength(1);
    expect(packet.template.gridType).toBe(GRID_TYPES.RECTANGULAR);
  });

  it('registers PixelBrain shader uniforms from packet state', () => {
    const packet = createPixelBrainAssetPacket({
      coordinates: [{ x: 0, y: 0, color: '#FFFFFF' }],
      palettes: [{ key: 'mono', colors: ['#FFFFFF'] }],
      template: { gridType: 'template-grid', fillState: { rarity: 'RARE', effect: 'HARMONIC' } },
      material: 'icy_fire',
      photonic: { status: 'ready' },
    });
    const render = derivePixelBrainRenderPacket(packet, { material: 'icy_fire' });

    registerPixelBrainShaderUniformProvider();
    const resolved = resolveShaderUniforms({ packet, renderPacket: render, wandFillSpec: { bytecode: 'VW' } });

    expect(resolved.ok).toBe(true);
    expect(resolved.uniforms).toMatchObject({
      u_pixelbrain_material: 1,
      u_pixelbrain_palette_count: 1,
      u_pixelbrain_is_template: 1,
      u_pixelbrain_wand_present: 1,
      u_pixelbrain_photonic_ready: 1,
    });
  });

  it('runs templatize, fill, material, and export stages without dropping geometry', () => {
    const result = runPixelBrainOperationPipeline({
      packet: {
        coordinates: [
          { x: 0, y: 0, color: '#FFFFFF' },
          { x: 1, y: 0, color: '#101010' },
        ],
        palettes: [{ key: 'src', colors: ['#FFFFFF', '#101010'] }],
      },
      stages: [
        { id: 'templatize', options: { bands: 2 } },
        { id: 'fill', options: { bytecode: 'VW-WILL-RARE-HARMONIC', bands: 2 } },
        { id: 'material', options: { material: 'holy_fire' } },
        { id: 'export', options: { target: 'json' } },
      ],
    });

    expect(result.ok).toBe(true);
    expect(result.packet.geometry.coordinates).toHaveLength(2);
    expect(result.packet.material.id).toBe('holy_fire');
    expect(result.exportPacket.kind).toBe('pixelbrain.export.v1');
  });

  it('exposes the operation pipeline through the microprocessor bridge', async () => {
    const result = await processorBridge.execute('pixelbrain.pipeline.run', {
      coordinates: [{ x: 0, y: 0, color: '#FFFFFF' }],
      stages: ['normalize'],
    });

    expect(result.ok).toBe(true);
    expect(result.packet.kind).toBe('pixelbrain.asset.v1');
  });
});
