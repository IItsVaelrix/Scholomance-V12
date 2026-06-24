import crypto from 'node:crypto';
import { BUG_FAMILIES } from './glossary';

export function generateSCD64(bugFamily: string, isPredicted: boolean = false): string {
  // @ts-expect-error - indexing object with string
  const family = BUG_FAMILIES[bugFamily];
  if (!family) {
    throw new Error(`[SCD64] Unknown bug family: ${bugFamily}`);
  }

  const deriveHex = (canonical: string, isBugClass: boolean) => {
    const hash = crypto.createHash('sha256').update(canonical).digest('hex').toUpperCase();
    if (isBugClass) {
      return (isPredicted ? family.predictedVersionByte : family.versionByte) + hash.slice(0, 6);
    }
    return hash.slice(0, 8);
  };

  const slots = family.canonicals.map((entry: any) => {
    const isBug = entry.slot === 'BUGCLASS';
    return deriveHex(entry.canonical, isBug);
  });

  return slots.join('');
}
