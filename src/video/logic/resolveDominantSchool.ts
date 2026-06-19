import type { WordTiming } from "../types";

const SCHOOL_PRIORITY = [
  "VOID",
  "NECROMANCY",
  "WILL",
  "ALCHEMY",
  "SONIC",
  "PSYCHIC",
  "ABJURATION",
  "DIVINATION",
];

export interface ResolveDominantSchoolOptions {
  historySize: number;
}

export function resolveDominantSchool(
  words: WordTiming[],
  options: ResolveDominantSchoolOptions
): string {
  const recent = words.slice(-options.historySize);

  if (recent.length === 0) {
    return "VOID";
  }

  const counts = new Map<string, number>();

  for (const word of recent) {
    counts.set(word.school, (counts.get(word.school) ?? 0) + 1);
  }

  return [...counts.entries()].sort((a, b) => {
    const countDiff = b[1] - a[1];
    if (countDiff !== 0) {
      return countDiff;
    }
    return SCHOOL_PRIORITY.indexOf(a[0]) - SCHOOL_PRIORITY.indexOf(b[0]);
  })[0][0];
}