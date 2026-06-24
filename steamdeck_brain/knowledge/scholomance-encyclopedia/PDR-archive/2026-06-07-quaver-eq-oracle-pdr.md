# 2026-06-07 Quaver EQ Oracle PDR

> Copy-ready filename: `2026-06-07-quaver-eq-oracle-pdr.md`
>
> Catalog target: `docs/scholomance/PDR-archive/2026-06-07-quaver-eq-oracle-pdr.md`

---

## Owner(s)

- **Codex:** schemas, deterministic scoring, layer law, engine architecture, feature flag contracts, adapter seams.
- **Claude:** Quaver mascot UI, visual behavior, accessibility states, copy tone, reduced-motion behavior.
- **Gemini:** worker implementation, backend-safe adapter tests, Vitest coverage, CI command integration.
- **Escalation owner:** Angel / repo owner.

## Context (seed, not the Executive Summary)

ScholoCandy needs an opt-in real-time helper for EQ work that can observe an active EQ instance and offer probability-based feedback without taking control away from the user. The feature combines photonic eyeball-style perception, Oracle-style deterministic interpretation, and a small eighth-note mascot named Quaver that speaks only when confidence gates are met.

## Target Integration Area

Primary integration area: `src/features/scholocandy/eq-oracle/`

Secondary integration areas:

- `src/features/scholocandy/eq/` for EQ instance state adapters.
- `src/workers/scholocandy/` for off-main-thread snapshot analysis.
- `src/lib/flags/` for feature flag registration.
- `docs/scholomance/PDR-archive/` for this PDR.
- `docs/scholomance/post-implementation-reports/` for the required PIR.

## Core Concept

Quaver is an eighth-note familiar for ScholoCandy's EQ workflow. It watches a single opted-in EQ instance, converts signal and EQ state into deterministic audio-semantic features, scores the current move against the user's declared intent, and emits short confidence-gated advice. The guiding metaphor is a tiny musical field medic perched on the EQ curve: it does not mix for the user, it reads the spectral weather and says whether the current move is probably helping, probably risky, or too uncertain to comment.

## Implementation Philosophy

Treat this as a real engineering handoff for an AI coding agent and future maintainers. Prefer small composable edits, deterministic behavior, adapter layers where existing contracts are uncertain, and no unnecessary rewrites. Preserve existing behavior unless a change is explicitly justified.

## Ownership & Law Compliance

This PDR must respect the project's file-ownership and agent-jurisdiction rules, including `VAELRIX_LAW.md` and `AGENTS.md` when present in the implementation branch. Every file path this PDR writes appears in §7 with its owning agent. Cross-domain conflicts are not resolved unilaterally; they are sent to Angel / repo owner using the `ESCALATION:` block format in §6.

---

## 1. Executive Summary

Build `Quaver EQ Oracle`, an opt-in real-time EQ feedback subsystem for ScholoCandy. It observes the currently active EQ instance, analyzes deterministic audio snapshots, scores the user's EQ move against an explicit intent profile, and displays advice through an eighth-note mascot only when confidence thresholds are met. The blast radius is medium: new feature modules, a worker, tests, and one gated UI integration point, but no existing public EQ APIs are changed. The first safe implementation runs in shadow mode, producing advice packets to diagnostics without rendering Quaver or modifying user settings. Current status: proposed architecture, ready for implementation behind feature flags.

## 2. Out of Scope / Non-Goals

- No automatic EQ changes in v1.
- No generative AI text calls in the real-time loop.
- No cloud upload of raw audio, stems, FFT frames, or EQ snapshots.
- No training pipeline, user profiling model, or remote telemetry dependency.
- No DAW plugin packaging in this PDR.
- No mastering assistant, arrangement assistant, or full mix critique engine.
- No permanent user preference memory until a follow-up privacy PDR exists.
- No replacement of the existing EQ UI.
- No mascot audio voice, speech synthesis, or notification sound in v1.
- No hard enforcement of taste. Advice is probabilistic and intent-relative.

## 3. Spec Sheet

### Functional Spec

1. Add a deterministic `EQAdvicePacket` contract.
2. Add an `EQIntentProfile` contract describing the user's chosen target, such as `clearLeadVocal`, `reduceMud`, or `addAir`.
3. Add an adapter that converts active EQ instance state into a normalized `EQSnapshot`.
4. Add an audio feature extractor that converts FFT and level data into stable semantic features.
5. Add a probability scorer that returns stable scores from identical inputs.
6. Add an advice engine that maps scores to deterministic message templates.
7. Add a Web Worker entry point for non-blocking snapshot analysis.
8. Add a React hook that subscribes to the active EQ instance and consumes advice packets.
9. Add `QuaverMascot` UI behind a feature flag.
10. Add shadow mode diagnostics that run without UI or user-visible behavior.

### Acceptance Criteria

- With the same `EQSnapshot`, `EQIntentProfile`, and `analysisConfig`, the engine emits byte-identical `EQAdvicePacket` JSON.
- With all flags disabled, ScholoCandy behaves exactly as before.
- In shadow mode, advice packets are computed but not rendered.
- In mascot mode, advice appears only when `confidence >= 0.6` unless verbose mode is enabled.
- No raw audio buffers are persisted.
- Worker failure degrades to silence, not UI crash.
- Reduced-motion mode disables bounce, pulse, and floating animation.
- The feature can be rolled back by disabling flags without code removal.

### Non-Functional Spec

| Area | Requirement |
|---|---|
| Latency | Main-thread scoring wrapper must complete within 5 ms for a single packet on a normal dev machine. Worker analysis target is under 16 ms per snapshot. |
| CPU | Analysis cadence defaults to 4 Hz in shadow mode and 8 Hz in active mascot mode. Never run per animation frame. |
| Memory | Ring buffer stores at most 16 compact snapshots per EQ instance. No raw audio retention. |
| Accessibility | Mascot advice uses `aria-live="polite"`, never steals focus, and supports `prefers-reduced-motion`. |
| Determinism | No `Math.random()`, `Date.now()`, `performance.now()`, locale-sensitive sorting, or unordered object iteration inside scoring. Time must be passed in as `absoluteTimeMs`. |
| Privacy | Snapshot payloads contain aggregate features only: bands, deltas, levels, and intent. No waveform persistence. |
| Resilience | Invalid snapshots produce deterministic diagnostic errors and no visible advice. |
| UX | Quaver is opt-in, dismissible, and scoped to one active EQ instance. |

### Contracts

#### `EQIntentProfile`

```js
export const EQ_INTENT_IDS = Object.freeze({
  CLEAR_LEAD_VOCAL: 'clearLeadVocal',
  REDUCE_MUD: 'reduceMud',
  ADD_AIR: 'addAir',
  TAME_HARSHNESS: 'tameHarshness',
  CONTROL_BOOM: 'controlBoom',
  WARMTH_WITHOUT_CLOUD: 'warmthWithoutCloud',
});
```

```ts
export type EQIntentProfile = {
  intentId: string;
  label: string;
  priorityBandsHz: Array<[number, number]>;
  avoidBandsHz: Array<[number, number]>;
  weights: {
    intentMatch: number;
    maskingReduction: number;
    gainSafety: number;
    tonalBalance: number;
    deltaStability: number;
  };
};
```

#### `EQSnapshot`

```ts
export type EQSnapshot = {
  schema: 'SCHOLOCANDY-EQ-SNAPSHOT-v1';
  instanceId: string;
  snapshotId: string;
  absoluteTimeMs: number;
  bpm: number;
  sampleRate: number;
  fftSize: number;
  eqBands: Array<{
    id: string;
    type: 'bell' | 'shelfLow' | 'shelfHigh' | 'lowPass' | 'highPass' | 'notch';
    frequencyHz: number;
    gainDb: number;
    q: number;
    enabled: boolean;
  }>;
  spectrum: {
    bands: Array<{ startHz: number; endHz: number; energy: number }>;
    rms: number;
    peak: number;
  };
  previousSpectrum?: {
    bands: Array<{ startHz: number; endHz: number; energy: number }>;
    rms: number;
    peak: number;
  };
};
```

#### `EQAdvicePacket`

```ts
export type EQAdvicePacket = {
  schema: 'SCHOLOCANDY-EQ-ADVICE-v1';
  instanceId: string;
  snapshotId: string;
  intentId: string;
  level: 'silent' | 'hint' | 'suggestion' | 'strong';
  confidence: number;
  scores: {
    intentMatch: number;
    maskingReduction: number;
    gainSafety: number;
    tonalBalance: number;
    deltaStability: number;
    uncertaintyPenalty: number;
  };
  messageId: string;
  message: string;
  nextAction: string | null;
  diagnostics: string[];
};
```

### Deferred to Follow-Up PDR

- Persistent preference memory.
- Reference-track comparison.
- Automatic EQ preview mode.
- Plugin export beyond browser ScholoCandy.
- Voice/personality customization for Quaver.
- Server-side mix review.

## 4. Change Classification

- **Architectural:** introduces a new feature subsystem, worker, schemas, scoring engine, and UI seam.
- **Behavioral:** adds optional live feedback to EQ workflow when enabled.
- **Structural:** adds new files under a dedicated folder and one adapter integration point.
- **Cosmetic:** adds Quaver mascot visuals, but only after engine packets are stable.

## 5. Assumptions and Unknowns

### Assumptions

1. The project uses `pnpm` as the package manager and Vitest as the test runner.
2. ScholoCandy already exposes, or can expose through an adapter, the active EQ instance state.
3. FFT or aggregate spectrum data is already available from the EQ/analyzer path, or can be sampled through an existing AudioWorklet/WebAudio analyzer.
4. The current feature flag layer can accept namespaced boolean flags.
5. React is used for the ScholoCandy UI surface.
6. Existing law files such as `VAELRIX_LAW.md` and `AGENTS.md` are authoritative if they conflict with this PDR.

### Unknowns

1. Exact current EQ component file path.
2. Exact current analyzer node ownership.
3. Exact current feature flag helper name.
4. Whether ScholoCandy has existing worker infrastructure for audio tasks.
5. Whether the app currently supports user-defined mix intent profiles.

### Unknown Handling

- Do not block Phase 1 on unknown UI paths. Build the engine as a pure module first.
- Use `audioSnapshot.adapter.js` as the seam if EQ state contracts are uncertain.
- Do not import from private EQ internals until the integration owner confirms the stable surface.

## 6. Open Questions / Escalations

These are conflicts requiring owner decisions, not ordinary missing details.

```txt
ESCALATION: QUAVER-EQ-001
Owner: Angel / repo owner
Conflict: Quaver needs access to active EQ instance state, but the stable public EQ contract is not confirmed.
Options:
  A) Expose a read-only EQ snapshot selector from the EQ feature.
  B) Let eq-oracle import current EQ internals directly.
Recommendation: A. It preserves API boundaries and makes rollback cleaner.
Required decision before: Phase 3 UI integration.
```

```txt
ESCALATION: QUAVER-EQ-002
Owner: Angel / repo owner
Conflict: Mascot tone can be playful, technical, or brutally diagnostic.
Options:
  A) Friendly concise coach.
  B) Scholomance familiar with flavorful but short messages.
  C) Strict diagnostic-only mode.
Recommendation: B for default, with C available through verbose diagnostics.
Required decision before: Claude finalizes message copy.
```

```txt
ESCALATION: QUAVER-EQ-003
Owner: Angel / repo owner
Conflict: Feature may need FFT access. Existing analyzer ownership is unknown.
Options:
  A) Consume existing aggregate spectrum data.
  B) Add a dedicated analyzer node for Quaver.
  C) Add an AudioWorklet bridge.
Recommendation: A first, C only if existing data is insufficient.
Required decision before: Gemini implements worker transport.
```

## 7. Architecture / File Map

### Directory Tree

```txt
src/
  features/
    scholocandy/
      eq-oracle/
        eqOracle.config.js
        eqAdvice.schema.js
        audioSnapshot.adapter.js
        eqFeatureExtractor.js
        eqProbabilityScorer.js
        eqAdviceEngine.js
        useEqOracleAdvice.js
        QuaverMascot.jsx
        QuaverMascot.css
        index.js
        __tests__/
          eqAdvice.schema.test.js
          eqFeatureExtractor.test.js
          eqProbabilityScorer.test.js
          eqAdviceEngine.test.js
          audioSnapshot.adapter.test.js
          QuaverMascot.test.jsx
  workers/
    scholocandy/
      eqOracle.worker.js
  lib/
    flags/
      scholocandyFlags.js

docs/
  scholomance/
    PDR-archive/
      2026-06-07-quaver-eq-oracle-pdr.md
    post-implementation-reports/
      PIR-20260607-QUAVER-EQ-ORACLE.md
```

### Dependency Graph

```txt
eqOracle.config.js
  -> no internal dependencies

eqAdvice.schema.js
  -> eqOracle.config.js

audioSnapshot.adapter.js
  -> eqAdvice.schema.js

eqFeatureExtractor.js
  -> eqAdvice.schema.js

eqProbabilityScorer.js
  -> eqOracle.config.js
  -> eqAdvice.schema.js

eqAdviceEngine.js
  -> eqFeatureExtractor.js
  -> eqProbabilityScorer.js
  -> eqAdvice.schema.js

useEqOracleAdvice.js
  -> eqAdviceEngine.js
  -> eqOracle.config.js
  -> worker transport when enabled

QuaverMascot.jsx
  -> useEqOracleAdvice.js
  -> QuaverMascot.css

eqOracle.worker.js
  -> eqAdviceEngine.js
```

### File Ownership Table

| File | Owner | Reason |
|---|---|---|
| `docs/scholomance/PDR-archive/2026-06-07-quaver-eq-oracle-pdr.md` | Codex | Architecture handoff and law-aware implementation contract. |
| `docs/scholomance/post-implementation-reports/PIR-20260607-QUAVER-EQ-ORACLE.md` | Codex | Required post-implementation report. |
| `src/features/scholocandy/eq-oracle/eqOracle.config.js` | Codex | Deterministic flags, thresholds, cadence. |
| `src/features/scholocandy/eq-oracle/eqAdvice.schema.js` | Codex | Public data contracts and validation. |
| `src/features/scholocandy/eq-oracle/audioSnapshot.adapter.js` | Codex | Read-only seam over uncertain EQ state. |
| `src/features/scholocandy/eq-oracle/eqFeatureExtractor.js` | Gemini | Numeric audio feature extraction and tests. |
| `src/features/scholocandy/eq-oracle/eqProbabilityScorer.js` | Codex | Deterministic scoring law. |
| `src/features/scholocandy/eq-oracle/eqAdviceEngine.js` | Codex | Engine orchestration and packet emission. |
| `src/features/scholocandy/eq-oracle/useEqOracleAdvice.js` | Claude | UI hook integration with engine boundary. |
| `src/features/scholocandy/eq-oracle/QuaverMascot.jsx` | Claude | Mascot UI and accessibility. |
| `src/features/scholocandy/eq-oracle/QuaverMascot.css` | Claude | Visual styling and reduced-motion behavior. |
| `src/features/scholocandy/eq-oracle/index.js` | Codex | Public module export. |
| `src/features/scholocandy/eq-oracle/__tests__/*.test.js(x)` | Gemini | Test implementation and CI coverage. |
| `src/workers/scholocandy/eqOracle.worker.js` | Gemini | Off-main-thread analysis. |
| `src/lib/flags/scholocandyFlags.js` | Codex | Feature flag declarations. |

## 8. Step-by-Step Implementation Plan

### Phase 1: Contracts and Flags

- **Owner:** Codex
- **Approximate time:** 30-45 minutes
- **Milestone:** Schemas, thresholds, and feature flags exist with tests.
- **Exit criteria:** `eqAdvice.schema.test.js` and config tests pass. No UI imports added.
- **Safe to ship independently:** Yes. Dead code until imported.

Tasks:

1. Add `eqOracle.config.js`.
2. Add `eqAdvice.schema.js`.
3. Add tests for validation, sorted keys, threshold behavior, and feature flag defaults.

### Phase 2: Pure Engine

- **Owner:** Codex + Gemini
- **Approximate time:** 1-2 hours
- **Milestone:** A pure function emits deterministic advice from fixture snapshots.
- **Exit criteria:** Same fixture produces byte-identical packet snapshots in Vitest.
- **Safe to ship independently:** Yes. No UI behavior.

Tasks:

1. Add `eqFeatureExtractor.js`.
2. Add `eqProbabilityScorer.js`.
3. Add `eqAdviceEngine.js`.
4. Add deterministic fixture tests.

### Phase 3: Shadow Mode Integration

- **Owner:** Gemini
- **Approximate time:** 1 hour
- **Milestone:** Active EQ snapshots can be analyzed in shadow mode without rendering Quaver.
- **Exit criteria:** Shadow diagnostics are produced only when `scholocandy.eqOracle.shadowMode` is true.
- **Safe to ship independently:** Yes. No user-visible behavior.

Tasks:

1. Add `audioSnapshot.adapter.js`.
2. Add `eqOracle.worker.js`.
3. Add adapter tests using fake EQ state.
4. Add worker message tests.

### Phase 4: Quaver Mascot UI

- **Owner:** Claude
- **Approximate time:** 1-2 hours
- **Milestone:** Quaver renders packet messages behind `scholocandy.eqOracle.mascotUi`.
- **Exit criteria:** Mascot is keyboard-safe, non-focus-stealing, reduced-motion compliant, and invisible when packet level is `silent`.
- **Safe to ship independently:** Yes, provided default flag remains false.

Tasks:

1. Add `useEqOracleAdvice.js`.
2. Add `QuaverMascot.jsx` and CSS.
3. Add React tests for silent, hint, suggestion, strong, and reduced-motion states.

### Phase 5: Canary Rollout

- **Owner:** Angel / repo owner + Gemini
- **Approximate time:** 30 minutes after merge
- **Milestone:** Feature enabled for local/dev canary only.
- **Exit criteria:** No regressions in EQ controls, transport, or analyzer performance.
- **Safe to ship independently:** Yes, with rollback flags.

Tasks:

1. Enable shadow mode locally.
2. Enable mascot for canary cohort.
3. Compare CPU and advice packet stability.
4. File PIR.

## 9. Code Examples for the 5-10 Most Pivotal Changes

### 9.1 Feature Configuration

```js
// src/features/scholocandy/eq-oracle/eqOracle.config.js

export const EQ_ORACLE_FLAGS = Object.freeze({
  SHADOW_MODE: 'scholocandy.eqOracle.shadowMode',
  MASCOT_UI: 'scholocandy.eqOracle.mascotUi',
  VERBOSE_ADVICE: 'scholocandy.eqOracle.verboseAdvice',
  WORKER_ENABLED: 'scholocandy.eqOracle.workerEnabled',
});

export const EQ_ORACLE_THRESHOLDS = Object.freeze({
  SILENT_MAX: 0.399,
  HINT_MIN: 0.4,
  SUGGESTION_MIN: 0.6,
  STRONG_MIN: 0.8,
});

export const EQ_ORACLE_CADENCE = Object.freeze({
  SHADOW_HZ: 4,
  ACTIVE_HZ: 8,
  MAX_SNAPSHOT_HISTORY: 16,
});

export const DEFAULT_EQ_ORACLE_WEIGHTS = Object.freeze({
  intentMatch: 0.35,
  maskingReduction: 0.2,
  gainSafety: 0.15,
  tonalBalance: 0.15,
  deltaStability: 0.15,
});
```

### 9.2 Schema Validation

```js
// src/features/scholocandy/eq-oracle/eqAdvice.schema.js

const SNAPSHOT_SCHEMA = 'SCHOLOCANDY-EQ-SNAPSHOT-v1';
const ADVICE_SCHEMA = 'SCHOLOCANDY-EQ-ADVICE-v1';

export function clamp01(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(1, numeric));
}

export function roundScore(value) {
  return Number(clamp01(value).toFixed(4));
}

export function assertEqSnapshot(snapshot) {
  if (!snapshot || snapshot.schema !== SNAPSHOT_SCHEMA) {
    throw new Error('EQ_ORACLE_INVALID_SNAPSHOT_SCHEMA');
  }
  if (!snapshot.instanceId || !snapshot.snapshotId) {
    throw new Error('EQ_ORACLE_MISSING_SNAPSHOT_IDENTITY');
  }
  if (!Array.isArray(snapshot.eqBands) || !Array.isArray(snapshot.spectrum?.bands)) {
    throw new Error('EQ_ORACLE_INVALID_SNAPSHOT_BANDS');
  }
  return snapshot;
}

export function createAdvicePacket(input) {
  const scores = Object.keys(input.scores || {})
    .sort((left, right) => left.localeCompare(right))
    .reduce((acc, key) => ({ ...acc, [key]: roundScore(input.scores[key]) }), {});

  return Object.freeze({
    schema: ADVICE_SCHEMA,
    instanceId: String(input.instanceId),
    snapshotId: String(input.snapshotId),
    intentId: String(input.intentId),
    level: input.level,
    confidence: roundScore(input.confidence),
    scores,
    messageId: String(input.messageId),
    message: String(input.message),
    nextAction: input.nextAction === null ? null : String(input.nextAction),
    diagnostics: Object.freeze([...(input.diagnostics || [])].map(String).sort()),
  });
}
```

### 9.3 Audio Snapshot Adapter

```js
// src/features/scholocandy/eq-oracle/audioSnapshot.adapter.js

export function createEqSnapshotFromState({
  instanceId,
  snapshotId,
  absoluteTimeMs,
  bpm,
  sampleRate,
  fftSize,
  eqState,
  spectrum,
  previousSpectrum = null,
}) {
  return Object.freeze({
    schema: 'SCHOLOCANDY-EQ-SNAPSHOT-v1',
    instanceId: String(instanceId),
    snapshotId: String(snapshotId),
    absoluteTimeMs: Number(absoluteTimeMs) || 0,
    bpm: Number(bpm) || 90,
    sampleRate: Number(sampleRate) || 44100,
    fftSize: Number(fftSize) || 2048,
    eqBands: Object.freeze((eqState?.bands || []).map((band) => Object.freeze({
      id: String(band.id),
      type: String(band.type || 'bell'),
      frequencyHz: Number(band.frequencyHz) || 1000,
      gainDb: Number(band.gainDb) || 0,
      q: Number(band.q) || 1,
      enabled: band.enabled !== false,
    }))),
    spectrum: Object.freeze({
      bands: Object.freeze((spectrum?.bands || []).map((band) => Object.freeze({
        startHz: Number(band.startHz) || 0,
        endHz: Number(band.endHz) || 0,
        energy: Math.max(0, Math.min(1, Number(band.energy) || 0)),
      }))),
      rms: Math.max(0, Math.min(1, Number(spectrum?.rms) || 0)),
      peak: Math.max(0, Math.min(1, Number(spectrum?.peak) || 0)),
    }),
    previousSpectrum: previousSpectrum ? Object.freeze(previousSpectrum) : undefined,
  });
}
```

### 9.4 Feature Extraction

```js
// src/features/scholocandy/eq-oracle/eqFeatureExtractor.js

import { assertEqSnapshot, roundScore } from './eqAdvice.schema.js';

const NAMED_RANGES = Object.freeze({
  sub: [20, 80],
  boom: [80, 160],
  mud: [160, 420],
  body: [420, 900],
  presence: [900, 4000],
  harshness: [4000, 8000],
  air: [8000, 16000],
});

function averageEnergyInRange(bands, [startHz, endHz]) {
  const overlapping = bands.filter((band) => band.endHz > startHz && band.startHz < endHz);
  if (overlapping.length === 0) return 0;
  const sum = overlapping.reduce((total, band) => total + Number(band.energy || 0), 0);
  return roundScore(sum / overlapping.length);
}

export function extractEqFeatures(snapshot) {
  const safeSnapshot = assertEqSnapshot(snapshot);
  const currentBands = safeSnapshot.spectrum.bands;
  const previousBands = safeSnapshot.previousSpectrum?.bands || currentBands;

  const ranges = Object.keys(NAMED_RANGES).sort().reduce((acc, key) => {
    const current = averageEnergyInRange(currentBands, NAMED_RANGES[key]);
    const previous = averageEnergyInRange(previousBands, NAMED_RANGES[key]);
    acc[key] = Object.freeze({
      current,
      previous,
      delta: roundScore(Math.abs(current - previous)),
    });
    return acc;
  }, {});

  const activeGainMagnitude = safeSnapshot.eqBands
    .filter((band) => band.enabled)
    .reduce((sum, band) => sum + Math.abs(Number(band.gainDb) || 0), 0);

  return Object.freeze({
    ranges: Object.freeze(ranges),
    rms: roundScore(safeSnapshot.spectrum.rms),
    peak: roundScore(safeSnapshot.spectrum.peak),
    activeBandCount: safeSnapshot.eqBands.filter((band) => band.enabled).length,
    activeGainMagnitude: roundScore(Math.min(1, activeGainMagnitude / 24)),
  });
}
```

### 9.5 Deterministic Scoring

```js
// src/features/scholocandy/eq-oracle/eqProbabilityScorer.js

import { DEFAULT_EQ_ORACLE_WEIGHTS, EQ_ORACLE_THRESHOLDS } from './eqOracle.config.js';
import { roundScore } from './eqAdvice.schema.js';

const INTENT_RANGE_MAP = Object.freeze({
  clearLeadVocal: ['mud', 'presence'],
  reduceMud: ['mud'],
  addAir: ['air', 'harshness'],
  tameHarshness: ['harshness'],
  controlBoom: ['boom', 'sub'],
  warmthWithoutCloud: ['body', 'mud'],
});

export function resolveAdviceLevel(confidence) {
  if (confidence >= EQ_ORACLE_THRESHOLDS.STRONG_MIN) return 'strong';
  if (confidence >= EQ_ORACLE_THRESHOLDS.SUGGESTION_MIN) return 'suggestion';
  if (confidence >= EQ_ORACLE_THRESHOLDS.HINT_MIN) return 'hint';
  return 'silent';
}

export function scoreEqMove(features, intentProfile, weights = DEFAULT_EQ_ORACLE_WEIGHTS) {
  const intentId = String(intentProfile?.intentId || 'clearLeadVocal');
  const ranges = INTENT_RANGE_MAP[intentId] || INTENT_RANGE_MAP.clearLeadVocal;

  const targetEnergy = ranges.reduce((sum, key) => sum + (features.ranges[key]?.current || 0), 0) / ranges.length;
  const targetDelta = ranges.reduce((sum, key) => sum + (features.ranges[key]?.delta || 0), 0) / ranges.length;

  const intentMatch = roundScore(1 - Math.abs(0.45 - targetEnergy));
  const maskingReduction = roundScore(intentId.includes('Mud') || intentId === 'clearLeadVocal'
    ? 1 - (features.ranges.mud?.current || 0)
    : 0.5 + targetDelta * 0.5);
  const gainSafety = roundScore(1 - features.activeGainMagnitude);
  const tonalBalance = roundScore(1 - Math.abs((features.peak || 0) - (features.rms || 0)));
  const deltaStability = roundScore(1 - Math.min(1, targetDelta * 1.8));

  const uncertaintyPenalty = roundScore(
    features.activeBandCount === 0 ? 0.3 :
    features.peak >= 0.98 ? 0.2 :
    0
  );

  const weighted =
    intentMatch * weights.intentMatch +
    maskingReduction * weights.maskingReduction +
    gainSafety * weights.gainSafety +
    tonalBalance * weights.tonalBalance +
    deltaStability * weights.deltaStability;

  const confidence = roundScore(weighted - uncertaintyPenalty);

  return Object.freeze({
    confidence,
    level: resolveAdviceLevel(confidence),
    scores: Object.freeze({
      intentMatch,
      maskingReduction,
      gainSafety,
      tonalBalance,
      deltaStability,
      uncertaintyPenalty,
    }),
  });
}
```

### 9.6 Advice Engine

```js
// src/features/scholocandy/eq-oracle/eqAdviceEngine.js

import { assertEqSnapshot, createAdvicePacket } from './eqAdvice.schema.js';
import { extractEqFeatures } from './eqFeatureExtractor.js';
import { scoreEqMove } from './eqProbabilityScorer.js';

const MESSAGE_LIBRARY = Object.freeze({
  silent: Object.freeze({
    messageId: 'quaver.silent',
    message: '',
    nextAction: null,
  }),
  hint: Object.freeze({
    messageId: 'quaver.hint.checkMove',
    message: 'Quaver sees a possible improvement, but the signal is not certain yet.',
    nextAction: 'Listen once in context before changing more.',
  }),
  suggestion: Object.freeze({
    messageId: 'quaver.suggestion.helping',
    message: 'This move is probably helping the selected EQ intent.',
    nextAction: 'Try bypassing the band once to confirm the difference.',
  }),
  strong: Object.freeze({
    messageId: 'quaver.strong.keepGoing',
    message: 'This EQ move strongly matches the selected intent.',
    nextAction: 'Lock this move, then check the next masking zone.',
  }),
});

export function createEqAdvice(snapshot, intentProfile, options = {}) {
  const safeSnapshot = assertEqSnapshot(snapshot);
  const features = extractEqFeatures(safeSnapshot);
  const result = scoreEqMove(features, intentProfile, options.weights);
  const template = MESSAGE_LIBRARY[result.level];

  return createAdvicePacket({
    instanceId: safeSnapshot.instanceId,
    snapshotId: safeSnapshot.snapshotId,
    intentId: intentProfile.intentId,
    level: result.level,
    confidence: result.confidence,
    scores: result.scores,
    messageId: template.messageId,
    message: template.message,
    nextAction: template.nextAction,
    diagnostics: [
      `activeBandCount:${features.activeBandCount}`,
      `peak:${features.peak}`,
      `rms:${features.rms}`,
    ],
  });
}
```

### 9.7 Worker Boundary

```js
// src/workers/scholocandy/eqOracle.worker.js

import { createEqAdvice } from '../../features/scholocandy/eq-oracle/eqAdviceEngine.js';

self.onmessage = (event) => {
  const { requestId, snapshot, intentProfile, options } = event.data || {};

  try {
    const packet = createEqAdvice(snapshot, intentProfile, options);
    self.postMessage({ requestId, ok: true, packet });
  } catch (error) {
    self.postMessage({
      requestId,
      ok: false,
      error: String(error?.message || error),
    });
  }
};
```

### 9.8 Mascot UI

```jsx
// src/features/scholocandy/eq-oracle/QuaverMascot.jsx

import './QuaverMascot.css';

export function QuaverMascot({ packet, reducedMotion = false, onDismiss }) {
  if (!packet || packet.level === 'silent') return null;

  return (
    <aside
      className={`quaverMascot quaverMascot--${packet.level}`}
      data-reduced-motion={reducedMotion ? 'true' : 'false'}
      aria-live="polite"
      aria-label="Quaver EQ advice"
    >
      <button
        type="button"
        className="quaverMascot__dismiss"
        aria-label="Dismiss Quaver advice"
        onClick={onDismiss}
      >
        ×
      </button>
      <div className="quaverMascot__glyph" aria-hidden="true">♪</div>
      <div className="quaverMascot__body">
        <strong>Quaver</strong>
        <p>{packet.message}</p>
        {packet.nextAction ? <small>{packet.nextAction}</small> : null}
        <meter min="0" max="1" value={packet.confidence}>
          {Math.round(packet.confidence * 100)}%
        </meter>
      </div>
    </aside>
  );
}
```

### 9.9 Reduced-Motion CSS

```css
/* src/features/scholocandy/eq-oracle/QuaverMascot.css */

.quaverMascot {
  border: 1px solid currentColor;
  border-radius: 12px;
  padding: 0.75rem;
  max-width: 20rem;
  background: rgb(10 10 14 / 0.94);
  color: white;
}

.quaverMascot__dismiss {
  float: right;
}

.quaverMascot__glyph {
  font-size: 2rem;
  line-height: 1;
}

.quaverMascot[data-reduced-motion='false'] .quaverMascot__glyph {
  animation: quaverFloat 1.2s ease-in-out infinite alternate;
}

@keyframes quaverFloat {
  from { transform: translateY(0); }
  to { transform: translateY(-4px); }
}

@media (prefers-reduced-motion: reduce) {
  .quaverMascot__glyph {
    animation: none !important;
  }
}
```

## 10. Glossary

- **Quaver:** The eighth-note mascot that displays EQ advice.
- **ScholoCandy:** The music/audio creation surface receiving this feature.
- **Photonic eyeball tech:** Existing perception metaphor adapted here into an audio-semantic analyzer.
- **Oracle tech:** Deterministic interpretation layer that scores observations and emits auditable advice.
- **EQ instance:** A single active equalizer module being edited by the user.
- **EQSnapshot:** Normalized read-only state of an EQ instance and its aggregate spectrum.
- **EQIntentProfile:** User-selected target for the current EQ move.
- **EQAdvicePacket:** Deterministic output payload consumed by diagnostics and UI.
- **Shadow mode:** Engine computes packets without rendering UI or changing behavior.
- **Confidence gate:** Threshold that determines whether Quaver stays silent, hints, suggests, or strongly recommends.
- **Masking zone:** Frequency range where one sound may obscure another.
- **Deterministic scoring:** Same input creates same output bytes every run.
- **Adapter seam:** A small module that isolates unknown or unstable contracts.
- **Canary cohort:** Small set of users or local builds where the feature is enabled first.

## 11. Q&A: Top 10 Most Confusing Implementation Concerns

### 1. Is Quaver allowed to change EQ bands?

No. V1 is read-only. Any auto-apply behavior requires a follow-up PDR.

### 2. Is the confidence score objective truth?

No. It is a deterministic probability estimate relative to the selected intent profile and available snapshot data.

### 3. Why not use an LLM for advice copy?

Real-time feedback must be deterministic, fast, private, and byte-stable. Use message templates in v1.

### 4. What happens when confidence is low?

The packet level becomes `silent` or `hint`. Quaver does not interrupt the user.

### 5. What if the analyzer data is noisy?

The scorer adds uncertainty penalties for risky or incomplete snapshots. The UI should stay silent when uncertainty is high.

### 6. What if the EQ state shape changes?

Only `audioSnapshot.adapter.js` should change. The pure engine must keep its contracts stable.

### 7. Does this store user audio?

No. Store at most compact aggregate snapshots in memory. Do not persist raw waveforms, FFT frames, or stems.

### 8. Can this run before the mascot UI exists?

Yes. Shadow mode is the required first rollout state.

### 9. What if the worker crashes?

The hook should drop the packet and keep the EQ UI unchanged. Failure is silent unless diagnostics mode is enabled.

### 10. How do future agents know whether advice changed?

Snapshot tests must compare full deterministic packet JSON. Message changes must intentionally update snapshots.

## 12. QA Plan

### Test Runner and Package Manager

- Package manager: `pnpm`
- Test runner: Vitest

### Commands

```bash
pnpm test -- src/features/scholocandy/eq-oracle/__tests__/eqAdvice.schema.test.js
pnpm test -- src/features/scholocandy/eq-oracle/__tests__/eqFeatureExtractor.test.js
pnpm test -- src/features/scholocandy/eq-oracle/__tests__/eqProbabilityScorer.test.js
pnpm test -- src/features/scholocandy/eq-oracle/__tests__/eqAdviceEngine.test.js
pnpm test -- src/features/scholocandy/eq-oracle/__tests__/audioSnapshot.adapter.test.js
pnpm test -- src/features/scholocandy/eq-oracle/__tests__/QuaverMascot.test.jsx
pnpm lint
pnpm test
```

### Test File: Schema Determinism

```js
// src/features/scholocandy/eq-oracle/__tests__/eqAdvice.schema.test.js

import { describe, expect, it } from 'vitest';
import { createAdvicePacket } from '../eqAdvice.schema.js';

describe('createAdvicePacket', () => {
  it('sorts score and diagnostic keys for byte-stable output', () => {
    const packet = createAdvicePacket({
      instanceId: 'eq-1',
      snapshotId: 'snap-1',
      intentId: 'reduceMud',
      level: 'suggestion',
      confidence: 0.612345,
      scores: { tonalBalance: 0.7, intentMatch: 0.8 },
      messageId: 'quaver.test',
      message: 'Test message',
      nextAction: null,
      diagnostics: ['z:last', 'a:first'],
    });

    expect(JSON.stringify(packet)).toMatchInlineSnapshot(
      `"{\"schema\":\"SCHOLOCANDY-EQ-ADVICE-v1\",\"instanceId\":\"eq-1\",\"snapshotId\":\"snap-1\",\"intentId\":\"reduceMud\",\"level\":\"suggestion\",\"confidence\":0.6123,\"scores\":{\"intentMatch\":0.8,\"tonalBalance\":0.7},\"messageId\":\"quaver.test\",\"message\":\"Test message\",\"nextAction\":null,\"diagnostics\":[\"a:first\",\"z:last\"]}"`
    );
  });
});
```

### Test File: Scoring Thresholds

```js
// src/features/scholocandy/eq-oracle/__tests__/eqProbabilityScorer.test.js

import { describe, expect, it } from 'vitest';
import { resolveAdviceLevel, scoreEqMove } from '../eqProbabilityScorer.js';

describe('resolveAdviceLevel', () => {
  it('maps confidence to stable advice levels', () => {
    expect(resolveAdviceLevel(0.39)).toBe('silent');
    expect(resolveAdviceLevel(0.4)).toBe('hint');
    expect(resolveAdviceLevel(0.6)).toBe('suggestion');
    expect(resolveAdviceLevel(0.8)).toBe('strong');
  });
});

describe('scoreEqMove', () => {
  it('is deterministic for the same features and intent', () => {
    const features = {
      ranges: {
        air: { current: 0.4, delta: 0.1 },
        body: { current: 0.5, delta: 0.05 },
        boom: { current: 0.2, delta: 0.02 },
        harshness: { current: 0.3, delta: 0.03 },
        mud: { current: 0.24, delta: 0.08 },
        presence: { current: 0.54, delta: 0.04 },
        sub: { current: 0.18, delta: 0.01 },
      },
      rms: 0.42,
      peak: 0.73,
      activeBandCount: 2,
      activeGainMagnitude: 0.18,
    };
    const intent = { intentId: 'clearLeadVocal' };

    expect(scoreEqMove(features, intent)).toEqual(scoreEqMove(features, intent));
  });
});
```

### Test File: Advice Engine Packet

```js
// src/features/scholocandy/eq-oracle/__tests__/eqAdviceEngine.test.js

import { describe, expect, it } from 'vitest';
import { createEqAdvice } from '../eqAdviceEngine.js';

const snapshot = Object.freeze({
  schema: 'SCHOLOCANDY-EQ-SNAPSHOT-v1',
  instanceId: 'eq-vocal-1',
  snapshotId: 'snap-001',
  absoluteTimeMs: 12000,
  bpm: 90,
  sampleRate: 44100,
  fftSize: 2048,
  eqBands: [
    { id: 'b1', type: 'bell', frequencyHz: 300, gainDb: -2.5, q: 1.2, enabled: true },
  ],
  spectrum: {
    rms: 0.42,
    peak: 0.72,
    bands: [
      { startHz: 160, endHz: 420, energy: 0.22 },
      { startHz: 900, endHz: 4000, energy: 0.51 },
    ],
  },
});

describe('createEqAdvice', () => {
  it('creates a deterministic packet', () => {
    const packet = createEqAdvice(snapshot, { intentId: 'clearLeadVocal' });
    expect(packet.schema).toBe('SCHOLOCANDY-EQ-ADVICE-v1');
    expect(packet.instanceId).toBe('eq-vocal-1');
    expect(JSON.stringify(packet)).toBe(JSON.stringify(createEqAdvice(snapshot, { intentId: 'clearLeadVocal' })));
  });
});
```

### Test File: Mascot Rendering

```jsx
// src/features/scholocandy/eq-oracle/__tests__/QuaverMascot.test.jsx

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { QuaverMascot } from '../QuaverMascot.jsx';

describe('QuaverMascot', () => {
  it('does not render silent packets', () => {
    const { container } = render(<QuaverMascot packet={{ level: 'silent' }} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders accessible advice for suggestion packets', () => {
    render(<QuaverMascot packet={{
      level: 'suggestion',
      confidence: 0.72,
      message: 'This move is probably helping.',
      nextAction: 'Bypass once to confirm.',
    }} />);

    expect(screen.getByLabelText('Quaver EQ advice')).toBeInTheDocument();
    expect(screen.getByText('This move is probably helping.')).toBeInTheDocument();
  });
});
```

## 13. Regression Risks and Specific Retest Checklist

### Risk: EQ UI slows down while playback runs

Retest:

```bash
pnpm test -- src/features/scholocandy/eq-oracle/__tests__/eqAdviceEngine.test.js
pnpm test -- src/features/scholocandy/eq-oracle/__tests__/audioSnapshot.adapter.test.js
```

Manual scenario:

1. Open ScholoCandy EQ page.
2. Disable all `scholocandy.eqOracle.*` flags.
3. Move all EQ nodes while transport plays.
4. Confirm no new UI appears and no interaction delay is visible.
5. Enable shadow mode only.
6. Repeat EQ node movement.
7. Confirm no UI appears and diagnostics remain bounded.

### Risk: Quaver interrupts creative flow

Retest:

```bash
pnpm test -- src/features/scholocandy/eq-oracle/__tests__/QuaverMascot.test.jsx
```

Manual scenario:

1. Enable mascot UI.
2. Set advice confidence below `0.6`.
3. Confirm no suggestion card appears unless verbose mode is enabled.
4. Confirm dismiss button hides the current packet.
5. Confirm focus stays on the EQ control being edited.

### Risk: Non-deterministic advice packets break snapshot stability

Retest:

```bash
pnpm test -- src/features/scholocandy/eq-oracle/__tests__/eqAdvice.schema.test.js
pnpm test -- src/features/scholocandy/eq-oracle/__tests__/eqProbabilityScorer.test.js
pnpm test -- src/features/scholocandy/eq-oracle/__tests__/eqAdviceEngine.test.js
```

Manual scenario:

1. Run the same fixture 100 times in a local loop.
2. Compare `JSON.stringify(packet)` output.
3. Confirm byte-identical output every run.

### Risk: Worker failure crashes UI

Retest:

```bash
pnpm test -- src/features/scholocandy/eq-oracle/__tests__/audioSnapshot.adapter.test.js
pnpm test -- src/features/scholocandy/eq-oracle/__tests__/eqAdviceEngine.test.js
```

Manual scenario:

1. Enable `scholocandy.eqOracle.workerEnabled`.
2. Force worker import failure in dev.
3. Confirm EQ UI stays usable.
4. Confirm Quaver stays hidden.
5. Confirm one diagnostic error is emitted, not an error flood.

### Risk: Accessibility regression

Retest:

```bash
pnpm test -- src/features/scholocandy/eq-oracle/__tests__/QuaverMascot.test.jsx
pnpm lint
```

Manual scenario:

1. Enable system reduced motion.
2. Open Quaver mascot.
3. Confirm no floating animation.
4. Navigate with keyboard.
5. Confirm Quaver does not steal focus.

## 14. Rollout Plan

### Feature Flags

| Flag | Default | Purpose |
|---|---:|---|
| `scholocandy.eqOracle.shadowMode` | `false` | Compute packets without UI. |
| `scholocandy.eqOracle.workerEnabled` | `false` | Use worker instead of direct pure call. |
| `scholocandy.eqOracle.mascotUi` | `false` | Render Quaver UI. |
| `scholocandy.eqOracle.verboseAdvice` | `false` | Allow low-confidence hints and diagnostics. |

### Shadow Mode

Initial rollout enables only `scholocandy.eqOracle.shadowMode` in local/dev. The system computes packets and discards UI output. This verifies stability without changing user behavior.

### A/B Compare

Compare three local modes:

1. All flags off.
2. Shadow mode only.
3. Shadow mode plus mascot UI.

Metrics to compare manually in dev:

- EQ node drag responsiveness.
- Console diagnostic volume.
- Worker failure behavior.
- Advice packet determinism.
- Reduced-motion compliance.

### Canary Cohort

Canary should be limited to Angel / repo owner local profile first. Do not enable for general users until the PIR confirms no serious EQ regressions.

### Incomplete-but-Safe Clause

Before the feature is complete, the system must run in one of these safe states:

1. **Disabled:** all flags false, no imports into active EQ route.
2. **Shadow only:** engine computes packet diagnostics, no mascot UI, no EQ mutation.
3. **Mascot UI canary:** Quaver renders only from valid packets, remains dismissible, and cannot change EQ state.

Any incomplete state that mutates EQ parameters, persists raw audio, or renders ungated advice is invalid.

### Rollback Steps

1. Set `scholocandy.eqOracle.mascotUi=false`.
2. Set `scholocandy.eqOracle.workerEnabled=false`.
3. Set `scholocandy.eqOracle.shadowMode=false`.
4. Remove the Quaver import from the EQ route if a hotfix is required.
5. Leave pure engine files in place unless they cause build failure.
6. Run:

```bash
pnpm lint
pnpm test
```

## 15. Definition of Done

- [ ] `2026-06-07-quaver-eq-oracle-pdr.md` exists in `docs/scholomance/PDR-archive/`.
- [ ] All files listed in §7 exist or are explicitly deferred in the implementation PR notes.
- [ ] All `scholocandy.eqOracle.*` flags default to false.
- [ ] With flags disabled, the EQ UI has no user-visible changes.
- [ ] `createEqAdvice()` is pure and deterministic.
- [ ] No scoring code calls `Math.random()`, `Date.now()`, `performance.now()`, or locale-sensitive unsorted serialization.
- [ ] Advice packets are byte-stable in snapshot tests.
- [ ] Quaver does not render `silent` packets.
- [ ] Quaver uses `aria-live="polite"` and never steals focus.
- [ ] Reduced-motion mode disables animation.
- [ ] Worker failure degrades to no advice, not an app crash.
- [ ] No raw audio buffers are persisted.
- [ ] `pnpm lint` passes.
- [ ] `pnpm test` passes.
- [ ] PIR file is created at `docs/scholomance/post-implementation-reports/PIR-20260607-QUAVER-EQ-ORACLE.md`.

## 16. Final Architectural Verdict

**Functionally complete but needs follow-up.**

This PDR is complete enough for a safe v1 implementation because it isolates the engine, forces deterministic scoring, keeps Quaver opt-in, and requires shadow mode before UI rollout. The remaining risk is contract uncertainty around the active EQ state and analyzer ownership. That risk is contained by the adapter seam and the explicit escalation blocks, but a follow-up PDR is required before preference memory, automatic EQ preview, or reference-track matching are allowed.

## 17. References

- `VAELRIX_LAW.md` - project ownership and jurisdiction rules, if present in implementation branch.
- `AGENTS.md` - agent-specific file ownership and implementation constraints, if present in implementation branch.
- `bytecode-error.js` - deterministic diagnostic pattern for structured, parseable errors.
- `gear-glide-amp.js` - absolute-time BPM-synced behavior pattern for musical timing.
- `image-to-semantic-bridge.js` - perception-to-semantic-parameter bridge pattern.
- `phoneme-mapping.js` - region heatmap analysis pattern adaptable to audio bins.
- `shared.js` - deterministic helpers such as clamping, rounding, and hashing.
- `processor-bridge.js` - existing processor dispatch seam referenced by PixelBrain modules.
- `docs/scholomance/PDR-archive/` - dated PDR catalog destination.
- `docs/scholomance/post-implementation-reports/` - required PIR destination.

## 18. Post-Implementation Report Handoff

Required PIR filename:

```txt
/docs/scholomance/post-implementation-reports/PIR-20260607-QUAVER-EQ-ORACLE.md
```

Required PIR date:

```txt
2026-06-07
```

Required PIR title:

```txt
# PIR-20260607-QUAVER-EQ-ORACLE
```

A Quaver EQ Oracle implementation that ships without this PIR is incomplete. The PIR must report actual files changed, flags used, test commands run, pass/fail results, unresolved escalations, and whether the feature remained read-only through rollout.
