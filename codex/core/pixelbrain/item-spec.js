/**
 * ITEM-SPEC-v1 — Declarative Item Foundry contract.
 *
 * A structured spec is the unit of authorship for any item the Foundry
 * produces: weapons, amulets, rings, and future shapes. Validation rejects
 * malformed input deterministically; normalization keeps keys stable so two
 * specs that differ only in key order produce byte-identical hashes.
 *
 *   ITEM-SPEC-v1
 *     contract      literal "ITEM-SPEC-v1"
 *     id            unique slug (e.g. "scimitar.hd.v1")
 *     class         "weapon" | "ring" | "amulet" | string (class set is
 *                   open; the Foundry uses it to seed layout defaults)
 *     archetype     free-form (e.g. "scimitar", "dagger", "ruby-eyes")
 *     canvas        { width, height, gridSize? }
 *     seed          integer for deterministic jitter
 *     bytecode      canonical bytecode string (e.g. "VW-VOID-INEXPLICABLE-TRANSCENDENT")
 *     bands         shading bands passed to sketchToSilhouette (default 6)
 *     parts         ordered list of { id, profile, params, attach, fill, outline?, motif?, wrap? }
 *     shader?       { kind, ...kind-specific params } — enables the FORGE pass
 *
 * Region identity is part-of (each cell carries the part id that placed it).
 * Color authority is the material registry (no hex literals are allowed in
 * Foundry output; only the registry's anchor set is referenced).
 */

import { hashString } from './shared.js';
import {
  MATERIAL_PALETTES,
  MATERIAL_CATEGORIES,
  resolveMaterialId,
} from './material-registry.js';
import { HERALDRY_MARKS } from './heraldry-library.js';

export const ITEM_SPEC_VERSION = 'ITEM-SPEC-v1';

const ITEM_CLASSES = Object.freeze(['weapon', 'ring', 'amulet']);
const REQUIRED_TOP_KEYS = Object.freeze([
  'contract', 'id', 'class', 'archetype', 'canvas', 'seed', 'bytecode', 'parts',
]);
const ANCHOR_KEYS = Object.freeze([
  'void', 'shadow', 'deep', 'body', 'frost', 'spectral', 'whiteCore',
]);

function err(reason, context) {
  const e = new Error(`ITEM-SPEC-v1: ${reason}`);
  e.cause = context;
  return e;
}

function toFiniteNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toPositiveInt(value, fallback) {
  const n = Math.round(toFiniteNumber(value, fallback));
  return n > 0 ? n : fallback;
}

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const key of Object.keys(value)) deepFreeze(value[key]);
    Object.freeze(value);
  }
  return value;
}

function sortKeysDeep(value) {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value && typeof value === 'object') {
    const out = {};
    for (const key of Object.keys(value).sort()) out[key] = sortKeysDeep(value[key]);
    return out;
  }
  return value;
}

// ── Normalization ────────────────────────────────────────────────────────

/**
 * Normalize a raw spec input into the canonical ITEM-SPEC-v1 shape.
 * Throws if the input cannot be brought to a valid form.
 */
export function normalizeItemSpec(input = {}) {
  if (!input || typeof input !== 'object') {
    throw err('spec must be an object', { input });
  }
  if (input.contract && input.contract !== ITEM_SPEC_VERSION) {
    throw err(`contract must be "${ITEM_SPEC_VERSION}"`, { contract: input.contract });
  }

  const id = String(input.id || '').trim();
  if (!id) throw err('id is required');

  const itemClass = String(input.class || '').trim().toLowerCase();
  if (!itemClass) throw err('class is required', { allowed: ITEM_CLASSES });

  const archetype = String(input.archetype || itemClass).trim();
  const canvas = normalizeCanvas(input.canvas);
  const seed = toFiniteNumber(input.seed, 0) >>> 0;
  const bytecode = String(input.bytecode || '').trim();
  if (!bytecode) throw err('bytecode is required');

  const bands = Math.max(2, Math.min(8, Math.round(toFiniteNumber(input.bands, 6))));
  const parts = normalizeParts(input.parts, canvas);
  const shader = input.shader ? normalizeShader(input.shader) : null;
  const light = input.light != null ? normalizeLight(input.light) : null;
  const heraldry = input.heraldry != null ? normalizeHeraldry(input.heraldry, parts) : null;

  const spec = {
    contract: ITEM_SPEC_VERSION,
    id,
    class: itemClass,
    archetype,
    canvas,
    seed,
    bytecode,
    bands,
    parts,
    shader,
    // Hash back-compat: specs that never declare a light must keep their
    // pre-light hash, so the key is only present when declared. Same for
    // heraldry below.
    ...(light ? { light } : {}),
    ...(heraldry && heraldry.length ? { heraldry } : {}),
  };
  return deepFreeze(spec);
}

const HERALDRY_EFFECTS = Object.freeze(['emboss', 'engrave', 'inlay', 'outline', 'emit']);
const HERALDRY_SYMMETRIES = Object.freeze(['none', 'vertical', 'horizontal']);

/**
 * Normalize heraldry entries (the Heraldry microprocessor's contract):
 *   { id?, mark, target?, placement?, scale?, symmetry?, style? }
 * `mark` must exist in the heraldry library; `target` must reference a
 * declared part (it is the centering + containment host for the emblem).
 */
function normalizeHeraldry(raw, parts) {
  if (!Array.isArray(raw)) throw err('heraldry must be an array', { raw });
  const partIds = new Set(parts.map((p) => p.id));
  return Object.freeze(raw.map((entry, index) => {
    if (!entry || typeof entry !== 'object') throw err('heraldry entry must be an object', { index });
    const mark = String(entry.mark || '').trim();
    if (!HERALDRY_MARKS[mark]) {
      throw err(`heraldry.mark "${mark}" is not in the mark library`, {
        index, mark, available: Object.keys(HERALDRY_MARKS),
      });
    }
    const target = entry.target != null ? String(entry.target).trim() : null;
    if (target && !partIds.has(target)) {
      throw err(`heraldry.target "${target}" does not reference a declared part`, {
        index, target, parts: [...partIds],
      });
    }
    if (entry.symmetry !== undefined && !HERALDRY_SYMMETRIES.includes(entry.symmetry)) {
      throw err(`heraldry.symmetry must be one of: ${HERALDRY_SYMMETRIES.join(', ')}`, {
        index, symmetry: entry.symmetry,
      });
    }
    const style = entry.style != null ? { ...entry.style } : null;
    if (style?.effect !== undefined && !HERALDRY_EFFECTS.includes(style.effect)) {
      throw err(`heraldry.style.effect must be one of: ${HERALDRY_EFFECTS.join(', ')}`, {
        index, effect: style.effect,
      });
    }
    if (style?.material) validateMaterialAnchor('heraldry.style', style, entry.id || 'emblem');
    const scale = entry.scale !== undefined ? Number(entry.scale) : undefined;
    if (scale !== undefined && (!Number.isFinite(scale) || scale <= 0)) {
      throw err('heraldry.scale must be a positive number', { index, scale: entry.scale });
    }
    return deepFreeze({
      id: String(entry.id || 'emblem').trim(),
      mark,
      ...(target ? { target } : {}),
      ...(entry.placement ? { placement: { ...entry.placement } } : {}),
      ...(scale !== undefined ? { scale } : {}),
      ...(entry.symmetry !== undefined ? { symmetry: entry.symmetry } : {}),
      ...(style ? { style } : {}),
    });
  }));
}

const SHADING_MODES = Object.freeze(['faceted']);

/**
 * Normalize the optional directional-light field. When present it activates
 * the finish passes (directional sketch shading, selout, facets) in the
 * Foundry; when absent the forge stays in legacy radial mode.
 */
function normalizeLight(raw) {
  if (!raw || typeof raw !== 'object') throw err('light must be an object', { raw });
  const angle = Number(raw.angle);
  if (!Number.isFinite(angle)) {
    throw err('light.angle must be a finite number (radians)', { angle: raw.angle });
  }
  const ambient = Math.max(0, Math.min(1, toFiniteNumber(raw.ambient, 0.3)));
  return Object.freeze({ angle, ambient });
}

function normalizeCanvas(canvas) {
  const width = toPositiveInt(canvas?.width, 0);
  const height = toPositiveInt(canvas?.height, 0);
  if (width <= 0 || height <= 0) {
    throw err('canvas.width and canvas.height must be positive integers', { canvas });
  }
  return Object.freeze({
    width,
    height,
    gridSize: toPositiveInt(canvas?.gridSize ?? 1, 1),
  });
}

function normalizeParts(rawParts, canvas) {
  if (!Array.isArray(rawParts) || rawParts.length === 0) {
    throw err('parts must be a non-empty array', { parts: rawParts });
  }
  const seen = new Set();
  const parts = rawParts.map((raw, index) => normalizePart(raw, index, canvas, seen));
  // Validate attachment graph: every part with `attach` must reference an
  // earlier part, and the graph must be a tree rooted at index 0.
  for (let i = 0; i < parts.length; i += 1) {
    const p = parts[i];
    if (i > 0 && !p.attach) {
      throw err('every part after the first must declare an attach', { partId: p.id });
    }
    if (p.attach) {
      if (!parts.slice(0, i).some((earlier) => earlier.id === p.attach.parent)) {
        throw err('attach.parent must reference a preceding part', {
          partId: p.id,
          attach: p.attach,
        });
      }
    }
  }
  return Object.freeze(parts);
}

function normalizePart(raw, index, canvas, seen) {
  if (!raw || typeof raw !== 'object') throw err('part must be an object', { index, raw });
  const id = String(raw.id || '').trim();
  if (!id) throw err('part.id is required', { index });
  if (seen.has(id)) throw err('part.id must be unique', { id, index });
  seen.add(id);

  const profile = String(raw.profile || '').trim();
  if (!profile) throw err('part.profile is required', { partId: id });

  const params = raw.params && typeof raw.params === 'object' ? deepFreeze({ ...raw.params }) : Object.freeze({});
  const attach = raw.attach ? deepFreeze({ ...raw.attach }) : null;
  const fill = raw.fill ? deepFreeze({ ...raw.fill }) : null;
  const outline = raw.outline ? deepFreeze({ ...raw.outline }) : null;
  const motif = raw.motif ? deepFreeze({ ...raw.motif }) : null;
  const wrap = raw.wrap ? deepFreeze({ ...raw.wrap }) : null;

  if (raw.shading !== undefined && !SHADING_MODES.includes(raw.shading)) {
    throw err(`part.shading must be one of: ${SHADING_MODES.join(', ')}`, {
      partId: id, shading: raw.shading,
    });
  }

  if (fill) validateMaterialAnchor('fill', fill, id);
  if (outline) validateMaterialAnchor('outline', outline, id);
  if (motif?.core) validateMaterialAnchor('motif.core', motif.core, id);
  if (motif?.glow) validateMaterialAnchor('motif.glow', motif.glow, id);
  if (wrap) validateMaterialAnchor('wrap', wrap, id);

  return Object.freeze({
    id,
    profile,
    params,
    attach,
    fill,
    outline,
    motif,
    wrap,
    // Hash back-compat: only present when declared (see normalizeLight note).
    ...(raw.shading !== undefined ? { shading: raw.shading } : {}),
  });
}

function validateMaterialAnchor(stage, fill, partId) {
  const material = resolveMaterialId(fill.material);
  if (material === 'source' && stage !== 'fill' && stage !== 'outline' && stage !== 'wrap') {
    throw err(`${stage}.material cannot be "source" (use a registered material)`, {
      partId, stage, material: fill.material,
    });
  }
  const definition = MATERIAL_PALETTES[material];
  if (stage === 'motif.core' || stage === 'motif.glow') {
    if (fill.anchor && !ANCHOR_KEYS.includes(fill.anchor)) {
      throw err(`${stage}.anchor must be a registry anchor`, {
        partId, stage, anchor: fill.anchor, allowed: ANCHOR_KEYS,
      });
    }
  }
  if (fill.anchor && definition && !definition.anchors?.[fill.anchor] && material !== 'source') {
    throw err(`${stage}.anchor "${fill.anchor}" not present on material "${material}"`, {
      partId, stage, material, anchor: fill.anchor, available: Object.keys(definition.anchors || {}),
    });
  }
}

function normalizeShader(raw) {
  if (!raw || typeof raw !== 'object') throw err('shader must be an object', { raw });
  const kind = String(raw.kind || '').trim();
  if (!kind) throw err('shader.kind is required');
  return deepFreeze({ kind, ...raw });
}

// ── Validation ──────────────────────────────────────────────────────────

/**
 * Validate a (presumably normalized) ITEM-SPEC-v1 spec against the registry
 * and the contract invariants. Throws on any structural or material error.
 */
export function validateItemSpec(spec) {
  if (!spec || typeof spec !== 'object') throw err('spec is required');
  for (const key of REQUIRED_TOP_KEYS) {
    if (!(key in spec)) throw err(`missing top-level field "${key}"`, { spec });
  }
  if (spec.contract !== ITEM_SPEC_VERSION) throw err('contract mismatch', { contract: spec.contract });
  if (spec.parts.length === 0) throw err('parts must be non-empty');
  // Material resolution for every fill/outline/motif node.
  for (const part of spec.parts) {
    collectMaterials(part).forEach(({ material }) => {
      if (material === 'source') return;
      if (!MATERIAL_PALETTES[material]) {
        throw err(`material "${material}" not in registry`, { partId: part.id, material });
      }
    });
  }
  return true;
}

function collectMaterials(part) {
  const out = [];
  if (part.fill?.material) out.push({ material: part.fill.material });
  if (part.outline?.material) out.push({ material: part.outline.material });
  if (part.motif?.core?.material) out.push({ material: part.motif.core.material });
  if (part.motif?.glow?.material) out.push({ material: part.motif.glow.material });
  if (part.wrap?.material) out.push({ material: part.wrap.material });
  return out;
}

// ── Hashing ─────────────────────────────────────────────────────────────

/**
 * Deterministic FNV-1a hash of the normalized spec. Two specs that
 * normalize to the same canonical form produce the same hash, so this
 * doubles as a content-addressed identity for asset-packet metadata.
 */
export function hashItemSpec(spec) {
  if (!spec || typeof spec !== 'object') throw err('spec is required for hash');
  const canonical = sortKeysDeep(spec);
  const json = JSON.stringify(canonical);
  return `fnv1a_${hashString(json).toString(16).padStart(8, '0')}`;
}

// ── Material category lookup ────────────────────────────────────────────

/**
 * Resolve the category of a material id. Used by Foundry phases that
 * branch on category (gemstone / metal / flame) without hardcoding ids.
 */
export function categoryOf(material) {
  const definition = MATERIAL_PALETTES[resolveMaterialId(material)];
  return definition?.category ?? MATERIAL_CATEGORIES.SOURCE ?? 'source';
}
