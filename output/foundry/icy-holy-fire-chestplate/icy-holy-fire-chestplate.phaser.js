/**
 * Phaser WebGL PostFXPipeline for "chestplate void armor breath" (item.icy.holyfire.chestplate.v1.void-armor-breath)
 * Generated deterministically from Scholomance custom shader packet.
 */
export class ItemIcyHolyfireChestplateV1VoidArmorBreathPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  constructor(game) {
    super({
      game,
      name: 'item.icy.holyfire.chestplate.v1.void-armor-breath',
      fragShader: `#version 300 es
precision highp float;

out vec4 fragColor;

uniform float u_time;
uniform vec2 u_resolution;
uniform float u_resonance;
uniform int u_school;
uniform float u_vowel_density;
uniform vec3 u_palette0;

// Foundry void-armor-breath shader — icy.holyfire.chestplate.v1.
// Mask-aware armor material shader with deterministic fBm + domain warping.
// Geometry AMP hash: fnv1a_D77BDD22.
float maskBody(vec2 uv) {
  float mask = 0.0;
  vec2 m0c = vec2(0.500000, 0.456250);
  vec2 m0r = max(vec2(0.351563, 0.362500), vec2(0.0001));
  vec2 m0q = abs((uv - m0c) / m0r);
  float m0ellipse = smoothstep(1.08, 0.82, length(m0q));
  float m0box = step(0.156250, uv.x) * step(uv.x, 0.859375) * step(0.100000, uv.y) * step(uv.y, 0.825000);
  mask = max(mask, m0ellipse * m0box);
  return mask;
}
float maskShoulder(vec2 uv) {
  float mask = 0.0;
  vec2 m0c = vec2(0.250000, 0.125000);
  vec2 m0r = max(vec2(0.195313, 0.056250), vec2(0.0001));
  vec2 m0q = abs((uv - m0c) / m0r);
  float m0ellipse = smoothstep(1.08, 0.82, length(m0q));
  float m0box = step(0.062500, uv.x) * step(uv.x, 0.453125) * step(0.075000, uv.y) * step(uv.y, 0.187500);
  mask = max(mask, m0ellipse * m0box);
  vec2 m1c = vec2(0.734375, 0.125000);
  vec2 m1r = max(vec2(0.195313, 0.056250), vec2(0.0001));
  vec2 m1q = abs((uv - m1c) / m1r);
  float m1ellipse = smoothstep(1.08, 0.82, length(m1q));
  float m1box = step(0.546875, uv.x) * step(uv.x, 0.937500) * step(0.075000, uv.y) * step(uv.y, 0.187500);
  mask = max(mask, m1ellipse * m1box);
  return mask;
}
float maskCore(vec2 uv) {
  float mask = 0.0;
  vec2 m0c = vec2(0.500000, 0.337500);
  vec2 m0r = max(vec2(0.085938, 0.068750), vec2(0.0001));
  vec2 m0q = abs((uv - m0c) / m0r);
  float m0ellipse = smoothstep(1.08, 0.82, length(m0q));
  float m0box = step(0.421875, uv.x) * step(uv.x, 0.593750) * step(0.275000, uv.y) * step(uv.y, 0.412500);
  mask = max(mask, m0ellipse * m0box);
  vec2 m1c = vec2(0.500000, 0.368750);
  vec2 m1r = max(vec2(0.054688, 0.037500), vec2(0.0001));
  vec2 m1q = abs((uv - m1c) / m1r);
  float m1ellipse = smoothstep(1.08, 0.82, length(m1q));
  float m1box = step(0.453125, uv.x) * step(uv.x, 0.562500) * step(0.337500, uv.y) * step(uv.y, 0.412500);
  mask = max(mask, m1ellipse * m1box);
  vec2 m2c = vec2(0.500000, 0.625000);
  vec2 m2r = max(vec2(0.054688, 0.043750), vec2(0.0001));
  vec2 m2q = abs((uv - m2c) / m2r);
  float m2ellipse = smoothstep(1.08, 0.82, length(m2q));
  float m2box = step(0.453125, uv.x) * step(uv.x, 0.562500) * step(0.587500, uv.y) * step(uv.y, 0.675000);
  mask = max(mask, m2ellipse * m2box);
  return mask;
}
float maskGlyph(vec2 uv) {
  float mask = 0.0;
  vec2 m0c = vec2(0.500000, 0.481250);
  vec2 m0r = max(vec2(0.195313, 0.075000), vec2(0.0001));
  vec2 m0q = abs((uv - m0c) / m0r);
  float m0ellipse = smoothstep(1.08, 0.82, length(m0q));
  float m0box = step(0.312500, uv.x) * step(uv.x, 0.703125) * step(0.412500, uv.y) * step(uv.y, 0.562500);
  mask = max(mask, m0ellipse * m0box);
  vec2 m1c = vec2(0.500000, 0.475000);
  vec2 m1r = max(vec2(0.132813, 0.056250), vec2(0.0001));
  vec2 m1q = abs((uv - m1c) / m1r);
  float m1ellipse = smoothstep(1.08, 0.82, length(m1q));
  float m1box = step(0.375000, uv.x) * step(uv.x, 0.640625) * step(0.425000, uv.y) * step(uv.y, 0.537500);
  mask = max(mask, m1ellipse * m1box);
  vec2 m2c = vec2(0.500000, 0.487500);
  vec2 m2r = max(vec2(0.226563, 0.056250), vec2(0.0001));
  vec2 m2q = abs((uv - m2c) / m2r);
  float m2ellipse = smoothstep(1.08, 0.82, length(m2q));
  float m2box = step(0.281250, uv.x) * step(uv.x, 0.734375) * step(0.437500, uv.y) * step(uv.y, 0.550000);
  mask = max(mask, m2ellipse * m2box);
  return mask;
}
float maskMantle(vec2 uv) {
  float mask = 0.0;
  vec2 m0c = vec2(0.500000, 0.343750);
  vec2 m0r = max(vec2(0.304688, 0.075000), vec2(0.0001));
  vec2 m0q = abs((uv - m0c) / m0r);
  float m0ellipse = smoothstep(1.08, 0.82, length(m0q));
  float m0box = step(0.203125, uv.x) * step(uv.x, 0.812500) * step(0.275000, uv.y) * step(uv.y, 0.425000);
  mask = max(mask, m0ellipse * m0box);
  return mask;
}
const vec3 VOID_TINT = vec3(0.9412, 0.7059, 0.3137);
const vec2 CORE_UV = vec2(0.500000, 0.337500);
const float BREATH_AMPLITUDE = 0.1800;
const float SPARKLE_DENSITY = 0.0300;
const float PULSE_SPEED = 0.7000;

float pbHash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = pbHash(i);
  float b = pbHash(i + vec2(1.0, 0.0));
  float c = pbHash(i + vec2(0.0, 1.0));
  float d = pbHash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 5; i++) {
    sum += amp * valueNoise(p);
    p *= 2.0;
    amp *= 0.5;
  }
  return sum;
}

vec2 domainWarp(vec2 p, float time) {
  float xWarp = p.x + 0.5 * sin(0.5 * p.y + time * 0.18);
  float yWarp = p.y + 0.5 * sin(0.5 * p.x - time * 0.14);
  vec2 q = vec2(xWarp, yWarp);
  q += vec2(fbm(p * 1.7 + 13.0), fbm(p * 1.9 + 37.0)) * 0.35;
  return q;
}

vec4 pbMain(vec2 uv, float time, float resonance) {
  float d = distance(uv, CORE_UV);
  float breath = 0.5 + 0.5 * sin(time * PULSE_SPEED);
  float bodyMask = maskBody(uv);
  float shoulderMask = maskShoulder(uv);
  float coreMask = maskCore(uv);
  float glyphMask = max(maskGlyph(uv), maskMantle(uv) * 0.55);
  vec2 warped = domainWarp(uv * 18.0, time);
  float voidGrain = fbm(warped * 1.25 + resonance * 2.0);
  float enamelWave = fbm(vec2(uv.x * 22.0, uv.y * 8.0) + vec2(time * 0.04, 0.0));
  float trimSpec = pow(max(0.0, 1.0 - abs(uv.y - CORE_UV.y) * 3.0), 3.0);
  float core = coreMask * smoothstep(0.18, 0.0, d) * (0.18 + BREATH_AMPLITUDE * breath) * (0.45 + resonance * 0.55);
  float ring = coreMask * smoothstep(0.022, 0.0, abs(d - 0.105)) * 0.18 * (0.6 + breath * 0.4);
  vec2 grid = floor(uv * vec2(64.0, 80.0));
  float starSeed = pbHash(grid + floor(time * 0.5));
  float star = bodyMask * step(1.0 - SPARKLE_DENSITY, starSeed) * smoothstep(0.7, 1.0, resonance) * 0.15;
  float voidShimmer = bodyMask * smoothstep(0.52, 1.0, voidGrain) * 0.12;
  float enamelSheen = shoulderMask * smoothstep(0.55, 0.95, enamelWave) * 0.16;
  float glyph = glyphMask * (0.08 + 0.18 * breath) * (0.4 + resonance * 0.6);
  float trim = trimSpec * max(bodyMask, shoulderMask) * 0.055;
  float alpha = clamp(core + ring + star + voidShimmer + enamelSheen + glyph + trim, 0.0, 0.78);
  vec3 color = VOID_TINT;
  color = mix(color, vec3(0.18, 0.35, 0.95), enamelSheen * 1.7);
  color = mix(color, vec3(0.95, 0.72, 0.22), trim * 2.5);
  color = mix(color, vec3(0.65, 0.38, 1.0), glyph * 2.0);
  color = mix(color, vec3(1.0), clamp(ring + core + star, 0.0, 0.42));
  return vec4(color * alpha, alpha);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  fragColor = pbMain(uv, u_time, u_resonance);
}
`
    });
  }

  onPreRender() {
    // Inject variables from spelling/time registry
    this.set1f('u_time', this.game.registry.get('clock.elapsedSeconds') || 0.0);
    this.set2f('u_resolution', this.renderer.width, this.renderer.height);
    this.set1f('u_resonance', this.game.registry.get('verse.resonance') || 0.5);
    this.set1i('u_school', this.game.registry.get('spell.schoolIndex') || 0);
    this.set1f('u_vowel_density', this.game.registry.get('verse.vowelDensity') || 0.5);
  }
}
