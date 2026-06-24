# Design: Assonance as a first-class color tier

- **Date:** 2026-06-21
- **Status:** Approved for implementation planning
- **Scope:** Make assonance fully represented in TrueSight color — both detected fully and allowed to drive color — without recreating the "skittles" over-coloring noise.

## Problem

Color in TrueSight is keyed on `vowelFamily` (the vowel sound → school → color), so coloring by vowel *is* assonance. But two things prevent assonance from being represented:

1. **The gate filters it out.** Coloring is binary and 100% gated: a word gets its full school color only if its `charStart` is in `resonantCharStarts` ([TruesightPlugin.jsx:124](../../../src/lib/lexical/TruesightPlugin.jsx#L124)); otherwise it renders grey. The gate is built at `MIN_RESONANCE_SCORE = 0.95` ([ReadPage.jsx:421](../../../src/pages/Read/ReadPage.jsx#L421)). Assonance connections score ~0.62 (`STRESSED_ASSONANCE_SCORE`), so they never pass — vowel-only echoes stay grey and their color is invisible.
2. **Detection is too narrow.** Assonance is only found cross-line and only for multisyllabic anchors ([findCrossLineAssonanceConnections](../../../codex/core/rhyme-astrology/deepRhyme.engine.js#L351)). Within-line interior echoes and monosyllabic content words are missed at the source.

Naively lowering the gate to admit assonance recreates the documented "skittles" problem (the gate was previously too loose — ≈ every word colored = noise).

## Key insight

Stop treating color as binary. If assonance is a **visually subordinate tier** (soft tint, no glow) rather than absent-or-full, it can be *fully present* without competing with rhyme. And because the assonance tier is quiet, **broadening detection becomes safe** — more vowel echoes just add soft tint, not noise. Tiering is what makes "fully represented" and "not noisy" compatible.

## Architecture

```
deepRhyme.engine  →  allConnections (rhyme/end/internal + assonance, broadened)
        │
ReadPage useMemo  →  ONE gate: Map<charStart, 'rhyme' | 'assonance'>
        │            (single resolveResonanceConnections call — one population path)
        ▼
LexicalScrollEditor → TruesightPlugin
        │
        ▼
  tier lookup → CSS class:  rhyme=active(glow) · assonance=assonant(tint) · none=grey
```

## Component 1: Tiered gate (one gate, tier per word)

Replace the `resonantCharStarts` `Set<charStart>` with a **`Map<charStart, 'rhyme' | 'assonance'>`**, built in the same single `useMemo` from one `resolveResonanceConnections(deepAnalysis)` call. Keeping a single construction site is what realizes the "one gate" choice and avoids the two-gate bug surface (two independently-populated Sets) that bit us with `RESONANCE_GHOST` / `GATE_DATA_ABSENT`.

Tier assignment is **connection-type-based**, reusing the engine's existing classification ([deepRhyme.engine.js:592](../../../codex/core/rhyme-astrology/deepRhyme.engine.js#L592)) rather than inventing a second score threshold:
- A charStart in any **rhyme / end / internal** connection → `'rhyme'`.
- A charStart in **only `type:'assonance'`** connections → `'assonance'`.
- Rhyme wins when a word qualifies for both.

`Map` is largely drop-in: existing `.has(cs)` / `.size` checks still work; the new `.get(cs)` yields the tier. The variable keeps the name `resonantCharStarts` (now a Map) to minimize prop-threading churn rather than renaming to `resonanceGate`.

## Component 2: Frontend tier rendering

In [TruesightPlugin.jsx](../../../src/lib/lexical/TruesightPlugin.jsx), `shouldColor` (boolean) becomes a tier lookup:
- `'rhyme'` → `grimoire-word--{school} grimoire-word--active` — unchanged (full color + glow).
- `'assonance'` → new `grimoire-word--{school} grimoire-word--assonant` — soft tint of the same school color, **no glow** (CSS: reduced opacity/saturation, no text-shadow/animation).
- absent → grey.

The drift probe `maybeWarnIfGateConventionDrifted` must accept `Map` (currently `instanceof Set`).

## Component 3: Broadened detection

Extend assonance detection beyond cross-line/multisyllabic to **within-line interior echoes and monosyllabic content words**, bucketed by primary stressed vowel family (as the cross-line path already does). The noise concern that justified the narrow scope is resolved by the quiet tier, so this is now safe.

## Component 4: Immune ripple (required, or the system self-flags)

The `Set` → `Map` change touches the invariants hardened last session:
- `RESONANCE_GHOST` fix pattern `/resonantCharStarts\s*=\s*new Set\(/` in [RuleRegistry.ts](../../../src/core/scd64/RuleRegistry.ts) → update to also accept `new Map(`, else clean code false-positives.
- `maybeWarnIfGateConventionDrifted` (`instanceof Set`) → accept `Map`.
- `resonanceDegraded` and `resolveResonanceConnections` empty/size checks → confirm Map-aware.

## Data flow

```
analysis → allConnections (broadened assonance)
→ resolveResonanceConnections → connections
→ ReadPage: Map<charStart, tier>  (rhyme | assonance, rhyme wins)
→ props → TruesightPlugin: tier = gate.get(charStart)
→ class: active(glow) | assonant(tint) | grey
```

## Error handling

- DIAGNOSE-safe: no engine mutation; gate is a pure derivation.
- Empty/degraded gate (server unreachable) still works: an empty Map = no coloring, same as today's empty Set; `resonanceDegraded` unchanged in meaning.
- Tier lookup on a missing key returns `undefined` → grey (safe default).

## Testing

- **Engine:** within-line and monosyllabic vowel echoes now produce `type:'assonance'` connections.
- **Gate:** rhyme word → `'rhyme'`; vowel-only echo → `'assonance'`; unrelated → absent; word in both → `'rhyme'` (rhyme wins).
- **Plugin:** tier → correct class (`active` vs `assonant` vs grey).
- **Immune:** updated Set/Map patterns don't regress; extend last session's RuleRegistry precision tests with a `new Map(` fix-pattern case.

## Decisions made (flag to flip)

1. **Tier is connection-type-based** (rhyme vs assonance), not a second score threshold.
2. **Keep the name `resonantCharStarts`** (now a Map) to minimize churn, rather than renaming to `resonanceGate`.

## Non-goals

- A third tier (e.g. slant) — two tiers only for now.
- Changing the per-word vowel→school→color mapping itself (that's the already-fixed syllabifier/engine fold path).
- Connection-line/link rendering changes — this is about per-word tier color only.
- Reworking `MIN_RESONANCE_SCORE` for the rhyme tier; the rhyme tier keeps its current bar.
