/**
 * RESONANCE SHIELD CLASS — slot-bound shield generator.
 *
 * One parametric shield template, many shields: every visual role is a named
 * MATERIAL SLOT, so a new variant is a bindings object, not a new spec.
 *
 *   slots = {
 *     shell:      face material (the field inside the rim)
 *     rim:        dark metal rim band (shield authority / edge thickness)
 *     rimEdge:    rim outline material (selout turns it into directional glints)
 *     core:       central medallion plate the glyph sits on (containment)
 *     sonicRings: concentric resonance rings (3:4:5 harmonic radii)
 *     separators: thin dark bands between rings (embeds the arcs in the face)
 *     glyph:      heraldic mark inlay
 *     glyphBack:  slightly fattened dark backing — the glyph's outline grammar
 *   }
 *
 * Structure (all existing engine capability, zero engine changes):
 *   shield.targe     face ellipse            (RadialShield role)
 *   shield.rimband   3px elliptical rim      (RadialShield role)
 *   sonic.rings      harmonic ring overlay   (SonicWave role)
 *   shield.medallion central plate overlay   (VoidCore role)
 *   heraldry ×2      backing + glyph inlays  (WillGlyph role)
 *
 * Usage:
 *   node scripts/forge-resonance-shields.mjs            # all variants
 *   node scripts/forge-resonance-shields.mjs void-sonic # one variant
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { forgeItemAsset, renderBundlePng } from '../codex/core/pixelbrain/item-foundry.js';
import { registerPartProfile } from '../codex/core/pixelbrain/part-profile-library.js';
import { hashItemSpec } from '../codex/core/pixelbrain/item-spec.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_ROOT = resolve(__dirname, '..', 'output', 'foundry');

function roundInt(value) { return Math.round(Number(value) || 0); }

// ── Part profiles (script-side, the established authoring surface) ────────

// Solid ellipse face with attachable anchors.
registerPartProfile('shield.targe', (params = {}) => {
  const cx = roundInt(params.cx);
  const cy = roundInt(params.cy);
  const rx = roundInt(params.rx);
  const ry = roundInt(params.ry);
  const cells = [];
  for (let y = cy - ry; y <= cy + ry; y += 1) {
    for (let x = cx - rx; x <= cx + rx; x += 1) {
      if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) cells.push({ x, y });
    }
  }
  return {
    cells,
    anchors: { base: { x: cx, y: cy - ry }, tip: { x: cx, y: cy + ry }, center: { x: cx, y: cy } },
  };
});

// Elliptical rim band: the outer shell of the face ellipse, `thickness`
// cells deep. Gives the silhouette a physical defensive lip instead of an
// orb edge.
registerPartProfile('shield.rimband', (params = {}) => {
  const cx = roundInt(params.cx);
  const cy = roundInt(params.cy);
  const rx = roundInt(params.rx);
  const ry = roundInt(params.ry);
  const thickness = Math.max(1, roundInt(params.thickness ?? 3));
  const innerRx = rx - thickness;
  const innerRy = ry - thickness;
  const cells = [];
  for (let y = cy - ry; y <= cy + ry; y += 1) {
    for (let x = cx - rx; x <= cx + rx; x += 1) {
      const outer = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
      const inner = ((x - cx) / innerRx) ** 2 + ((y - cy) / innerRy) ** 2 <= 1;
      if (outer && !inner) cells.push({ x, y });
    }
  }
  return {
    cells,
    // Overlay anchor: composer aligns child base to parent anchor + 1 row;
    // declaring base at exactly that row makes the translation zero.
    anchors: { base: { x: cx, y: roundInt(params.anchorY ?? cy - ry) }, center: { x: cx, y: cy } },
  };
});

// Concentric resonance rings — nodal circles at harmonic radii.
registerPartProfile('sonic.rings', (params = {}) => {
  const cx = roundInt(params.cx);
  const cy = roundInt(params.cy);
  const radii = (Array.isArray(params.radii) ? params.radii : [12, 16, 20]).map(roundInt);
  const thickness = Math.max(1, roundInt(params.thickness ?? 2));
  const cells = [];
  const seen = new Set();
  for (const r of radii) {
    for (let y = cy - r; y <= cy + r; y += 1) {
      for (let x = cx - r; x <= cx + r; x += 1) {
        const d = Math.hypot(x - cx, y - cy);
        if (d <= r && d >= r - thickness) {
          const key = `${x},${y}`;
          if (!seen.has(key)) { seen.add(key); cells.push({ x, y }); }
        }
      }
    }
  }
  return {
    cells,
    anchors: {
      base: { x: cx, y: roundInt(params.anchorY ?? cy - Math.max(...radii)) },
      center: { x: cx, y: cy },
    },
  };
});

// Central medallion plate — the glyph's containment disc.
registerPartProfile('shield.medallion', (params = {}) => {
  const cx = roundInt(params.cx);
  const cy = roundInt(params.cy);
  const r = roundInt(params.r ?? 9);
  const cells = [];
  for (let y = cy - r; y <= cy + r; y += 1) {
    for (let x = cx - r; x <= cx + r; x += 1) {
      if (Math.hypot(x - cx, y - cy) <= r) cells.push({ x, y });
    }
  }
  return {
    cells,
    anchors: { base: { x: cx, y: roundInt(params.anchorY ?? cy - r) }, center: { x: cx, y: cy } },
  };
});

// ── Slot-bound spec builder ────────────────────────────────────────────────

function buildResonanceShieldSpec(variant) {
  const { id, archetype, bytecode, mark, slots, geometry = {} } = variant;
  const canvas = geometry.canvas ?? { width: 64, height: 64, gridSize: 1 };
  const cx = geometry.cx ?? Math.round(canvas.width / 2);
  const cy = geometry.cy ?? Math.round(canvas.height / 2);
  const rx = geometry.rx ?? 22;
  const ry = geometry.ry ?? 26;
  const ringRadii = geometry.ringRadii ?? [12, 16, 20];           // 3:4:5
  const separatorRadii = geometry.separatorRadii ?? [14, 18];
  const medallionR = geometry.medallionR ?? 9;
  const overlayAnchorY = cy - ry + 1; // face top + 1 → zero translation

  return {
    contract: 'ITEM-SPEC-v1',
    id,
    class: 'armor',
    archetype,
    canvas,
    seed: 1337,
    bytecode,
    bands: 7,
    light: { angle: Math.PI * 1.25, ambient: 0.28 },
    parts: [
      {
        id: 'face',
        profile: 'shield.targe',
        params: { cx, cy, rx, ry },
        fill: { material: slots.shell },
      },
      {
        id: 'rim',
        profile: 'shield.rimband',
        params: { cx, cy, rx, ry, thickness: 3, anchorY: overlayAnchorY },
        attach: { parent: 'face', at: 'base' },
        fill: { material: slots.rim },
        outline: { material: slots.rimEdge, anchor: 'body' }, // selout → glints
      },
      {
        id: 'separators',
        profile: 'sonic.rings',
        params: { cx, cy, radii: separatorRadii, thickness: 1, anchorY: overlayAnchorY },
        attach: { parent: 'face', at: 'base' },
        fill: { material: slots.separators },
      },
      {
        id: 'rings',
        profile: 'sonic.rings',
        params: { cx, cy, radii: ringRadii, thickness: 2, anchorY: overlayAnchorY },
        attach: { parent: 'face', at: 'base' },
        fill: { material: slots.sonicRings },
      },
      {
        id: 'medallion',
        profile: 'shield.medallion',
        params: { cx, cy, r: medallionR, anchorY: overlayAnchorY },
        attach: { parent: 'face', at: 'base' },
        fill: { material: slots.core },
      },
      { id: 'glyphBack', profile: 'none', attach: { parent: 'medallion', at: 'center' }, fill: { material: slots.glyphBack } },
      { id: 'glyph', profile: 'none', attach: { parent: 'medallion', at: 'center' }, fill: { material: slots.glyph } },
    ],
    heraldry: [
      // Order matters: the glyph stamps first and claims its cells; the
      // fattened backing then only fills the surrounding halo ring — the
      // glyph's 1px outline grammar.
      {
        id: 'glyph',
        mark,
        target: 'medallion',
        symmetry: 'vertical',
        style: { effect: 'inlay', material: slots.glyph, anchor: 'frost' },
      },
      {
        id: 'glyphBack',
        mark,
        target: 'medallion',
        scale: 1.2,
        symmetry: 'vertical',
        style: { effect: 'inlay', material: slots.glyphBack, anchor: 'deep' },
      },
    ],
  };
}

// ── The class roster ───────────────────────────────────────────────────────

const VARIANTS = [
  {
    name: 'void-sonic',
    label: 'Void Sonic Shield',
    id: 'voidshield.hd.v2',
    archetype: 'void_targe',
    bytecode: 'VW-VOID-INEXPLICABLE-HARMONIC',
    mark: 'eye',
    slots: {
      shell: 'onyx',
      rim: 'black_steel',
      rimEdge: 'gold',
      core: 'darksteel',
      sonicRings: 'amethyst',
      separators: 'darksteel',
      glyph: 'gold',
      glyphBack: 'gold',
    },
  },
  {
    name: 'holy-sonic',
    label: 'Holy Sonic Shield',
    id: 'holyshield.hd.v1',
    archetype: 'holy_targe',
    bytecode: 'VW-WILL-INEXPLICABLE-HARMONIC',
    mark: 'cross',
    slots: {
      shell: 'silver',
      rim: 'bronze',
      rimEdge: 'gold',
      core: 'gold',
      sonicRings: 'holy_fire',
      separators: 'bronze',
      glyph: 'ruby',
      glyphBack: 'bronze',
    },
  },
  {
    name: 'poison-echo',
    label: 'Poison Echo Shield',
    id: 'poisonshield.hd.v1',
    archetype: 'echo_targe',
    bytecode: 'VW-ALCHEMY-INEXPLICABLE-HARMONIC',
    mark: 'serpent',
    slots: {
      shell: 'onyx',
      rim: 'bronze',
      rimEdge: 'gold',
      core: 'black_steel',
      sonicRings: 'poison_flame',
      separators: 'darksteel',
      glyph: 'emerald',
      glyphBack: 'gold',
    },
  },
  {
    name: 'frost-resonance',
    label: 'Frost Resonance Buckler',
    id: 'frostbuckler.hd.v1',
    archetype: 'resonance_buckler',
    bytecode: 'VW-SONIC-INEXPLICABLE-HARMONIC',
    mark: 'moon',
    geometry: {
      canvas: { width: 48, height: 48, gridSize: 1 },
      rx: 17,
      ry: 19,
      ringRadii: [9, 12, 15],
      separatorRadii: [10, 13],
      medallionR: 7,
    },
    slots: {
      shell: 'silver',
      rim: 'black_steel',
      rimEdge: 'diamond',
      core: 'sapphire',
      sonicRings: 'icy_fire',
      separators: 'black_steel',
      glyph: 'diamond',
      glyphBack: 'sapphire',
    },
  },
];

// ── Forge ──────────────────────────────────────────────────────────────────

const only = process.argv[2];
for (const variant of VARIANTS) {
  if (only && variant.name !== only) continue;
  const spec = buildResonanceShieldSpec(variant);
  const bundle = forgeItemAsset(spec, { includeShader: false });
  const outDir = resolve(OUT_ROOT, variant.name);
  mkdirSync(outDir, { recursive: true });

  writeFileSync(resolve(outDir, `${variant.name}.json`), JSON.stringify(bundle.assetPacket, null, 2), 'utf8');
  if (bundle.godotArtifact) {
    writeFileSync(resolve(outDir, `${variant.name}.pbrain`), bundle.godotArtifact, 'utf8');
  }
  writeFileSync(resolve(outDir, `${variant.name}.png`), renderBundlePng(bundle, 6));
  writeFileSync(resolve(outDir, `${variant.name}.1x.png`), renderBundlePng(bundle, 1));
  writeFileSync(
    resolve(outDir, `${variant.name}.forge.diagnostics.json`),
    JSON.stringify(
      {
        label: variant.label,
        slots: variant.slots,
        spec: { id: bundle.spec.id, hash: hashItemSpec(bundle.spec) },
        cells: bundle.assetPacket.geometry.coordinates.length,
        heraldry: bundle.fills.heraldry ?? null,
        fillHash: bundle.fills.hash,
      },
      null,
      2,
    ),
    'utf8',
  );

  const heraldry = (bundle.fills.heraldry ?? []).map((h) => `${h.id}: ${h.cells} cells, contrast ${h.contrast}, warnings [${h.warnings.join('; ')}]`);
  console.log(`forged ${variant.label.padEnd(26)} ${hashItemSpec(bundle.spec)}  ${bundle.assetPacket.geometry.coordinates.length} cells`);
  for (const line of heraldry) console.log(`    ${line}`);
}
