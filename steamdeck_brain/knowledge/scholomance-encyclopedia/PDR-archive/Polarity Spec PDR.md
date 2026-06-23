Polarity Music Video
Phase 2 Technical Implementation Spec
Summary

Change classification: architectural + behavioral.

This phase turns Polarity from a cinematic concept into a code-addressable PixelBrain video pipeline.

The goal is not to manually edit a music video. The goal is to create a deterministic render system where:

lyrics + audio + BPM + scene cues + Foundry assets
→ ScholoTime timing
→ PixelBrain visual authority
→ Remotion cinematic render
→ output/videos/polarity.mp4

This spec gives you the paste-ready skeleton for:

polarity.align.json
polarity.video.json
Foundry asset checklist
Remotion component map
scene cue resolver
typography behavior
PixelBrain stage behavior
validation rules
QA checklist
next technical risks
Why

The biggest risk with this project is turning PixelBrain into “After Effects but weirder.”

Do not do that.

PixelBrain’s advantage is that the visuals are not just overlays. They are structured symbolic assets driven by:

beat state
bar state
lyric timing
school color
scene mode
atmosphere state
Foundry-authored lattice assets

So the renderer should not ask:

What effect should I put on this line?

It should ask:

What has this line done to the world-state?

That is the dragon-key 🜂.

Assumptions

Until real audio alignment exists, these are placeholders:

const POLARITY_ASSUMPTIONS = {
  trackId: "polarity",
  bpm: 93,
  leadInS: 1.2,
  fps: 30,
  width: 1920,
  height: 1080,
  estimatedDurationMs: 202000
};

Once the real audio exists, the alignment script should replace all estimated word timings.

File Tree
src/
  pages/
    Visualiser/
      tracks/
        polarity.ts
        polarity.align.json
        polarity.video.json

  video/
    compositions/
      KineticLyricsVideo.tsx

    components/
      KineticLyricsLayer.tsx
      KineticWord.tsx
      PixelBrainStage.tsx
      PixelBrainAssetLayer.tsx
      SceneAtmosphereLayer.tsx
      GlyphGhost.tsx
      BytecodeMandalaLayer.tsx

    hooks/
      useBeatClock.ts
      useActiveScene.ts
      useActiveWords.ts

    schemas/
      alignment.ts
      videoScene.ts
      foundryAssetManifest.ts

    logic/
      resolveActiveScene.ts
      resolveActiveWords.ts
      resolveDominantSchool.ts
      resolveSceneAtmosphere.ts
      resolveTypographyProgram.ts
      validateVideoSidecar.ts

scripts/
  align-track.mjs
  render-music-video.mjs
  validate-video-sidecar.mjs

output/
  videos/
    polarity.mp4
Code
1. Alignment Sidecar Schema
NEW: src/video/schemas/alignment.ts
export interface WordTiming {
  word: string;
  startMs: number;
  endMs: number;
  beat: {
    index: number;
    phase: number;
    bar: number;
    barPhase: number;
  };
  school: string;
  confidence?: number;
  manualOffsetMs?: number;
}

export interface AlignmentSidecar {
  schemaVersion: "scholomance.align.v1";
  trackId: string;
  bpm: number;
  offsetMs: number;
  lyricsHash: string;
  audioUrl?: string;
  audioHash?: string;
  generatedAt: string;
  wordTimings: WordTiming[];
}
Why

This keeps timing data separate from the track definition.

Risk reduced
no track file bloat
no Visualiser regression
no silent timing mismatch
no stale sidecar corruption
2. Example polarity.align.json
NEW: src/pages/Visualiser/tracks/polarity.align.json

This is a shape example, not final alignment.

{
  "schemaVersion": "scholomance.align.v1",
  "trackId": "polarity",
  "bpm": 93,
  "offsetMs": 1200,
  "lyricsHash": "TO_BE_GENERATED_FROM_LOCKED_LYRICS",
  "audioUrl": "TO_BE_FILLED_FROM_GRIMOIRE_TRACK",
  "audioHash": "OPTIONAL_LOCAL_AUDIO_HASH",
  "generatedAt": "2026-06-15T00:00:00.000Z",
  "wordTimings": [
    {
      "word": "Lyrical",
      "startMs": 6200,
      "endMs": 6600,
      "beat": {
        "index": 8,
        "phase": 0.75,
        "bar": 2,
        "barPhase": 0.18
      },
      "school": "SONIC",
      "confidence": 0.92
    },
    {
      "word": "rapper",
      "startMs": 6620,
      "endMs": 6940,
      "beat": {
        "index": 9,
        "phase": 0.04,
        "bar": 2,
        "barPhase": 0.25
      },
      "school": "WILL",
      "confidence": 0.89
    }
  ]
}
3. Video Scene Sidecar Schema
NEW: src/video/schemas/videoScene.ts
export type SceneMode =
  | "threshold"
  | "drought"
  | "lotus"
  | "tragedy"
  | "gold"
  | "retro-war"
  | "skull-dragon"
  | "gravity-machine"
  | "fibonacci-pressure"
  | "monarch-fire"
  | "black-hole-flood"
  | "recovery-polarity";

export type CameraKind =
  | "lock"
  | "push"
  | "pull"
  | "orbit"
  | "shake"
  | "parallax"
  | "snapZoom"
  | "crane";

export type TypographyLayout =
  | "centerPulse"
  | "impactStack"
  | "splitPolarity"
  | "flood"
  | "orbit"
  | "arena"
  | "emblem";

export interface CameraProgram {
  kind: CameraKind;
  intensity: number;
  easing: "smoothstep" | "easeOutCubic" | "easeInOutSine";
  shakeOnDownbeat?: boolean;
}

export interface AtmosphereProgram {
  saturation: number;
  vignette: number;
  aurora: number;
  grain: number;
  rain: number;
  embers: number;
  voidDrain: number;
  chromaSplit: number;
}

export interface TypographyProgram {
  layout: TypographyLayout;
  glyphGhosts: boolean;
  trailAmount: number;
  maxVisibleWords: number;
  emphasizePunchlines: boolean;
}

export interface SceneCue {
  id: string;
  title: string;
  startMs: number;
  endMs: number;
  mode: SceneMode;
  dominantSchools: string[];
  assets: string[];
  camera: CameraProgram;
  atmosphere: AtmosphereProgram;
  typography: TypographyProgram;
  anchorLyrics: string[];
  notes?: string;
}

export interface VideoSidecar {
  schemaVersion: "scholomance.video.v1";
  trackId: string;
  bpm: number;
  offsetMs: number;
  lyricsHash: string;
  scenes: SceneCue[];
}
4. polarity.video.json
NEW: src/pages/Visualiser/tracks/polarity.video.json

These timestamps are estimates. Forced alignment should refine them.

{
  "schemaVersion": "scholomance.video.v1",
  "trackId": "polarity",
  "bpm": 93,
  "offsetMs": 1200,
  "lyricsHash": "TO_BE_GENERATED_FROM_LOCKED_LYRICS",
  "scenes": [
    {
      "id": "scene-00-threshold",
      "title": "Magnetic Threshold",
      "startMs": 0,
      "endMs": 6000,
      "mode": "threshold",
      "dominantSchools": ["VOID", "DIVINATION"],
      "assets": [
        "pb_polarity_field_v1",
        "pb_charge_arc_gold_v1",
        "pb_charge_arc_blue_v1",
        "pb_wordgrid_ghost_v1"
      ],
      "camera": {
        "kind": "lock",
        "intensity": 0.15,
        "easing": "smoothstep"
      },
      "atmosphere": {
        "saturation": 0.32,
        "vignette": 0.55,
        "aurora": 0.16,
        "grain": 0.12,
        "rain": 0,
        "embers": 0.08,
        "voidDrain": 0.42,
        "chromaSplit": 0.08
      },
      "typography": {
        "layout": "emblem",
        "glyphGhosts": true,
        "trailAmount": 0.12,
        "maxVisibleWords": 1,
        "emphasizePunchlines": true
      },
      "anchorLyrics": ["Polarity"],
      "notes": "Title seed only. Let the magnetic arcs establish the core visual law."
    },
    {
      "id": "scene-01-drought-heart",
      "title": "The Drought Heart",
      "startMs": 6000,
      "endMs": 22000,
      "mode": "drought",
      "dominantSchools": ["NECROMANCY", "ALCHEMY"],
      "assets": [
        "pb_heart_parchment_cracked_v1",
        "pb_drought_fissure_set_v1",
        "pb_bard_mouth_sigil_v1",
        "pb_vaelrix_bust_shadow_v1"
      ],
      "camera": {
        "kind": "push",
        "intensity": 0.38,
        "easing": "smoothstep"
      },
      "atmosphere": {
        "saturation": 0.45,
        "vignette": 0.48,
        "aurora": 0.12,
        "grain": 0.18,
        "rain": 0,
        "embers": 0.2,
        "voidDrain": 0.18,
        "chromaSplit": 0.04
      },
      "typography": {
        "layout": "centerPulse",
        "glyphGhosts": true,
        "trailAmount": 0.18,
        "maxVisibleWords": 6,
        "emphasizePunchlines": true
      },
      "anchorLyrics": [
        "Lyrical rapper",
        "spilling my heart out",
        "heart bringing large droughts",
        "bard mouth"
      ]
    },
    {
      "id": "scene-02-black-lotus",
      "title": "Black Lotus Text-Gnosis",
      "startMs": 22000,
      "endMs": 38000,
      "mode": "lotus",
      "dominantSchools": ["DIVINATION", "SONIC", "ALCHEMY"],
      "assets": [
        "pb_black_lotus_card_v1",
        "pb_breath_text_stream_v1",
        "pb_focus_iris_v1",
        "pb_chestplate_fracture_v1"
      ],
      "camera": {
        "kind": "snapZoom",
        "intensity": 0.52,
        "easing": "easeOutCubic",
        "shakeOnDownbeat": true
      },
      "atmosphere": {
        "saturation": 0.68,
        "vignette": 0.38,
        "aurora": 0.3,
        "grain": 0.12,
        "rain": 0,
        "embers": 0.35,
        "voidDrain": 0.12,
        "chromaSplit": 0.1
      },
      "typography": {
        "layout": "impactStack",
        "glyphGhosts": true,
        "trailAmount": 0.22,
        "maxVisibleWords": 7,
        "emphasizePunchlines": true
      },
      "anchorLyrics": [
        "Card up my sleeve",
        "black Lotus",
        "breath flows like text-gnosis",
        "chest broken"
      ]
    },
    {
      "id": "scene-03-tragedy-darker",
      "title": "Tragedy Darker",
      "startMs": 38000,
      "endMs": 51000,
      "mode": "tragedy",
      "dominantSchools": ["VOID", "NECROMANCY"],
      "assets": [
        "pb_false_king_shadow_v1",
        "pb_web_agony_overlay_v1",
        "pb_grief_shroud_v1"
      ],
      "camera": {
        "kind": "pull",
        "intensity": 0.36,
        "easing": "easeInOutSine"
      },
      "atmosphere": {
        "saturation": 0.22,
        "vignette": 0.7,
        "aurora": 0.04,
        "grain": 0.2,
        "rain": 0.05,
        "embers": 0.08,
        "voidDrain": 0.68,
        "chromaSplit": 0.06
      },
      "typography": {
        "layout": "splitPolarity",
        "glyphGhosts": true,
        "trailAmount": 0.16,
        "maxVisibleWords": 5,
        "emphasizePunchlines": true
      },
      "anchorLyrics": [
        "actually Arthur",
        "agony Parker",
        "killing Ben",
        "tragedy darker"
      ],
      "notes": "Keep references archetypal, not literal."
    },
    {
      "id": "scene-04-golden-fist",
      "title": "Golden Fist Selection",
      "startMs": 51000,
      "endMs": 66000,
      "mode": "gold",
      "dominantSchools": ["WILL", "SONIC"],
      "assets": [
        "pb_golden_fist_gauntlet_v1",
        "pb_target_silhouette_strip_v1",
        "pb_flow_pressure_ring_v1"
      ],
      "camera": {
        "kind": "push",
        "intensity": 0.75,
        "easing": "easeOutCubic",
        "shakeOnDownbeat": true
      },
      "atmosphere": {
        "saturation": 0.82,
        "vignette": 0.24,
        "aurora": 0.2,
        "grain": 0.08,
        "rain": 0,
        "embers": 0.72,
        "voidDrain": 0,
        "chromaSplit": 0.07
      },
      "typography": {
        "layout": "impactStack",
        "glyphGhosts": true,
        "trailAmount": 0.18,
        "maxVisibleWords": 7,
        "emphasizePunchlines": true
      },
      "anchorLyrics": [
        "Golden Fist",
        "Eenie Miney Moe",
        "Teeny Tiny poets",
        "flow like this"
      ]
    },
    {
      "id": "scene-05-retro-war-room",
      "title": "Magnavox Sciamachy",
      "startMs": 66000,
      "endMs": 89000,
      "mode": "retro-war",
      "dominantSchools": ["SONIC", "ABJURATION", "VOID"],
      "assets": [
        "pb_crt_wall_magnavox_v1",
        "pb_cannonball_impact_v1",
        "pb_muzzle_flash_glyph_v1",
        "pb_shadow_duelist_set_v1",
        "pb_scanline_overprint_v1"
      ],
      "camera": {
        "kind": "parallax",
        "intensity": 0.46,
        "easing": "smoothstep"
      },
      "atmosphere": {
        "saturation": 0.52,
        "vignette": 0.42,
        "aurora": 0.09,
        "grain": 0.36,
        "rain": 0,
        "embers": 0.38,
        "voidDrain": 0.16,
        "chromaSplit": 0.16
      },
      "typography": {
        "layout": "arena",
        "glyphGhosts": true,
        "trailAmount": 0.26,
        "maxVisibleWords": 8,
        "emphasizePunchlines": true
      },
      "anchorLyrics": [
        "Beretta Pops",
        "Magavox",
        "box rappers",
        "sciamachy"
      ]
    },
    {
      "id": "scene-06-skull-dragon",
      "title": "Dragon in the Skull",
      "startMs": 89000,
      "endMs": 118000,
      "mode": "skull-dragon",
      "dominantSchools": ["NECROMANCY", "WILL", "VOID"],
      "assets": [
        "pb_battle_steed_v1",
        "pb_broken_glyph_debris_v1",
        "pb_open_skull_shell_v1",
        "pb_skull_dragon_core_v1",
        "pb_bleeding_script_eruption_v1"
      ],
      "camera": {
        "kind": "crane",
        "intensity": 0.68,
        "easing": "easeOutCubic",
        "shakeOnDownbeat": true
      },
      "atmosphere": {
        "saturation": 0.58,
        "vignette": 0.58,
        "aurora": 0.22,
        "grain": 0.2,
        "rain": 0.03,
        "embers": 0.54,
        "voidDrain": 0.34,
        "chromaSplit": 0.12
      },
      "typography": {
        "layout": "flood",
        "glyphGhosts": true,
        "trailAmount": 0.3,
        "maxVisibleWords": 8,
        "emphasizePunchlines": true
      },
      "anchorLyrics": [
        "battle steed",
        "war zone",
        "feed the dragon in my skull",
        "it has to bleed"
      ]
    },
    {
      "id": "scene-07-gravity-machine",
      "title": "Gravity Machine",
      "startMs": 118000,
      "endMs": 141000,
      "mode": "gravity-machine",
      "dominantSchools": ["DIVINATION", "SONIC", "ALCHEMY"],
      "assets": [
        "pb_gravity_well_v1",
        "pb_oil_gasoline_splash_v1",
        "pb_algorithm_grid_v1",
        "pb_sand_effigy_v1",
        "pb_water_serpent_v1",
        "pb_hook_waveform_v1"
      ],
      "camera": {
        "kind": "orbit",
        "intensity": 0.54,
        "easing": "smoothstep"
      },
      "atmosphere": {
        "saturation": 0.64,
        "vignette": 0.36,
        "aurora": 0.28,
        "grain": 0.12,
        "rain": 0.18,
        "embers": 0.34,
        "voidDrain": 0.08,
        "chromaSplit": 0.14
      },
      "typography": {
        "layout": "orbit",
        "glyphGhosts": true,
        "trailAmount": 0.24,
        "maxVisibleWords": 7,
        "emphasizePunchlines": true
      },
      "anchorLyrics": [
        "The pull is gravity",
        "onto the beat like gasoline",
        "algorithmically I'm grand",
        "water to a Sandman",
        "allergic to a hook"
      ]
    },
    {
      "id": "scene-08-fibonacci-pressure",
      "title": "Fibonacci Pressure",
      "startMs": 141000,
      "endMs": 166000,
      "mode": "fibonacci-pressure",
      "dominantSchools": ["DIVINATION", "ALCHEMY", "SONIC"],
      "assets": [
        "pb_heavy_hands_v1",
        "pb_sawed_musket_v1",
        "pb_firehose_text_jet_v1",
        "pb_emotion_fabric_strip_v1",
        "pb_fibonacci_lattice_spiral_v1",
        "pb_enemy_mask_leak_v1"
      ],
      "camera": {
        "kind": "push",
        "intensity": 0.62,
        "easing": "easeOutCubic",
        "shakeOnDownbeat": true
      },
      "atmosphere": {
        "saturation": 0.74,
        "vignette": 0.3,
        "aurora": 0.38,
        "grain": 0.16,
        "rain": 0.1,
        "embers": 0.44,
        "voidDrain": 0.06,
        "chromaSplit": 0.1
      },
      "typography": {
        "layout": "flood",
        "glyphGhosts": true,
        "trailAmount": 0.34,
        "maxVisibleWords": 9,
        "emphasizePunchlines": true
      },
      "anchorLyrics": [
        "heavy hands",
        "deadly slam poetry",
        "fire hose",
        "designer clothes",
        "fibonacci codes"
      ]
    },
    {
      "id": "scene-09-monarch-fire",
      "title": "Monarch Fire Pit",
      "startMs": 166000,
      "endMs": 183000,
      "mode": "monarch-fire",
      "dominantSchools": ["WILL", "NECROMANCY", "ABJURATION"],
      "assets": [
        "pb_fire_pit_ritual_v1",
        "pb_crown_monarch_shadow_v1",
        "pb_heart_shutdown_pulse_v1",
        "pb_pentabyte_pyramid_v1",
        "pb_beast_eye_mask_v1"
      ],
      "camera": {
        "kind": "crane",
        "intensity": 0.72,
        "easing": "easeOutCubic"
      },
      "atmosphere": {
        "saturation": 0.78,
        "vignette": 0.46,
        "aurora": 0.2,
        "grain": 0.16,
        "rain": 0,
        "embers": 0.85,
        "voidDrain": 0.12,
        "chromaSplit": 0.06
      },
      "typography": {
        "layout": "impactStack",
        "glyphGhosts": true,
        "trailAmount": 0.2,
        "maxVisibleWords": 7,
        "emphasizePunchlines": true
      },
      "anchorLyrics": [
        "fire pit",
        "monarch",
        "heart off",
        "pentabyte pyramid",
        "I'm a beast"
      ]
    },
    {
      "id": "scene-10-black-hole-flood",
      "title": "Black Hole Dam Break",
      "startMs": 183000,
      "endMs": 195000,
      "mode": "black-hole-flood",
      "dominantSchools": ["VOID", "SONIC", "DIVINATION"],
      "assets": [
        "pb_sleet_puddle_name_v1",
        "pb_vox_boxer_ring_v1",
        "pb_xo_grid_arena_v1",
        "pb_capsule_relic_v1",
        "pb_black_hole_core_v1",
        "pb_dam_break_flood_v1"
      ],
      "camera": {
        "kind": "snapZoom",
        "intensity": 0.82,
        "easing": "easeOutCubic",
        "shakeOnDownbeat": true
      },
      "atmosphere": {
        "saturation": 0.5,
        "vignette": 0.62,
        "aurora": 0.24,
        "grain": 0.2,
        "rain": 0.42,
        "embers": 0.18,
        "voidDrain": 0.54,
        "chromaSplit": 0.22
      },
      "typography": {
        "layout": "flood",
        "glyphGhosts": true,
        "trailAmount": 0.42,
        "maxVisibleWords": 10,
        "emphasizePunchlines": true
      },
      "anchorLyrics": [
        "puddle during sleet",
        "tic tac toe",
        "black hole rhymes",
        "dam broke",
        "BYE"
      ]
    },
    {
      "id": "scene-11-recovery-polarity",
      "title": "Recovery Polarity",
      "startMs": 195000,
      "endMs": 202000,
      "mode": "recovery-polarity",
      "dominantSchools": ["ALCHEMY", "ABJURATION", "DIVINATION"],
      "assets": [
        "pb_gold_mine_cavern_v1",
        "pb_recovery_rain_v1",
        "pb_petrichor_vapor_v1",
        "pb_monster_silhouette_v1",
        "pb_syllable_crown_v1",
        "pb_polarity_emblem_final_v1"
      ],
      "camera": {
        "kind": "pull",
        "intensity": 0.5,
        "easing": "easeInOutSine"
      },
      "atmosphere": {
        "saturation": 0.7,
        "vignette": 0.28,
        "aurora": 0.46,
        "grain": 0.08,
        "rain": 0.72,
        "embers": 0.08,
        "voidDrain": 0,
        "chromaSplit": 0.04
      },
      "typography": {
        "layout": "emblem",
        "glyphGhosts": true,
        "trailAmount": 0.16,
        "maxVisibleWords": 4,
        "emphasizePunchlines": true
      },
      "anchorLyrics": [
        "gold mine",
        "Recovery won't die",
        "petrichor go by",
        "syllable King",
        "Polarity"
      ]
    }
  ]
}
5. Foundry Asset Checklist
Tier 1: Must create first

These carry the video.

Priority	Asset	Why
1	pb_polarity_emblem_final_v1	final payoff
2	pb_black_lotus_card_v1	early identity anchor
3	pb_golden_fist_gauntlet_v1	first major power image
4	pb_open_skull_shell_v1	bridge into inner violence
5	pb_skull_dragon_core_v1	central monster symbol
6	pb_fibonacci_lattice_spiral_v1	proves PixelBrain uniqueness
7	pb_gold_mine_cavern_v1	recovery payoff
8	pb_recovery_rain_v1	emotional release
9	pb_black_hole_core_v1	final technical rupture
10	pb_dam_break_flood_v1	climax motion
Tier 2: Strong enhancement
Asset	Why
pb_heart_parchment_cracked_v1	opening wound image
pb_drought_fissure_set_v1	drought theme
pb_breath_text_stream_v1	text-gnosis line
pb_pentabyte_pyramid_v1	brain-as-computation
pb_sleet_puddle_name_v1	elegant identity image
pb_xo_grid_arena_v1	tic-tac-toe combat section
pb_crt_wall_magnavox_v1	old-school vision
Tier 3: Can fake in v1 with procedural FX
Asset	Fallback
pb_battle_steed_v1	parallax silhouette
pb_shadow_duelist_set_v1	two mirrored shadows
pb_cannonball_impact_v1	expanding circle shockwave
pb_enemy_mask_leak_v1	procedural drip overlay
pb_emotion_fabric_strip_v1	ribbon text trails
6. Remotion Component Map
KineticLyricsVideo
├── Audio
├── PixelBrainStage
│   ├── SceneAtmosphereLayer
│   ├── PixelBrainAssetLayer
│   ├── BytecodeMandalaLayer
│   └── PolarityFieldLayer
├── KineticLyricsLayer
│   └── KineticWord
│       └── GlyphGhost
└── DebugOverlay optional
6.1 Root Composition
NEW: src/video/compositions/KineticLyricsVideo.tsx
import { AbsoluteFill, Audio } from "remotion";
import type { GrimoireTrackWithAlignment } from "../../pages/Visualiser/tracks/loadTrackWithAlignment";
import type { VideoSidecar } from "../schemas/videoScene";
import { useBeatClock } from "../hooks/useBeatClock";
import { resolveActiveScene } from "../logic/resolveActiveScene";
import { resolveActiveWords } from "../logic/resolveActiveWords";
import { resolveDominantSchool } from "../logic/resolveDominantSchool";
import { PixelBrainStage } from "../components/PixelBrainStage";
import { KineticLyricsLayer } from "../components/KineticLyricsLayer";

interface KineticLyricsVideoProps {
  track: GrimoireTrackWithAlignment;
  video: VideoSidecar;
}

export function KineticLyricsVideo({ track, video }: KineticLyricsVideoProps) {
  const bpm = track.pacing.bpm;
  const offsetMs = track.pacing.leadInS * 1000;

  const beatClock = useBeatClock({ bpm, offsetMs });

  const activeScene = resolveActiveScene(beatClock.timeMs, video.scenes);

  const activeWords = resolveActiveWords(
    track.wordTimings ?? [],
    beatClock.timeMs,
    {
      preRollMs: 120,
      holdMs: 520,
      maxWords: activeScene?.typography.maxVisibleWords ?? 6
    }
  );

  const dominantSchool = resolveDominantSchool(activeWords, {
    historySize: 4
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#050505" }}>
      <Audio src={track.audioUrl} />

      <PixelBrainStage
        scene={activeScene}
        beat={beatClock.beat}
        bar={beatClock.bar}
        dominantSchool={dominantSchool}
      />

      <KineticLyricsLayer
        words={activeWords}
        beat={beatClock.beat}
        bar={beatClock.bar}
        scene={activeScene}
      />
    </AbsoluteFill>
  );
}
6.2 Beat Clock Hook
NEW: src/video/hooks/useBeatClock.ts
import { useCurrentFrame, useVideoConfig } from "remotion";
import { frameIndexToTimeMs } from "../../scholotime/frameIndexToTimeMs";
import { resolveBeatState, resolveBarState } from "../../scholotime/beat";

interface UseBeatClockArgs {
  bpm: number;
  offsetMs: number;
}

export function useBeatClock({ bpm, offsetMs }: UseBeatClockArgs) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const timeMs = frameIndexToTimeMs(frame, fps);
  const beat = resolveBeatState(timeMs, { bpm, offsetMs });
  const bar = resolveBarState(beat);

  return {
    frame,
    timeMs,
    beat,
    bar
  };
}
6.3 Active Scene Resolver
NEW: src/video/logic/resolveActiveScene.ts
import type { SceneCue } from "../schemas/videoScene";

export function resolveActiveScene(
  timeMs: number,
  scenes: SceneCue[]
): SceneCue | null {
  return scenes.find(
    (scene) => timeMs >= scene.startMs && timeMs < scene.endMs
  ) ?? null;
}
6.4 Active Word Resolver
NEW: src/video/logic/resolveActiveWords.ts
import type { WordTiming } from "../schemas/alignment";

interface ResolveActiveWordsOptions {
  preRollMs: number;
  holdMs: number;
  maxWords: number;
}

export function resolveActiveWords(
  words: WordTiming[],
  timeMs: number,
  options: ResolveActiveWordsOptions
): WordTiming[] {
  const active = words.filter((word) => {
    const start = word.startMs - options.preRollMs;
    const end = word.endMs + options.holdMs;

    return timeMs >= start && timeMs <= end;
  });

  return active.slice(-options.maxWords);
}
6.5 Dominant School Resolver
NEW: src/video/logic/resolveDominantSchool.ts
import type { WordTiming } from "../schemas/alignment";

const SCHOOL_PRIORITY = [
  "VOID",
  "NECROMANCY",
  "WILL",
  "ALCHEMY",
  "SONIC",
  "PSYCHIC",
  "ABJURATION",
  "DIVINATION"
];

interface ResolveDominantSchoolOptions {
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
Why

Ties must be deterministic or atmosphere flickers.

7. PixelBrain Stage
NEW: src/video/components/PixelBrainStage.tsx
import { AbsoluteFill } from "remotion";
import type { SceneCue } from "../schemas/videoScene";
import { SceneAtmosphereLayer } from "./SceneAtmosphereLayer";
import { PixelBrainAssetLayer } from "./PixelBrainAssetLayer";
import { BytecodeMandalaLayer } from "./BytecodeMandalaLayer";

interface PixelBrainStageProps {
  scene: SceneCue | null;
  beat: {
    index: number;
    phase: number;
  };
  bar: {
    index: number;
    phase: number;
  };
  dominantSchool: string;
}

export function PixelBrainStage({
  scene,
  beat,
  bar,
  dominantSchool
}: PixelBrainStageProps) {
  return (
    <AbsoluteFill>
      <SceneAtmosphereLayer
        scene={scene}
        beat={beat}
        bar={bar}
        dominantSchool={dominantSchool}
      />

      <BytecodeMandalaLayer
        scene={scene}
        beat={beat}
        dominantSchool={dominantSchool}
      />

      <PixelBrainAssetLayer
        scene={scene}
        beat={beat}
        bar={bar}
      />
    </AbsoluteFill>
  );
}
7.1 Atmosphere Layer
NEW: src/video/components/SceneAtmosphereLayer.tsx
import { AbsoluteFill } from "remotion";
import type { SceneCue } from "../schemas/videoScene";
import { smoothstep } from "../../scholotime/easing";

interface SceneAtmosphereLayerProps {
  scene: SceneCue | null;
  beat: {
    phase: number;
  };
  bar: {
    phase: number;
  };
  dominantSchool: string;
}

export function SceneAtmosphereLayer({
  scene,
  beat,
  dominantSchool
}: SceneAtmosphereLayerProps) {
  const atmosphere = scene?.atmosphere ?? {
    saturation: 0.25,
    vignette: 0.65,
    aurora: 0.05,
    grain: 0.12,
    rain: 0,
    embers: 0,
    voidDrain: 0.4,
    chromaSplit: 0.04
  };

  const pulse = smoothstep(beat.phase);

  const voidBoost = dominantSchool === "VOID" ? 0.25 : 0;
  const alchemyBoost = dominantSchool === "ALCHEMY" ? 0.18 : 0;

  const saturation = Math.max(
    0,
    atmosphere.saturation - atmosphere.voidDrain * 0.4 - voidBoost
  );

  const aurora = atmosphere.aurora + alchemyBoost * pulse;

  return (
    <AbsoluteFill
      style={{
        filter: `saturate(${saturation})`,
        background: `
          radial-gradient(circle at 50% 45%,
            rgba(255,255,255,${aurora * 0.12}) 0%,
            rgba(0,0,0,0) 42%),
          radial-gradient(circle at 50% 50%,
            rgba(0,0,0,0) 0%,
            rgba(0,0,0,${atmosphere.vignette}) 78%),
          #050505
        `
      }}
    />
  );
}
8. Kinetic Lyrics
NEW: src/video/components/KineticLyricsLayer.tsx
import { AbsoluteFill } from "remotion";
import type { WordTiming } from "../schemas/alignment";
import type { SceneCue } from "../schemas/videoScene";
import { KineticWord } from "./KineticWord";

interface KineticLyricsLayerProps {
  words: WordTiming[];
  beat: {
    phase: number;
  };
  bar: {
    phase: number;
  };
  scene: SceneCue | null;
}

export function KineticLyricsLayer({
  words,
  beat,
  scene
}: KineticLyricsLayerProps) {
  const layout = scene?.typography.layout ?? "centerPulse";

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        alignItems: resolveAlignItems(layout),
        justifyContent: "center",
        padding: "7vw",
        fontFamily: "Inter, system-ui, sans-serif",
        fontWeight: 900,
        letterSpacing: "-0.04em",
        textTransform: "uppercase",
        textAlign: "center",
        pointerEvents: "none"
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.32em",
          justifyContent: "center",
          maxWidth: "1450px",
          fontSize: resolveFontSize(layout, words.length)
        }}
      >
        {words.map((word, index) => (
          <KineticWord
            key={`${word.startMs}-${word.word}-${index}`}
            wordTiming={word}
            beatPhase={beat.phase}
            scene={scene}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
}

function resolveAlignItems(layout: string): "center" | "flex-end" | "flex-start" {
  if (layout === "flood") return "flex-end";
  if (layout === "emblem") return "center";
  return "center";
}

function resolveFontSize(layout: string, wordCount: number): string {
  if (layout === "emblem") return "112px";
  if (layout === "impactStack") return wordCount > 6 ? "74px" : "88px";
  if (layout === "flood") return wordCount > 8 ? "58px" : "68px";
  if (layout === "arena") return "72px";
  return wordCount > 6 ? "66px" : "82px";
}
8.1 Kinetic Word
NEW: src/video/components/KineticWord.tsx
import type { WordTiming } from "../schemas/alignment";
import type { SceneCue } from "../schemas/videoScene";
import { generateSchoolColor } from "../../pixelbrain/schools";
import { applyEasing, easeOutCubic, smoothstep } from "../../scholotime/easing";
import { GlyphGhost } from "./GlyphGhost";

interface KineticWordProps {
  wordTiming: WordTiming;
  beatPhase: number;
  scene: SceneCue | null;
}

export function KineticWord({
  wordTiming,
  beatPhase,
  scene
}: KineticWordProps) {
  const color = generateSchoolColor(wordTiming.school);
  const isDownbeatWord = wordTiming.beat.barPhase < 0.1;

  const entranceEase = isDownbeatWord ? easeOutCubic : smoothstep;
  const eased = applyEasing(beatPhase, entranceEase);

  const layout = scene?.typography.layout ?? "centerPulse";

  const scale = resolveScale(layout, eased, isDownbeatWord);
  const y = resolveYOffset(layout, eased);
  const opacity = 0.35 + eased * 0.65;

  return (
    <span
      style={{
        position: "relative",
        display: "inline-block",
        color,
        opacity,
        textShadow: `0 0 ${isDownbeatWord ? 28 : 14}px ${color}`,
        transform: `translateY(${y}px) scale(${scale})`,
        transformOrigin: "center",
        willChange: "transform, opacity"
      }}
    >
      {scene?.typography.glyphGhosts && (
        <GlyphGhost
          school={wordTiming.school}
          color={color}
          beatPhase={beatPhase}
        />
      )}
      {wordTiming.word}
    </span>
  );
}

function resolveScale(
  layout: string,
  eased: number,
  isDownbeatWord: boolean
): number {
  const base = layout === "impactStack" ? 0.76 : 0.84;
  const lift = isDownbeatWord ? 0.28 : 0.16;

  return base + eased * lift;
}

function resolveYOffset(layout: string, eased: number): number {
  if (layout === "flood") {
    return (1 - eased) * 22;
  }

  if (layout === "impactStack") {
    return (1 - eased) * 34;
  }

  return (1 - eased) * 18;
}
8.2 Glyph Ghost
NEW: src/video/components/GlyphGhost.tsx
import { smoothstep } from "../../scholotime/easing";

const SCHOOL_GLYPHS: Record<string, string> = {
  SONIC: "♩",
  PSYCHIC: "◬",
  VOID: "∅",
  ALCHEMY: "⚗",
  WILL: "⚡",
  NECROMANCY: "☠",
  ABJURATION: "◇",
  DIVINATION: "◉"
};

interface GlyphGhostProps {
  school: string;
  color: string;
  beatPhase: number;
}

export function GlyphGhost({
  school,
  color,
  beatPhase
}: GlyphGhostProps) {
  const glyph = SCHOOL_GLYPHS[school] ?? SCHOOL_GLYPHS.VOID;
  const bloom = smoothstep(beatPhase);

  return (
    <span
      aria-hidden
      style={{
        position: "absolute",
        left: "-0.48em",
        top: "0.08em",
        zIndex: -1,
        color,
        opacity: 0.4 * (1 - bloom),
        transform: `scale(${1 + bloom * 0.4})`,
        fontSize: "0.62em",
        pointerEvents: "none"
      }}
    >
      {glyph}
    </span>
  );
}
9. Asset Layer Stub
NEW: src/video/components/PixelBrainAssetLayer.tsx
import { AbsoluteFill } from "remotion";
import type { SceneCue } from "../schemas/videoScene";

interface PixelBrainAssetLayerProps {
  scene: SceneCue | null;
  beat: {
    phase: number;
  };
  bar: {
    phase: number;
  };
}

export function PixelBrainAssetLayer({
  scene,
  beat
}: PixelBrainAssetLayerProps) {
  if (!scene) {
    return null;
  }

  return (
    <AbsoluteFill>
      {scene.assets.map((assetId, index) => (
        <PixelBrainAssetSprite
          key={assetId}
          assetId={assetId}
          index={index}
          beatPhase={beat.phase}
          sceneMode={scene.mode}
        />
      ))}
    </AbsoluteFill>
  );
}

function PixelBrainAssetSprite({
  assetId,
  index,
  beatPhase,
  sceneMode
}: {
  assetId: string;
  index: number;
  beatPhase: number;
  sceneMode: string;
}) {
  const opacity = resolveAssetOpacity(assetId, sceneMode, index);
  const scale = 1 + beatPhase * 0.015;

  return (
    <div
      data-pixelbrain-asset-id={assetId}
      style={{
        position: "absolute",
        inset: 0,
        opacity,
        transform: `scale(${scale})`,
        transformOrigin: "center",
        backgroundImage: `url(/pixelbrain/assets/${assetId}.png)`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
        backgroundSize: "contain",
        mixBlendMode: index === 0 ? "normal" : "screen"
      }}
    />
  );
}

function resolveAssetOpacity(
  assetId: string,
  sceneMode: string,
  index: number
): number {
  if (assetId.includes("emblem")) return 0.92;
  if (sceneMode === "threshold") return index === 0 ? 0.55 : 0.28;
  if (sceneMode === "recovery-polarity") return index === 0 ? 0.62 : 0.38;

  return index === 0 ? 0.5 : 0.24;
}
Why this is temporary

This uses PNG references as a bridge. The eventual better version should render from PixelBrain packets directly.

Risk reduced

Lets the render pipeline exist before full packet-native rendering is complete.

10. Video Sidecar Validation
NEW: src/video/logic/validateVideoSidecar.ts
import type { VideoSidecar } from "../schemas/videoScene";

export function validateVideoSidecar(video: VideoSidecar): void {
  if (video.schemaVersion !== "scholomance.video.v1") {
    throw new Error(`[video] Unsupported schemaVersion: ${video.schemaVersion}`);
  }

  if (!video.trackId) {
    throw new Error("[video] Missing trackId");
  }

  if (!Number.isFinite(video.bpm) || video.bpm <= 0) {
    throw new Error(`[video] Invalid bpm: ${video.bpm}`);
  }

  if (!Number.isFinite(video.offsetMs)) {
    throw new Error(`[video] Invalid offsetMs: ${video.offsetMs}`);
  }

  if (!video.lyricsHash) {
    throw new Error("[video] Missing lyricsHash");
  }

  if (!Array.isArray(video.scenes) || video.scenes.length === 0) {
    throw new Error("[video] Missing scenes");
  }

  for (let i = 0; i < video.scenes.length; i++) {
    const scene = video.scenes[i];

    if (scene.startMs >= scene.endMs) {
      throw new Error(`[video] Scene ${scene.id} has invalid time range`);
    }

    if (i > 0) {
      const previous = video.scenes[i - 1];

      if (scene.startMs < previous.endMs) {
        throw new Error(
          `[video] Scene ${scene.id} overlaps previous scene ${previous.id}`
        );
      }
    }

    if (!scene.assets.every(Boolean)) {
      throw new Error(`[video] Scene ${scene.id} has empty asset id`);
    }
  }
}
11. Render Script Skeleton
NEW: scripts/render-music-video.mjs
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "node:path";
import { pathToFileURL } from "node:url";

const trackId = process.argv[2];

if (!trackId) {
  throw new Error("Usage: node scripts/render-music-video.mjs <trackId>");
}

const entry = path.resolve("src/video/remotionRoot.tsx");
const serveUrl = await bundle(entry);

const composition = await selectComposition({
  serveUrl,
  id: "KineticLyricsVideo"
});

const trackModuleUrl = pathToFileURL(
  path.resolve(`src/pages/Visualiser/tracks/${trackId}.ts`)
).href;

const videoSidecarUrl = pathToFileURL(
  path.resolve(`src/pages/Visualiser/tracks/${trackId}.video.json`)
).href;

const alignmentSidecarUrl = pathToFileURL(
  path.resolve(`src/pages/Visualiser/tracks/${trackId}.align.json`)
).href;

const trackModule = await import(trackModuleUrl, {
  with: { type: "module" }
});

const videoSidecar = await import(videoSidecarUrl, {
  with: { type: "json" }
});

const alignmentSidecar = await import(alignmentSidecarUrl, {
  with: { type: "json" }
});

const track = {
  ...trackModule.default,
  wordTimings: alignmentSidecar.default.wordTimings,
  alignmentMeta: {
    ...alignmentSidecar.default,
    wordTimings: undefined
  }
};

await renderMedia({
  composition,
  serveUrl,
  codec: "h264",
  outputLocation: `output/videos/${trackId}.mp4`,
  inputProps: {
    track,
    video: videoSidecar.default
  }
});

console.log(`Rendered output/videos/${trackId}.mp4`);
Note

Depending on your Node version and bundler setup, JSON import syntax may need to be replaced with fs.readFile + JSON.parse.

12. Remotion Root
NEW: src/video/remotionRoot.tsx
import { Composition } from "remotion";
import { KineticLyricsVideo } from "./compositions/KineticLyricsVideo";

export function RemotionRoot() {
  return (
    <Composition
      id="KineticLyricsVideo"
      component={KineticLyricsVideo}
      durationInFrames={6060}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{
        track: null,
        video: null
      }}
    />
  );
}
Duration formula

For estimated 202000ms at 30fps:

202 seconds × 30 fps = 6060 frames

Later, compute this from audio duration.

13. Foundry Asset Packet Example
Black Lotus Card
export const PB_BLACK_LOTUS_CARD_V1 = {
  schema: "pixelbrain.asset.v1",
  id: "pb_black_lotus_card_v1",
  dimensions: {
    width: 64,
    height: 88
  },
  construction: {
    symmetry: "vertical",
    parts: [
      {
        partId: "card_body",
        kind: "rect",
        x: 8,
        y: 6,
        width: 48,
        height: 76,
        material: "obsidian_card"
      },
      {
        partId: "gold_frame",
        kind: "border",
        x: 10,
        y: 8,
        width: 44,
        height: 72,
        material: "burnished_gold"
      },
      {
        partId: "lotus_outer",
        kind: "motif",
        motif: "lotus",
        x: 32,
        y: 42,
        radius: 20,
        material: "void_black"
      },
      {
        partId: "lotus_core",
        kind: "motif",
        motif: "seed",
        x: 32,
        y: 42,
        radius: 5,
        material: "alchemy_pink"
      }
    ]
  },
  anchors: {
    center: { x: 32, y: 44 },
    bloomOrigin: { x: 32, y: 42 },
    textAnchor: { x: 32, y: 78 }
  },
  ampHints: {
    shadowAMP: "ritual-soft",
    volumeAMP: "card-raised",
    tonationAMP: "obsidian-gold-high-contrast",
    shaderAMP: "low-aurora"
  }
};
14. Punchline Tags You Should Add Later

This is not required for first render, but it will make the video much sharper.

export type WordEmphasis =
  | "normal"
  | "accent"
  | "punchline"
  | "sceneAnchor"
  | "finisher";

export interface WordTiming {
  word: string;
  startMs: number;
  endMs: number;
  beat: {
    index: number;
    phase: number;
    bar: number;
    barPhase: number;
  };
  school: string;
  confidence?: number;
  manualOffsetMs?: number;
  emphasis?: WordEmphasis;
}
Suggested finisher words
Golden Fist
text-gnosis
sciamachy
dragon
gravity
algorithmically
Fibonacci
monarch
pentabyte
black hole
dam broke
gold mine
Recovery
petrichor
syllable King
Polarity
15. Animation Fidelity Rules
Timing
Element	Target
word onset	within ±33ms
punchline hit	exact beat or snare hit
scene transition	barline or phrase boundary
glyph bloom	one beat phase
sustained pulse	every beat crossed by word
Typography
Situation	Rule
dense rap	max 8–10 visible words
punchline	isolate or impact stack
emotional line	fewer words, larger spacing
technical line	grid/flood layout
title word	emblem layout only
Camera
Event	Camera behavior
ordinary word	no shake
bar downbeat	small push
punchline	snap zoom or impact shake
scene transition	push/pull/orbit
final Polarity	lock, then emblem pulse
Assets

Every Foundry asset needs:

{
  id: string;
  dimensions: { width: number; height: number };
  construction: unknown;
  anchors: Record<string, { x: number; y: number }>;
  ampHints: Record<string, string>;
}

No anonymous visual blobs. No “just export a PNG and pray.” The PNG can exist, but the lattice packet is the truth.

16. Top Implementation Pitfalls
1. Scene cue drift

The scene timestamps will feel wrong until real alignment exists.

Fix: author scene boundaries from aligned anchor lyrics, not pure stopwatch guesses.

2. Too many assets on screen

PixelBrain power can become soup.

Fix: one hero asset, two support assets, atmosphere, typography.

3. Generic typography

Do not let text just bounce.

Fix: layout must follow scene mode.

4. Recomputing time inside components

This causes drift.

Fix: one useBeatClock() at root or one shared hook used consistently.

5. Weak fallback path

If one asset is missing, render should still succeed.

Fix: missing asset becomes procedural glyph/atmosphere fallback.

6. Non-deterministic tie-breaking

Dominant school flicker will look cursed in the bad way.

Fix: use fixed SCHOOL_PRIORITY.

7. Wrong sidecar after lyric edit

This is a silent killer.

Fix: validate lyricsHash.

8. Pop-culture literalism

References should become archetypes.

Fix: false king, web grief, sand effigy, capsule relic, not literal characters.

9. Overusing camera shake

Shake is salt. Dumping the whole shaker ruins the meat.

Fix: only downbeats, punchlines, scene ruptures.

10. Final scene too short

The word Polarity needs air.

Fix: reserve at least 1.5–2.5 seconds for final emblem lock.

17. QA Checklist
Data
 polarity.ts exists
 polarity.align.json exists
 polarity.video.json exists
 trackId matches across all files
 bpm matches across track and sidecars
 offsetMs matches leadInS * 1000
 lyricsHash matches locked lyrics
 scene ranges do not overlap
 every scene has at least one asset
 missing alignment falls back cleanly
Render
 Remotion composition loads
 audio plays
 video exports to output/videos/polarity.mp4
 duration matches audio
 no dropped frames
 no browser-only APIs used in render path
 no performance.now() in render components
Sync
 first lyric lands correctly
 scene 4 Golden Fist hits hard
 dragon line has visible skull-dragon reveal
 Fibonacci line shows real spiral logic
 black hole/dam break sequence lands on final technical burst
 final Polarity emblem lands clearly
Visual
 school colors readable
 glyph ghosts are subtle
 VOID scenes drain color
 ALCHEMY/recovery scenes bloom
 gold scenes feel royal, not yellow sludge
 typography does not cover important hero assets
18. Regression Checklist

Because this touches the Visualiser ecosystem:

 existing Visualiser still works without .align.json
 heuristic syllable pacing still works
 existing track files do not require modification
 ScholoTime APIs remain shared
 PixelBrain school color authority is not duplicated
 Remotion render path does not import Web Worker code
 browser preview does not require Remotion dependencies
19. Recommended Build Order
Pass 1: Skeleton render

Build:

Remotion root
video sidecar loader
basic active scene resolver
audio playback
static scene background

Goal:

Can render polarity.mp4 with audio and changing scene background.
Pass 2: Kinetic lyrics

Build:

word timing loader
active word resolver
KineticWord
GlyphGhost
school color

Goal:

Words appear in sync with school colors.
Pass 3: PixelBrain stage

Build:

atmosphere layer
asset layer
scene mode behaviors
dominant school transitions

Goal:

Scenes visibly mutate based on lyric energy.
Pass 4: Tier 1 Foundry assets

Create:

final emblem
black lotus
golden fist
skull dragon
Fibonacci spiral
black hole
recovery rain

Goal:

Video has iconic scene anchors.
Pass 5: Polish

Tune:

font sizing
word density
camera intensity
glyph opacity
scene transitions
final emblem timing

Goal:

It feels edited, not merely generated.
20. Next Risks
Highest risk: alignment quality

The entire cinematic system depends on word timing. Bad alignment turns the dragon into a karaoke lizard.

Second risk: asset overload

PixelBrain can generate too much. The music video needs hierarchy, not a blizzard of cool ideas.

Third risk: final scene pacing

The ending has recovery, gold mine, monster, auteur, syllable king, despair/conquer, and Polarity. That is a lot. Give the final emblem space or the payoff gets swallowed.

Fourth risk: packet-native rendering

Using PNG asset bridges is okay for v1, but the true PixelBrain version should eventually render from asset packets.

Final Implementation Target

The first working version should prove this:

Polarity can be rendered as a deterministic cinematic lyric video
where every lyric is timed,
every scene is cue-driven,
every school color comes from PixelBrain,
every animation obeys ScholoTime,
and the final MP4 can be regenerated exactly.

That is the core machine.

Once this works, every song becomes a scene-addressable spell film.
