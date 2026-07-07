import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { forgeItemAsset, renderBundlePng } from '../codex/core/pixelbrain/item-foundry.js';
import { exportFoundryToAsepriteBinary } from '../codex/core/pixelbrain/foundry-aseprite-bridge.js';
import { hashItemSpec } from '../codex/core/pixelbrain/item-spec.js';
import { createPixelBrainAssetPacket } from '../codex/core/pixelbrain/pixelbrain-asset-packet.js';
import {
  VAELRIX_VOID_ARMOR_POLISH_PROFILE,
  VOID_CHESTPLATE_MASKS,
  VOID_CHESTPLATE_ANCHORS,
  VOID_CHESTPLATE_EXACT_PALETTE,
} from '../codex/core/pixelbrain/void-chestplate-profile.js';

import {
  widenPauldrons,
  moveCore,
  cleanupOrphanPixels,
  enforceInnerStructuralRigidity,
  applyDropShadow,
} from '../codex/core/pixelbrain/edit-compiler.js';

import {
  enhanceSquaresForRender,
} from '../codex/core/pixelbrain/square-sharpness-contrast-amp.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Support CLI variant name so we can generate e.g. "void-1", "void-2" etc.
// Default preserves all existing behavior + pinned test paths.
const variant = process.argv[2] || 'new-void-chestplate';
const OUT_DIR = resolve(__dirname, '..', 'output', 'foundry', variant);

// Palette now imported from void-chestplate-profile.js for single source of truth (100% color accuracy)

export function buildVoidChestplateSpec(theme = 'void') {
  const isIcyHoly = /icy|holy|fire/i.test(theme);
  const id = isIcyHoly ? 'icy.holyfire.chestplate.v1' : 'void.chestplate.sovereign.v1';
  const themes = isIcyHoly ? ['icy', 'holy', 'fire', 'resonance'] : ['void', 'will', 'resonance'];
  const bytecode = isIcyHoly ? 'VW-ICY-HOLYFIRE-TRANSCENDENT' : 'VW-VOID-WILL-SONIC-TRANSCENDENT';

  // Icy Holy Fire conversion: cold icy plates + holy fire core/energy + sanctified gold trim
  const bodyFill = isIcyHoly ? 'holy_steel' : 'voidsteel';
  const bodyTrim = isIcyHoly ? 'sanctified_gold' : 'void_gold';

  const mantleFill = isIcyHoly ? 'icy_fire' : 'amethyst_resonance';
  const pauldronFill = isIcyHoly ? 'icy_fire' : 'sapphire_enamel';
  const coreFill = isIcyHoly ? 'divine_flame_core' : 'void_core';
  const harnessFill = isIcyHoly ? 'holy_fire' : 'void_rune_glow';
  const emblemFill = isIcyHoly ? 'sanctified_gold' : 'amethyst_resonance';
  const runeFill = isIcyHoly ? 'holy_fire' : 'void_rune_glow';
  const collarFill = isIcyHoly ? 'holy_steel' : 'obsidian';
  const lowerDropFill = isIcyHoly ? 'divine_flame_core' : 'void_core';

  return {
    contract: 'ITEM-SPEC-v1',
    id,
    class: 'armor',
    archetype: 'chestplate',
    rarity: 'legendary',
    theme: themes,
    canvas: { width: 64, height: 80, gridSize: 1 },
    seed: 110731,
    bytecode,
    bands: 7,
    proportions: {
      profile: 'human_regular',
      shoulderScale: 1.45,           // wider dramatic wings to match image
      pauldronScale: 1.35,           // oversized horned/winged pauldrons like the reference
      waistTaper: 0.68,
      allowOversizedPauldrons: false, // enable for the wing-like extension in the image
    },
    fidelity: {
      qualityTarget: 'pro_game_icon',
      paletteBudget: 64,
      bevelStrength: 1.5,          // extremely strong bevels for pronounced metal look
      rimContrast: 1.3,            // much crisper gold edges
      centralGlowContainment: 0.95,
      noiseFloor: 'none',          // clean for pro polished appearance
    },
    construction: {
      version: 'construction-v1',
      center: { x: 32, y: 32 },
      rings: [
        { radius: 5, role: 'top-crystal' },
        { radius: 9, role: 'core-orb' },
        { radius: 14, role: 'harness-frame' },
      ],
      radials: { count: 8, offsetDegrees: 22.5 },
      axes: true,
      // Emergent harmonic boon: use golden spacing + symmetric guides for Icy Holy Fire
      // This reconciles Sketch + Fibonacci + Symmetry at the construction layer.
      goldenSpacing: isIcyHoly,
      symmetricGuides: isIcyHoly,
      harmonic: isIcyHoly,
      symmetry: isIcyHoly ? { axis: 'vertical', mode: 'strict' } : undefined,
    },
    symmetry: {
      axis: 'vertical',
      mode: 'strict',
    },
    light: {
      angle: Math.PI * 1.25,
      ambient: 0.24,
    },
    parts: [
      {
        id: 'body',
        profile: 'armor.chestplate.void_royal_human',
        params: {
          shoulderWidth: 46,
          chestWidth: 38,
          waistWidth: 26,
          torsoHeight: 58,
          neckWidth: 12,
        },
        fill: { material: bodyFill, intensity: 'dark' },
        trim: { material: bodyTrim, anchor: 'body' },
        outline: { material: 'blacksteel', anchor: 'shadow' },
      },
      {
        id: 'mantle',
        profile: 'armor.panel.void_reference_mantle',
        attach: { parent: 'body', at: 'centerChest' },
        fill: { material: mantleFill, intensity: 'dark' },
        trim: { material: bodyTrim, anchor: 'body' },
        outline: { material: 'blacksteel', anchor: 'shadow' },
      },
      {
        id: 'collar',
        profile: 'armor.collar.high_void',
        params: { neckWidth: 12 },
        attach: { parent: 'body', at: 'top' },
        fill: { material: collarFill, intensity: 'dark' },
        trim: { material: bodyTrim, anchor: 'deep' },
        outline: { material: bodyTrim, anchor: 'body' },  // outer silhouette border  (sanctified for icy-holy)
      },
      {
        id: 'left_pauldron',
        profile: 'armor.pauldron.void_reference_human',
        attach: { parent: 'body', at: 'leftShoulder' },
        fill: { material: pauldronFill, intensity: 'bright' },  // icy fire for Icy Holy Fire shoulders
        trim: { material: bodyTrim, anchor: 'body' },
        outline: { material: bodyTrim, anchor: 'body' },  // sanctified gold outer border
        // Use new SDF + Noise abilities for dramatic winged silhouette (matching the reference image)
        sdf: {
          contract: 'PB-SDF-v1',
          primitives: [
            { type: 'capsule', params: { p1: { x: 8, y: 5 }, p2: { x: 22, y: 18 }, radius: 7 } }, // outer wing
            { type: 'capsule', params: { p1: { x: 12, y: 8 }, p2: { x: 18, y: 22 }, radius: 4 } },
          ],
          operations: [
            { op: 'smoothUnion', k: 2.5, children: [0, 1] }
          ]
        },
        noise: {
          contract: 'PB-NOISE-v1',
          id: 'enamel-variation',
          type: 'fbm',
          seed: 0xA1B2C3,
          octaves: 2,
          frequency: 0.18,
          amplitude: 0.35
        }
      },
      {
        id: 'right_pauldron',
        mirrorOf: 'left_pauldron',
      },
      {
        id: 'center_core',
        profile: 'gem.socket.void_orb',
        params: { r: 5, height: 18 },  // taller vertical crystal to match image
        attach: { parent: 'body', at: 'centerChest' },
        fill: { material: coreFill, intensity: 'bright' },  // divine flame core for Icy Holy Fire
        trim: { material: bodyTrim, anchor: 'frost' },
        outline: { material: bodyTrim, anchor: 'deep' },
        glow: { material: 'amethyst', radius: 5, containment: 0.9 },
        // New SDF for faceted tall crystal look in the reference
        sdf: {
          contract: 'PB-SDF-v1',
          primitives: [
            { type: 'capsule', params: { p1: { x: 32, y: 18 }, p2: { x: 32, y: 38 }, radius: 4.5 } },
            { type: 'box', params: { center: { x: 32, y: 28 }, size: { x: 2.5, y: 14 } } }
          ],
          operations: [ { op: 'union', children: [0, 1] } ]
        }
      },
      {
        id: 'top_crystal',
        profile: 'gem.socket.void_reference_top',
        params: { r: 3 },
        attach: { parent: 'body', at: 'centerChest' },
        fill: { material: coreFill, intensity: 'bright' },
        trim: { material: bodyTrim, anchor: 'spectral' },
        outline: { material: bodyTrim, anchor: 'deep' },
      },
      {
        id: 'harness',
        profile: 'armor.panel.void_reference_harness',
        attach: { parent: 'body', at: 'safeZoneUpperLower' },
        fill: { material: harnessFill, intensity: 'dark' },
        trim: { material: bodyTrim, anchor: 'frost' },
        outline: { material: 'blacksteel', anchor: 'void' },
      },
      {
        id: 'lower_drop',
        profile: 'gem.socket.void_reference_drop',
        attach: { parent: 'body', at: 'waist' },
        fill: { material: lowerDropFill, intensity: 'light' },
        trim: { material: bodyTrim, anchor: 'frost' },
        outline: { material: bodyTrim, anchor: 'deep' },
      },
      {
        id: 'emblem',
        profile: 'heraldry.void_eye',
        attach: { parent: 'body', at: 'safeZoneCenter' },
        fill: { material: emblemFill, anchor: 'frost' },
      },
      {
        id: 'rune_channels',
        profile: 'motif.harmonic_channels',
        params: { span: 14 },
        attach: { parent: 'body', at: 'safeZoneUpperLower' },
        fill: { material: runeFill, anchor: 'body' },
        outline: { material: bodyTrim, anchor: 'deep' },
        motif: {
          kind: 'rune-row',
          count: 3,
          core: { material: runeFill, anchor: 'frost' },
        },
      },
    ],
    heraldry: [
      {
        id: 'emblem',
        mark: 'eye',
        target: 'harness',
        placement: { dx: 0, dy: 0 },
        scale: 1,
        required: true,
        symmetry: 'vertical',
        style: {
          effect: 'inlay',
          material: emblemFill,
          anchor: 'frost',
        },
      },
    ],
    shader: {
      kind: 'void-armor-breath',
      targetParts: ['center_core', 'emblem', 'rune_channels'],
      resonanceDefault: 0.34,
      pulseSpeed: 0.7,
      amplitude: 0.18,
      sparkleDensity: 0.03,
      flicker: 0,
    },
  };
}

export function forgeVoidChestplate(theme = 'void') {
  const isIcyHolyVariantLocal = /icy|holy|fire/i.test(theme);
  const REMAP_PALETTE_LOCAL = isIcyHolyVariantLocal ? [
    '#02070A', '#06131C', '#0E0902', '#160F02', '#1A1206',
    '#06324A', '#2A1F08', '#5A4418', '#7A4A10',
    '#0EA5E9', '#7DD3FC', '#B8F7FF', '#C7D2FE',
    '#F59E0B', '#A88C40', '#D4B860', '#E8C46A', '#F0B450', '#FFD888',
    '#FDE68A', '#FEF3C7', '#FFFBEB', '#FFF0B8', '#FFFDF0',
    '#8FA8C0', '#B8C8D8', '#D8E2EE',
    '#000004', '#05050D', '#0B0B14'
  ] : VOID_CHESTPLATE_EXACT_PALETTE;
  const bundle = forgeItemAsset(buildVoidChestplateSpec(theme), {
    includeShader: true,
    includePng: true,
    pngScale: 6,
  });
  let editorAssetPacket = {
    ...bundle.assetPacket,
    metadata: {
      ...(bundle.assetPacket.metadata || {}),
      editorPalette: {
        id: 'icy-holy-fire-exact',
        label: 'Icy Holy Fire Chestplate Exact Palette',
        colors: REMAP_PALETTE_LOCAL,
      },
      // Edit Compiler integration
      polishProfile: VAELRIX_VOID_ARMOR_POLISH_PROFILE,
      masks: VOID_CHESTPLATE_MASKS,
      anchors: VOID_CHESTPLATE_ANCHORS,
    },
    // Attach masks directly for UI addressability (packet.masks.*)
    masks: VOID_CHESTPLATE_MASKS,
  };

  // Deterministic post-polish using the new Edit Compiler pure verbs
  // to replicate the dramatic wide wings and prominent crystal from the reference image.
  // Helper to safely override coordinates (stale .geometry in spread wins normalizeGeometry otherwise).
  const withCoords = (pkt, newCoords) => {
    const clean = { ...pkt };
    delete clean.geometry;
    return createPixelBrainAssetPacket({ ...clean, coordinates: newCoords });
  };

  try {
    let polished = widenPauldrons(editorAssetPacket, 5);
    polished = moveCore(polished, -1);

    // Extra crisp polish and detail pass using sharpness AMP to bring out the facets, borders, and small crosses like the reference
    const sharpened = enhanceSquaresForRender(polished.geometry.coordinates, {
      edgeContrast: 0.85,
      interiorContrast: 0.45,
      isolatedEmphasisScale: 0.8,
      isolatedAccentIntensity: 0.9,
      midtoneSupport: 0.35
    });
    polished = withCoords(polished, sharpened);

    editorAssetPacket = withCoords(polished, polished.geometry?.coordinates || polished.coordinates || sharpened);
    editorAssetPacket = createPixelBrainAssetPacket({
      ...editorAssetPacket,
      metadata: {
        ...editorAssetPacket.metadata,
        replicatedFromImage: true,
        replicationMethod: 'PixelBrain-Edit-Compiler + SDF/Noise + style-profile + widen/move verbs + sharpness polish',
      },
      masks: editorAssetPacket.masks || polished.masks || VOID_CHESTPLATE_MASKS,
    });

    // Add the small purple cross details on the side void panels exactly as in the reference image
    // (deterministic positions relative to anchors for perfect replication)
    const crossColor = '#FFD888'; // divine/holy highlight for Icy Holy Fire (or original purple for void)
    const crossOffsets = [
      {x: 0, y: 0}, {x: -1, y: 0}, {x: 1, y: 0}, {x: 0, y: -1}, {x: 0, y: 1}
    ];
    const leftCrossCenter = { x: 20, y: 30 }; // left void panel, tuned to image
    const rightCrossCenter = { x: 44, y: 30 }; // mirrored
    let finalCoords = [...(editorAssetPacket.geometry?.coordinates || editorAssetPacket.coordinates || [])];
    [leftCrossCenter, rightCrossCenter].forEach(center => {
      crossOffsets.forEach(off => {
        const cx = center.x + off.x;
        const cy = center.y + off.y;
        // avoid overwriting important cells
        if (!finalCoords.some(c => c.x === cx && c.y === cy)) {
          finalCoords.push({ 
            x: cx, y: cy, 
            snappedX: cx, snappedY: cy,
            color: crossColor, partId: 'small_cross', emphasis: 1 
          });
        }
      });
    });
    editorAssetPacket = withCoords(editorAssetPacket, finalCoords);

    // Force 100% color accuracy to exact palette (fixes "ColorAMP 90%" off-by-palette)
    // and ensure full gold trim on all silhouette edges using actual computed min/max per y (robust, not brittle x-bounds).
    const palette = REMAP_PALETTE_LOCAL;
    const closestColor = (hex) => {
      if (palette.includes(hex)) return hex;
      let best = palette[0];
      let bestDist = Infinity;
      const r = parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
      palette.forEach(p => {
        const pr = parseInt(p.slice(1,3),16), pg=parseInt(p.slice(3,5),16), pb=parseInt(p.slice(5,7),16);
        const d = (r-pr)**2 + (g-pg)**2 + (b-pb)**2;
        if (d < bestDist) { bestDist = d; best = p; }
      });
      return best;
    };
    const srcCoords = editorAssetPacket.geometry?.coordinates || editorAssetPacket.coordinates || [];
    let remappedCoords = srcCoords.map(c => ({
      ...c,
      color: closestColor(c.color)
    }));
    const GOLD = isIcyHolyVariantLocal ? '#D4B860' : '#A58A2D';
    // Compute true silhouette edges for 100% trim guarantee
    const byYRemap = new Map();
    remappedCoords.forEach(c => { if (!byYRemap.has(c.y)) byYRemap.set(c.y, []); byYRemap.get(c.y).push(c); });
    const edgeKeys = new Set();
    byYRemap.forEach((ycells, y) => {
      const nonCrystal = ycells.filter(c => !c.partId || !['center_core', 'top_crystal'].includes(c.partId));
      if (nonCrystal.length < 2) return;
      const minX = Math.min(...nonCrystal.map(c => c.x));
      const maxX = Math.max(...nonCrystal.map(c => c.x));
      edgeKeys.add(`${minX},${y}`);
      edgeKeys.add(`${maxX},${y}`);
    });
    remappedCoords = remappedCoords.map(c => {
      const key = `${c.x},${c.y}`;
      if (edgeKeys.has(key) || c.isRim) {
        const isPaul = c.partId && c.partId.includes('pauldron');
        const newPart = isPaul ? (String(c.partId).includes('left') ? 'left_pauldron_trim' : 'right_pauldron_trim') : 'body_trim';
        return { ...c, color: GOLD, partId: newPart };
      }
      return c;
    });
    editorAssetPacket = withCoords(editorAssetPacket, remappedCoords);

    // Final 100% armor trim force + explicit bottom connector bar (fresh plain objects + withCoords to persist).
    let finalForTrim = (editorAssetPacket.geometry?.coordinates || editorAssetPacket.coordinates || []).map(c => ({ ...c }));
    const byYForTrim = new Map();
    finalForTrim.forEach(c => {
      if (!byYForTrim.has(c.y)) byYForTrim.set(c.y, []);
      byYForTrim.get(c.y).push(c);
    });
    byYForTrim.forEach((ycells, y) => {
      const nonCrystal = ycells.filter(c => !c.partId || !['center_core', 'top_crystal'].includes(c.partId));
      if (nonCrystal.length < 2) return;
      const minX = Math.min(...nonCrystal.map(c => c.x));
      const maxX = Math.max(...nonCrystal.map(c => c.x));
      const left = finalForTrim.find(c => c.x === minX && c.y === y);
      const right = finalForTrim.find(c => c.x === maxX && c.y === y);
      if (left) {
        left.color = GOLD;
        left.partId = left.partId && left.partId.includes('pauldron') ? (left.partId.includes('left') ? 'left_pauldron_trim' : 'right_pauldron_trim') : 'body_trim';
      }
      if (right) {
        right.color = GOLD;
        right.partId = right.partId && right.partId.includes('pauldron') ? (right.partId.includes('left') ? 'left_pauldron_trim' : 'right_pauldron_trim') : 'body_trim';
      }
    });
    // Bottom trim bar connects the sides (user: "needs to connect on the bottom")
    const maxY = Math.max(...finalForTrim.map(c => c.y));
    const bottom = finalForTrim.filter(c => c.y === maxY);
    if (bottom.length > 0) {
      const bmin = Math.min(...bottom.map(c => c.x));
      const bmax = Math.max(...bottom.map(c => c.x));
      const barY = maxY + 1;
      finalForTrim.push({ x: bmin-1, y: barY, color: GOLD, partId: 'bottom_trim', emphasis: 1, snappedX: bmin-1, snappedY: barY });
      finalForTrim.push({ x: bmax+1, y: barY, color: GOLD, partId: 'bottom_trim', emphasis: 1, snappedX: bmax+1, snappedY: barY });
      for (let x = bmin; x <= bmax; x++) {
        finalForTrim.push({ x, y: barY, color: GOLD, partId: 'bottom_trim', emphasis: 1, snappedX: x, snappedY: barY });
      }
    }
    editorAssetPacket = withCoords(editorAssetPacket, finalForTrim);

    // ── Algorithmic Tuning Passes (addressing specific visual QA feedback) ──
    // 1. Orphan pixel cleanup: merge isolated light purple / intricate-band dots
    //    unless they are protected motifs (crosses, core, emblem, trims).
    try {
      editorAssetPacket = cleanupOrphanPixels(editorAssetPacket, {
        protectPartIds: ['small_cross', 'emblem', 'center_core', 'top_crystal', 'rune_channels', 'body_trim', 'left_pauldron_trim', 'right_pauldron_trim', 'bottom_trim'],
        minSameNeighbors: 1,
      });
    } catch (e) { console.warn('orphan cleanup skipped:', e.message); }

    // 2. Inner structural rigidity: fight blobbiness on dark purple / mantle / body areas
    //    below collar and central band. Uses both part names present in this generator
    //    ('body', 'mantle', 'harness') + color filters. Outer gold trims untouched.
    try {
      editorAssetPacket = enforceInnerStructuralRigidity(editorAssetPacket, {
        innerPartIds: ['mantle', 'harness', 'body', 'collar'],
        innerColors: ['#01030A', '#030308', '#0B0B14', '#16161F', '#05050D', '#0E1020', '#191C2D', '#20284A'],
      });
    } catch (e) { console.warn('inner rigidity skipped:', e.message); }

    // 3. Drop shadows from the blue pauldron areas (left/right_pauldron with #3920A0 etc)
    //    down onto the dark fabric (body/mantle darks) to create volume.
    try {
      editorAssetPacket = applyDropShadow(editorAssetPacket, {
        sourcePartIds: ['left_pauldron', 'right_pauldron'],
        targetPartIdsOrColors: ['body', 'mantle', 'harness'],
        targetTestColors: ['#01030A', '#030308', '#0B0B14', '#16161F', '#05050D', '#0E1020'],
        maxOffset: 2,
        feather: true,
      });
    } catch (e) { console.warn('drop shadow skipped:', e.message); }

  } catch (e) {
    console.warn('Edit Compiler polish step skipped (non-fatal):', e.message);
  }
  const materialSlotManifest = buildMaterialSlotManifest(bundle.spec.parts);
  return {
    bundle,
    editorAssetPacket,
    diagnostics: {
      code: 'VOID_CHESTPLATE_EXPORT_READY',
      item: bundle.spec.id,
      spec: {
        id: bundle.spec.id,
        hash: hashItemSpec(bundle.spec),
      },
      cells: bundle.assetPacket.geometry.coordinates.length,
      materialSlotManifest,
      editorPalette: {
        id: 'icy-holy-fire-exact',
        colors: REMAP_PALETTE_LOCAL,
      },
      shader: bundle.shader?.packet
        ? {
            id: bundle.shader.packet.id,
            hash: bundle.shader.hash,
            contract: 'PB-SHADER-v1',
          }
        : null,
      heraldry: bundle.fills.heraldry ?? null,
      fills: bundle.fills.diagnostics,
      chestplate: bundle.template.chestplateDiagnostics ?? null,
    },
  };
}

function resolvePartMaterial(partsById, part, field, seen = new Set()) {
  if (!part) return null;
  if (part[field]?.material) return part[field].material;
  if (!part.mirrorOf || seen.has(part.id)) return null;
  seen.add(part.id);
  return resolvePartMaterial(partsById, partsById.get(part.mirrorOf), field, seen);
}

function buildMaterialSlotManifest(parts) {
  const partsById = new Map(parts.map((part) => [part.id, part]));
  return Object.fromEntries(
    parts.map((part) => [
      part.id,
      {
        fill: resolvePartMaterial(partsById, part, 'fill'),
        trim: resolvePartMaterial(partsById, part, 'trim'),
        outline: resolvePartMaterial(partsById, part, 'outline'),
      },
    ]),
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const theme = (variant && (variant.includes('icy') || variant.includes('holy') || variant.includes('fire'))) ? 'icy-holy-fire' : 'void';
  let { bundle, editorAssetPacket, diagnostics } = forgeVoidChestplate(theme);

  // Allow naming this generated asset (e.g. Void-1 or icy-holy-fire-chestplate)
  const isIcyHolyVariant = theme === 'icy-holy-fire';
  if (variant !== 'new-void-chestplate') {
    const desiredId = isIcyHolyVariant ? 'icy.holyfire.chestplate.v1' : `void.chestplate.${variant}.v1`;
    editorAssetPacket = createPixelBrainAssetPacket({
      ...editorAssetPacket,
      source: {
        ...(editorAssetPacket.source || {}),
        id: desiredId,
        label: isIcyHolyVariant ? 'Icy Holy Fire Chestplate' : 'Void-1',
      },
    });
    diagnostics = {
      ...diagnostics,
      item: desiredId,
      spec: diagnostics.spec ? { ...diagnostics.spec, id: desiredId } : { id: desiredId },
    };
  }

  // Theme-specific trim/cross/palette for the post-processing force (keeps 100% silhouette trim)
  const GOLD = isIcyHolyVariant ? '#D4B860' : '#A58A2D';  // sanctified bright for holy trim
  const crossColor = isIcyHolyVariant ? '#FFD888' : '#6B35B8'; // divine/holy highlight or void purple
  const REMAP_PALETTE = isIcyHolyVariant ? [
    '#02070A', '#06131C', '#0E0902', '#160F02', '#1A1206',
    '#06324A', '#2A1F08', '#5A4418', '#7A4A10',
    '#0EA5E9', '#7DD3FC', '#B8F7FF', '#C7D2FE',
    '#F59E0B', '#A88C40', '#D4B860', '#E8C46A', '#F0B450', '#FFD888',
    '#FDE68A', '#FEF3C7', '#FFFBEB', '#FFF0B8', '#FFFDF0',
    '#8FA8C0', '#B8C8D8', '#D8E2EE',
    '#000004', '#05050D', '#0B0B14'
  ] : VOID_CHESTPLATE_EXACT_PALETTE;

  // Ensure tuning passes run on the final packet (after any id override for variants like Void-1).
  // The edit-compiler helpers are robust but this generator also has direct coord surgery.
  try {
    editorAssetPacket = cleanupOrphanPixels(editorAssetPacket, {
      protectPartIds: ['small_cross', 'emblem', 'center_core', 'top_crystal', 'rune_channels', 'body_trim', 'left_pauldron_trim', 'right_pauldron_trim', 'bottom_trim'],
    });
  } catch (e) {}
  try {
    editorAssetPacket = enforceInnerStructuralRigidity(editorAssetPacket, {
      innerPartIds: ['mantle', 'harness', 'body', 'collar'],
    });
  } catch (e) {}
  try {
    editorAssetPacket = applyDropShadow(editorAssetPacket, {
      sourcePartIds: ['left_pauldron', 'right_pauldron'],
      targetPartIdsOrColors: ['body', 'mantle', 'harness'],
    });
  } catch (e) {}

  // Direct asset-specific tuning for Void chestplate (guarantees response to the QA feedback
  // even if the general edit-compiler heuristics are conservative on this intricate geometry).
  try {
    const withCoordsLocal = (pkt, newCoords) => {
      const clean = { ...pkt };
      delete clean.geometry;
      return createPixelBrainAssetPacket({ ...clean, coordinates: newCoords });
    };
    let finalCoords = [...(editorAssetPacket.geometry?.coordinates || editorAssetPacket.coordinates || [])];
    const pos = new Map(finalCoords.map(c => [`${c.x},${c.y}`, c]));
    const four = [[-1,0],[1,0],[0,-1],[0,1]];

    // 1. Orphan cleanup (direct): light purple intricate dots in the central band (y~18-28)
    //    that have <=1 same-color 4-neighbor and are not protected get merged to dominant neighbor.
    const protectPids = ['small_cross','emblem','center_core','top_crystal','rune_channels','body_trim','left_pauldron_trim','right_pauldron_trim','bottom_trim'];
    const goldSet = new Set(['#A58A2D','#CEB65A','#E8DA91']);
    let orphansFixed = 0;
    finalCoords = finalCoords.map(c => {
      const pid = c.partId || '';
      if (protectPids.some(p => pid.includes(p)) || goldSet.has(c.color)) return c;
      if (c.y < 16 || c.y > 30) return c; // focus central horizontal band
      let same = 0;
      four.forEach(([dx,dy]) => { if (pos.get(`${c.x+dx},${c.y+dy}`)?.color === c.color) same++; });
      if (same <= 1) {
        // find dominant neighbor
        const cnt = new Map();
        [...four, [-1,-1],[-1,1],[1,-1],[1,1]].forEach(([dx,dy]) => {
          const nc = pos.get(`${c.x+dx},${c.y+dy}`)?.color;
          if (nc) cnt.set(nc, (cnt.get(nc)||0)+1);
        });
        let dom = c.color, best = 0;
        for (const [col,n] of cnt) if (n>best){best=n; dom=col;}
        if (dom !== c.color) { orphansFixed++; return { ...c, color: dom }; }
      }
      return c;
    });
    if (orphansFixed > 0) {
      editorAssetPacket = withCoordsLocal(editorAssetPacket, finalCoords);
      console.log(`  tuning: merged ${orphansFixed} orphan pixels in central band`);
    }

    // Refresh pos map after possible change
    finalCoords = [...(editorAssetPacket.geometry?.coordinates || editorAssetPacket.coordinates || [])];
    pos.clear(); finalCoords.forEach(c => pos.set(`${c.x},${c.y}`, c));

    // 2. Inner rigidity (direct): below collar (y 13-26) on dark purple body/mantle cells,
    //    snap extreme single-pixel jogs left/right to reduce blobbiness vs the sharp belt.
    const darkInner = new Set(['#01030A','#030308','#0B0B14','#16161F','#05050D']);
    let rigidityFixed = 0;
    const byY2 = new Map();
    finalCoords.forEach(c => { if (!byY2.has(c.y)) byY2.set(c.y,[]); byY2.get(c.y).push(c); });
    for (let y=13; y<=26; y++) {
      const row = (byY2.get(y) || []).filter(c => darkInner.has(c.color) && ( (c.partId||'').includes('body') || (c.partId||'').includes('mantle') ));
      if (row.length < 5) continue;
      const xs = row.map(c=>c.x).sort((a,b)=>a-b);
      const minX = xs[0], maxX = xs[xs.length-1];
      // adjacent rows for guidance
      const pRow = byY2.get(y-1) || [];
      const pDark = pRow.filter(c=>darkInner.has(c.color));
      if (pDark.length >= 3) {
        const pmin = Math.min(...pDark.map(c=>c.x));
        const pmax = Math.max(...pDark.map(c=>c.x));
        row.forEach(c => {
          if (c.x === minX && minX < pmin-1) {
            const k = `${c.x},${y}`; const idx = finalCoords.findIndex(cc=>`${cc.x},${cc.y}`===k);
            if (idx>=0) { finalCoords[idx] = {...finalCoords[idx], x: pmin-1}; rigidityFixed++; }
          }
          if (c.x === maxX && maxX > pmax +1) {
            const k = `${c.x},${y}`; const idx = finalCoords.findIndex(cc=>`${cc.x},${cc.y}`===k);
            if (idx>=0) { finalCoords[idx] = {...finalCoords[idx], x: pmax+1}; rigidityFixed++; }
          }
        });
      }
    }
    if (rigidityFixed > 0) {
      editorAssetPacket = withCoordsLocal(editorAssetPacket, finalCoords);
      console.log(`  tuning: fixed ${rigidityFixed} inner boundary jogs (anti-blob)`);
    }

    // Refresh again
    finalCoords = [...(editorAssetPacket.geometry?.coordinates || editorAssetPacket.coordinates || [])];
    pos.clear(); finalCoords.forEach(c => pos.set(`${c.x},${c.y}`, c));

    // 3. Drop shadows (direct + reliable): under the blue pauldron regions (mainly x 8-20 and 44-56, y~6-13)
    //    place darker fabric pixels on the dark body/mantle below to give volume.
    const pauldronBlue = ['#3920A0'];
    let shadowAdded = 0;
    const pauldronBottomPerX = new Map();
    finalCoords.forEach(c => {
      if (pauldronBlue.includes(c.color) || (c.partId||'').includes('pauldron')) {
        const prev = pauldronBottomPerX.get(c.x) || -1;
        pauldronBottomPerX.set(c.x, Math.max(prev, c.y));
      }
    });
    pauldronBottomPerX.forEach((by, bx) => {
      for (let off=1; off<=2; off++) {
        const ty = by + off;
        const tkey = `${bx},${ty}`;
        const tcell = pos.get(tkey);
        if (tcell && darkInner.has(tcell.color)) {
          const newC = { ...tcell, color: off===1 ? '#000004' : '#05050D', partId: (tcell.partId||'body')+'_shadow', role: 'shadow', emphasis: 0.35 };
          // insert or override
          const idx = finalCoords.findIndex(cc => cc.x===bx && cc.y===ty);
          if (idx>=0) finalCoords[idx] = newC; else finalCoords.push(newC);
          shadowAdded++;
          if (off===1) {
            // feather sides
            [-1,1].forEach(dx => {
              const sk = `${bx+dx},${ty}`;
              const sc = pos.get(sk);
              if (sc && darkInner.has(sc.color)) {
                const snew = { ...sc, color: '#05050D', partId: (sc.partId||'body')+'_shadow', role:'shadow', emphasis:0.25 };
                const sidx = finalCoords.findIndex(cc=>cc.x===bx+dx && cc.y===ty);
                if (sidx>=0) finalCoords[sidx]=snew; else finalCoords.push(snew);
                shadowAdded++;
              }
            });
          }
        }
      }
    });
    if (shadowAdded > 0) {
      editorAssetPacket = withCoordsLocal(editorAssetPacket, finalCoords);
      console.log(`  tuning: cast ${shadowAdded} drop shadow pixels under pauldrons for volume`);
    }

  } catch (e) {
    console.warn('direct asset tuning skipped (non-fatal):', e.message);
  }

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(resolve(OUT_DIR, `${variant}.json`), JSON.stringify(editorAssetPacket, null, 2), 'utf8');
  if (bundle.godotArtifact) {
    writeFileSync(resolve(OUT_DIR, `${variant}.pbrain`), bundle.godotArtifact, 'utf8');
  }
  writeFileSync(resolve(OUT_DIR, `${variant}.aseprite`), exportFoundryToAsepriteBinary(bundle));
  writeFileSync(resolve(OUT_DIR, `${variant}.png`), bundle.png);
  writeFileSync(resolve(OUT_DIR, `${variant}.1x.png`), renderBundlePng(bundle, 1));
  if (bundle.godotShader) {
    writeFileSync(resolve(OUT_DIR, `${variant}.gdshader`), bundle.godotShader, 'utf8');
  }
  if (bundle.phaserPipeline) {
    writeFileSync(resolve(OUT_DIR, `${variant}.phaser.js`), bundle.phaserPipeline, 'utf8');
  }
  writeFileSync(
    resolve(OUT_DIR, `${variant}.forge.diagnostics.json`),
    JSON.stringify(diagnostics, null, 2),
    'utf8',
  );
  console.log(`forged ${variant} ${hashItemSpec(bundle.spec)} ${bundle.assetPacket.geometry.coordinates.length} cells`);
}
