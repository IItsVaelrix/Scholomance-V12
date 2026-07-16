import type { GrimoireAlbum } from './types';
// Import track modules directly — never via ./index — to avoid a circular
// dependency (index re-exports albums; albums must not import the barrel).
import { PETRICHOR } from './petrichor';
import { BIG_FATHER } from './bigFather';
import { POLARITY } from './polarity';
import { DAYDREAMING_NIGHTMARES } from './daydreaming-nightmares';

export const GRIMOIRE_ALBUMS: GrimoireAlbum[] = [
  {
    id: 'grimoire-vol-1',
    title: 'Grimoire Vol. I',
    artist: 'Vaelrix',
    coverUrl: PETRICHOR.coverUrl,
    description: 'The first collection of Suno incantations — cinematic emo rock, hyperpop, and dark ambient forged through the Vaelrix persona.',
    releaseDate: '2026-06-10',
    status: 'released',
    genres: ['Cinematic Emo Rock', 'Hyperpop', 'Dark Ambient'],
    tracks: [
      { trackId: PETRICHOR.id, trackNumber: 1 },
      { trackId: BIG_FATHER.id, trackNumber: 2 },
      { trackId: POLARITY.id, trackNumber: 3 },
      { trackId: DAYDREAMING_NIGHTMARES.id, trackNumber: 4 },
    ],
  },
];
