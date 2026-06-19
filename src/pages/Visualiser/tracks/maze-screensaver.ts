import type { GrimoireTrack } from './types';

// Suno track — id 0ff1c2ee-6951-4f65-9204-4cbb2baf16fa
//
// Before running alignment:
//   1. Measure BPM from the audio (tap-tempo or onset detection).
//   2. Fill in pacing.bpm, pacing.leadInS, and duration below.
//   3. npx tsx scripts/align-track.mjs maze-screensaver
//
// WhisperX auto-transcribes — no reference lyrics required.
export const MAZE_SCREENSAVER: GrimoireTrack = {
  id: '0ff1c2ee-6951-4f65-9204-4cbb2baf16fa',
  title: 'Maze Screensaver',       // TODO: fill in actual title
  artist: 'Vaelrix',
  model: 'suno',
  modelVersion: 'v4',
  duration: 180,                   // TODO: fill in actual duration (seconds)
  sunoUrl: 'https://suno.com/song/0ff1c2ee-6951-4f65-9204-4cbb2baf16fa',
  audioUrl: 'https://cdn1.suno.ai/0ff1c2ee-6951-4f65-9204-4cbb2baf16fa.mp3',
  coverUrl: '',
  meta: [
    ['Source', 'suno.com'],
  ],
  provenance: {
    statement: 'Crafted with human intention and AI assistance.',
    tools: ['Suno'],
    assistance: '',
  },
  lyrics: [], // populated automatically by WhisperX transcript
  annotations: [],
  // Uncomment and set once BPM is measured:
  // pacing: {
  //   bpm: 0,         // <-- measure this
  //   leadInS: 0,     // silence before first beat
  //   tailS: 0,
  //   verseSylPerBeat: 1.2,
  //   chorusSylPerBeat: 0.8,
  //   coupletCostMax: 0.75,
  // },
};
