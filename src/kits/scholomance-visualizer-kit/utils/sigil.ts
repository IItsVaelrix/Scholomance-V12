import type { ScholomanceSigilSeed, ScholomanceSigilOutput } from "../types";

export function createSigilProfile(seed: ScholomanceSigilSeed): ScholomanceSigilOutput {
  const semanticWeight = seed.semanticTags.length;
  const checksumValue = seed.checksum
    .slice(0, 6)
    .split("")
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);

  return {
    seed: `${seed.trackId}:${seed.checksum.slice(0, 8)}`,
    polygonSides: 5 + (checksumValue % 4),
    ringCount: 2 + (semanticWeight % 4),
    glyphCount: 6 + (checksumValue % 9),
    primaryHue: checksumValue % 3 === 0 ? "magenta" : checksumValue % 3 === 1 ? "cyan" : "amber",
    motionProfile: semanticWeight > 5 ? "fracture" : "orbit"
  };
}
