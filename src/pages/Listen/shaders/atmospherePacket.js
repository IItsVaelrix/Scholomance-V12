import { createShaderPacket } from '../../../lib/pixelbrain/uniforms.bridge.js';

// pbMain contract matches shader-webgl-preview wrapShaderSource:
//   vec4 pbMain(vec2 uv, float time, float resonance)
// Canonical uniforms (u_school, u_palette0) are declared as globals by the
// wrapper's `declarations` block, so pbMain may reference them directly.
const FRAGMENT = `
float pbHash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }

vec4 pbMain(vec2 uv, float time, float resonance) {
  // Baked aurora: three drifting radial lobes, animated only by time (no re-raster).
  vec2 c0 = vec2(0.5, 0.8);
  vec2 c1 = vec2(0.2 + 0.05*sin(time*0.13), 0.3);
  vec2 c2 = vec2(0.8, 0.4 + 0.05*cos(time*0.10));
  float a0 = smoothstep(0.6, 0.0, distance(uv, c0));
  float a1 = smoothstep(0.55, 0.0, distance(uv, c1));
  float a2 = smoothstep(0.55, 0.0, distance(uv, c2));
  float breath = 0.85 + 0.15*sin(time*0.45);

  // School-tinted base (u_palette0 provided by wrapper); fall back to teal.
  vec3 tint = mix(vec3(0.17,0.79,0.79), u_palette0, step(0.001, dot(u_palette0,u_palette0)));
  vec3 col = tint * (a0*0.5 + a1*0.4 + a2*0.3) * breath * (0.6 + resonance*0.6);

  // Portal ring: a single baked ring pulsing by formula, not a blurred DOM layer.
  float ring = smoothstep(0.012, 0.0, abs(distance(uv, vec2(0.5)) - 0.34));
  col += tint * ring * (0.4 + 0.4*sin(time*0.6));

  float alpha = clamp(a0*0.5 + a1*0.4 + a2*0.3 + ring, 0.0, 1.0);
  return vec4(col, alpha);
}`;

export const ATMOSPHERE_PACKET = createShaderPacket({
  id: 'listen-atmosphere',
  label: 'Listen Chamber Atmosphere',
  fragmentSource: FRAGMENT,
  canvas: { width: 1280, height: 720 },
  uniforms: {
    u_school: { type: 'int', source: 'spell.schoolIndex', default: 0 },
    u_palette0: { type: 'vec3', source: 'palette.0.rgb01', default: [0, 0, 0] },
  },
});
