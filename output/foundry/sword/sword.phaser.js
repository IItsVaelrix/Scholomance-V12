/**
 * Phaser WebGL PostFXPipeline for "sword blade energize" (item.nightmare.sword.blade.energize)
 * Generated deterministically from Scholomance custom shader packet.
 */
export class ItemNightmareSwordBladeEnergizePipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  constructor(game) {
    super({
      game,
      name: 'item.nightmare.sword.blade.energize',
      fragShader: `#version 300 es
precision highp float;

out vec4 fragColor;

uniform float u_time;
uniform vec2 u_resolution;
uniform float u_resonance;
uniform int u_school;
uniform float u_vowel_density;
uniform vec3 u_palette0;

// Foundry item-effect shader — blade motif energize.
// Asset constants baked at generation time:
//   - BOLT_TINT (#FFFBEB)
//   - ENGRAVING_DENSITY (0.2442)
//   - host part: blade.straight over v in [0.0000, 0.6146]
//
// All motion is deterministic — sin(u_time * k) and pbHash(vec2) only.
const vec3 BOLT_TINT = vec3(1.0000, 0.9843, 0.9216);
const float ENGRAVING_DENSITY = 0.2442;
const float V_MIN = 0.0000;
const float V_MAX = 0.6146;

float pbHash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float hostCenterX(float v) { return 0.500000; }

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
