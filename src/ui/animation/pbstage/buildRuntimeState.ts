export interface RuntimeStateInput {
  elapsedMs: number;
  resonance?: number;
  schoolIndex?: number;
  vowelDensity?: number;
  palette0?: [number, number, number];
  canvasSize?: [number, number];
}

/**
 * Assembles the nested runtimeState object consumed by resolveShaderUniforms.
 * Dot-paths here MUST match DEFAULT_SHADER_UNIFORMS `source` strings in
 * codex/core/pixelbrain/shader-uniform-resolver.js.
 */
export function buildRuntimeState(input: RuntimeStateInput) {
  return {
    clock: { elapsedSeconds: input.elapsedMs / 1000 },
    verse: {
      resonance: input.resonance ?? 0.5,
      vowelDensity: input.vowelDensity ?? 0.5,
    },
    spell: { schoolIndex: input.schoolIndex ?? 0 },
    palette: { '0': { rgb01: input.palette0 ?? [0, 0, 0] } },
    canvas: { size: input.canvasSize ?? [160, 144] },
  };
}
