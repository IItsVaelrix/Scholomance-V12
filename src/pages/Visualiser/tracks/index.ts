export type { GrimoireTrack, TrackPacing } from './types';
export { DEFAULT_PACING } from './types';
export type { GrimoireAlbumTrack, GrimoireAlbum } from './types';
export { GRIMOIRE_ALBUMS } from './albums';
export { PETRICHOR } from './petrichor';
export { BIG_FATHER } from './bigFather';
export { POLARITY } from './polarity';
export { DAYDREAMING_NIGHTMARES } from './daydreaming-nightmares';
export { SCHOLOMANCER } from './scholomancer';
export { SONIC_THAUMATURGY } from './sonic-thaumaturgy';
export { REGRET } from './regret';

import type { GrimoireTrack } from './types';
import { PETRICHOR } from './petrichor';
import { BIG_FATHER } from './bigFather';
import { POLARITY } from './polarity';
import { DAYDREAMING_NIGHTMARES } from './daydreaming-nightmares';
import { SCHOLOMANCER } from './scholomancer';
import { SONIC_THAUMATURGY } from './sonic-thaumaturgy';
import { REGRET } from './regret';

/** Shelf order = release order; first entry is the default track.
    REGRET sits before SCHOLOMANCER because its master's tag dates it July 1 —
    earlier than Scholomancer's July 15 — even though the album plays it third.
    Album running order is an artistic choice; this shelf is chronological. Its
    position relative to POLARITY and DAYDREAMING_NIGHTMARES is unverified:
    neither declares a release date, so nothing here claims one. */
export const GRIMOIRE_TRACKS: GrimoireTrack[] = [
  PETRICHOR,
  BIG_FATHER,
  POLARITY,
  DAYDREAMING_NIGHTMARES,
  REGRET,
  SCHOLOMANCER,
  SONIC_THAUMATURGY,
];
