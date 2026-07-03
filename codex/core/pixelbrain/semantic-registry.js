/**
 * SEMANTIC-REGISTRY
 *
 * Canonical source of truth for PixelBrain authoring semantics.
 * Exposes roles, effects, and other semantic concepts used by SemQuant,
 * construction, region-fill, character systems, etc.
 *
 * This is the shared "connective tissue" for role/part/effect classification
 * so that different authoring surfaces and processing AMPS speak the same language.
 */

// === Core Semantic Constants (source of truth) ===
export const SemanticDomains = Object.freeze({
  GEOMETRY: 'geometry',
  CONSTRUCTION: 'construction',
  MATERIAL: 'material',
  PART: 'part',
  ROLE: 'role',
  EFFECT: 'effect',
  ANIMATION: 'animation',
  PROVENANCE: 'provenance',
});

export const CanonicalRoles = Object.freeze({
  BODY: 'body',
  RIM: 'rim',
  CORE: 'core',
  HIGHLIGHT: 'highlight',
  SHADOW: 'shadow',
  LIMB: 'limb',
  JOINT: 'joint',
  EYE: 'eye',
  MOUTH: 'mouth',
  AURA: 'aura',
  WEAPON: 'weapon',
  ARMOR: 'armor',
  CONSTRUCTION_GUIDE: 'constructionGuide',
  REFERENCE: 'reference',
});

export const SemanticDiagnosticCodes = Object.freeze({
  UNKNOWN_ROLE: 'PB-SEM-001',
  AMBIGUOUS_ROLE: 'PB-SEM-002',
  MISSING_MATERIAL_BINDING: 'PB-SEM-003',
  INVALID_EFFECT_TARGET: 'PB-SEM-004',
  PROVENANCE_LOSS: 'PB-SEM-005',
});

export const ROLE_ALIASES = Object.freeze({
  body: 'body',
  torso: 'body',
  hull: 'body',
  blob: 'body',
  mass: 'body',

  rim: 'rim',
  outline: 'rim',
  border: 'rim',
  edge: 'rim',

  shine: 'highlight',
  specular: 'highlight',
  glint: 'highlight',
  highlight: 'highlight',

  shade: 'shadow',
  shadow: 'shadow',
  darkside: 'shadow',

  glow: 'aura',
  aura: 'aura',
  field: 'aura',

  guide: 'constructionGuide',
  reference: 'constructionGuide',
  construction: 'constructionGuide',
  '00_reference': 'constructionGuide',
  'constructionguide': 'constructionGuide',
});

// Provide a normalized lookup for roles
export function resolveRole(raw) {
  if (!raw) return null;
  const normalized = String(raw).trim().toLowerCase().replace(/[^a-z0-9_/-]/g, '');
  if (ROLE_ALIASES[normalized]) {
    return ROLE_ALIASES[normalized];
  }
  // Also allow direct canonical match
  const upper = normalized.toUpperCase().replace(/[^A-Z0-9_]/g, '');
  if (CanonicalRoles[upper]) {
    return CanonicalRoles[upper];
  }
  return null;
}

// Get all known roles (canonical values)
export function getAllRoles() {
  return Object.values(CanonicalRoles);
}

// Check if a string is a known role (after alias resolution)
export function isKnownRole(raw) {
  return !!resolveRole(raw);
}

// Effect aliases (can be expanded later)
export const EFFECT_ALIASES = Object.freeze({
  glow: 'aura',
  aura: 'aura',
  field: 'aura',
  trace: 'trace',
  highlight: 'highlight',
});

export function resolveEffect(raw) {
  if (!raw) return null;
  const norm = String(raw).trim().toLowerCase();
  return EFFECT_ALIASES[norm] || norm;
}

// Convenience: get a semantic metadata object for a coordinate or node
export function getSemanticMeta(item = {}) {
  const role = item.role || item.semanticRole || resolveRole(item.payload?.role || item.layerName);
  const part = item.partId || item.payload?.partId;
  const effect = resolveEffect(item.effect || item.payload?.effect || item.payload?.op);

  return {
    role: role || 'unknown',
    partId: part || null,
    effect: effect || null,
    isConstructionGuide: role === CanonicalRoles.CONSTRUCTION_GUIDE,
    isRim: role === CanonicalRoles.RIM,
    isBody: role === CanonicalRoles.BODY,
    isAura: effect === 'aura' || role === CanonicalRoles.AURA,
  };
}

export default {
  SemanticDomains,
  CanonicalRoles,
  SemanticDiagnosticCodes,
  ROLE_ALIASES,
  resolveRole,
  getAllRoles,
  isKnownRole,
  resolveEffect,
  getSemanticMeta,
};
