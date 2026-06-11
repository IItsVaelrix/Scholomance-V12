import type { PixelLotusActorLayer, PixelLotusActorLayerSlot } from './pixelLotusActor.schema';
import {
  createPixelBrainAssetPacket,
  normalizePixelBrainAssetPacket,
} from '../../../codex/core/pixelbrain/pixelbrain-asset-packet.js';

type PixelBrainLayerBridgeOptions = {
  layerId?: string;
  slot?: PixelLotusActorLayerSlot;
  assetId?: string;
  zIndex?: number;
  opacity?: number;
  paletteId?: string;
  materialId?: string;
};

export function pixelBrainPacketToPixelLotusLayer(packet: any, options: PixelBrainLayerBridgeOptions = {}): PixelLotusActorLayer {
  const normalized = normalizePixelBrainAssetPacket(packet);
  return {
    id: options.layerId || normalized.id,
    slot: options.slot || 'custom',
    assetId: options.assetId || normalized.id,
    visible: true,
    locked: false,
    zIndex: Number.isFinite(Number(options.zIndex)) ? Number(options.zIndex) : 0,
    opacity: Number.isFinite(Number(options.opacity)) ? Number(options.opacity) : 1,
    paletteId: options.paletteId || normalized.palette.sourcePalette[0]?.key,
    materialId: options.materialId || normalized.material.id,
    blendMode: 'normal',
  };
}

export function pixelLotusLayerToPixelBrainPacket(layer: PixelLotusActorLayer, options: any = {}) {
  return createPixelBrainAssetPacket({
    id: options.packetId || `pb_${layer.id}`,
    source: {
      kind: 'pixel-lotus',
      id: layer.id,
      label: layer.slot,
    },
    canvas: options.canvas || { width: 160, height: 144, gridSize: 1 },
    coordinates: options.coordinates || [],
    palettes: layer.paletteId ? [{ key: layer.paletteId, colors: options.colors || [] }] : [],
    material: {
      id: layer.materialId || 'source',
    },
    metadata: {
      tags: ['pixel-lotus-layer', layer.slot],
      compatibility: { pixelLotusLayerId: layer.id },
    },
    provenance: {
      createdBy: 'pixelbrainLayerBridge',
      operations: ['pixel-lotus-layer-to-pixelbrain-packet'],
    },
  });
}
