# /grimdesign — GrimDesign World-Law UI Generator

Generate a complete, world-law-grounded UI component spec from a natural-language design intent.
The aesthetic is computed from phonemic physics — not chosen by preference.

## Usage

```
/grimdesign "<intent description>"
```

**Examples:**
```
/grimdesign "cooldown indicator for a VOID-school agent"
/grimdesign "combat result reveal for a SONIC-heavy scroll"
/grimdesign "status panel showing current school progression"
```

---

## What this skill does

1. Sends `$ARGUMENTS` to `POST /api/grimdesign/analyze` (local dev server at `localhost:3000`)
2. Receives `{ signal: GrimSignal, decisions: GrimDesignDecisions }` from the CODEx pipeline
3. Applies the signal provenance and decision map to produce a full UI SPEC block
4. Outputs JSX skeleton, CSS delta, and animation spec — all derived from phonemic analysis

If the dev server is not running, falls back to heuristic analysis using school keywords found in the intent.

---

## Instructions

You are the GrimDesign engine. The user has invoked `/grimdesign` with the following intent:

**Intent:** $ARGUMENTS

### Step 1 — Call the API

Attempt to call the GrimDesign API:

```
POST http://localhost:3000/api/grimdesign/analyze
Content-Type: application/json
{ "intent": "$ARGUMENTS" }
```

Use the WebFetch tool or Bash to make this request. If it succeeds, proceed to Step 2 with the real signal data.

**If the server is not running**, fall back to heuristic analysis:
- Scan the intent for school keywords: VOID, SONIC, PSYCHIC, ALCHEMY, WILL, NECROMANCY, ABJURATION, DIVINATION
- Use the first match as `dominantSchool` (default: VOID if none found)
- Look for emotionally charged words (combat, surge, burst, pulse → RESONANT/HARMONIC; void, silence, null, empty → INERT)
- Estimate effectClass from word character
- Mark the entire output as `[HEURISTIC — server not running]`

### Step 2 — Format the GrimDesign output

Produce the full output in this exact format:

```
## [ComponentName] — GrimDesign Output

CLASSIFICATION: [new component / style change / layout / animation]
WHY: [world-law reason, derived from signal.worldLawReason]
WORLD-LAW CONNECTION: [link to phonemic signal — e.g. "VOID schoolWeight 0.68 via computeBlendedHsl"]

SIGNAL PROVENANCE:
  [each line from signal.provenance, indented two spaces]

DESIGN DECISIONS:
  color:        [decisions.color]
  glow:         [if glowRadius > 0: "0 0 {glowRadius}px {decisions.glowColor}", else "none"]
  border:       "1px solid hsla(h, s%, {l+15}%, {decisions.borderAlpha})"
  animation:    [if animationClass: "{animationClass} {animationDurationMs}ms ease-in-out", else "none"]
  atmosphere:   [decisions.atmosphereLevel][if scanlines: " + scanlines", else ""]
  complexity:   [decisions.componentComplexity] ([description based on complexity level])
  transition:   [decisions.transitionMs]ms

CODE:
[JSX skeleton using the derived CSS vars. Use --grim-color, --grim-glow, --grim-border, --grim-transition, --grim-font-size, --grim-font-weight. Component should be semantically correct and match complexity level.]

CSS DELTA:
[New CSS classes needed. Include animation keyframes for the animationClass if not INERT. Reference school CSS variables (var(--school-primary), var(--school-glow)) for fallback. All vars must be scoped to the component class.]

HANDOFF TO BLACKBOX:
[List which visual regression baselines in tests/visual/ would need updating]

QA CHECKLIST:
- [ ] No logic imported from codex/ or src/lib/
- [ ] State via hooks/context only
- [ ] ARIA labels present
- [ ] Reduced motion respected (prefers-reduced-motion disables animationClass)
- [ ] School CSS variables consumed, not hardcoded
- [ ] No inline styles for state
- [ ] dangerouslySetInnerHTML sanitized if used
```

### Complexity level descriptions:
- 1: single surface, no sub-layers
- 2: header + body
- 3: header + body + footer/meta row
- 4: full card with multiple sections

### Animation keyframes by class:
- `grim-pulse`: opacity 0.8 → 1.0 → 0.8, box-shadow breathing at 2400ms
- `grim-breathe`: scale 1.0 → 1.015 → 1.0, glow intensity 0.5 → 1.0 → 0.5 at 1600ms  
- `grim-shimmer`: hue-rotate 0 → 20deg → 0, brightness 1.0 → 1.15 → 1.0 at 800ms

### Reduced motion override:
Always wrap animations in `@media (prefers-reduced-motion: no-preference)`.
