/**
 * SCDL Emit Diagnostics Pass
 *
 * Converts SCDLError[] into hover-decodable diagnostic entries.
 * These are structured for the existing SCD64 diagnostic infrastructure.
 */

/**
 * @param {object} ast
 * @param {import('../scdl.errors.js').SCDLError[]} errors
 * @param {object|null} packet - PixelBrainAssetPacket (may be null on compile failure)
 * @returns {object[]} diagnostic entries
 */
export function emitDiagnosticsPass(ast, errors, packet) {
  const diagnostics = errors.map(err => ({
    source:         'SCDL-v1',
    module:         'scdl-compiler',
    severity:       err.severity || 'ERROR',
    code:           err.label || 'SCDL-???',
    message:        err.message,
    loc:            err.loc,
    bytecodeString: err.bytecodeString,
    context:        err.context,
    assetId:        ast?.asset || null,
    packetId:       packet?.id || null,
  }));

  return diagnostics;
}
