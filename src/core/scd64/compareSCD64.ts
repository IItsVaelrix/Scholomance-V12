import { SCD64_SLOT_NAMES } from "./constants";
import { parseSCD64 } from "./parseSCD64";
import type { SCD64MutationComparison } from "./types";

export function compareSCD64ByBlocks(a: string, b: string): SCD64MutationComparison {
  const aBlocks = parseSCD64(a);
  const bBlocks = parseSCD64(b);

  let matchingBlocks = 0;
  const differentBlocks: Array<typeof SCD64_SLOT_NAMES[number]> = [];

  for (let i = 0; i < 8; i++) {
    if (aBlocks[i] === bBlocks[i]) {
      matchingBlocks++;
    } else {
      differentBlocks.push(SCD64_SLOT_NAMES[i]);
    }
  }

  const similarity = matchingBlocks / 8;

  let relationship: SCD64MutationComparison["relationship"];
  if (matchingBlocks === 8) {
    relationship = "IDENTICAL";
  } else if (matchingBlocks >= 6) {
    relationship = "MUTATION";
  } else if (matchingBlocks >= 4) {
    relationship = "RELATED_FAMILY";
  } else if (matchingBlocks >= 2) {
    relationship = "WEAK_NEIGHBOR";
  } else {
    relationship = "UNRELATED";
  }

  return {
    matchingBlocks,
    differentBlocks,
    similarity,
    relationship
  };
}
