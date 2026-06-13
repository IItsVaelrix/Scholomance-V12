shader_type canvas_item;

// Canonical uniforms from Scholomance clock and spells
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_resonance;
uniform int u_school;
uniform float u_vowel_density;
uniform vec3 u_palette0;

// Custom uniforms defined in packet


// User-written pbMain contract
// Foundry void-armor-breath shader — paladin.holyfire.sword.v1.
// Mask-aware armor material shader with deterministic fBm + domain warping.
// Geometry AMP hash: fnv1a_F693B392.
float maskBody(vec2 uv) { return 0.0; }
float maskShoulder(vec2 uv) { return 0.0; }
float maskCore(vec2 uv) { return 0.0; }
float maskGlyph(vec2 uv) { return 0.0; }
float maskMantle(vec2 uv) { return 0.0; }
const vec3 VOID_TINT = vec3(0.5608, 0.6588, 0.7529);
const vec2 CORE_UV = vec2(0.500000, 0.350000);
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
  vec2 grid = floor(uv * vec2(64.0, 96.0));
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

void fragment() {
    // Call user-authored pbMain with normalized UV coordinates
    COLOR = pbMain(UV, u_time, u_resonance);
}
