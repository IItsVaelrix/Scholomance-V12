/**
 * PIXELBRAIN ADAPTER
 *
 * Bridge between UI surface and Codex-level logic.
 * Ensures UI files don't violate architectural boundaries.
 */

import { processorBridge } from './engine.adapter.js';
import { routeRetinaPacketToPhotonicBridge } from './photonic-retina/index.js';

// --- Coordinate & Formula Logic ---
import { 
  generatePixelArtFromImage as codexGeneratePixelArtFromImage,
  transcribeFullPixelData as codexTranscribeFullPixelData
} from '../../codex/core/pixelbrain/image-to-pixel-art.js';

import { 
  evaluateFormulaWithColor as codexEvaluateFormulaWithColor 
} from '../../codex/core/pixelbrain/formula-to-coordinates.js';

import { 
  parseErrorForAI as codexParseErrorForAI,
  decodeBytecodeError as codexDecodeBytecodeError,
  BytecodeError as codexBytecodeError,
  ERROR_CATEGORIES as codexERROR_CATEGORIES,
  ERROR_SEVERITY as codexERROR_SEVERITY,
  MODULE_IDS as codexMODULE_IDS,
  ERROR_CODES as codexERROR_CODES
} from '../../codex/core/pixelbrain/bytecode-error.js';

import {
  analyzeImageToFormula as codexAnalyzeImageToFormula,
  formulaToBytecode as codexFormulaToBytecode,
  parseBytecodeToFormula as codexParseBytecodeToFormula,
  FORMULA_TYPES as codexFORMULA_TYPES
} from '../../codex/core/pixelbrain/image-to-bytecode-formula.js';

// --- Grid & Template Logic ---
import {
  createTemplateGrid as codexCreateTemplateGrid,
  clearCell as codexClearCell,
  exportToAseprite as codexExportToAseprite,
  importFromAseprite as codexImportFromAseprite,
  validateAsepriteImportPayload as codexValidateAsepriteImportPayload,
  generateGridPreview as codexGenerateGridPreview,
  getCellAtPosition as codexGetCellAtPosition,
  getCellOrigin as codexGetCellOrigin,
  getGridMetrics as codexGetGridMetrics,
  snapToGrid as codexSnapToGrid,
  applySymmetry as codexApplySymmetry,
  floodFill as codexFloodFill,
  GRID_TYPES as codexGRID_TYPES,
  setCell as codexSetCell,
  toggleSymmetryAxis as codexToggleSymmetryAxis,
} from '../../codex/core/pixelbrain/template-grid-engine.js';

// --- Lattice Grid Engine (NEW) ---
import {
  generateLatticeGrid as codexGenerateLatticeGrid,
  renderLattice as codexRenderLattice,
  paintCell as codexPaintCell,
  clearCell as codexClearLatticeCell,
  exportLatticeToAseprite as codexExportLatticeToAseprite,
  buildOccupancySet as codexBuildOccupancySet,
  resolveLatticeClick as codexResolveLatticeClick,
} from '../../codex/core/pixelbrain/lattice-grid-engine.js';

// --- Symmetry AMP ---
import {
  detectSymmetry as codexDetectSymmetry,
  applySymmetryToLattice as codexApplySymmetryToLattice,
  generateSymmetryOverlay as codexGenerateSymmetryOverlay,
} from '../../codex/core/pixelbrain/symmetry-amp.js';

// --- Physics & Animation ---
import {
  getRotationAtTime as codexGetRotationAtTime
} from '../../codex/core/pixelbrain/gear-glide-amp.js';

import { roundTo as codexRoundTo } from '../../codex/core/pixelbrain/shared.js';

// --- NLP Morph Engine (in-place phonetic asset edit) ---
import {
  deriveVerseMorphTarget as codexDeriveVerseMorphTarget,
  morphCoordinatesToward as codexMorphCoordinatesToward,
  interpretInstruction as codexInterpretInstruction,
} from '../../codex/core/pixelbrain/nlp-morph-engine.js';

// --- Template / Fill Bridge (geometry↔fill separation) ---
import {
  templatize as codexTemplatize,
  fillTemplate as codexFillTemplate,
} from '../../codex/core/pixelbrain/template-fill-bridge.js';

// --- Sketch AMP (silhouette authoring → auto-shaded template) ---
import {
  sketchToSilhouette as codexSketchToSilhouette,
} from '../../codex/core/pixelbrain/sketch-amp.js';

// --- Asset Packet / Connective Tissue ---
import {
  createPixelBrainAssetPacket as codexCreatePixelBrainAssetPacket,
  normalizePixelBrainAssetPacket as codexNormalizePixelBrainAssetPacket,
  derivePixelBrainRenderPacket as codexDerivePixelBrainRenderPacket,
  derivePixelBrainExportPacket as codexDerivePixelBrainExportPacket,
} from '../../codex/core/pixelbrain/pixelbrain-asset-packet.js';

import {
  resolvePixelBrainPaletteAuthority as codexResolvePixelBrainPaletteAuthority,
} from '../../codex/core/pixelbrain/palette-authority-bridge.js';

import {
  templateGridToPixelBrainAssetPacket as codexTemplateGridToPixelBrainAssetPacket,
} from '../../codex/core/pixelbrain/template-grid-asset-bridge.js';

import {
  registerPixelBrainShaderUniformProvider as codexRegisterPixelBrainShaderUniformProvider,
  resolvePixelBrainShaderUniforms as codexResolvePixelBrainShaderUniforms,
} from '../../codex/core/pixelbrain/pixelbrain-shader-uniform-providers.js';

// --- WAND → Fill Bridge (proposal → fill bytecode) ---
import {
  deriveWandFillBytecode as codexDeriveWandFillBytecode,
} from '../../codex/core/pixelbrain/wand-fill-bridge.js';

// --- Custom Shaders System (NEW) ---
import {
  createShaderPacket as codexCreateShaderPacket,
  validateShaderPacket as codexValidateShaderPacket,
  hashShaderPacket as codexHashShaderPacket,
  normalizeShaderSource as codexNormalizeShaderSource,
} from '../../codex/core/pixelbrain/shader-packet.js';

import {
  resolveShaderUniforms as codexResolveShaderUniforms,
  DEFAULT_SHADER_UNIFORMS as codexDEFAULT_SHADER_UNIFORMS,
} from '../../codex/core/pixelbrain/shader-uniform-resolver.js';

import {
  registerUniformProvider as codexRegisterUniformProvider,
  getUniformProviders as codexGetUniformProviders,
  clearUniformRegistry as codexClearUniformRegistry,
} from '../../codex/core/pixelbrain/shader-uniform-registry.js';

import {
  createShaderCompileError as codexCreateShaderCompileError,
} from '../../codex/core/pixelbrain/shader-errors.js';

import {
  compileShaderProgram as codexCompileShaderProgram,
  parseShaderCompileLog as codexParseShaderCompileLog,
  renderShaderFrame as codexRenderShaderFrame,
  disposeShaderProgram as codexDisposeShaderProgram,
  createFullscreenQuad as codexCreateFullscreenQuad,
  disposeFullscreenQuad as codexDisposeFullscreenQuad,
  wrapShaderSource as codexWrapShaderSource,
  DEFAULT_FRAGMENT_SOURCE as codexDEFAULT_FRAGMENT_SOURCE,
} from './pixelbrain/shader-webgl-preview.js';

import {
  exportToGodotShader as codexExportToGodotShader,
} from './exporters/pixelbrainGodotShaderExport.js';

import {
  exportToPhaserPipeline as codexExportToPhaserPipeline,
} from './exporters/pixelbrainPhaserShaderExport.js';

// --- EXPORTS ---

export const FORMULA_TYPES = codexFORMULA_TYPES;
export const GRID_TYPES = codexGRID_TYPES;

export { processorBridge };
export const BytecodeError = codexBytecodeError;
export const ERROR_CATEGORIES = codexERROR_CATEGORIES;
export const ERROR_SEVERITY = codexERROR_SEVERITY;
export const MODULE_IDS = codexMODULE_IDS;
export const ERROR_CODES = codexERROR_CODES;
export const decodeBytecodeError = codexDecodeBytecodeError;

export const DEFAULT_SHADER_UNIFORMS = codexDEFAULT_SHADER_UNIFORMS;
export const DEFAULT_FRAGMENT_SOURCE = codexDEFAULT_FRAGMENT_SOURCE;

export function createShaderPacket(options) {
  return codexCreateShaderPacket(options);
}
export function validateShaderPacket(packet) {
  return codexValidateShaderPacket(packet);
}
export function hashShaderPacket(packet) {
  return codexHashShaderPacket(packet);
}
export function normalizeShaderSource(src) {
  return codexNormalizeShaderSource(src);
}
export function resolveShaderUniforms(packet, runtimeState) {
  return codexResolveShaderUniforms(packet, runtimeState);
}
export function createShaderCompileError(params) {
  return codexCreateShaderCompileError(params);
}
export function compileShaderProgram(gl, fsUserCode) {
  return codexCompileShaderProgram(gl, fsUserCode);
}
export function parseShaderCompileLog(log) {
  return codexParseShaderCompileLog(log);
}
export function renderShaderFrame(gl, program, quad, resolvedUniforms) {
  return codexRenderShaderFrame(gl, program, quad, resolvedUniforms);
}
export function disposeShaderProgram(gl, program) {
  return codexDisposeShaderProgram(gl, program);
}
export function createFullscreenQuad(gl) {
  return codexCreateFullscreenQuad(gl);
}
export function disposeFullscreenQuad(gl, quad) {
  return codexDisposeFullscreenQuad(gl, quad);
}
export function wrapShaderSource(userCode) {
  return codexWrapShaderSource(userCode);
}
export function exportToGodotShader(packet) {
  return codexExportToGodotShader(packet);
}
export function exportToPhaserPipeline(packet) {
  return codexExportToPhaserPipeline(packet);
}

export function generatePixelArtFromImage(analysis, canvasSize, extension) {
  return codexGeneratePixelArtFromImage(analysis, canvasSize, extension);
}

export function transcribeFullPixelData(pixelData, dimensions, canvasSize) {
  return codexTranscribeFullPixelData(pixelData, dimensions, canvasSize);
}

export function evaluateFormulaWithColor(formula, canvasSize, time) {
  return codexEvaluateFormulaWithColor(formula, canvasSize, time);
}

export function parseErrorForAI(error) {
  return codexParseErrorForAI(error);
}

export function analyzeImageToFormula(analysis) {
  return codexAnalyzeImageToFormula(analysis);
}

export function formulaToBytecode(formula) {
  return codexFormulaToBytecode(formula);
}

export function parseBytecodeToFormula(bytecode) {
  return codexParseBytecodeToFormula(bytecode);
}

export function createTemplateGrid(config) {
  return codexCreateTemplateGrid(config);
}

export function clearCell(layer, x, y) {
  return codexClearCell(layer, x, y);
}

export function exportToAseprite(grid) {
  return codexExportToAseprite(grid);
}

export function generateGridPreview(grid) {
  return codexGenerateGridPreview(grid);
}

export function getCellAtPosition(grid, x, y) {
  return codexGetCellAtPosition(grid, x, y);
}

export function getCellOrigin(grid, col, row) {
  return codexGetCellOrigin(grid, col, row);
}

export function getGridMetrics(grid) {
  return codexGetGridMetrics(grid);
}

export function snapToGrid(x, y, grid) {
  return codexSnapToGrid(x, y, grid);
}

export function applySymmetry(coordinates, grid) {
  return codexApplySymmetry(coordinates, grid);
}

export function importFromAseprite(data, options = {}) {
  return codexImportFromAseprite(data, options);
}

export function validateAsepriteImportPayload(data, options = {}) {
  return codexValidateAsepriteImportPayload(data, options);
}

export function floodFill(grid, layer, x, y, color) {
  return codexFloodFill(grid, layer, x, y, color);
}

export function setCell(layer, x, y, color, emphasis) {
  return codexSetCell(layer, x, y, color, emphasis);
}

export function toggleSymmetryAxis(grid, axis) {
  return codexToggleSymmetryAxis(grid, axis);
}

export function getRotationAtTime(time, bpm) {
  return codexGetRotationAtTime(time, bpm);
}

export function roundTo(val, precision) {
  return codexRoundTo(val, precision);
}

// --- NLP MORPH ENGINE EXPORTS ---

export function deriveVerseMorphTarget(versePayload) {
  return codexDeriveVerseMorphTarget(versePayload);
}

export function morphCoordinatesToward(baseCoordinates, target, t) {
  return codexMorphCoordinatesToward(baseCoordinates, target, t);
}

export function interpretInstruction(text) {
  return codexInterpretInstruction(text);
}

// --- TEMPLATE / FILL BRIDGE EXPORTS ---

export function templatize(coordinates, options) {
  return codexTemplatize(coordinates, options);
}

export function fillTemplate(template, bytecode, options) {
  return codexFillTemplate(template, bytecode, options);
}

// --- SKETCH AMP EXPORTS ---

export function sketchToSilhouette(occupied, dimensions, options) {
  return codexSketchToSilhouette(occupied, dimensions, options);
}

// --- ASSET PACKET / CONNECTIVE TISSUE EXPORTS ---

export function createPixelBrainAssetPacket(input) {
  return codexCreatePixelBrainAssetPacket(input);
}

export function normalizePixelBrainAssetPacket(packet) {
  return codexNormalizePixelBrainAssetPacket(packet);
}

export function derivePixelBrainRenderPacket(packet, options) {
  return codexDerivePixelBrainRenderPacket(packet, options);
}

export function derivePixelBrainExportPacket(packet, target, options) {
  return codexDerivePixelBrainExportPacket(packet, target, options);
}

export function resolvePixelBrainPaletteAuthority(input) {
  return codexResolvePixelBrainPaletteAuthority(input);
}

export function templateGridToPixelBrainAssetPacket(grid, options) {
  return codexTemplateGridToPixelBrainAssetPacket(grid, options);
}

export function registerPixelBrainShaderUniformProvider() {
  return codexRegisterPixelBrainShaderUniformProvider();
}

export function resolvePixelBrainShaderUniforms(context) {
  return codexResolvePixelBrainShaderUniforms(context);
}

export function runPixelBrainPipeline(input, context) {
  return processorBridge.execute('pixelbrain.pipeline.run', input, context);
}

// --- WAND → FILL BRIDGE EXPORTS ---

export function deriveWandFillBytecode(proposal) {
  return codexDeriveWandFillBytecode(proposal);
}

function normalizePixelBrainCoordinate(coord) {
  return Object.freeze({
    x: Number(coord?.snappedX ?? coord?.x ?? 0),
    y: Number(coord?.snappedY ?? coord?.y ?? 0),
    color: coord?.color || '#ffffff',
    emphasis: Number(coord?.emphasis ?? coord?.pressure ?? 1),
  });
}

export function buildPixelBrainPhotonicRoute(payload, options = {}) {
  try {
    const coordinates = Array.isArray(payload?.coordinates) ? payload.coordinates : [];

    if (coordinates.length === 0) {
      return null;
    }

    const canvas = payload?.canvas || {};
    const dimensions = {
      width: Number(canvas.width) || 160,
      height: Number(canvas.height) || 144,
    };

    return routeRetinaPacketToPhotonicBridge(
      {
        sourceKind: 'coordinates',
        dimensions,
        payload: coordinates.map(normalizePixelBrainCoordinate),
        metadata: {
          sourceSystem: 'pixelbrain',
          paletteCount: Array.isArray(payload?.palettes) ? payload.palettes.length : 0,
        },
      },
      {
        retina: {
          targetDimension: options.targetDimension || 64,
          bitWidth: options.bitWidth || 4,
        },
        bridge: {
          mode: options.mode || 'shadow',
        },
        previousPacket: options.previousPacket,
        previewLength: options.previewLength || 24,
      }
    );
  } catch (error) {
    if (options.mode === 'warn') {
      console.warn('[PixelBrain Photonic Retina] routing failed:', error);
    }

    return null;
  }
}

// --- LATTICE GRID ENGINE EXPORTS ---

export async function generateLatticeGrid(analysis) {
  return codexGenerateLatticeGrid(analysis);
}

export function renderLattice(canvas, lattice, zoom) {
  return codexRenderLattice(canvas, lattice, zoom);
}

export function paintCell(lattice, col, row, color) {
  return codexPaintCell(lattice, col, row, color);
}

export function clearLatticeCell(lattice, col, row) {
  return codexClearLatticeCell(lattice, col, row);
}

export function exportLatticeToAseprite(lattice, targetWidth, targetHeight) {
  return codexExportLatticeToAseprite(lattice, targetWidth, targetHeight);
}

export function buildOccupancySet(lattice) {
  return codexBuildOccupancySet(lattice);
}

export function resolveLatticeClick(clientX, clientY, rect, lattice, zoom, offsetX, offsetY) {
  return codexResolveLatticeClick(clientX, clientY, rect, lattice, zoom, offsetX, offsetY);
}

// --- SYMMETRY AMP EXPORTS ---

export function detectSymmetry(pixelData, dimensions) {
  return codexDetectSymmetry(pixelData, dimensions);
}

export function applySymmetryToLattice(lattice, symmetry) {
  return codexApplySymmetryToLattice(lattice, symmetry);
}

export function generateSymmetryOverlay(symmetry, width, height, zoom) {
  return codexGenerateSymmetryOverlay(symmetry, width, height, zoom);
}

// --- SYMMETRY AMP MICROPROCESSOR ---
/**
 * Run Symmetry AMP as a microprocessor stage
 * @param {Object} input - SymmetryAmpInput contract
 * @returns {SymmetryAmpOutput} SymmetryAmpOutput contract
 */
export function runSymmetryAmpProcessor(input) {
  return processorBridge.execute('amp.symmetry', input);
}

/**
 * Run Coord Symmetry AMP as a microprocessor stage
 * @param {Object} input - CoordSymmetryInput contract
 * @returns {CoordSymmetryOutput} CoordSymmetryOutput contract
 */
export function runCoordSymmetryAmp(input) {
  return processorBridge.execute('amp.coord-symmetry', input);
}

export function registerUniformProvider(providerId, provider) {
  return codexRegisterUniformProvider(providerId, provider);
}

export function getUniformProviders() {
  return codexGetUniformProviders();
}

export function clearUniformRegistry() {
  return codexClearUniformRegistry();
}

// Re-export transform functions for testing
export {
  verticalMirror,
  horizontalMirror,
  radialRotate,
  diagonalMirror,
} from '../../codex/core/pixelbrain/coord-symmetry-amp.js';
