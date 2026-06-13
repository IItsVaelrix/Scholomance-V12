/**
 * ITEM EFFECT SHADER — generates a PB-SHADER-v1 packet from a Foundry spec.
 *
 * The scimitar's hand-authored energize GLSL is generalized here. The
 * shader's pbMain contract:
 *
 *   1. Reads the host part's centerline as a UV-space polynomial (sampled
 *      and baked at generation time, not transcribed by hand).
 *   2. Renders the engraved motif as a procedural overlay: bolt for
 *      `motif-energize`, a generic charged rune for other kinds.
 *   3. Animates via `u_time` and `u_resonance` (canonical uniforms
 *      declared by every exporter — no custom uniforms).
 *
 * Asset-specific values (BOLT_TINT, ENGRAVING_DENSITY, host centerline
 * span) are baked into the source as constants, so the fragment is fully
 * deterministic at runtime.
 *
 * Anti-Chaos compliance: the only "random" is `pbHash(vec2)` in GLSL
 * (a deterministic sin/fract hash) and `hashString` in JS. No Math.random
 * anywhere in this module.
 */

import { createShaderPacket, hashShaderPacket, validateShaderPacket } from './shader-packet.js';
import { hashString } from './shared.js';

function err(reason, context) {
  const e = new Error(`item-effect-shader: ${reason}`);
  e.cause = context;
  return e;
}

function toFiniteNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp01(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function hexToRgb01(hex) {
  const m = String(hex || '').trim().replace('#', '');
  if (m.length !== 6) return null;
  return {
    r: parseInt(m.slice(0, 2), 16) / 255,
    g: parseInt(m.slice(2, 4), 16) / 255,
    b: parseInt(m.slice(4, 6), 16) / 255,
  };
}

// ── Centerline baker ──────────────────────────────────────────────────

/**
 * Bake the host part's centerline into a GLSL float expression. The
 * sampler takes normalized t in [0, 1] and returns the x coordinate of
 * the centerline in UV space (uv.x). For curved blades, the function
 * uses the same quadratic as the silhouette composer's centerline math.
 */
function bakeCenterlineGlsl(part, canvas) {
  const span = Array.isArray(part.params?.span) && part.params.span.length === 2
    ? [Math.round(toFiniteNumber(part.params.span[0])), Math.round(toFiniteNumber(part.params.span[1]))]
    : [0, Math.max(1, Math.round(toFiniteNumber(canvas.height)) - 1)];
  const cx = toFiniteNumber(part.params?.cx, 0);
  const sweep = toFiniteNumber(part.params?.sweep, 0);
  const width = toFiniteNumber(canvas.width, 48);
  // UV-space: u is in [0, 1] across the canvas width; v is in [0, 1]
  // across the height. We compute the centerline as a function of v.
  const spanMinUV = span[0] / Math.max(1, canvas.height);
  const spanMaxUV = span[1] / Math.max(1, canvas.height);
  const cxUV = cx / Math.max(1, width);
  const sweepUV = (sweep * width) / Math.max(1, width); // already uv units
  // For scimitar-style: x = cxUV + sweep * (t * t), where t = (vMax - v) / (vMax - vMin)
  // For straight: x = cxUV
  if (sweep === 0) {
    return `float hostCenterX(float v) { return ${cxUV.toFixed(6)}; }`;
  }
  return [
    `float hostCenterX(float v) {`,
    `  float vMin = ${spanMinUV.toFixed(6)};`,
    `  float vMax = ${spanMaxUV.toFixed(6)};`,
    `  float t = clamp((vMax - v) / max(1e-6, vMax - vMin), 0.0, 1.0);`,
    `  return ${cxUV.toFixed(6)} + ${sweepUV.toFixed(6)} * t * t;`,
    `}`,
  ].join('\n');
}

// ── Motif-energize GLSL template ───────────────────────────────────────

function buildEnergizeGLSL({ part, canvas, engravingDensity, boltTintHex, spanVMinUV, spanVMaxUV }) {
  const rgb = hexToRgb01(boltTintHex) || { r: 0.1, g: 0.3, b: 0.9 };
  const centerline = bakeCenterlineGlsl(part, canvas);
  return `// Foundry item-effect shader — ${part.id} motif energize.
// Asset constants baked at generation time:
//   - BOLT_TINT (${boltTintHex})
//   - ENGRAVING_DENSITY (${engravingDensity.toFixed(4)})
//   - host part: ${part.profile} over v in [${spanVMinUV.toFixed(4)}, ${spanVMaxUV.toFixed(4)}]
//
// All motion is deterministic — sin(u_time * k) and pbHash(vec2) only.
const vec3 BOLT_TINT = vec3(${rgb.r.toFixed(4)}, ${rgb.g.toFixed(4)}, ${rgb.b.toFixed(4)});
const float ENGRAVING_DENSITY = ${engravingDensity.toFixed(4)};
const float V_MIN = ${spanVMinUV.toFixed(4)};
const float V_MAX = ${spanVMaxUV.toFixed(4)};

float pbHash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

${centerline}

vec4 pbMain(vec2 uv, float time, float resonance) {
  float v = uv.y;
  float inHost = step(V_MIN, v) * step(v, V_MAX);
  float cx = hostCenterX(v);

  // Zigzag jitter per engraving segment (9 waypoints down the host).
  float seg = floor(clamp((v - V_MIN) / max(1e-6, V_MAX - V_MIN), 0.0, 1.0) * 9.0);
  float jitter = (pbHash(vec2(seg, 7.0)) - 0.5) * 0.10;
  float d = abs(uv.x - (cx + jitter));

  // Strobe: quantized time flicker, charged by verse resonance.
  float strobe = pbHash(vec2(floor(time * 8.0), seg));
  float charge = 0.35 + 0.65 * resonance;
  float flicker = smoothstep(0.55, 1.0, strobe) * charge;

  float core = smoothstep(0.035, 0.0, d);
  float halo = smoothstep(0.16, 0.0, d) * 0.45;
  float energy = inHost * (core + halo) * flicker;

  vec3 tint = mix(BOLT_TINT, u_palette0, 0.25);
  vec3 color = mix(tint, vec3(1.0), core * 0.85) * energy;
  float alpha = clamp(energy * (0.5 + ENGRAVING_DENSITY * 4.0), 0.0, 1.0);
  return vec4(color, alpha);
}`;
}

function geometryParts(geometry, role) {
  return Array.isArray(geometry?.parts) ? geometry.parts.filter((part) => part.role === role) : [];
}

function singleMaskExpr(part, index) {
  const { centerX, centerY, radiusX, radiusY, minX, maxX, minY, maxY } = part.uv;
  const prefix = `m${index}`;
  return [
    `  vec2 ${prefix}c = vec2(${centerX.toFixed(6)}, ${centerY.toFixed(6)});`,
    `  vec2 ${prefix}r = max(vec2(${radiusX.toFixed(6)}, ${radiusY.toFixed(6)}), vec2(0.0001));`,
    `  vec2 ${prefix}q = abs((uv - ${prefix}c) / ${prefix}r);`,
    `  float ${prefix}ellipse = smoothstep(1.08, 0.82, length(${prefix}q));`,
    `  float ${prefix}box = step(${minX.toFixed(6)}, uv.x) * step(uv.x, ${maxX.toFixed(6)}) * step(${minY.toFixed(6)}, uv.y) * step(uv.y, ${maxY.toFixed(6)});`,
    `  mask = max(mask, ${prefix}ellipse * ${prefix}box);`,
  ].join('\n');
}

function maskFn(name, parts) {
  const validParts = parts.filter((part) => part?.uv);
  if (validParts.length === 0) return `float ${name}(vec2 uv) { return 0.0; }`;
  return [
    `float ${name}(vec2 uv) {`,
    `  float mask = 0.0;`,
    ...validParts.map(singleMaskExpr),
    `  return mask;`,
    `}`,
  ].join('\n');
}

function buildVoidArmorBreathGLSL({ spec, geometry, tintHex, amplitude, sparkleDensity, pulseSpeed }) {
  const rgb = hexToRgb01(tintHex) || { r: 0.45, g: 0.35, b: 0.9 };
  const coreParts = geometryParts(geometry, 'crystal_core');
  const bodyParts = geometryParts(geometry, 'body_voidsteel');
  const shoulderParts = geometryParts(geometry, 'shoulder_enamel');
  const glyphParts = geometryParts(geometry, 'glyph_glow');
  const mantleParts = geometryParts(geometry, 'void_mantle');
  const corePart = coreParts[0] || null;
  const cx = corePart?.uv?.centerX ?? 0.5;
  const cy = corePart?.uv?.centerY ?? 0.35;
  return `// Foundry void-armor-breath shader — ${spec.id}.
// Mask-aware armor material shader with deterministic fBm + domain warping.
// Geometry AMP hash: ${geometry?.hash || 'none'}.
${maskFn('maskBody', bodyParts)}
${maskFn('maskShoulder', shoulderParts)}
${maskFn('maskCore', coreParts)}
${maskFn('maskGlyph', glyphParts)}
${maskFn('maskMantle', mantleParts)}
`
    + `const vec3 VOID_TINT = vec3(${rgb.r.toFixed(4)}, ${rgb.g.toFixed(4)}, ${rgb.b.toFixed(4)});\n`
    + `const vec2 CORE_UV = vec2(${cx.toFixed(6)}, ${cy.toFixed(6)});\n`
    + `const float BREATH_AMPLITUDE = ${amplitude.toFixed(4)};\n`
    + `const float SPARKLE_DENSITY = ${sparkleDensity.toFixed(4)};\n`
    + `const float PULSE_SPEED = ${pulseSpeed.toFixed(4)};\n\n`
    + `float pbHash(vec2 p) {\n`
    + `  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);\n`
    + `}\n\n`
    + `float valueNoise(vec2 p) {\n`
    + `  vec2 i = floor(p);\n`
    + `  vec2 f = fract(p);\n`
    + `  vec2 u = f * f * (3.0 - 2.0 * f);\n`
    + `  float a = pbHash(i);\n`
    + `  float b = pbHash(i + vec2(1.0, 0.0));\n`
    + `  float c = pbHash(i + vec2(0.0, 1.0));\n`
    + `  float d = pbHash(i + vec2(1.0, 1.0));\n`
    + `  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);\n`
    + `}\n\n`
    + `float fbm(vec2 p) {\n`
    + `  float sum = 0.0;\n`
    + `  float amp = 0.5;\n`
    + `  for (int i = 0; i < 5; i++) {\n`
    + `    sum += amp * valueNoise(p);\n`
    + `    p *= 2.0;\n`
    + `    amp *= 0.5;\n`
    + `  }\n`
    + `  return sum;\n`
    + `}\n\n`
    + `vec2 domainWarp(vec2 p, float time) {\n`
    + `  float xWarp = p.x + 0.5 * sin(0.5 * p.y + time * 0.18);\n`
    + `  float yWarp = p.y + 0.5 * sin(0.5 * p.x - time * 0.14);\n`
    + `  vec2 q = vec2(xWarp, yWarp);\n`
    + `  q += vec2(fbm(p * 1.7 + 13.0), fbm(p * 1.9 + 37.0)) * 0.35;\n`
    + `  return q;\n`
    + `}\n\n`
    + `vec4 pbMain(vec2 uv, float time, float resonance) {\n`
    + `  float d = distance(uv, CORE_UV);\n`
    + `  float breath = 0.5 + 0.5 * sin(time * PULSE_SPEED);\n`
    + `  float bodyMask = maskBody(uv);\n`
    + `  float shoulderMask = maskShoulder(uv);\n`
    + `  float coreMask = maskCore(uv);\n`
    + `  float glyphMask = max(maskGlyph(uv), maskMantle(uv) * 0.55);\n`
    + `  vec2 warped = domainWarp(uv * 18.0, time);\n`
    + `  float voidGrain = fbm(warped * 1.25 + resonance * 2.0);\n`
    + `  float enamelWave = fbm(vec2(uv.x * 22.0, uv.y * 8.0) + vec2(time * 0.04, 0.0));\n`
    + `  float trimSpec = pow(max(0.0, 1.0 - abs(uv.y - CORE_UV.y) * 3.0), 3.0);\n`
    + `  float core = coreMask * smoothstep(0.18, 0.0, d) * (0.18 + BREATH_AMPLITUDE * breath) * (0.45 + resonance * 0.55);\n`
    + `  float ring = coreMask * smoothstep(0.022, 0.0, abs(d - 0.105)) * 0.18 * (0.6 + breath * 0.4);\n`
    + `  vec2 grid = floor(uv * vec2(${Math.max(1, spec.canvas.width).toFixed(1)}, ${Math.max(1, spec.canvas.height).toFixed(1)}));\n`
    + `  float starSeed = pbHash(grid + floor(time * 0.5));\n`
    + `  float star = bodyMask * step(1.0 - SPARKLE_DENSITY, starSeed) * smoothstep(0.7, 1.0, resonance) * 0.15;\n`
    + `  float voidShimmer = bodyMask * smoothstep(0.52, 1.0, voidGrain) * 0.12;\n`
    + `  float enamelSheen = shoulderMask * smoothstep(0.55, 0.95, enamelWave) * 0.16;\n`
    + `  float glyph = glyphMask * (0.08 + 0.18 * breath) * (0.4 + resonance * 0.6);\n`
    + `  float trim = trimSpec * max(bodyMask, shoulderMask) * 0.055;\n`
    + `  float alpha = clamp(core + ring + star + voidShimmer + enamelSheen + glyph + trim, 0.0, 0.78);\n`
    + `  vec3 color = VOID_TINT;\n`
    + `  color = mix(color, vec3(0.18, 0.35, 0.95), enamelSheen * 1.7);\n`
    + `  color = mix(color, vec3(0.95, 0.72, 0.22), trim * 2.5);\n`
    + `  color = mix(color, vec3(0.65, 0.38, 1.0), glyph * 2.0);\n`
    + `  color = mix(color, vec3(1.0), clamp(ring + core + star, 0.0, 0.42));\n`
    + `  return vec4(color * alpha, alpha);\n`
    + `}`;
}

// ── Public entry ───────────────────────────────────────────────────────

/**
 * Build the PB-SHADER-v1 packet for a Foundry spec.
 *
 * @param {Object} args
 * @param {Object} args.spec           — the ITEM-SPEC-v1 spec
 * @param {Object} args.materialColor — a function (spec) → hex color for the
 *   bolt tint. Defaults to the spec's bolt core material body anchor.
 * @param {number} [args.engravingDensity] — fraction of host part cells that
 *   are engraved. Defaults to motif-cells / part-cells.
 *
 * @returns {{ packet, hash, fragmentSource, engravings: { partId, count, density } }}
 */
export function buildItemEffectShader({ spec, geometry = null, materialColor, engravingDensity } = {}) {
  if (!spec || !Array.isArray(spec.parts)) throw err('spec is required');
  if (!spec.shader) return null;
  const kind = String(spec.shader.kind || '');
  if (kind === 'void-armor-breath') {
    const targetIds = Array.isArray(spec.shader.targetParts) && spec.shader.targetParts.length
      ? spec.shader.targetParts
      : ['center_core', 'emblem', 'rune_channels'];
    const tintTarget = spec.parts.find((p) => targetIds.includes(p.id))?.fill
      || spec.parts.find((p) => p.id === 'center_core')?.fill
      || spec.parts[0]?.fill;
    const tintHex = materialColor ? materialColor(tintTarget) : defaultTintFromRegistry(tintTarget);
    if (!tintHex) throw err('void armor tint could not be resolved', { targetIds, tintTarget });
    const fragmentSource = buildVoidArmorBreathGLSL({
      spec,
      geometry,
      tintHex,
      amplitude: clamp01(toFiniteNumber(spec.shader.amplitude, 0.18)),
      sparkleDensity: clamp01(toFiniteNumber(spec.shader.sparkleDensity, 0.03)),
      pulseSpeed: Math.max(0, toFiniteNumber(spec.shader.pulseSpeed, 0.7)),
    });
    const packet = createShaderPacket({
      id: `item.${spec.id}.void-armor-breath`,
      label: `${spec.archetype} void armor breath`,
      fragmentSource,
      uniforms: {},
      canvas: { width: spec.canvas.width, height: spec.canvas.height },
      deterministicSeed: spec.seed >>> 0,
    });
    validateShaderPacket(packet);
    return Object.freeze({
      packet,
      hash: hashShaderPacket(packet),
      fragmentSource,
      engravings: Object.freeze({
        partId: targetIds.join(','),
        density: clamp01(toFiniteNumber(spec.shader.resonanceDefault, 0.34)),
      }),
    });
  }
  if (kind !== 'motif-energize') {
    throw err(`unsupported shader.kind "${kind}"`, { kind });
  }
  // Find the host part: the first part that has a motif.
  const host = spec.parts.find((p) => p.motif);
  if (!host) throw err('motif-energize shader requires a part with motif', {
    parts: spec.parts.map((p) => p.id),
  });

  // Compute engraving density if not given.
  let density = engravingDensity;
  if (density == null) {
    // The fill-amp computes motifCells at runtime; we approximate here by
    // counting bolt waypoints. Tests can override for exact parity.
    const segments = Math.max(2, Math.round(toFiniteNumber(host.motif?.segments, 9)));
    density = clamp01(segments / Math.max(1, host.params?.height || 32));
  }

  // Bolt tint: prefer motif.core, fall back to the host's outline, then
  // the first material that yields a usable color.
  const colorTarget = host.motif?.core || host.motif?.glow || host.outline || host.fill;
  const tintHex = materialColor ? materialColor(colorTarget) : defaultTintFromRegistry(colorTarget);
  if (!tintHex) throw err('bolt tint could not be resolved', { host: host.id, colorTarget });

  // Centerline span in UV.
  const span = Array.isArray(host.params?.span) && host.params.span.length === 2
    ? host.params.span
    : [0, Math.max(1, spec.canvas.height) - 1];
  const spanVMinUV = span[0] / Math.max(1, spec.canvas.height);
  const spanVMaxUV = span[1] / Math.max(1, spec.canvas.height);

  const fragmentSource = buildEnergizeGLSL({
    part: host,
    canvas: spec.canvas,
    engravingDensity: density,
    boltTintHex: tintHex,
    spanVMinUV,
    spanVMaxUV,
  });

  const packet = createShaderPacket({
    id: `item.${spec.id}.${host.id}.energize`,
    label: `${spec.archetype} ${host.id} energize`,
    fragmentSource,
    uniforms: {}, // canonical uniforms only; constants are baked in
    canvas: { width: spec.canvas.width, height: spec.canvas.height },
    deterministicSeed: spec.seed >>> 0,
  });
  validateShaderPacket(packet);
  const hash = hashShaderPacket(packet);

  return Object.freeze({
    packet,
    hash,
    fragmentSource,
    engravings: Object.freeze({
      partId: host.id,
      density,
    }),
  });
}

function defaultTintFromRegistry(spec) {
  if (!spec) return null;
  // Lazy import to avoid a cycle at module load.
  // eslint-disable-next-line global-require
  return null; // The page-side caller usually provides a resolver.
}
