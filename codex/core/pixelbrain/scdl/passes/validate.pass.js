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

import { SCDL_ERROR_CODES, scdlError } from '../scdl.errors.js';

const SUPPORTED_EXPORTS = new Set(['json', 'svg', 'phaser', 'png']);
const KNOWN_OPS = new Set([
  'symmetry', 'trace', 'fill', 'rim', 'cell', 'glow',
  'circle', 'ring', 'rect', 'polygon', 'path', 'sphere',
]);

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
      validateVectorOp(op, part, errors, l);
    }
  }

  // 5 — export targets
  for (const target of (ast.exports || [])) {
    if (!SUPPORTED_EXPORTS.has(target)) {
      errors.push(scdlError(
        `Unknown export target '${target}' — supported: json, svg, phaser, png`,
        SCDL_ERROR_CODES.UNKNOWN_EXPORT_TARGET,
        l,
        { target }
      ));
    }
  }

  return ast;
}

function validateVectorOp(op, part, errors, fallbackLoc) {
  if (!['circle', 'ring', 'rect', 'polygon', 'path', 'sphere'].includes(op.op)) return;

  const loc = op.loc || fallbackLoc;
  const fail = (message, context = {}) => {
    errors.push(scdlError(
      message,
      SCDL_ERROR_CODES.INVALID_VECTOR_OP,
      loc,
      { op: op.op, partId: part.id, ...context }
    ));
  };
  const finite = value => Number.isFinite(value);
  const positive = value => finite(value) && value > 0;

  if (op.op === 'circle' && !positive(op.radius)) {
    fail(`Invalid circle radius '${op.radius}' — must be > 0`, { radius: op.radius });
  }
  if (op.op === 'ring') {
    if (!positive(op.radius)) fail(`Invalid ring radius '${op.radius}' — must be > 0`, { radius: op.radius });
    if (!positive(op.width)) fail(`Invalid ring width '${op.width}' — must be > 0`, { width: op.width });
  }
  if (op.op === 'rect') {
    if (!positive(op.w)) fail(`Invalid rect width '${op.w}' — must be > 0`, { width: op.w });
    if (!positive(op.h)) fail(`Invalid rect height '${op.h}' — must be > 0`, { height: op.h });
  }
  if (op.op === 'polygon' && (!Array.isArray(op.points) || op.points.length < 3)) {
    fail(`Invalid polygon — at least 3 points are required`, { pointCount: op.points?.length || 0 });
  }
  if (op.op === 'path' && !String(op.d || '').trim()) {
    fail(`Invalid path — path data string is required`);
  }
  if (op.op === 'sphere') {
    if (!positive(op.radius)) fail(`Invalid sphere radius '${op.radius}' — must be > 0`, { radius: op.radius });
    if (!Array.isArray(op.tierColorRefs) || op.tierColorRefs.length !== 5) {
      fail(`Invalid sphere tier color count '${op.tierColorRefs?.length || 0}' — expected 5`, {
        tierColorCount: op.tierColorRefs?.length || 0,
      });
    }
    if (!finite(op.lx) || !finite(op.ly) || (op.lx === 0 && op.ly === 0)) {
      fail(`Invalid sphere light vector '${op.lx},${op.ly}' — must be a non-zero finite vector`, {
        lx: op.lx,
        ly: op.ly,
      });
    }
  }
}
