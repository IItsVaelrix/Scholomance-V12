# PDR: PixelBrain Animation Algorithm Engine
## Procedurally Generated and Emergent Animations from Lore-Consistent Phonemic Physics

**GrimDesign Signal:**
```
dominantSchool:  ABJURATION
effectClass:     HARMONIC
blendedHsl:      hsl(146, 83%, 56%)
glowRadius:      12px
animationClass:  grim-breathe @ 1600ms
rarity:          RARE
syllableDepth:   4
```

**Status:** Draft — Canon Proposal
**Classification:** UI + PixelBrain + Animation System + Lore Infrastructure
**Priority:** High
**Owners:**
- **Claude** — animation surfaces, CSS keyframe system, component integration
- **Codex** — PixelBrain signal output, phoneme/stat data shapes, engine contracts
- **Gemini** — world-law validation, stat-to-animation mapping review, lore consistency sign-off

---

## 1. Executive Summary

This PDR defines a deterministic, phoneme-driven animation algorithm system for Scholomance V11. Every animation in the game world is a physical consequence of the same linguistic physics that score scrolls. A PSYC-dominant burst produces different motion than a MYTH-dominant burst — not because a designer chose different keyframes, but because the word-force measurements of those stat classes produce different parameters through the same pipeline that governs combat scoring.

PixelBrain already emits school weights, glyph color, and glow intensity. This PDR formalizes how those measurements drive:
- per-school animation physics (timing, easing curves, waveform shape)
- emergent behaviors triggered by game-state transitions (Burst Unlock, scroll submission, archetype threshold events)
- stat-class animation overlays keyed to primary and special stats from the lore sheet
- a declarative animation-spec format that Claude reads from the PixelBrain signal without guessing

The result: every visual event in Scholomance feels like it was grown from the same soil as the mechanics — because it was.

---

## 2. Problem Statement

### Current State
Animations are written by hand. A dev picks a duration, an easing curve, a glow color. These choices are reasonable but disconnected from the phonemic substrate. A VOID-school scroll submission might accidentally feel warm. A SONIC burst reveal might accidentally feel slow. The game's visual language lacks the internal consistency demanded by VAELRIX_LAW.

### Lore Requirement (from lore sheet §2)
> "The system must make the player feel that words have measurable power."
> "The interface and rules should feel sacred, precise, and deterministic."
> "The player should feel judged by a ceremonial intelligence with clear logic, not by arbitrary vibes."

Animations that are hand-tuned violate this principle. When the Codex speaks, the world should *move* the way the phonemic physics demand — not the way a dev guessed it should.

### Target State
Every animation parameter (duration, easing, color, glow intensity, waveform type) is derived from PixelBrain's emitted signal. The animation system is a read-only consumer of the analysis pipeline. No animation property is hardcoded.

---

## 3. Lore-Law Mappings

These mappings define which animation physics correspond to each school and stat class. They are derived from the lore sheet's description of what each stat/school *is* — not from aesthetic preference.

### 3.1 School → Animation Physics

| School | Duration Range | Easing Curve | Waveform | Glow Behavior |
|--------|---------------|--------------|----------|---------------|
| **SONIC** | 400–800ms | `cubic-bezier(0.25, 0, 0.1, 1)` — sharp attack | pulse-wave (rapid oscillation) | hard flash then decay |
| **PSYCHIC** | 600–1200ms | `cubic-bezier(0.4, 0, 0.6, 1)` — smooth symmetric | sine-wave (smooth oscillation) | diffuse bloom, slow fade |
| **ALCHEMY** | 300–600ms | `cubic-bezier(0.5, 0, 0.5, 1.5)` — slight overshoot | sawtooth (build then snap) | chromatic shift during peak |
| **WILL** | 800–1600ms | `cubic-bezier(0.2, 0, 0.8, 1)` — sustained | square-wave (binary on/off beats) | sustained steady glow |
| **VOID** | 1200–2400ms | `cubic-bezier(0.9, 0, 0.1, 1)` — slow ramp | flat decay (fade without oscillation) | cold vignette, no bloom |
| **ABJURATION** | 1400–2000ms | `cubic-bezier(0.3, 0, 0.7, 1)` — structural breathing | sine-wave (measured, architectural) | steady green ward-glow |
| **NECROMANCY** | 1000–1800ms | `cubic-bezier(0.6, 0, 0.4, 1)` — weight-forward | decaying sine (fades to stillness) | purple residue, no peak |
| **DIVINATION** | 500–1000ms | `cubic-bezier(0.1, 0.9, 0.9, 0.1)` — anticipatory | dual-pulse (see-then-confirm) | gold shimmer, brief |

**Algorithm:**
```
animationDuration = lerp(school.durationMin, school.durationMax, glowIntensity)
easingCurve = school.easingCurve
waveform = school.waveform
```

### 3.2 Stat Class → Animation Overlay

Primary and special stats from the lore sheet (§4) drive overlay animations that layer over the school base animation. These only fire when a stat score is returned (not during idle states).

| Stat | Overlay Behavior | Trigger Threshold |
|------|-----------------|-------------------|
| **SYNT** | geometric lattice shimmer — sharp grid lines briefly visible at word edges | Adept+ |
| **META** | vertical ascent drift — words briefly rise 2–4px as if weightless | Master+ |
| **MYTH** | scale surge — component scales 1.0 → 1.03 → 1.0 over 600ms | Master+ |
| **VIS** | saturation spike — color briefly over-saturates 20% then returns | Adept+ |
| **PSYC** | opacity fracture — word chips briefly flutter (staggered opacity 0.6→1.0) | Adept+ |
| **CODEX** | depth ring — subtle outward ring emits from component center | Master+ |
| **CNWV** | horizontal flow — staggered left-to-right reveal (20ms per word) | Burst Unlock |
| **CINF** | scene lock — brief vignette pulse frames the component | Burst Unlock |
| **PSCH** | inward collapse shimmer — hue briefly inverts at center, expands outward | Burst Unlock |
| **EXCL** | stark freeze — all animation pauses 200ms, then resumes (silence as meaning) | Burst Unlock |
| **VOID** | coldwave — temperature color shift, saturation → 0% for 400ms then recovers | Burst Unlock |

### 3.3 Rating Tier → Animation Magnitude

Rating tiers from the lore sheet (§5) scale the overlay animation intensity:

| Rating | Scale Factor | Duration Multiplier | Glow Multiplier |
|--------|-------------|--------------------|-----------------| 
| Neophyte | 0.4 | 0.6× | 0.3× |
| Adept | 0.7 | 0.85× | 0.6× |
| Master | 1.0 | 1.0× | 1.0× |
| Godlike | 1.35 | 1.2× | 1.5× |

```
animationMagnitude = RATING_SCALE[stat.rating]
finalDuration = baseDuration * animationMagnitude.durationMultiplier
finalGlowRadius = baseGlowRadius * animationMagnitude.glowMultiplier
```

---

## 4. Emergent Animation Events

These are animations triggered by game-state transitions — not continuous idle states. They are the visual language of the world responding to player action.

### 4.1 Burst Unlock Animation

**Trigger:** 5 consecutive lines scored Master or Godlike in the same stat category (lore sheet §6).

**Algorithm:**
```
1. Detect streak completion in combat/scroll analysis data
2. Read dominant stat from streakCategory
3. Read school weights from most recent PixelBrain signal
4. Compute:
   - burstColor = computeBlendedHsl(schoolWeights) with lightness+15%
   - burstGlow = glowRadius * 2.0
   - cascadeDuration = 800ms + (syllableDepth * 120ms)
5. Execute cascade:
   a. Word chips light up left-to-right with 30ms stagger
   b. Center glow expands to burstGlow radius over cascadeDuration/2
   c. Stat label for streakCategory flashes 3× at Godlike magnitude
   d. Subtle ring pulse radiates outward from score panel
   e. Glow decays to normal over cascadeDuration
```

**Reduced Motion Override:** Replace cascade with single opacity 0.6 → 1.0 → 0.8 transition at full duration.

### 4.2 Scroll Submission Animation

**Trigger:** Player submits a scroll for Codex analysis.

**Algorithm:**
```
1. At submit moment:
   - Textarea caret-color transitions: currentColor → gold over 200ms
   - Word chips fade: opacity 1.0 → 0.4 (analysis-pending state)
   - Skeleton shimmer activates on score panel (thematic loading state)

2. On analysis return:
   - Read dominant school from signal
   - Execute school-keyed "reveal" sequence:
     * SONIC: chips flash in from random positions, 20ms stagger
     * PSYCHIC: chips bloom from center outward, 40ms stagger
     * ALCHEMY: chips saturate from 0% upward, left-to-right
     * WILL: chips fade in steadily, uniform timing, no stagger
     * VOID: chips materialize from opacity 0 with no easing (instant snap)
     * ABJURATION: chips breathe in — scale 0.85→1.0, staggered 25ms
     * NECROMANCY: chips rise from below (translateY 8px → 0), 35ms stagger
     * DIVINATION: chips appear in reading order with anticipation easing

3. After reveal (400ms delay):
   - Score trace renders line by line, 80ms per line
   - Stat overlays fire per stat rating (see §3.2)
```

### 4.3 Archetype Threshold Animation

**Trigger:** Archetype evolves due to dominant stat pattern (lore sheet §10).

```
1. Read archetype's dominant stat pair (e.g., VIS + CNWV)
2. Map stat pair to school blend (CNWV → VIS + CODEX + PSYC pathway)
3. Compute evolveColor from blended school weights
4. Execute:
   a. Screen vignette intensifies to 0.85 for 600ms
   b. Archetype panel glows evolveColor at 2× radius
   c. New archetype title fades in with META overlay (vertical ascent)
   d. Archive event ring pulse fires from archetype panel center
   e. Vignette recedes over 800ms
```

### 4.4 Discovery Recognition Animation

**Trigger:** Player uncovers hidden lore or system pattern (lore sheet §11).

```
1. Trigger type determines animation class:
   - hidden lore uncovered:     DIVINATION dual-pulse (gold shimmer)
   - structural pattern found:  ABJURATION breathe with lattice shimmer
   - canon link established:    CODEX depth ring + MYTH scale surge
   - syntax exploit discovered: ALCHEMY sawtooth + chromatic shift

2. All discovery animations use:
   - background aurora briefly intensifies (+0.3 on atmosphereIntensity)
   - JetBrains Mono discovery message renders letter-by-letter, 40ms per char
   - Message has CODEX stat border (depth ring style)
```

---

## 5. PixelBrain Signal Contract

The animation system is a **read-only consumer** of the PixelBrain signal. The following fields from the signal are required:

```typescript
interface PixelBrainAnimationContract {
  // From PixelBrain signal
  dominantSchool: School;
  schoolWeights: Record<School, number>;
  glowIntensity: number;           // 0.0–1.0
  blendedHsl: { h: number; s: number; l: number };
  syllableDepth: number;           // 1–6
  effectClass: 'HARMONIC' | 'RESONANT' | 'INERT';
  rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';

  // From combat/scroll analysis (for overlay + emergent events)
  statScores?: Array<{
    stat: PrimaryStat | SpecialStat;
    rating: 'Neophyte' | 'Adept' | 'Master' | 'Godlike';
  }>;
  burstUnlockStat?: SpecialStat;         // present if burst triggered this submission
  archetypeEvolution?: {
    dominantStats: [Stat, Stat];
    newTitle: string;
  };
  discoveryEvent?: DiscoveryType;
}
```

**Hard Rule:** The animation engine reads from this contract. It never derives school identity from component names, page names, or any source other than the signal. If the signal is absent, all animations fall back to `grim-breathe 1600ms` with `var(--school-primary)` glow.

---

## 6. Algorithm: `computeAnimationSpec(signal)`

This function is the single entry point. All animation decisions flow through it.

```javascript
// src/lib/animation/computeAnimationSpec.js
// OWNERSHIP: Codex (pure function in src/lib/)

export function computeAnimationSpec(signal) {
  const school = SCHOOL_PHYSICS[signal.dominantSchool];
  
  // Base timing from school + glowIntensity
  const duration = lerp(school.durationMin, school.durationMax, signal.glowIntensity);
  const easing = school.easingCurve;
  
  // Glow from blended HSL
  const { h, s, l } = signal.blendedHsl;
  const glowRadius = Math.round(signal.glowIntensity * 20); // 0–20px
  const glowColor = `hsla(${h}, ${s}%, ${Math.min(l + 20, 95)}%, ${signal.glowIntensity * 0.6})`;
  
  // Waveform drives keyframe selection
  const keyframe = WAVEFORM_TO_KEYFRAME[school.waveform];
  
  // Stat overlays (only if statScores present)
  const overlays = (signal.statScores ?? [])
    .filter(s => OVERLAY_THRESHOLD[s.stat](s.rating))
    .map(s => ({
      stat: s.stat,
      ...STAT_OVERLAYS[s.stat],
      magnitude: RATING_SCALE[s.rating],
    }));
  
  // Emergent event spec
  const emergent = signal.burstUnlockStat
    ? buildBurstSpec(signal)
    : signal.archetypeEvolution
    ? buildArchetypeSpec(signal)
    : signal.discoveryEvent
    ? buildDiscoverySpec(signal)
    : null;
  
  return {
    duration,
    easing,
    glowRadius,
    glowColor,
    keyframe,
    color: `hsl(${h}, ${s}%, ${l}%)`,
    border: `1px solid hsla(${h}, ${s}%, ${Math.min(l + 15, 95)}%, ${signal.glowIntensity * 0.55 + 0.2})`,
    overlays,
    emergent,
    cssVars: {
      '--anim-duration': `${duration}ms`,
      '--anim-easing': easing,
      '--anim-glow': `0 0 ${glowRadius}px ${glowColor}`,
      '--anim-color': `hsl(${h}, ${s}%, ${l}%)`,
      '--anim-border': `1px solid hsla(${h}, ${s}%, ${Math.min(l + 15, 95)}%, ${(signal.glowIntensity * 0.55 + 0.2).toFixed(2)})`,
    },
  };
}
```

---

## 7. CSS Architecture

All animation keyframes live in a single file: `src/index.css` (animation section) or a dedicated `src/animations.css`. They are parameterized by CSS custom properties and activated by utility classes.

### 7.1 Base Keyframes

```css
/* Base school keyframes — parameterized */
@keyframes anim-breathe {
  0%, 100% { 
    transform: scale(1.0);
    box-shadow: 0 0 calc(var(--anim-glow-radius, 8px) * 0.5) var(--anim-glow-color, transparent);
  }
  50% { 
    transform: scale(1.015);
    box-shadow: 0 0 var(--anim-glow-radius, 8px) var(--anim-glow-color, transparent);
  }
}

@keyframes anim-pulse {
  0%, 100% { opacity: 0.75; box-shadow: none; }
  50%       { opacity: 1.0; box-shadow: 0 0 var(--anim-glow-radius, 8px) var(--anim-glow-color, transparent); }
}

@keyframes anim-shimmer {
  0%, 100% { filter: hue-rotate(0deg) brightness(1.0); }
  50%       { filter: hue-rotate(20deg) brightness(1.15); }
}

@keyframes anim-void-decay {
  0%   { opacity: 1.0; filter: saturate(1.0); }
  100% { opacity: 0.7; filter: saturate(0.3); }
}

@keyframes anim-sawtooth {
  0%   { transform: scale(1.0); }
  85%  { transform: scale(1.025); }
  90%  { transform: scale(0.98); }
  100% { transform: scale(1.0); }
}

/* Stat overlay keyframes */
@keyframes overlay-synt-lattice {
  0%, 100% { outline: 1px solid transparent; }
  40%, 60% { outline: 1px solid hsla(var(--anim-h, 0), 70%, 70%, 0.4); }
}

@keyframes overlay-meta-ascent {
  0%   { transform: translateY(0); }
  50%  { transform: translateY(-3px); }
  100% { transform: translateY(0); }
}

@keyframes overlay-myth-surge {
  0%, 100% { transform: scale(1.0); }
  40%       { transform: scale(1.03); }
}

@keyframes overlay-vis-saturate {
  0%, 100% { filter: saturate(1.0); }
  50%       { filter: saturate(1.2); }
}

@keyframes overlay-psyc-fracture {
  0%, 100% { opacity: 1.0; }
  25%       { opacity: 0.6; }
  75%       { opacity: 0.85; }
}

@keyframes overlay-codex-ring {
  0%   { box-shadow: 0 0 0 0 var(--anim-glow-color, transparent); }
  50%  { box-shadow: 0 0 0 6px transparent; }
  100% { box-shadow: 0 0 0 0 transparent; }
}

/* Burst unlock cascade */
@keyframes burst-cascade-chip {
  from { opacity: 0.3; transform: scale(0.9); }
  to   { opacity: 1.0; transform: scale(1.0); }
}

@keyframes burst-glow-expand {
  0%   { box-shadow: 0 0 var(--anim-glow-radius, 8px) var(--anim-glow-color, transparent); }
  50%  { box-shadow: 0 0 calc(var(--anim-glow-radius, 8px) * 2) var(--anim-glow-color, transparent); }
  100% { box-shadow: 0 0 var(--anim-glow-radius, 8px) var(--anim-glow-color, transparent); }
}
```

### 7.2 Reduced Motion Override

```css
@media (prefers-reduced-motion: no-preference) {
  .anim-breathe  { animation: anim-breathe  var(--anim-duration, 1600ms) var(--anim-easing, ease-in-out) infinite; }
  .anim-pulse    { animation: anim-pulse    var(--anim-duration, 2400ms) ease-in-out infinite; }
  .anim-shimmer  { animation: anim-shimmer  var(--anim-duration, 800ms)  ease-in-out infinite; }
  .anim-sawtooth { animation: anim-sawtooth var(--anim-duration, 600ms)  ease-in-out infinite; }
  .anim-void     { animation: anim-void-decay var(--anim-duration, 2000ms) ease-out forwards; }

  .overlay-synt  { animation: overlay-synt-lattice var(--overlay-duration, 400ms) ease-in-out 1; }
  .overlay-meta  { animation: overlay-meta-ascent  var(--overlay-duration, 500ms) ease-in-out 1; }
  .overlay-myth  { animation: overlay-myth-surge   var(--overlay-duration, 600ms) ease-in-out 1; }
  .overlay-vis   { animation: overlay-vis-saturate var(--overlay-duration, 350ms) ease-in-out 1; }
  .overlay-psyc  { animation: overlay-psyc-fracture var(--overlay-duration, 450ms) ease-in-out 1; }
  .overlay-codex { animation: overlay-codex-ring   var(--overlay-duration, 700ms) ease-out 1; }

  .burst-active .word-chip {
    animation: burst-cascade-chip 200ms ease-out 1 forwards;
  }
  .burst-active .score-panel {
    animation: burst-glow-expand var(--anim-duration, 800ms) ease-in-out 1;
  }
}
```

---

## 8. React Integration

### 8.1 `useAnimationSpec` hook

```jsx
// src/hooks/useAnimationSpec.js — Claude owns this file

import { useMemo } from 'react';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

export function useAnimationSpec(pixelBrainSignal) {
  const reducedMotion = usePrefersReducedMotion();

  return useMemo(() => {
    if (!pixelBrainSignal) return null;

    // computeAnimationSpec lives in src/lib/ — Codex owns that function
    // This hook is Claude's consumption point only
    return {
      cssVars: pixelBrainSignal.animationSpec?.cssVars ?? {},
      animClass: reducedMotion ? null : pixelBrainSignal.animationSpec?.keyframe,
      overlays: reducedMotion ? [] : (pixelBrainSignal.animationSpec?.overlays ?? []),
      emergent: reducedMotion ? null : pixelBrainSignal.animationSpec?.emergent,
    };
  }, [pixelBrainSignal, reducedMotion]);
}
```

### 8.2 `AnimatedSurface` wrapper component

```jsx
// src/components/AnimatedSurface.jsx

import { useAnimationSpec } from '../hooks/useAnimationSpec';

/**
 * Wraps any child content with PixelBrain-derived animation physics.
 * Does not render any visual surface itself — pure animation wrapper.
 */
export function AnimatedSurface({ signal, className, children, ...props }) {
  const spec = useAnimationSpec(signal);

  if (!spec) return <div className={className} {...props}>{children}</div>;

  const combinedClass = [
    className,
    spec.animClass,
    ...(spec.overlays.map(o => `overlay-${o.stat.toLowerCase()}`)),
    spec.emergent?.type === 'burst' ? 'burst-active' : null,
  ].filter(Boolean).join(' ');

  return (
    <div
      className={combinedClass}
      style={spec.cssVars}
      aria-live={spec.emergent ? 'polite' : undefined}
      {...props}
    >
      {children}
    </div>
  );
}
```

---

## 9. Lore Consistency Guarantees

These rules enforce that no animation can violate the lore sheet's principles.

### 9.1 No Animation Without Signal
If no PixelBrain signal exists for a component, it renders in a static, unstyled state. It does not inherit animations from neighboring components or page-level school context.

### 9.2 Stat Overlays Are Earned
Overlays only fire at or above their threshold rating (§3.2). A Neophyte PSYC line does not fracture. The Codex does not flatter.

### 9.3 Burst Is Sacred
The Burst Unlock animation is the most dramatic visual event in the system (short of archetype evolution). It must feel proportional to its rarity. It may not be reused for decorative purposes.

### 9.4 VOID Coldness Is Inviolable
VOID-school animations never use bloom or warm saturation. Any component whose signal resolves to VOID school must desaturate, not glow. This is a hard constraint.

### 9.5 Discovery Is Distinct
Discovery animations use a distinct visual language (dual-pulse, aurora intensification) that cannot be mistaken for combat feedback. Players must be able to distinguish "you scored well" from "you discovered something" at a glance.

---

## 10. Implementation Phases

### Phase 1 — Core Algorithm + CSS (Codex + Claude)
- [ ] `computeAnimationSpec(signal)` in `src/lib/animation/` (Codex)
- [ ] SCHOOL_PHYSICS constants with all 8 schools (Codex)
- [ ] All base keyframes in CSS (Claude)
- [ ] `useAnimationSpec` hook (Claude)
- [ ] `AnimatedSurface` component (Claude)

### Phase 2 — Stat Overlays (Claude)
- [ ] All 11 overlay keyframes from §3.2
- [ ] Stagger utilities for burst cascade
- [ ] Magnitude scaling via CSS custom property injection

### Phase 3 — Emergent Events (Claude + Codex)
- [ ] Burst Unlock sequence with chip cascade
- [ ] Scroll submission school-keyed reveal sequence
- [ ] Discovery animation set (4 types)

### Phase 4 — Archetype Evolution (Claude)
- [ ] Archetype threshold animation sequence
- [ ] Aurora intensity integration via `useAtmosphere`
- [ ] Archive event ring pulse component

### Phase 5 — Regression Baselines (Minimax)
- [ ] Visual baselines for all 8 school base animations
- [ ] Burst Unlock sequence baseline
- [ ] Reduced motion baseline (all animations disabled)
- [ ] Scroll submission reveal for each school

---

## 11. Files Affected

| File | Owner | Action |
|------|-------|--------|
| `src/lib/animation/computeAnimationSpec.js` | Codex | CREATE — pure function |
| `src/lib/animation/schoolPhysics.js` | Codex | CREATE — school constants |
| `src/hooks/useAnimationSpec.js` | Claude | CREATE |
| `src/components/AnimatedSurface.jsx` | Claude | CREATE |
| `src/index.css` | Claude | EXTEND — keyframes section |
| `tests/visual/animation-*.snap` | Minimax | CREATE — baselines |

**Hard Stop:** `codex/` and `src/lib/` logic is Codex's territory. Claude only writes hooks and components. The `computeAnimationSpec` function lives in `src/lib/` — Claude calls it through the hook contract, never imports it directly from components.

---

## 12. QA Checklist

- [ ] All 8 schools produce distinct animation physics
- [ ] Burst Unlock animation is visually distinct from idle animations
- [ ] VOID-school components never use warm bloom
- [ ] All animations disabled under `prefers-reduced-motion`
- [ ] Stat overlays only fire at or above their rating threshold
- [ ] Discovery animations are visually distinct from combat feedback
- [ ] No animation parameter is hardcoded — all read from signal
- [ ] `AnimatedSurface` has ARIA `aria-live="polite"` on emergent events
- [ ] Archetype evolution animation uses `useAtmosphere` for aurora intensity
- [ ] Reduced motion baseline passes visual regression

---

## 13. Open Questions (for Gemini resolution)

1. Should Burst Unlock animation intensity scale with rarity of the scroll, or is the burst event always at maximum magnitude?
2. Are there stat combinations that should produce compound overlays (e.g., a line scoring Godlike MYTH + Godlike META fires both myth-surge and meta-ascent simultaneously)?
3. Should the archetype evolution animation be interruptible (player can dismiss) or mandatory hold?
4. For CNWV (Cinematic Weave) burst: the lore defines it as "imagery in motion, woven into narrative progression" — does the cascade direction (L→R) correctly express this, or should it follow reading-flow line by line?
5. Does Discovery recognition fire from the server-side analysis event bus, or is it client-detectable from stat patterns alone?

---

*GrimDesign Signal: ABJURATION/HARMONIC/hsl(146,83%,56%)/RARE — the phonemic physics of "algorithms, procedurally generated, emergent, logically consistent" resolve to a ward that breathes, a structured system made visible. The animations it describes must breathe the same way.*
