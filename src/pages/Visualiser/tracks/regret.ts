import type { GrimoireTrack } from './types';

// Regret V3 — a real Suno incantation by Vaelrix. Every value below is taken from
// the published track (no invented BPM/key claims — VAELRIX honesty law). id,
// creation date and lyrics come from the file's own ID3 tags; the three URLs
// were each verified live before being written here.
export const REGRET: GrimoireTrack = {
  id: 'b5a2ff2a-a16b-407f-8691-409da736599f',
  title: 'Regret V3',
  artist: 'Vaelrix',
  model: 'Scholomance V2',
  modelVersion: 'custom',
  duration: 205, // 3:25, measured from the master (205.20s)
  sunoUrl: 'https://suno.com/song/b5a2ff2a-a16b-407f-8691-409da736599f',
  audioUrl: 'https://cdn1.suno.ai/b5a2ff2a-a16b-407f-8691-409da736599f.mp3',
  coverUrl: 'https://cdn2.suno.ai/image_b5a2ff2a-a16b-407f-8691-409da736599f.jpeg',
  meta: [
    ['Duration', '3:25'],
    ['Model', 'Custom Suno model · Scholomance V2'],
    ['Persona', 'Vaelrix'],
    ['Style', 'Hip-Hop · Rap'],
    ['Released', 'July 1, 2026'],
    ['Source', 'suno.com'],
  ],
  provenance: {
    statement: 'Crafted with human intention and AI assistance.',
    tools: ['Suno · custom model — Scholomance V2', 'Persona — Vaelrix'],
    assistance: 'Hip-hop · rap',
  },
  // Fallback only — the alignment artifact takes precedence wherever it loads.
  // Honesty law: every value here is measured or reported, none invented.
  //   bpm .............. 90, reported by Damien, who made the track. Inert in
  //                      lyricLineAt (it cancels out of beatS) but NOT inert
  //                      overall: computeFingerprint seeds the visual off
  //                      `trackId|bpm|key`, useBeatClock drives the video
  //                      renders, and RitualSyncCard prints it on screen.
  //   leadInS .......... 1.00s, reported by Damien (the vocal opens on
  //                      'Lord,'). The aligner was not confident
  //                      until 'regretful,' at 2.46s, so the derived value
  //                      would have been late — a report beats a derivation.
  //   tailS ............ last confident word ends 204.92s of 205.20s.
  //   *SylPerBeat ...... DEFAULT_PACING's bland even spread. Nobody measured the
  //                      syllable density, and a default is not a claim.
  pacing: {
    bpm: 90,
    leadInS: 1.00,
    verseSylPerBeat: 1.2,
    chorusSylPerBeat: 1.2,
    tailS: 0.28,
    coupletCostMax: 0.75,
  },
  // Verbatim from the master's embedded lyrics-eng tag (blank stanza breaks and
  // [Section] directions dropped — the registry carries sung text only). The
  // forced aligner (scripts/align_lyrics.py) counts word indices over exactly
  // these lines — edit one without re-running it and the artifact contract fails.
  lyrics: [
    "Lord, I'm regretful,",
    "Sorcery forged from a war and a pencil",
    "morbid credentials",
    "force of the torque like a gorgeous nuclear core",
    "glowing orange with morphed instrumentals",
    "Pouring the mental",
    "over my corpse, baptized in chaos",
    "Cold as a seance",
    "Making a mark but these people never see it",
    "like I'm using white crayons",
    "Fusing my weight",
    "with unusual grace, steady choosing to wade",
    "through abuse and the pain",
    "too improve even though these dubious claims",
    "stay polluting my name like",
    "Who is insane? Right. music became the illusion, a chain spliced",
    "using the range of melodic disdain, I",
    "rain on the beat with demonic, enraged eyes",
    "aiming the heat like a flamethrower's reach",
    "and the pain comes complete with the rage of a caged life",
    "Erasing the stage fright,",
    "Placating the wolf with estranged hype",
    "Slaying the booth, at the same time",
    "Detaching the limbs of the grape vine.",
    "Your Majesty is shattered",
    "Pattern after pattern",
    "Big Father swallows up the steam, it doesn't matter",
    "Logically I'm nothing",
    "but logic never mattered",
    "to anybody else, so why the fuck does it matter?",
    "Honestly disaster",
    "could never come faster",
    "Slaughter in the rain like the drops made of acid",
    "Honoring the pain with this poem etched on Sanskrit",
    "Cauterize the shame, then I'll sell it in a pamphlet",
    "Honestly disaster",
    "could never come faster",
    "Slaughter in the rain like the drops made of acid",
    "Authoring the range like my hands are a rifle's scope",
    "Only feel elated when I take away my rival's hope",
    "Automated anguish,",
    "Bodies laced like a shoe or the weed that I sell, right?",
    "Complicated madness.",
    "Hatred, the swelled chest",
    "bursting at the seams because depression, it knows best.",
    "bold stress, blood leaking on a cold bed",
    "gold kept inside a safe",
    "next to the clip, so I don't hold breath.",
    "Your Majesty is shattered",
    "Pattern after pattern",
    "Big Father swallows up the steam, it doesn't matter",
    "Logically I'm nothing",
    "but logic never mattered",
    "to anybody else, so why the fuck does it matter?",
    "Honestly disaster",
    "could never come faster",
    "Slaughter in the rain like the drops made of acid",
    "Honoring the pain with this poem etched on Sanskrit",
    "Cauterize the shame, then I'll sell it in a pamphlet",
    "Oxygen is trapped, in these cylinders of gold",
    "where the villains in the story charge with millions alone",
    "while water is usurped, and the politicians know",
    "they would rather drown inside it than give a drop of the soul",
    "Masterful Monarchs",
    "Habit to evolve dark",
    "Lacking all poise, and it's poignant, but an odd thought",
    "Maybe I'm a Noah,",
    "building such a large Ark",
    "Feeling like I'm Tanjuro",
    "the boulder was a mini arc.",
    "Majesty is shattered",
    "Pattern after pattern",
    "Big Father swallows up the steam, it doesn't matter",
    "Logically I'm nothing",
    "but logic never mattered",
    "to anybody else, so why the fuck does it matter?",
    "Scattering disaster",
    "the seeds made of Jasper",
    "I couldn't grow peace in the soil made of laughter",
    "Cause S slithered right in the front and caused cancer",
    "all my dreams died, so I need a necromancer.",
    "Honestly disaster",
    "could never come faster",
    "Slaughter in the rain like the drops made of acid",
    "Honoring the pain with this poem etched on Sanskrit",
    "Cauterize the shame, then I'll sell it in a pamphlet",
    "Lord, I'm regretful,",
    "Sorcery forged from a war and a pencil",
    "morbid credentials",
    "force of the torque like a gorgeous nuclear core",
    "glowing orange with morphed instrumentals",
  ],
  annotations: [],
};
