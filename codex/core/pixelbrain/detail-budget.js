/**
 * detail-budget.js
 * Enforces a detail budget on motifs based on the host part's interior width.
 * Prevents thin parts from being overcrowded by motif + glow layers.
 */

export function applyDetailBudget(part, interiorWidth) {
  if (!part || !part.motif) return { allowCore: false, allowGlow: false, simplifyToPoints: false };

  // Assume conservative width if unknown
  const width = interiorWidth || 10;

  if (width >= 7) {
    // Plenty of room: full motif and glow shell
    return { allowCore: true, allowGlow: true, simplifyToPoints: false };
  } else if (width >= 4) {
    // Moderate room: motif only, no glow shell
    return { allowCore: true, allowGlow: false, simplifyToPoints: false };
  } else {
    // Very tight: single-pixel accents only
    return { allowCore: true, allowGlow: false, simplifyToPoints: true };
  }
}
