/**
 * Resonance antibody persistence (Node-only).
 *
 * When the immune scan locates a distress root, its exosome checksum + the
 * failing invariant are written as a `.resonance.json` antibody record. If the
 * exact same checksum (RNA) appears again, the system recognizes the failure
 * instantly instead of re-deriving it. See SPATIAL-IMMUNE-DIAGNOSTICS.md §1.3.
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const DEFAULT_RESONANCE_DIR = 'public/data/resonance';

/**
 * Persist an antibody for a distress root.
 * @param {object} antibody - from synthesizeResonance()
 * @param {object} opts - { dir?, recognizedOnly? }
 * @returns {object} { path, checksum, recognized } — recognized=true if a prior
 *   antibody with the same checksum already existed (an immune memory hit).
 */
export function writeResonanceAntibody(antibody, opts = {}) {
  if (!antibody || !antibody.checksum) return { path: null, checksum: null, recognized: false };
  const dir = opts.dir || DEFAULT_RESONANCE_DIR;
  const path = join(dir, `${antibody.checksum}.resonance.json`);

  const recognized = existsSync(path);
  let firstSeen = new Date().toISOString();
  let hits = 1;
  if (recognized) {
    try {
      const prior = JSON.parse(readFileSync(path, 'utf8'));
      firstSeen = prior.firstSeen || firstSeen;
      hits = (prior.hits || 1) + 1;
    } catch {
      // corrupt prior record — overwrite cleanly
    }
  }

  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(
    path,
    JSON.stringify({ ...antibody, firstSeen, lastSeen: new Date().toISOString(), hits }, null, 2)
  );
  return { path, checksum: antibody.checksum, recognized };
}

export default writeResonanceAntibody;
