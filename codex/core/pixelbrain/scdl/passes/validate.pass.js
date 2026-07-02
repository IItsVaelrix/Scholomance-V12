/**
 * SCDL Validate Pass
 *
 * Checks:
 *  - `asset` declaration present
 *  - canvas dimensions > 0
 *  - No duplicate part IDs
 *  - All op verbs are recognized
 *  - Export targets are supported
 */

import { SCDLError, SCDL_ERROR_CODES, scdlError, scdlWarn } from '../scdl.errors.js';

const SUPPORTED_EXPORTS = new Set(['json', 'svg', 'phaser', 'png']);
const KNOWN_OPS = new Set(['symmetry', 'trace', 'fill', 'rim', 'cell', 'glow']);

/**
 * @param {object} ast - SCDL-AST-v1 (raw from parser)
 * @param {SCDLError[]} errors - mutable array to push into
 * @returns {object} ast (unchanged)
 */
export function validatePass(ast, errors) {
  const l = ast.sourceLocation || { line: 1, col: 1 };

  // 1 — asset present
  if (!ast.asset || ast.asset === 'unnamed') {
    errors.push(scdlError(`Missing 'asset' declaration`, SCDL_ERROR_CODES.MISSING_ASSET, l));
  }

  // 2 — canvas dimensions
  if (!ast.canvas || ast.canvas.width <= 0 || ast.canvas.height <= 0) {
    errors.push(scdlError(
      `Invalid canvas '${ast.canvas?.width}x${ast.canvas?.height}' — must be WxH with W,H > 0`,
      SCDL_ERROR_CODES.INVALID_CANVAS, l
    ));
  }

  // 3 — duplicate part IDs
  const seen = new Set();
  for (const part of (ast.parts || [])) {
    if (seen.has(part.id)) {
      errors.push(scdlError(
        `Duplicate part ID '${part.id}'`,
        SCDL_ERROR_CODES.DUPLICATE_PART_ID,
        part.loc || l,
        { partId: part.id }
      ));
    }
    seen.add(part.id);

    // 4 — unknown ops
    for (const op of (part.ops || [])) {
      if (!KNOWN_OPS.has(op.op)) {
        errors.push(scdlError(
          `Unknown op '${op.op}' in part '${part.id}'`,
          SCDL_ERROR_CODES.UNKNOWN_VERB,
          op.loc || l,
          { op: op.op, partId: part.id }
        ));
      }
    }
  }

  // 5 — export targets
  for (const target of (ast.exports || [])) {
    if (!SUPPORTED_EXPORTS.has(target)) {
      errors.push(scdlWarn(
        `Unknown export target '${target}' — supported: json, svg, phaser, png`,
        SCDL_ERROR_CODES.UNKNOWN_EXPORT_TARGET,
        l,
        { target }
      ));
    }
  }

  return ast;
}
