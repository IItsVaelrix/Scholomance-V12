shader_type canvas_item;

// Canonical uniforms from Scholomance clock and spells
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_resonance;
uniform int u_school;
uniform float u_vowel_density;
uniform vec3 u_palette0;

// Custom uniforms defined in packet
uniform float resonance;

// User-written pbMain contract
vec4 pbMain(vec2 uv, float time, float resonance) {
  vec2 center = vec2(0.5, 0.5);
  vec2 d = uv - center;
  float dist = length(d);
  float angle = atan(d.y, d.x);

  // 8-fold radial pulse
  float oct = mod(angle + 3.14159 / 8.0, 6.28318 / 4.0);
  float armPulse = sin(oct * 8.0 - time * 3.0) * 0.5 + 0.5;

  // Top halo ring
  vec2 ringCenter = vec2(0.5, 0.13);
  float ringDist = length(uv - ringCenter);
  float ring = smoothstep(0.13, 0.10, ringDist) * (1.0 - smoothstep(0.10, 0.07, ringDist));

  // 8 main spikes — angular wedge gates
  float spikeAngle = mod(angle + 3.14159 / 8.0, 6.28318 / 8.0);
  float spikeWidth = abs(spikeAngle - 3.14159 / 8.0);
  float spikeShape = smoothstep(0.18, 0.0, spikeWidth);
  float spike = spikeShape * smoothstep(0.48, 0.18, dist) * smoothstep(0.0, 0.10, dist);

  // 4 secondary horns (between cardinals)
  float hornAngle = mod(angle + 3.14159 / 16.0, 6.28318 / 4.0);
  float hornWidth = abs(hornAngle - 3.14159 / 4.0);
  float hornShape = smoothstep(0.14, 0.0, hornWidth);
  float horn = hornShape * smoothstep(0.45, 0.18, dist) * smoothstep(0.0, 0.10, dist) * 0.6;

  // Body (dark frame around the gem)
  float bodyRing = smoothstep(0.34, 0.30, dist) * (1.0 - smoothstep(0.20, 0.24, dist));
  float body = bodyRing * 0.45;

  // Inner gem
  float gem = smoothstep(0.18, 0.10, dist);

  // Cracks (procedural)
  float crack = sin(angle * 11.0 + time * 1.4) * 0.5 + 0.5;
  crack = pow(crack, 6.0) * smoothstep(0.34, 0.10, dist) * 0.8;

  vec3 darkMetal = vec3(0.04, 0.0, 0.02);
  vec3 redDim   = vec3(0.55, 0.06, 0.04);
  vec3 redHot   = vec3(1.0, 0.18, 0.10);
  vec3 whiteHot = vec3(1.0, 0.85, 0.70);

  vec3 col = darkMetal;
  col += redDim * body;
  col += redHot * spike * (0.6 + 0.4 * armPulse);
  col += redHot * horn * (0.5 + 0.5 * armPulse);
  col += redHot * crack;
  col += whiteHot * gem * (0.65 + 0.35 * sin(time * 4.0));
  col += redHot * ring * (0.7 + 0.3 * sin(time * 2.0));

  // Top + bottom spires
  float topSpire = smoothstep(0.06, 0.0, dist) * smoothstep(0.0, -0.20, d.y);
  float botSpire = smoothstep(0.06, 0.0, dist) * smoothstep(0.20, 0.0, d.y);
  col += redHot * topSpire * 0.7;
  col += redHot * botSpire * 0.5;

  float alpha = max(max(body * 1.4, spike), max(horn, gem));
  alpha = max(alpha, max(ring * 1.2, crack * 1.3));
  alpha = max(alpha, max(topSpire, botSpire));
  alpha = clamp(alpha, 0.0, 1.0) * resonance;

  return vec4(col, alpha);
}

void fragment() {
    // Call user-authored pbMain with normalized UV coordinates
    COLOR = pbMain(UV, u_time, u_resonance);
}
