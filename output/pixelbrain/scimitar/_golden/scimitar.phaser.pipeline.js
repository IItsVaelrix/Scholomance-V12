/**
 * Phaser WebGL PostFXPipeline for "Scimitar Lightning Engraving" (scimitar-lightning-engraving)
 * Generated deterministically from Scholomance custom shader packet.
 */
export class ScimitarLightningEngravingPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  constructor(game) {
    super({
      game,
      name: 'scimitar-lightning-engraving',
      fragShader: `#version 300 es
precision highp float;

out vec4 fragColor;

uniform float u_time;
uniform vec2 u_resolution;
uniform float u_resonance;
uniform int u_school;
uniform float u_vowel_density;
uniform vec3 u_palette0;

// HD Scimitar — lightning engraving energize overlay.
// Deterministic: all motion derives from u_time / u_resonance.
const vec3 BOLT_TINT = vec3(0.1137, 0.3725, 0.8392); // sapphire #1D5FD6
const float ENGRAVING_DENSITY = 0.0923; // engraved cells / total cells

float pbHash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// Blade sweep centerline in UV space — mirrors bladeCenterX() in
// generate-pixelbrain-scimitar.mjs (blade spans v in [0, 0.615]).
float bladeCenter(float v) {
  float t = clamp((0.615 - v) / 0.615, 0.0, 1.0);
  return 0.333 + 0.542 * t * t;
}

vec4 pbMain(vec2 uv, float time, float resonance) {
  float v = uv.y;
  float blade = step(v, 0.615);
  float cx = bladeCenter(v);

  // Zigzag jitter per engraving segment (9 waypoints down the blade).
  float seg = floor(v * 9.0);
  float jitter = (pbHash(vec2(seg, 7.0)) - 0.5) * 0.10;
  float d = abs(uv.x - (cx + jitter));

  // Strobe: quantized time flicker, charged by verse resonance.
  float strobe = pbHash(vec2(floor(time * 8.0), seg));
  float charge = 0.35 + 0.65 * resonance;
  float flicker = smoothstep(0.55, 1.0, strobe) * charge;

  float core = smoothstep(0.035, 0.0, d);
  float halo = smoothstep(0.16, 0.0, d) * 0.45;
  float energy = blade * (core + halo) * flicker;

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
