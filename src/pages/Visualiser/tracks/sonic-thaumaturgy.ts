import type { GrimoireTrack } from './types';

// Sonic Thaumaturgy V2 — a real Suno incantation by Vaelrix. Every value below is taken from
// the published track (no invented BPM/key claims — VAELRIX honesty law). id,
// creation date and lyrics come from the file's own ID3 tags; the three URLs
// were each verified live before being written here.
export const SONIC_THAUMATURGY: GrimoireTrack = {
  id: '5c6aee94-2583-435f-bbad-1439de23772d',
  title: 'Sonic Thaumaturgy V2',
  artist: 'Vaelrix',
  model: 'Scholomance V2',
  modelVersion: 'custom',
  duration: 282, // 4:42, measured from the master (282.77s)
  sunoUrl: 'https://suno.com/song/5c6aee94-2583-435f-bbad-1439de23772d',
  audioUrl: 'https://cdn1.suno.ai/5c6aee94-2583-435f-bbad-1439de23772d.mp3',
  coverUrl: 'https://cdn2.suno.ai/image_5c6aee94-2583-435f-bbad-1439de23772d.jpeg',
  meta: [
    ['Duration', '4:42'],
    ['Model', 'Custom Suno model · Scholomance V2'],
    ['Persona', 'Vaelrix'],
    ['Style', 'Hip-Hop · Rap'],
    ['Released', 'July 16, 2026'],
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
  //   leadInS .......... 21.41s, the start of the first *confidently*
  //                      aligned word ('a'). Interpolated spans are
  //                      guesses drawn between neighbours and may not source a
  //                      pacing number.
  //   tailS ............ last confident word ends 272.85s of 282.77s.
  //   *SylPerBeat ...... DEFAULT_PACING's bland even spread. Nobody measured the
  //                      syllable density, and a default is not a claim.
  pacing: {
    bpm: 90,
    leadInS: 21.41,
    verseSylPerBeat: 1.2,
    chorusSylPerBeat: 1.2,
    tailS: 9.91,
    coupletCostMax: 0.75,
  },
  // Verbatim from the master's embedded lyrics-eng tag (blank stanza breaks and
  // [Section] directions dropped — the registry carries sung text only). The
  // forced aligner (scripts/align_lyrics.py) counts word indices over exactly
  // these lines — edit one without re-running it and the artifact contract fails.
  lyrics: [
    "I'm a super Saiyan God with an aura of a dynamo",
    "rhymes complex like cells under a microscope",
    "microphone gore, written poetry inside the soul",
    "grass is always greener cause I water it with mind control",
    "I hear a beat, and I'm Dwight Shrute, I eat it up",
    "discard your body in a box like a pizza crust",
    "every bar turned into gold, it's verbal alchemy",
    "write a diss to me and get punished for journal blasphemy",
    "I write a verse, and I murder it like a psychopath",
    "outshine, And like Vegeta, that is your final flash",
    "turn the mic to ash, I meditate in an acid bath",
    "rapping wrath so long, question marks measured by taxi cabs",
    "it's absurd to me,  try to wrestle with Hercules",
    "when the verses breed, a spirit powered by Cherokee",
    "can't compare to me, it's like Atari to a holodeck",
    "process data so efficient, I don't have a bottleneck",
    "charisma great, make a Nazi account and you'd follow it",
    "Drink a giant liquor, use the container to bottle ships",
    "Marijuana has me seeing green like it's night vision",
    "not safe, Epstein, you'll get killed inside prison",
    "assassins posted on your block like they're sound ninjas",
    "you're a snack, compared to my Jounin, they just found dinner",
    "I need a hit? I'm calling universe 6",
    "I have Zeno stare in awe when I spew the verses",
    "I'm perfect, write a verse with symmetrical rhyme",
    "that's why the lines hit with force and impeccable time",
    "You gotta mention my name? you better let it die",
    "or I'll make a point to diss you every day that ends in Y",
    "sonic wave gonna judge you if you want to testify",
    "High fidelity, I rhyme the hell in me, electrify",
    "Steven Spielberg couldn't match the direction",
    "and I'm like Hephaestus, I am crafting perfection",
    "if you see me in the street and you're lacking protection",
    "one shot, your voice raises like you're asking a question",
    "Your flow, I bury it, you're just a proletariat",
    "Your prose can barely hit, all your poetry like chariots",
    "controlled by a headless horseman, there's no comparison",
    "no thoughts put into your words, it's embarrassing",
    "getting drunk off a mathematical proof",
    "talk shit I'll squeeze your brittle adam's apple to juice",
    "John Wilkes, I assassinate when inside the booth",
    "buck 50 to your pillow like you're hiding a tooth",
    "A G I, I'm encoded and designed to improve",
    "Sukuna's finger, I'm a vessel that is highly imbued",
    "lines that I use, phonetically divine like it's Zeus",
    "see you coming, Peter Parker with the mind of a Bruce",
    "Aladdin with female genies, I'm riding the magic carpet",
    "you're the type to throw a shot but can't shatter a plastic target",
    "doesn't help you rap retarded, your flow is a vat of garbage",
    "I laugh at this maggot ass with a pad full of disregarded",
    "lyrics that never harden like thinking putty, your shit is ugly",
    "I'm getting money, by stealing faster than debt and honey",
    "you're rapping simple bout' shit that you haven't been through",
    "you couldn't feel my pain if we body swapped like Captain Ginyou",
    "after this, you'll be a rapper that they have to rescue",
    "a restaurant of bars, and I have a massive menu",
    "Las Vegas shooting, this machine gun it will crash the venue",
    "doodlebob, erase your reality when I grab the pencil",
    "head buried in the coke like I'm scarface",
    "love is pulled apart like 808 and heartbreak",
    "stay awake, insomnia is a hard state",
    "devil tried to trick, and I turned him into a charred snake",
    "brain is like a group of Lizzos, it stays with heavy thoughts.",
    "I could murder people on stage, and still get applause",
    "over fifty only time you'll ever get the men to pause",
    "Scratch my back, then I'm scratching yours with Santa Claus",
    "buying percussion, is the only time I'm peeping toms",
    "Elder Man touched my girl, and she told me to keep it calm",
    "only reason why you're alive, facing the demon spawn",
    "if I had my way I'd have you castrated, semen gone",
    "verbal warfare, you're fighting a war in Vietnam",
    "Agent Orange burning the forests until the seeds are blonde",
    "making green out of my soul like I'm Shang Tsung",
    "polyglot, it is required to have a great tongue",
    "Outperforming Doctor strange if we're in the same room",
    "Harry Potter, outrun Bugattis using a plain broom",
    "I'm Franklin Richards when it comes to metamorphosis",
    "triangulate, with cell phone towers I get coordinates",
    "mentally, I'm not bending spoons, I'm bending time itself",
    "unfathomably large, holding my pants with Orion's belt",
    "it's as if I coded my genetics and designed myself",
    "the way I see a flaw and perfect it before you try to help",
    "disconnected from reality, but find a way",
    "to be the realest rapper that's inhabiting the cyber space",
    "no artifice, and what you see is not a subterfuge",
    "the way I suffer too is not removed from what is up with you",
    "I put it into the lines, trust me, it's nothing new",
    "I was writing poems at 8, riding the bus to school",
    "I remember I was losing battles cause I couldn't rhyme",
    "now the only time I lose a battle? with my crooked mind",
    "paranoia, every enemy an apparition",
    "schizophrenic tendencies causing me to lack conviction",
    "lost friends, cause' they put me in a bad position",
    "gained a fan base and had the vision but slacked in wisdom",
  ],
  annotations: [],
};
