/**
 * PixelBrain WebGL Preview Helper
 *
 * Handles low-level WebGL 2 context operations, shader compilation, program linking,
 * fullscreen quad creation, uniform binding, and frame drawing.
 */

import { createShaderCompileError, createShaderLinkError } from '../../../codex/core/pixelbrain/shader-errors.js';

export const DEFAULT_FRAGMENT_SOURCE = `vec4 pbMain(vec2 uv, float time, float resonance) {
  // A glowing void ripple effect matching Scholomance aesthetics
  vec2 center = vec2(0.5, 0.5);
  float dist = distance(uv, center);
  float ripple = sin(dist * 20.0 - time * 4.0) * 0.5 + 0.5;
  
  // Fade out toward edges
  float mask = smoothstep(0.4, 0.0, dist);
  
  // Combine school resonance
  vec3 color = vec3(0.5, 0.1, 0.8) * ripple * resonance * mask;
  
  return vec4(color, mask * 0.8);
}`;

/**
 * Wraps the user's custom pbMain function in a valid WebGL2 GLSL fragment shader.
 */
export function wrapShaderSource(userCode) {
  const safeCode = String(userCode || DEFAULT_FRAGMENT_SOURCE).trim();
  return `#version 300 es
precision highp float;

out vec4 fragColor;

uniform float u_time;
uniform vec2 u_resolution;
uniform float u_resonance;
uniform int u_school;
uniform float u_vowel_density;
uniform vec3 u_palette0;

${safeCode}

void main() {
  // Normalize coordinates to local canvas space uv [0..1]
  vec2 uv = gl_FragCoord.xy / u_resolution;
  fragColor = pbMain(uv, u_time, u_resonance);
}
`;
}

/**
 * Parses the WebGL shader compilation log to locate compile errors.
 */
export function parseShaderCompileLog(logText) {
  const lines = String(logText || '').split('\n');
  for (const logLine of lines) {
    // Matches standard formats like "ERROR: 0:24: 'pbMain' : no matching overloaded function found"
    const match = logLine.match(/(?:ERROR|WARNING):\s+\d+:(\d+):\s+(.*)/i);
    if (match) {
      return {
        line: parseInt(match[1], 10),
        column: 1,
        message: match[2].trim(),
      };
    }
  }
  return { line: 1, column: 1, message: logText || 'Shader compilation failed' };
}

/**
 * Compiles a vertex shader and fragment shader, then links them into a GL program.
 * Throws structured BytecodeErrors upon failure.
 */
export function compileShaderProgram(gl, fsUserCode) {
  const vsSource = `#version 300 es
    in vec2 position;
    void main() {
      gl_Position = vec4(position, 0.0, 1.0);
    }
  `;
  const fsSource = wrapShaderSource(fsUserCode);

  // Compile Vertex Shader
  const vs = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vs, vsSource);
  gl.compileShader(vs);
  if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(vs);
    gl.deleteShader(vs);
    throw createShaderLinkError(`Vertex shader failed compilation: ${log}`);
  }

  // Compile Fragment Shader
  const fs = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fs, fsSource);
  gl.compileShader(fs);
  if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(fs);
    const parsed = parseShaderCompileLog(log);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    
    // Attempt to extract line from user code snippet
    const lines = fsSource.split('\n');
    const sourcePreview = lines[parsed.line - 1] || '';
    
    throw createShaderCompileError({
      stage: 'fragment',
      line: parsed.line,
      column: parsed.column,
      message: parsed.message,
      sourcePreview,
    });
  }

  // Link Program
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);

  // Once linked, shaders can be detached and marked for deletion
  gl.detachShader(program, vs);
  gl.detachShader(program, fs);
  gl.deleteShader(vs);
  gl.deleteShader(fs);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw createShaderLinkError(`Program linking failed: ${log}`);
  }

  return program;
}

/**
 * Creates the buffer for a full-screen quad.
 */
export function createFullscreenQuad(gl) {
  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  const positions = new Float32Array([
    -1, -1,
     1, -1,
    -1,  1,
    -1,  1,
     1, -1,
     1,  1,
  ]);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
  return { positionBuffer };
}

/**
 * Disposes of the quad buffers.
 */
export function disposeFullscreenQuad(gl, quad) {
  if (gl && quad && quad.positionBuffer) {
    gl.deleteBuffer(quad.positionBuffer);
  }
}

/**
 * Binds resolved uniforms to program locations.
 */
export function bindUniforms(gl, program, resolvedUniforms) {
  for (const [name, spec] of Object.entries(resolvedUniforms)) {
    const location = gl.getUniformLocation(program, name);
    if (location === null) continue; // Uniform was optimized out by GPU compiler

    const { type, value } = spec;
    if (type === 'float') {
      gl.uniform1f(location, value);
    } else if (type === 'int') {
      gl.uniform1i(location, value);
    } else if (type === 'vec2') {
      gl.uniform2f(location, value[0], value[1]);
    } else if (type === 'vec3') {
      gl.uniform3f(location, value[0], value[1], value[2]);
    }
  }
}

/**
 * Renders a single shader frame to the WebGL viewport.
 */
export function renderShaderFrame(gl, program, quad, resolvedUniforms) {
  if (!gl || !program || !quad) return;

  gl.useProgram(program);

  // Setup viewport size matching the canvas dimensions
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

  // Clear canvas buffer
  gl.clearColor(0.0, 0.0, 0.0, 0.0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  // Bind attribute buffers
  gl.bindBuffer(gl.ARRAY_BUFFER, quad.positionBuffer);
  const positionLocation = gl.getAttribLocation(program, 'position');
  if (positionLocation !== -1) {
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
  }

  // Bind uniforms
  bindUniforms(gl, program, resolvedUniforms);

  // Draw fullscreen quad triangles
  gl.drawArrays(gl.TRIANGLES, 0, 6);
}

/**
 * Cleanly disposes of a linked WebGL program.
 */
export function disposeShaderProgram(gl, program) {
  if (!gl || !program) return;
  gl.deleteProgram(program);
}
