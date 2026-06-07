shader_type canvas_item;

uniform float resonance = 0.55;
uniform vec3 u_palette0 = vec3(0.788, 0.635, 0.153); // Default to sonic/accent

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 4; i++) {
    v += amp * noise(p);
    p *= 2.0;
    amp *= 0.5;
  }
  return v;
}

float ridge(vec2 p) {
  return 1.0 - abs(2.0 * fbm(p) - 1.0);
}

void fragment() {
  vec2 uv = UV;
  float time = TIME;
  vec3 amethyst = u_palette0 * 1.9 + vec3(0.12, 0.0, 0.22);
  vec3 obsidian = vec3(0.085, 0.075, 0.13);
  float horizon = 0.40;

  vec3 col;

  if (uv.y < horizon) {
    float wy = uv.y / horizon;
    col = mix(vec3(0.008, 0.008, 0.02), obsidian * 0.9, wy);
    float strata = fbm(vec2(uv.x * 7.0, uv.y * 4.0 + time * 0.02));
    col += obsidian * strata * 0.5 * wy;
    
    vec2 sc = vec2(0.5, horizon);
    float sd = distance((uv - sc) * vec2(1.5, 2.2), vec2(0.0));
    col += amethyst * smoothstep(0.34, 0.0, sd) * (0.6 + 0.4 * resonance);
    col *= 1.0 - smoothstep(0.05, 0.0, sd) * 0.9;
  } else {
    float fy = (uv.y - horizon) / (1.0 - horizon);
    float persp = 1.0 / (fy * fy * 5.5 + 0.10);
    vec2 fp = vec2((uv.x - 0.5) * persp * 1.3, persp * 0.6 + time * 0.05);

    float stone = 0.6 * fbm(fp * 0.8) + 0.4 * fbm(fp * 2.1);
    col = mix(obsidian * 0.75, obsidian * 1.9, stone);

    vec2 gl = abs(fract(vec2((uv.x - 0.5) * persp * 1.3, fp.y)) - vec2(0.5));
    float grid = smoothstep(0.46, 0.5, max(gl.x, gl.y));
    col += amethyst * grid * 0.12 * clamp(fy, 0.0, 1.0);

    float veins = smoothstep(0.82, 1.0, ridge(fp * 1.1));
    float pulse = 0.6 + 0.4 * sin(time * 1.4 + fp.y * 2.0);
    col += amethyst * veins * pulse * (0.7 + 0.7 * resonance) * clamp(fy * 1.4, 0.0, 1.0);

    col = mix(obsidian * 0.5, col, clamp(fy * 1.5, 0.0, 1.0));
  }

  col += amethyst * smoothstep(0.025, 0.0, abs(uv.y - horizon)) * 0.5;

  vec2 q = uv - vec2(0.5); 
  q.x *= 1.3;
  col *= smoothstep(1.15, 0.25, length(q));
  col *= 0.85 + 0.3 * resonance;

  COLOR = vec4(col, 1.0);
}
