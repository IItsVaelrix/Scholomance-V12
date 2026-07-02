/**
 * SCDL Compiler — Pass Orchestrator
 *
 * Runs the full pass pipeline on a parsed AST:
 *   validate → resolveColors → resolveMaterials →
 *   expandSymmetry → expandCells → emitPacket → emitDiagnostics
 *
 * Always returns a CompileResult — never throws.
 *
 * @typedef {object} CompileResult
 * @property {boolean}   ok          - true if no ERROR-severity errors
 * @property {object|null} ast       - Final AST (null if early error)
 * @property {object|null} packet    - PixelBrainAssetPacket (null on error)
 * @property {import('./scdl.errors.js').SCDLError[]} errors
 * @property {object[]}  diagnostics - SCD64 diagnostic entries
 * @property {object}    regressionSeed - Replay token for regression tests
 */

import { parseSCDL }            from './scdl.grammar.js';
import { SCDLError, SCDL_ERROR_CODES, scdlError } from './scdl.errors.js';
import { validatePass }         from './passes/validate.pass.js';
import { resolveColorsPass }    from './passes/resolve-colors.pass.js';
import { resolveMaterialsPass } from './passes/resolve-materials.pass.js';
import { expandSymmetryPass }   from './passes/expand-symmetry.pass.js';
import { expandCellsPass }      from './passes/expand-cells.pass.js';
import { emitPacketPass }       from './passes/emit-packet.pass.js';
import { emitDiagnosticsPass }  from './passes/emit-diagnostics.pass.js';

/**
 * Compile SCDL source text into a PixelBrainAssetPacket.
 *
 * @param {string} source - Raw SCDL source text
 * @param {object} [options]
 * @param {boolean} [options.strict=false] - Treat WARNs as ERRORs
 * @returns {CompileResult}
 */
export function compileSCDL(source, options = {}) {
  const { strict = false } = options;
  const errors = [];

  // ── Parse ────────────────────────────────────────────────────────────────
  let parseResult;
  try {
    parseResult = parseSCDL(source);
  } catch (e) {
    const fatal = scdlError(
      `Parser threw: ${e.message}`,
      SCDL_ERROR_CODES.MISSING_ASSET,
      { line: 1, col: 1 },
      { thrown: String(e) }
    );
    return _failResult([fatal], null, source);
  }

  // Materialise deferred errors from grammar (plain objects → SCDLError)
  for (const raw of (parseResult.errors || [])) {
    if (raw instanceof SCDLError) {
      errors.push(raw);
    } else if (raw?._deferred) {
      const code = raw.severity === 'ERROR' ? SCDL_ERROR_CODES.UNKNOWN_VERB : SCDL_ERROR_CODES.TRACE_INTENT;
      errors.push(new SCDLError({
        message:  raw.message,
        code,
        severity: raw.severity,
        loc:      raw.loc,
      }));
    }
  }

  // If parse produced no usable AST, bail
  if (!parseResult.rawAst) {
    return _failResult(errors, null, source);
  }

  let ast = parseResult.rawAst;

  // ── Pass 1: Validate ─────────────────────────────────────────────────────
  ast = _runPass('validate', ast, errors, validatePass);
  if (_hasFatal(errors)) return _failResult(errors, ast, source);

  // ── Pass 2: Resolve Colors ───────────────────────────────────────────────
  ast = _runPass('resolveColors', ast, errors, resolveColorsPass);
  if (_hasFatal(errors)) return _failResult(errors, ast, source);

  // ── Pass 3: Resolve Materials ────────────────────────────────────────────
  ast = _runPass('resolveMaterials', ast, errors, resolveMaterialsPass);
  // Material warnings are non-fatal

  // ── Pass 4: Expand Symmetry (SymmetryAMP) ────────────────────────────────
  ast = _runPass('expandSymmetry', ast, errors, expandSymmetryPass);
  if (_hasFatal(errors)) return _failResult(errors, ast, source);

  // ── Pass 5: Expand Cells ─────────────────────────────────────────────────
  ast = _runPass('expandCells', ast, errors, expandCellsPass);
  if (_hasFatal(errors)) return _failResult(errors, ast, source);

  // ── Pass 6: Emit Packet ──────────────────────────────────────────────────
  let packet = null;
  try {
    packet = emitPacketPass(ast, errors);
  } catch (e) {
    errors.push(scdlError(
      `Packet emit failed: ${e.message}`,
      SCDL_ERROR_CODES.MISSING_ASSET,
      { line: 1, col: 1 },
      { thrown: String(e) }
    ));
    return _failResult(errors, ast, source);
  }

  // ── Pass 7: Emit Diagnostics ─────────────────────────────────────────────
  const diagnostics = emitDiagnosticsPass(ast, errors, packet);

  const hasErrors = errors.some(e =>
    e.isError() || (strict && e.isWarn())
  );

  return Object.freeze({
    ok:           !hasErrors,
    ast:          hasErrors ? null : ast,
    packet:       hasErrors ? null : packet,
    errors:       Object.freeze(errors),
    diagnostics:  Object.freeze(diagnostics),
    regressionSeed: Object.freeze({
      source:  source,
      options: options,
      checksum: ast?.checksum || null,
    }),
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function _runPass(name, ast, errors, passFn) {
  try {
    return passFn(ast, errors) || ast;
  } catch (e) {
    errors.push(scdlError(
      `Pass '${name}' threw unexpectedly: ${e.message}`,
      SCDL_ERROR_CODES.MISSING_ASSET,
      { line: 1, col: 1 },
      { pass: name, thrown: String(e) }
    ));
    return ast;
  }
}

function _hasFatal(errors) {
  return errors.some(e => e.isError ? e.isError() : e.severity === 'ERROR');
}

function _failResult(errors, ast, source) {
  const diagnostics = emitDiagnosticsPass(ast, errors, null);
  return Object.freeze({
    ok:          false,
    ast:         null,
    packet:      null,
    errors:      Object.freeze(errors),
    diagnostics: Object.freeze(diagnostics),
    regressionSeed: Object.freeze({ source, options: {}, checksum: ast?.checksum || null }),
  });
}
