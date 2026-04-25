import { hslToHex, resolveVerseIrColor } from './pcaChroma.js';
import { normalizeVowelFamily } from '../../phonology/vowelFamily.js';

export const REGISTRY_SATURATION = 72;
export const REGISTRY_LIGHTNESS = 62;
export const GOLDEN_ANGLE_DEG = 137.508;

function resolveRhymeKey(token) {
  if (!token || typeof token !== 'object') {
    return null;
  }

  if (typeof token.rhymeKey === 'string' && token.rhymeKey) {
    return token.rhymeKey;
  }

  if (typeof token.analysis?.rhymeKey === 'string' && token.analysis.rhymeKey) {
    return token.analysis.rhymeKey;
  }

  if (typeof token.rhymeTailSignature === 'string' && token.rhymeTailSignature) {
    return token.rhymeTailSignature;
  }

  return null;
}

function resolveEffectClass(token) {
  if (!token || typeof token !== 'object') {
    return null;
  }

  if (typeof token.effectClass === 'string' && token.effectClass) {
    return token.effectClass;
  }

  if (typeof token.visualBytecode?.effectClass === 'string' && token.visualBytecode.effectClass) {
    return token.visualBytecode.effectClass;
  }

  if (typeof token.trueVisionBytecode?.effectClass === 'string' && token.trueVisionBytecode.effectClass) {
    return token.trueVisionBytecode.effectClass;
  }

  return null;
}

function resolveRhymeFamilyFromKey(rhymeKey) {
  if (typeof rhymeKey !== 'string' || !rhymeKey) {
    return null;
  }

  return normalizeVowelFamily(rhymeKey.split('-')[0] || null);
}

function resolveTerminalVowelFamily(token) {
  if (!token || typeof token !== 'object') {
    return null;
  }

  // V12 CANONICAL: Use the pre-computed terminalVowelFamily from the VerseIR analysis
  const canonical = token.terminalVowelFamily || token.analysis?.terminalVowelFamily;
  const normalized = normalizeVowelFamily(canonical);
  
  if (normalized) {
    return normalized;
  }

  // Final fallback: Use the last vowel in the family list if explicitly present
  if (Array.isArray(token.vowelFamily) && token.vowelFamily.length > 0) {
    return normalizeVowelFamily(token.vowelFamily[token.vowelFamily.length - 1]);
  }

  const rhymeKeyFamily = resolveRhymeFamilyFromKey(resolveRhymeKey(token));
  if (rhymeKeyFamily) {
    return rhymeKeyFamily;
  }

  return null;
}

export function buildRhymeColorRegistry(tokens) {
  const registry = new Map();
  let slotIndex = 0;

  for (const token of Array.isArray(tokens) ? tokens : []) {
    const rhymeKey = resolveRhymeKey(token);
    if (!rhymeKey || resolveEffectClass(token) === 'INERT' || registry.has(rhymeKey)) {
      continue;
    }

    const terminalVowelFamily = resolveTerminalVowelFamily(token);
    const familyColor = terminalVowelFamily ? resolveVerseIrColor(terminalVowelFamily) : null;
    let hex;
    if (familyColor?.family) {
      // Registry colors represent rhyme-tail identity, not the first vowel encountered in the word.
      // This keeps multisyllabic rhymes like "core" / "adore" in the same family color.
      hex = familyColor.hex;
    } else {
      // Fallback: golden angle for tokens where no vowel family data is available.
      const hue = (slotIndex * GOLDEN_ANGLE_DEG) % 360;
      hex = hslToHex(hue, REGISTRY_SATURATION, REGISTRY_LIGHTNESS);
    }

    registry.set(rhymeKey, hex);
    slotIndex += 1;
  }

  return registry;
}

function normalizeExplicitColor(color) {
  if (!color || color === '#888888' || color === '#888' || color === 'rgb(136, 136, 136)') {
    return null;
  }
  return color;
}

export function resolveTokenColor(rhymeKey, registry, pcaColor, options = {}) {
  const explicitColor = normalizeExplicitColor(pcaColor);
  const preferRegistry = Boolean(options.preferRegistry);

  if (!preferRegistry && explicitColor) {
    return explicitColor;
  }

  if (typeof rhymeKey === 'string' && rhymeKey && registry instanceof Map && registry.has(rhymeKey)) {
    return registry.get(rhymeKey) || explicitColor || null;
  }

  return explicitColor || null;
}
