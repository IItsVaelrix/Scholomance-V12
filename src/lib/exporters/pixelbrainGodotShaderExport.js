/**
 * PixelBrain Godot Shader Exporter
 *
 * Compiles a declarative PB-SHADER-v1 packet into a native Godot .gdshader file.
 */

import { validateShaderPacket } from '../../../codex/core/pixelbrain/shader-packet.js';

export function exportToGodotShader(packet) {
  // Enforce contract validation before export
  validateShaderPacket(packet);

  const customUniforms = Object.entries(packet.uniforms || {})
    .map(([name, spec]) => `uniform ${spec.type} ${name};`)
    .join('\n');

  return `shader_type canvas_item;

// Canonical uniforms from Scholomance clock and spells
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_resonance;
uniform int u_school;
uniform float u_vowel_density;
uniform vec3 u_palette0;

// Custom uniforms defined in packet
${customUniforms}

// User-written pbMain contract
${packet.fragmentSource}

void fragment() {
    // Call user-authored pbMain with normalized UV coordinates
    COLOR = pbMain(UV, u_time, u_resonance);
}
`;
}
