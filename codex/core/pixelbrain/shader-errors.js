/**
 * PixelBrain Shader Error Builders
 *
 * Provides factory functions to generate structured BytecodeError instances
 * for compilation and runtime exceptions in the Shader system.
 */

import {
  BytecodeError,
  ERROR_CATEGORIES,
  ERROR_SEVERITY,
  ERROR_CODES,
  MODULE_IDS,
} from './bytecode-error.js';

/**
 * Creates a structured BytecodeError for shader compilation failures.
 *
 * @param {object} params
 * @param {string} params.stage - 'vertex' | 'fragment'
 * @param {number} params.line - Line number of compile error (1-indexed)
 * @param {number} params.column - Column number of compile error (1-indexed)
 * @param {string} params.message - GLSL compiler error message
 * @param {string} params.sourcePreview - Surrounding source snippet
 */
export function createShaderCompileError({
  stage,
  line,
  column,
  message,
  sourcePreview,
}) {
  return new BytecodeError(
    ERROR_CATEGORIES.RENDER,
    ERROR_SEVERITY.CRIT,
    MODULE_IDS.SHADER,
    ERROR_CODES.SHADER_COMPILE_FAILED,
    {
      stage: String(stage || 'fragment'),
      line: Number(line) || 1,
      column: Number(column) || 1,
      message: String(message || 'Shader compilation failed'),
      sourcePreview: String(sourcePreview || ''),
    }
  );
}

/**
 * Creates a structured BytecodeError for shader linking failures.
 */
export function createShaderLinkError(message, context = {}) {
  return new BytecodeError(
    ERROR_CATEGORIES.RENDER,
    ERROR_SEVERITY.CRIT,
    MODULE_IDS.SHADER,
    ERROR_CODES.SHADER_LINK_FAILED,
    {
      message: String(message || 'Shader program linking failed'),
      ...context,
    }
  );
}

/**
 * Creates a structured BytecodeError for invalid shader uniforms.
 */
export function createShaderUniformError(uniformName, message) {
  return new BytecodeError(
    ERROR_CATEGORIES.RENDER,
    ERROR_SEVERITY.CRIT,
    MODULE_IDS.SHADER,
    ERROR_CODES.SHADER_UNIFORM_INVALID,
    {
      uniformName,
      message: String(message || 'Invalid uniform binding'),
    }
  );
}

/**
 * Creates a structured BytecodeError for lost WebGL context.
 */
export function createShaderContextLostError(context = {}) {
  return new BytecodeError(
    ERROR_CATEGORIES.RENDER,
    ERROR_SEVERITY.CRIT,
    MODULE_IDS.SHADER,
    ERROR_CODES.SHADER_CONTEXT_LOST,
    {
      message: 'WebGL context was lost',
      ...context,
    }
  );
}
