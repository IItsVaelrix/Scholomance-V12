import { createByteMap, hashString, parseBytecodeString } from './shared.js';
import {
  MATERIAL_REGISTRY_VERSION,
  SOURCE_MATERIAL,
  resolveMaterialId,
  transmuteMaterialCoordinates,
  transmuteMaterialPalettes,
} from './material-registry.js';

export const PIXELBRAIN_ASSET_KIND = 'pixelbrain.asset.v1';
export const PIXELBRAIN_RENDER_KIND = 'pixelbrain.render.v1';
export const PIXELBRAIN_EXPORT_KIND = 'pixelbrain.export.v1';

const DEFAULT_CANVAS = Object.freeze({
  width: 160,
  height: 144,
  cellSize: 1,
  gridSize: 1,
  transparent: true,
  background: '#00000000',
});

function stableJson(value) {
  if (value === undefined || typeof value === 'function' || typeof value === 'symbol') return 'null';
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
}

function stableId(prefix, value) {
  return `${prefix}_${hashString(stableJson(value)).toString(16).padStart(8, '0')}`;
}

function clonePlain(value) {
  if (value === undefined || value === null) return value;
  return JSON.parse(JSON.stringify(value));
}

function toFiniteNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

export function normalizePixelBrainCanvas(canvas = {}) {
  return Object.freeze({
    width: Math.max(1, Math.round(toFiniteNumber(canvas.width, DEFAULT_CANVAS.width))),
    height: Math.max(1, Math.round(toFiniteNumber(canvas.height, DEFAULT_CANVAS.height))),
    cellSize: Math.max(1, toFiniteNumber(canvas.cellSize ?? canvas.gridSize, DEFAULT_CANVAS.cellSize)),
    gridSize: Math.max(1, toFiniteNumber(canvas.gridSize ?? canvas.cellSize, DEFAULT_CANVAS.gridSize)),
    transparent: Boolean(canvas.transparent ?? DEFAULT_CANVAS.transparent),
    background: String(canvas.background ?? DEFAULT_CANVAS.background),
  });
}

export function normalizePixelBrainCoordinate(coord = {}) {
  return Object.freeze({
    ...clonePlain(coord),
    x: toFiniteNumber(coord.x ?? coord.snappedX, 0),
    y: toFiniteNumber(coord.y ?? coord.snappedY, 0),
    z: toFiniteNumber(coord.z, 0),
    snappedX: toFiniteNumber(coord.snappedX ?? coord.x, 0),
    snappedY: toFiniteNumber(coord.snappedY ?? coord.y, 0),
    color: String(coord.color || '#ffffff'),
    emphasis: toFiniteNumber(coord.emphasis ?? coord.pressure, 1),
  });
}

function normalizePaletteRecord(palette, index = 0) {
  if (Array.isArray(palette)) {
    return Object.freeze({
      key: `palette_${index}`,
      colors: Object.freeze(palette.map(String)),
      weights: Object.freeze([]),
      source: 'array',
      byteMap: createByteMap(palette),
    });
  }

  const colors = Array.isArray(palette?.colors) ? palette.colors.map(String) : [];
  return Object.freeze({
    ...clonePlain(palette || {}),
    key: String(palette?.key || palette?.id || `palette_${index}`),
    colors: Object.freeze(colors),
    weights: Object.freeze(Array.isArray(palette?.weights) ? palette.weights.map(Number) : []),
    source: String(palette?.source || 'unknown'),
    byteMap: palette?.byteMap || createByteMap(colors),
  });
}

export function normalizePixelBrainPalettes(palettes) {
  if (!Array.isArray(palettes)) return Object.freeze([]);
  return Object.freeze(palettes.map(normalizePaletteRecord));
}

function flattenPaletteColors(palettes) {
  const colors = [];
  (Array.isArray(palettes) ? palettes : []).forEach((palette) => {
    if (Array.isArray(palette?.colors)) colors.push(...palette.colors);
  });
  return Object.freeze(colors);
}

function normalizeBytecode(input = {}) {
  const raw = String(input?.bytecode?.raw ?? input?.bytecode ?? input?.formula?.bytecode ?? '').trim();
  const components = raw ? parseBytecodeString(raw) : clonePlain(input?.bytecode?.components || {});
  return Object.freeze({
    raw,
    components: Object.freeze(components || {}),
    authority: String(input?.bytecode?.authority || (raw ? 'color-byte-mapping.v12' : 'none')),
    materialStage: input?.bytecode?.materialStage || input?.material?.id || SOURCE_MATERIAL,
  });
}

function normalizeTemplate(input = {}) {
  const template = input.template || {};
  return Object.freeze({
    id: template.id || null,
    gridType: template.gridType || input.gridType || null,
    symmetryAxes: Object.freeze(Array.isArray(template.symmetryAxes) ? [...template.symmetryAxes] : []),
    slots: Object.freeze(Array.isArray(template.slots) ? clonePlain(template.slots) : []),
    fillState: Object.freeze(clonePlain(template.fillState || input.fillState || {})),
  });
}

function normalizeSource(input = {}) {
  const source = input.source || {};
  return Object.freeze({
    kind: source.kind || input.sourceKind || 'unknown',
    id: source.id || input.sourceId || null,
    label: source.label || input.label || null,
    importedAt: source.importedAt || null,
  });
}

function normalizeGeometry(input = {}) {
  const coordinates = Array.isArray(input.geometry?.coordinates)
    ? input.geometry.coordinates
    : Array.isArray(input.coordinates)
      ? input.coordinates
      : [];
  const cells = Array.isArray(input.geometry?.cells)
    ? input.geometry.cells
    : Array.isArray(input.cells)
      ? input.cells
      : [];

  const normalizedCoordinates = Object.freeze(coordinates.map(normalizePixelBrainCoordinate));
  return Object.freeze({
    mode: input.geometry?.mode || (cells.length ? 'template-grid' : 'coordinates'),
    bounds: Object.freeze(clonePlain(input.geometry?.bounds || {})),
    coordinates: normalizedCoordinates,
    cells: Object.freeze(clonePlain(cells)),
  });
}

export function createPixelBrainAssetPacket(input = {}) {
  return normalizePixelBrainAssetPacket(input);
}

export function normalizePixelBrainAssetPacket(input = {}) {
  const canvas = normalizePixelBrainCanvas(input.canvas || input.dimensions || {});
  const geometry = normalizeGeometry(input);
  const sourcePalette = normalizePixelBrainPalettes(input.palette?.sourcePalette || input.palettes || input.palette?.palettes || []);
  const materialId = resolveMaterialId(input.material?.id || input.material || input.chromatic?.material || SOURCE_MATERIAL);
  const bytecode = normalizeBytecode({ ...input, material: { id: materialId } });
  const packetSeed = {
    source: input.source || input.sourceKind,
    canvas,
    coordinateCount: geometry.coordinates.length,
    palette: flattenPaletteColors(sourcePalette),
    bytecode: bytecode.raw,
    material: materialId,
  };

  return Object.freeze({
    kind: PIXELBRAIN_ASSET_KIND,
    id: input.id || stableId('pbasset', packetSeed),
    schemaVersion: 1,
    source: normalizeSource(input),
    canvas,
    geometry,
    palette: Object.freeze({
      sourcePalette,
      semanticPalette: normalizePixelBrainPalettes(input.palette?.semanticPalette || []),
      materialPalette: normalizePixelBrainPalettes(input.palette?.materialPalette || []),
      byteMap: Object.freeze(input.palette?.byteMap || createByteMap(flattenPaletteColors(sourcePalette))),
      authority: input.palette?.authority || 'pixelbrain.asset-packet.v1',
    }),
    formula: input.formula ?? null,
    bytecode,
    template: normalizeTemplate(input),
    material: Object.freeze({
      id: materialId,
      variant: input.material?.variant || null,
      registryVersion: MATERIAL_REGISTRY_VERSION,
      parameters: Object.freeze(clonePlain(input.material?.parameters || {})),
    }),
    chromatic: Object.freeze({
      transformId: input.chromatic?.transformId || materialId,
      diagnostics: Object.freeze(clonePlain(input.chromatic?.diagnostics || [])),
    }),
    photonic: Object.freeze({
      routeId: input.photonic?.routeId || input.photonicRoute?.packet?.packetId || null,
      packetId: input.photonic?.packetId || input.photonicRoute?.packet?.packetId || null,
      status: input.photonic?.status || (input.photonicRoute ? 'ready' : 'idle'),
    }),
    provenance: Object.freeze({
      createdBy: input.provenance?.createdBy || 'pixelbrain',
      operations: Object.freeze(clonePlain(input.provenance?.operations || [])),
    }),
    metadata: Object.freeze({
      tags: Object.freeze(Array.isArray(input.metadata?.tags) ? [...input.metadata.tags] : []),
      notes: Object.freeze(Array.isArray(input.metadata?.notes) ? [...input.metadata.notes] : []),
      compatibility: Object.freeze(clonePlain(input.metadata?.compatibility || {})),
    }),
  });
}

export function assertPixelBrainAssetPacket(packet) {
  if (!packet || packet.kind !== PIXELBRAIN_ASSET_KIND || packet.schemaVersion !== 1) {
    throw new Error('Invalid PixelBrainAssetPacket');
  }
  return true;
}

export function derivePixelBrainRenderPacket(packet, options = {}) {
  const source = normalizePixelBrainAssetPacket(packet);
  const materialId = resolveMaterialId(options.material || source.material.id);
  const coordinates = transmuteMaterialCoordinates(source.geometry.coordinates, materialId);
  const palettes = transmuteMaterialPalettes(source.palette.sourcePalette, materialId);

  return Object.freeze({
    kind: PIXELBRAIN_RENDER_KIND,
    id: stableId('pbrender', { sourceId: source.id, materialId, coordinates, palettes }),
    sourcePacketId: source.id,
    schemaVersion: 1,
    canvas: source.canvas,
    coordinates: Object.freeze(coordinates),
    palettes: Object.freeze(palettes),
    formula: source.formula,
    bytecode: source.bytecode,
    material: Object.freeze({ ...source.material, id: materialId }),
    chromatic: Object.freeze({
      transformId: materialId,
      sourcePacketId: source.id,
    }),
  });
}

export function derivePixelBrainExportPacket(packet, target = 'json', options = {}) {
  const render = derivePixelBrainRenderPacket(packet, options);
  return Object.freeze({
    kind: PIXELBRAIN_EXPORT_KIND,
    id: stableId('pbexport', { renderId: render.id, target }),
    schemaVersion: 1,
    target: String(target || 'json'),
    renderPacketId: render.id,
    canvas: render.canvas,
    coordinates: render.coordinates,
    palettes: render.palettes,
    formula: render.formula,
    bytecode: render.bytecode.raw,
    material: render.material,
    metadata: Object.freeze({
      materialStage: render.material.id,
      sourcePacketId: render.sourcePacketId,
    }),
  });
}
