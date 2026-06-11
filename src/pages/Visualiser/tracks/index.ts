export type { GrimoireTrack, TrackPacing } from './types';
export { DEFAULT_PACING } from './types';
export { PETRICHOR } from './petrichor';
export { BIG_FATHER } from './bigFather';

import type { GrimoireTrack } from './types';
import { PETRICHOR } from './petrichor';
import { BIG_FATHER } from './bigFather';

/** Shelf order = release order; first entry is the default track. */
export const GRIMOIRE_TRACKS: GrimoireTrack[] = [PETRICHOR, BIG_FATHER];
