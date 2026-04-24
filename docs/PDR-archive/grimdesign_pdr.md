# PDR: GrimDesign — World-Law UI Generation Engine

**Subtitle:** The aesthetic is computed, not chosen. Components design themselves from the same phonemic physics that govern spells.

**Status:** Draft
**Classification:** UI + Tooling + PixelBrain + VerseIR + Developer Experience
**Priority:** High
**Primary Goal:** Build a design generation system that derives visual decisions (color, glow, animation timing, border weight, atmosphere intensity) directly from CODEx phonemic analysis of a natural-language design intent description — producing world-law-grounded UI component specs and code automatically.

**Owner (Phases 1–2):** Codex — analysis API surface and signal extraction module
**Owner (Phases 3–5):** Claude — decision engine, output format, Claude Code skill
**Reviewer:** Gemini — world-law validation, mechanic consistency

---

## 1. Executive Summary

SuperDesign generates UI from aesthetic preference. GrimDesign generates UI from **analysis**. Feed it a sentence describing what you want to build. It runs that sentence through the CODEx pipeline, extracts PixelBrain signals and VerseIR amplifier output, and maps those signals to deterministic visual decisions using the same laws that govern spell scoring.

The color is not chosen — it is computed from `computeBlendedHsl(schoolWeights)`.
The glow intensity is not estimated — it is read from `glowIntensity` in the visual bytecode.
The animation speed is not guessed — it is derived from `effectClass` on the dominant token.

The result: a component that is internally consistent with the game world by construction. A VOID-school status panel will always be zinc-cold and slow. A SONIC combat reveal will always be purple and fast. Not because someone picked those properties — because the phonemic physics of the words "VOID status" and "SONIC combat reveal" produce those measurements through the same math that runs the game.

---

## 2. Problem Statement

**Current design process:**
```
Developer describes what they need
        ↓
Manually picks colors from school palette (may not match phonemic character)
        ↓
Manually decides glow / no glow, animation speed, border weight
        ↓
Manually writes UI SPEC block
        ↓
Manually writes JSX + CSS
```

**What's wrong:**
- Visual decisions are made by intuition, not by physics
- A component about VOID magic might accidentally be warm-toned if the developer doesn't cross-reference the school palette manually
- No guaranteed consistency between the word used to describe a component and its visual character
- The design system exists (CSS tokens, school palettes, pcaChroma) but nothing routes through it automatically — every component is a manual translation from intent to output

**The untapped infrastructure:**
The entire signal extraction pipeline already exists and produces exactly the data needed for design decisions:

| Existing signal | Currently used for | GrimDesign uses for |
|---|---|---|
| `schoolWeights` | Truesight word coloring | Component palette anchor |
| `computeBlendedHsl` | Adaptive palette PDR | Base HSL for all color decisions |
| `effectClass` | Word glow in overlay | Animation class, border treatment |
| `glowIntensity` | Truesight glow rendering | Box-shadow radius, aurora presence |
| `syllableDepth` | Word visual richness | Component layer count, detail density |
| `vowelFamilyDistribution` | School affinity scoring | Accent color granularity |
| `rarity` | Word card display | Component visual weight |

All of this is computed and then discarded after rendering the scroll editor. GrimDesign routes it to a new output: component specification.

---

## 3. Product Goal

1. **Feed a sentence → receive a world-law-grounded component** — full UI SPEC, JSX skeleton, CSS delta, and animation spec, all computed from phonemic analysis
2. **Decisions are traceable** — every visual choice has a signal source (e.g., "border-color derived from VOID schoolWeight 0.68 via computeBlendedHsl")
3. **Internally consistent by construction** — two components with similar phonemic character will naturally look related, even if designed weeks apart
4. **Available as a Claude Code skill** (`/grimdesign`) and as a live design panel within the IDE itself
5. **Codex-owned analysis, Claude-owned output** — clean separation; Codex computes signals, Claude interprets them into components

---

## 4. Non-Goals

- Not replacing the developer's judgement — GrimDesign produces a starting point, not a final answer
- Not generating pixel-perfect mockups or visual previews — output is code + spec, not images
- Not supporting external design tools (Figma export, etc.)
- Not changing any existing component's visual treatment — retroactive
- Not running the full CODEx runtime in the browser for the skill (use the local dev server API)

---

## 5. Core Design Principles

| Principle | Rationale |
|-----------|-----------|
| **Physics, not preference** | Every visual decision has a signal source. If you can't name the PixelBrain/VerseIR output that produced it, the decision doesn't belong |
| **Same pipeline, new output** | GrimDesign is not a new system — it's a new consumer of the existing analysis pipeline |
| **Traceable decisions** | The spec output includes signal → decision provenance for every choice |
| **Graceful degradation** | If analysis produces weak signals (neutral text), output a well-reasoned default using `DEFAULT_SCHOOL_HSL` |
| **World-law first** | The CLAUDE.md UI SPEC format is the output contract — GrimDesign automates filling it in |

---

## 6. Feature Overview

### 6.1 Signal Extraction

A design intent string (e.g., `"cooldown indicator for a VOID-school agent"`) is passed through `analyzeText()`. The output produces:

```js
{
  schoolWeights: { VOID: 0.68, WILL: 0.32 },
  dominantSchool: 'VOID',
  vowelFamilyDistribution: { UW: 5, AH: 3, IH: 2 },
  words: [
    { token: 'cooldown', effectClass: 'RESONANT', glowIntensity: 0.42, syllableDepth: 2, rarity: 'COMMON' },
    { token: 'indicator', effectClass: 'INERT', glowIntensity: 0.0, syllableDepth: 4, rarity: 'COMMON' },
    { token: 'VOID', effectClass: 'HARMONIC', glowIntensity: 0.71, syllableDepth: 1, rarity: 'RARE' },
    { token: 'agent', effectClass: 'INERT', glowIntensity: 0.0, syllableDepth: 2, rarity: 'COMMON' },
  ]
}
```

The **dominant signal** is extracted as the highest-weight word that is not INERT. Here: `VOID` with `effectClass: HARMONIC`, `glowIntensity: 0.71`.

### 6.2 Signal → Decision Mapping

A deterministic mapping table converts extracted signals to design decisions:

#### effectClass → Visual Treatment

| effectClass | Border | Glow | Animation | Atmosphere |
|---|---|---|---|---|
| `INERT` | `1px solid rgba(school, 0.15)` | None | None (static) | None |
| `RESONANT` | `1px solid rgba(school, 0.35)` | `0 0 8px var(--school-glow, 0.3)` | Soft pulse 2400ms | Faint aurora |
| `HARMONIC` | `1px solid rgba(school, 0.55)` | `0 0 16px var(--school-glow, 0.5)` | Breathe 1600ms | Aurora present |
| `TRANSCENDENT` | `1px solid rgba(school, 0.85)` | `0 0 28px var(--school-glow, 0.8)` | Shimmer 800ms | Full aurora + scanlines |

#### dominantSchool → Color Character

| School | Hue range | Saturation | Lightness | Transition speed | Typography weight |
|---|---|---|---|---|---|
| `SONIC` | 255–280° | High (45–60%) | 50–55% | Fast (180–240ms) | Bold |
| `PSYCHIC` | 185–210° | High (55–70%) | 48–54% | Medium (280ms) | Regular |
| `ALCHEMY` | 290–320° | High (55–65%) | 45–52% | Medium (300ms) | Regular |
| `WILL` | 20–40° | Medium (35–50%) | 50–58% | Medium-slow (360ms) | Regular |
| `VOID` | 230–250° | Low (10–25%) | 32–42% | Slow (480–600ms) | Light |
| Mixed/Default | Computed via `computeBlendedHsl` | Blended | Blended | Weighted average | Regular |

#### glowIntensity → Box Shadow Radius

```
glowIntensity 0.0       → no shadow
glowIntensity 0.0–0.3   → box-shadow: 0 0 4px  (subtle)
glowIntensity 0.3–0.6   → box-shadow: 0 0 12px (present)
glowIntensity 0.6–0.8   → box-shadow: 0 0 20px (strong)
glowIntensity 0.8–1.0   → box-shadow: 0 0 32px (beacon)
```

#### syllableDepth → Component Complexity

```
syllableDepth 1         → Minimal: single surface, no sub-layers
syllableDepth 2         → Standard: header + body
syllableDepth 3         → Rich: header + body + footer/meta row
syllableDepth 4+        → Dense: full card with multiple sections
```

#### rarity → Visual Weight

| rarity | Font size scale | Padding | Ornament |
|---|---|---|---|
| `COMMON` | `0.78rem` | Tight (0.4rem) | None |
| `RARE` | `0.85rem` | Standard (0.6rem) | `::before` accent line |
| `INEXPLICABLE` | `0.95rem` | Generous (0.8rem) | Corner ornaments |

### 6.3 Output: GrimDesign Spec

The decision engine produces a structured spec in the CLAUDE.md UI SPEC format, with an additional `SIGNAL PROVENANCE` block that traces every decision to its source:

```
## [ComponentName] — GrimDesign Output

CLASSIFICATION: new component
WHY: [world-law reason derived from intent analysis]
WORLD-LAW CONNECTION: [explicit link to phonemic signal]

SIGNAL PROVENANCE:
  dominantSchool:  VOID (weight: 0.68)
  effectClass:     HARMONIC (from token "VOID", glowIntensity: 0.71)
  blendedHsl:      { h: 238, s: 19, l: 36 }  — via computeBlendedHsl
  syllableDepth:   2 (from "cooldown")
  rarity:          RARE (from "VOID")
  transitionSpeed: 480ms (VOID school character)

DESIGN DECISIONS:
  color:        hsl(238, 19%, 36%)
  glow:         0 0 16px hsla(238, 19%, 56%, 0.5)
  border:       1px solid hsla(238, 19%, 56%, 0.55)
  animation:    breathe 1600ms ease-in-out infinite
  atmosphere:   aurora present, scanlines off

CODE: [JSX skeleton]
CSS DELTA: [generated classes]
HANDOFF TO BLACKBOX: [visual regression baselines]
QA CHECKLIST: [standard CLAUDE.md checklist]
```

### 6.4 Claude Code Skill — `/grimdesign`

Invoked as:
```
/grimdesign "cooldown indicator for a VOID-school agent on the collab console"
```

The skill:
1. Sends the intent string to the local dev server at `POST /api/grimdesign/analyze`
2. Receives the signal extraction result
3. Applies the decision mapping
4. Outputs the full GrimDesign spec in the conversation

If the dev server is not running, the skill falls back to a heuristic analysis based on school keywords in the intent string (VOID, SONIC, etc.) to produce an approximate spec.

### 6.5 In-IDE Design Panel (Phase 5)

A collapsible panel in the Read IDE sidebar (tab: `DESIGN`) where:
- You type a design intent description
- The panel calls `POST /api/grimdesign/analyze` on each debounced input
- The blended HSL preview renders in real-time (a color swatch)
- The effectClass tier and suggested animation are shown
- The full spec is available to copy

This is the same pattern as the Oracle panel — a living analysis surface.

---

## 7. Architecture

```
/grimdesign "cooldown indicator for VOID-school agent"
        │
        ▼
POST /api/grimdesign/analyze
        │
        ▼
codex/core/grimdesign/intentAnalyzer.js
  analyzeText(intentString)
        │
        ▼
AnalyzedDocument
  { schoolWeights, dominantSchool, vowelFamilyDistribution, words[] }
        │
        ├──→ computeBlendedHsl(schoolWeights)  → blendedHsl
        │
        ▼
codex/core/grimdesign/signalExtractor.js
  extractDominantSignal(analyzedDoc)
        │
        ▼
GrimSignal {
  dominantSchool, effectClass, glowIntensity,
  blendedHsl, syllableDepth, rarity,
  schoolWeights, vowelFamilyDistribution
}
        │
        ▼
codex/core/grimdesign/decisionEngine.js
  resolveDesignDecisions(grimSignal)
        │
        ▼
GrimDesignDecisions {
  color, glowRadius, borderAlpha, transitionMs,
  atmosphereLevel, componentComplexity, fontScale,
  animationClass, cssVars, worldLawReason, provenance
}
        │
        ▼
Claude (skill / IDE panel)
  formatGrimSpec(intent, decisions) → UI SPEC block + JSX + CSS delta
```

---

## 8. Module Breakdown

### 8.1 `codex/core/grimdesign/intentAnalyzer.js` (Codex)

Thin wrapper around the existing analysis pipeline. Accepts a natural-language string, runs it through `analyzeText`, attaches `schoolWeights` and `vowelFamilyDistribution` from the Phase 1 adaptive palette PDR schema extension.

```js
/**
 * Analyzes a design intent string through the CODEx pipeline.
 * Returns the signal set needed by the GrimDesign decision engine.
 *
 * @param {string} intentString - e.g. "cooldown indicator for VOID-school agent"
 * @returns {Promise<GrimSignal>}
 */
export async function analyzeDesignIntent(intentString) { ... }
```

**Dependencies:** `codex/core/analysis.pipeline.js`, `codex/core/grimdesign/signalExtractor.js`

---

### 8.2 `codex/core/grimdesign/signalExtractor.js` (Codex)

Extracts the dominant design signal from an analyzed document. Selects the highest-weight non-INERT token, reads its `effectClass`, `glowIntensity`, `syllableDepth`, and `rarity`. Calls `computeBlendedHsl` to get the palette anchor.

```js
/**
 * @param {AnalyzedDocument} analyzedDoc
 * @returns {GrimSignal}
 */
export function extractDominantSignal(analyzedDoc) { ... }

/**
 * GrimSignal schema:
 * {
 *   dominantSchool: string,
 *   effectClass: 'INERT' | 'RESONANT' | 'HARMONIC' | 'TRANSCENDENT',
 *   glowIntensity: number,          // 0.0–1.0
 *   blendedHsl: { h, s, l },
 *   syllableDepth: number,
 *   rarity: 'COMMON' | 'RARE' | 'INEXPLICABLE',
 *   schoolWeights: Record<string, number>,
 *   vowelFamilyDistribution: Record<string, number>,
 *   provenance: string[]            // human-readable decision trace
 * }
 */
```

**Dependencies:** `src/lib/truesight/color/pcaChroma.js` (`computeBlendedHsl`), `codex/core/constants/schools.js`

---

### 8.3 `codex/core/grimdesign/decisionEngine.js` (Codex)

Pure function. Maps a `GrimSignal` to a `GrimDesignDecisions` object using the mapping tables from Section 6.2. No side effects. Fully testable.

```js
/**
 * @param {GrimSignal} signal
 * @returns {GrimDesignDecisions}
 */
export function resolveDesignDecisions(signal) { ... }

/**
 * GrimDesignDecisions schema:
 * {
 *   // Color
 *   color: string,                  // hsl(h, s%, l%)
 *   colorMuted: string,             // hsl(h, s%, l%) at 55% lightness
 *   glowColor: string,              // hsla(..., 0.5)
 *
 *   // Geometry
 *   borderAlpha: number,            // 0.15 – 0.85
 *   glowRadius: number,             // px — 0, 4, 12, 20, 32
 *   paddingScale: 'tight' | 'standard' | 'generous',
 *   componentComplexity: 1 | 2 | 3 | 4,
 *
 *   // Motion
 *   transitionMs: number,           // 180 – 600
 *   animationClass: string | null,  // CSS class name or null
 *   animationDurationMs: number,    // 0 | 800 | 1600 | 2400
 *
 *   // Atmosphere
 *   atmosphereLevel: 'none' | 'faint' | 'present' | 'full',
 *   scanlines: boolean,
 *
 *   // Typography
 *   fontSizeRem: number,            // 0.78 – 0.95
 *   fontWeight: 300 | 400 | 700,
 *
 *   // CSS custom props
 *   cssVars: Record<string, string>, // ready to inject
 *
 *   // Provenance
 *   worldLawReason: string,         // one sentence
 *   provenance: string[],           // signal → decision trace
 * }
 */
```

**No external dependencies beyond the signal.**

---

### 8.4 `codex/server/routes/grimdesign.routes.js` (Codex)

Single POST endpoint registered in `codex/server/index.js`:

```js
POST /api/grimdesign/analyze
Body: { intent: string }
Response: { signal: GrimSignal, decisions: GrimDesignDecisions }
```

Rate-limited to 30 req/min (design tool, not game hot path). Auth optional (dev tool — can be unauthed in dev, authed in prod).

---

### 8.5 Claude Code Skill — `grimdesign` (Claude)

**File:** `.claude/skills/grimdesign.md`

The skill receives the intent string as args, calls the API, and formats the full GrimDesign spec output. It also handles the fallback heuristic path when the server is not running.

Fallback heuristic: scan the intent string for school keywords (`VOID`, `SONIC`, `PSYCHIC`, `ALCHEMY`, `WILL`) and use SCHOOLS data to approximate `blendedHsl`. Produce a lower-confidence spec marked `[HEURISTIC — server not running]`.

---

### 8.6 `src/hooks/useGrimDesign.js` (Claude)

React hook for the in-IDE design panel. Debounces the intent string (400ms), calls the API, returns `{ signal, decisions, isLoading, error }`.

```js
/**
 * @param {string} intentString
 * @returns {{ signal: GrimSignal, decisions: GrimDesignDecisions, isLoading: boolean, error: string|null }}
 */
export function useGrimDesign(intentString) { ... }
```

---

### 8.7 `src/pages/Read/GrimDesignPanel.jsx` + CSS (Claude)

The in-IDE design panel. Lives in the sidebar under a `DESIGN` tab (or collapsible within the existing `TOOLS` tab). Minimal UI — it's a tool for developers, not players.

Displays:
- Intent input (textarea)
- Live color swatch showing `blendedHsl`
- effectClass badge (`INERT` / `RESONANT` / `HARMONIC` / `TRANSCENDENT`)
- Signal provenance list
- Copy-to-clipboard for the full spec output

Does not render JSX or CSS directly — that remains Claude's job in conversation. The panel gives the developer the signals so they can describe what they're building to Claude with precision.

---

## 9. Bytecode Integration

GrimDesign decisions are annotated with `PB-ERR-v1` errors when signals are ambiguous or when the analysis produces weak/empty school weights:

```js
// Emitted when schoolWeights is empty or all weights < 0.1
BytecodeError(
  ERROR_CATEGORIES.LINGUISTIC,
  ERROR_SEVERITY.WARN,
  MODULE_IDS.SHARED,
  ERROR_CODES.LING_EMPTY_PHONEME_SET,
  {
    reason: 'GrimDesign intent produced no usable school signal — falling back to DEFAULT_SCHOOL_HSL',
    intent: intentString,
    schoolWeights: {}
  }
)
```

This means: if you feed GrimDesign a purely structural description with no phonemic content (`"a div with a button"`), it tells you exactly why the output is a fallback instead of silently producing a generic result.

---

## 10. Implementation Phases

### Phase 1 — Codex: Analysis modules (Codex)
- `codex/core/grimdesign/intentAnalyzer.js`
- `codex/core/grimdesign/signalExtractor.js`
- `codex/core/grimdesign/decisionEngine.js`
- Unit tests: known intents → expected effectClass, blendedHsl, decisions
- **Gate:** `analyzeDesignIntent("VOID school agent status")` returns `{ dominantSchool: 'VOID', effectClass: 'HARMONIC', blendedHsl: { h: 238..244, s: 10..25, l: 32..42 } }`

### Phase 2 — Codex: API route (Codex)
- `codex/server/routes/grimdesign.routes.js`
- Register at `POST /api/grimdesign/analyze`
- Rate limit, optional auth
- **Gate:** `curl -X POST /api/grimdesign/analyze -d '{"intent":"SONIC combat reveal"}'` returns valid decisions JSON

### Phase 3 — Claude: Skill (Claude)
- `.claude/skills/grimdesign.md`
- Full spec output format with provenance block
- Fallback heuristic path
- **Gate:** `/grimdesign "VOID cooldown indicator"` produces a complete UI SPEC block with correct VOID visual properties

### Phase 4 — Claude: Hook + Panel (Claude)
- `src/hooks/useGrimDesign.js`
- `src/pages/Read/GrimDesignPanel.jsx`
- CSS for the panel (grimoire-minimal, developer tool aesthetic)
- Wire into sidebar TOOLS tab as collapsible section
- **Gate:** Typing in the panel produces a live color swatch update within 400ms

### Phase 5 — QA (Minimax)
- Signal extraction tests: SONIC, VOID, WILL, PSYCHIC, ALCHEMY, mixed inputs
- Decision engine: `effectClass: HARMONIC` → `glowRadius: 16`, `atmosphereLevel: 'present'`
- Edge cases: empty intent, single word, all stop words, no school keywords
- Regression: existing components unaffected (GrimDesign is additive)

---

## 11. QA Requirements

| Test | Pass Criteria |
|------|--------------|
| VOID intent → zinc palette | `blendedHsl.s < 25`, `transitionMs >= 400` |
| SONIC intent → purple palette | `blendedHsl.h` in 255–280, `transitionMs <= 240` |
| TRANSCENDENT effectClass → full atmosphere | `atmosphereLevel === 'full'`, `scanlines === true` |
| INERT intent → no glow | `glowRadius === 0`, `animationClass === null` |
| Empty weights → fallback + bytecode error | `dominantSchool === 'DEFAULT'`, error logged |
| Mixed SONIC/WILL → blended hue | Hue between 265 (SONIC) and 30 (WILL) |
| `/grimdesign` skill produces valid UI SPEC | All CLAUDE.md SPEC fields present in output |
| Panel color swatch updates on debounce | Color changes within 500ms of intent change |

---

## 12. Success Criteria

1. **`/grimdesign "VOID cooldown indicator"` produces a VOID-correct spec** — zinc palette, slow transitions, HARMONIC glow — without the developer specifying any of those properties
2. **Every decision is traceable** — the provenance block names the signal source for every visual choice
3. **Two intents with similar school character produce visually related components** — SONIC combat + SONIC score panel share hue family without coordination
4. **Ambiguous intent fails loudly via bytecode** — not silently with a generic output
5. **The panel is usable during active development** — sub-500ms response, no full-page interaction

---

## 13. Example Outputs

### Input: `"combat result reveal for a SONIC-heavy scroll"`
```
SIGNAL PROVENANCE:
  dominantSchool:  SONIC (weight: 0.71)
  effectClass:     TRANSCENDENT (from "combat", glowIntensity: 0.88)
  blendedHsl:      { h: 267, s: 51, l: 52 }
  syllableDepth:   3 ("combat" + "result" + "reveal")
  transitionSpeed: 200ms (SONIC)

DESIGN DECISIONS:
  color:           hsl(267, 51%, 52%)         — SONIC purple
  glow:            0 0 28px hsla(267, 51%, 72%, 0.8)
  border:          1px solid hsla(267, 51%, 72%, 0.85)
  animation:       shimmer 800ms ease-in-out
  atmosphere:      aurora full + scanlines
  complexity:      3 (header + score body + detail row)
```

### Input: `"ambient background indicator, neutral"`
```
SIGNAL PROVENANCE:
  dominantSchool:  DEFAULT (no school signal detected)
  effectClass:     INERT
  blendedHsl:      DEFAULT_SCHOOL_HSL { h: 220, s: 14, l: 40 }
  [WARN] PB-ERR-v1-LING-WARN-SHARED-... intent produced no school signal

DESIGN DECISIONS:
  color:           hsl(220, 14%, 40%)          — neutral slate
  glow:            none
  border:          1px solid rgba(220, 14%, 60%, 0.15)
  animation:       none
  atmosphere:      none
  complexity:      1 (single surface)
```

---

## 14. World-Law Connection

GrimDesign is not a developer convenience. It is the logical conclusion of the world's first law: *nothing is assigned, everything is discovered.*

The school system, the phoneme weights, the Source cost — all of these emerge from the text. The UI of the game should emerge from text too. A component that describes VOID magic in its name should look like VOID magic without the developer having to know that VOID is zinc-cold and slow. The language already knows. The pipeline reads it.

When GrimDesign is complete, there is no arbitrary aesthetic in Scholomance. Every visual property is a measurement of the world.

---

*PDR Author: claude-ui*
*Date: 2026-04-05*
*Classification: UI + Tooling + PixelBrain + VerseIR + Developer Experience*
*Owner: Phase 1–2 → Codex, Phase 3–4 → Claude, Phase 5 → Minimax*
*Reviewer: Gemini (world-law validation)*
