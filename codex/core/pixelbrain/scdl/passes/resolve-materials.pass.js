/**
 * SCDL Resolve Materials Pass
 *
 * Validates part material IDs against the existing material-registry.js.
 * Unknown materials emit a WARN (not ERROR) and fall back to 'source'.
 */

import { resolveMaterialId } from '../../material-registry.js';
import { SCDL_ERROR_CODES, scdlWarn } from '../scdl.errors.js';

/**
 * @param {object} ast
 * @param {import('../scdl.errors.js').SCDLError[]} errors
 * @returns {object} new AST with materials validated/normalized
 */
export function resolveMaterialsPass(ast, errors) {
  const l = ast.sourceLocation || { line: 1, col: 1 };

  const resolvedParts = ast.parts.map(part => {
    const resolved = resolveMaterialId(part.material);
    if (resolved !== part.material) {
      errors.push(scdlWarn(
        `Unknown material '${part.material}' in part '${part.id}' — falling back to '${resolved}'`,
        SCDL_ERROR_CODES.UNKNOWN_MATERIAL,
        part.loc || l,
        { material: part.material, fallback: resolved, partId: part.id }
      ));
    }
    return { ...part, material: resolved };
  });

  return { ...ast, parts: resolvedParts };
}
