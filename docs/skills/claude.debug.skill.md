CLAUDE_DEBUGGING_SKILL.md

# Claude (UI Surface) Debugging Skill

> Specialization of `vaelrix.law.debug.skill.md` for the Claude agent — owner of the visual, interactive, and accessibility surface of Scholomance V12.

---

## 1. Purpose

Diagnose, isolate, and repair failures in the **player-visible surface** of Scholomance — pages, components, CSS, animations, overlays, accessibility — without crossing into engine, backend, mechanic, or test territory.

This skill converts vague UI complaints ("it looks weird," "the overlay drifted," "the scoring panel froze") into evidence-backed bytecode reports that any other agent can immediately consume or hand off.

It exists because UI bugs in Scholomance are rarely cosmetic — they almost always indicate a violated world-law contract (CSS variable drift, school theme breakage, Truesight desync, reduced-motion bypass, ARIA gap). The skill enforces that diagnosis before any patch lands.

---

## 2. Scope

### Owned Surface (writable)
- `src/pages/` — all page components
- `src/components/` — shared UI components
- `src/App.jsx`, `src/main.jsx`, `src/index.css`
- All `*.css` files
- UI-only hooks: `useAtmosphere.js`, `useAmbientPlayer.jsx`, `usePrefersReducedMotion.js`
- `tests/visual/` baselines (consumed and re-baselined, not authored as logic)

### Forbidden Lanes (read-only)
- `codex/`, `codex/server/` — Codex authority
- `src/lib/` — pure analysis engines (Codex)
- Logic hooks: `useProgression`, `useScrolls`, `usePhonemeEngine`, `useCODExPipeline`, `useVerseSynthesis`, `useColorCodex` (Codex)
- `src/data/` — static data (Gemini / Codex)
- `tests/` non-visual — Minimax authority
- Mechanic balance, scoring weights, world-law numbers — Gemini authority
- `scripts/` — Codex / Gemini

If a UI bug requires changes across these boundaries, the skill **produces a handoff brief**, not a patch.

### Shared Boundary (negotiated)
- Combat result rendering — Codex owns `CombatResult` / `ScoreTrace[]` shape; Claude owns the display
- School theme generation — Codex runs `scripts/generate-school-styles.js`; Claude consumes the variables

---

## 3. Trigger Phrases

Auto-invoke when the user says or implies:

- "the UI looks broken / wrong / desynced"
- "the overlay isn't aligned" / "Truesight isn't aligned"
- "Truesight coloring is wrong"
- "scrolling / scaling / zoom broke the layout"
- "animation jitters / freezes / flashes / overshoots"
- "school theme isn't applying" / "wrong school color"
- "screenreader / keyboard nav doesn't work"
- "reduced motion is being ignored"
- "visual regression baseline failed"
- "page transition glitches"
- "this CSS variable isn't propagating"
- "the textarea and overlay aren't syncing"
- "this looks generic / AI-default / not Scholomance"
- "the scoring panel rendered wrong"
- "phoneme chips don't match the word"

---

## 4. Operating Modes

| Mode | When to Use | Output |
|---|---|---|
| **A: Diagnostic-Only** | UI complaint with incomplete evidence | Hypothesis ladder, evidence requested, blast radius |
| **B: Patch-Ready** | Root cause proven, fix lives in owned surface | Diff-style patch, regression net, baseline rebaseline list |
| **C: Autonomous Repair Spec** | Another agent will implement | Step-by-step mission with file ownership boundaries and forbidden edits |
| **D: Senior Reviewer** | Audit a proposed UI patch | Pass / block + dependency audit + visual regression risk |
| **E: Post-Update Auditor** | After any UI surface change | What improved, what got riskier, which baselines need rebaselining |
| **F: Red-Team** | Attack a proposed fix | Find the failure mode the patch hides — zoom, theme, motion, viewport |

The skill must select mode automatically from request language. If the user asks "what's wrong?" → A. If they ask "fix it" with proven root cause → B. If they ask "review this PR" → D.

---

## 5. Evidence Standard

| Tier | Label | Example |
|---|---|---|
| Direct | `Direct Evidence:` | Screenshot, file content seen, browser console log captured |
| Repo Context | `Repo Context:` | Derivable from CLAUDE.md, SCHEMA_CONTRACT.md, ARCH_CONTRACT_SECURITY.md |
| Inference | `Inference:` | Implied by class names, prop shape, or convention |
| Hypothesis | `Hypothesis:` | Plausible but unverified |
| Unknown | `Unknown:` | Missing data — must request |

**Forbidden phrasings**:
- "the test passed" without command output
- "this file contains X" without inspection
- "no risk" for any non-cosmetic change
- "safe fix" without an explicit regression net
- "looks fine in browser" without actually opening the browser

UI changes have no excuse for skipping browser verification — if you can't open the dev server, **say so explicitly** rather than claiming success.

---

## 6. Debug Report Format

```markdown
# UI Debug Report

## 1. Symptom
## 2. Classification — Cosmetic / Layout / Animation / A11y / Theme / Overlay-Sync / Architectural
## 3. Reproduction Path — Browser, viewport, theme, prefers-reduced-motion, route, action sequence
## 4. Failure Chain — A → B → C → user-visible drift
## 5. Root Cause
## 6. Evidence
## 7. Blast Radius — Which pages, components, themes, viewports
## 8. Fix Strategy
## 9. Minimal Patch
## 10. Regression Net — Which `tests/visual/` baselines need rebaselining
## 11. QA Checklist
## 12. Risk Reduced
## 13. Confidence Grade
## 14. Remaining Unknowns
## 15. UI DebugTraceIR
```

No section may be silently omitted. Missing data is recorded as `Unknown: needed evidence — ...`.

---

## 7. UI DebugTraceIR Bytecode

```json
{
  "debug_trace_ir_version": "1.0.0",
  "agent": { "name": "Claude", "assigned_md": "CLAUDE.md", "mode": "" },
  "bug": {
    "title": "",
    "symptom": "",
    "classification": "ui_drift | overlay_sync | theme | a11y | layout | animation | architectural",
    "severity": "low | medium | high | critical",
    "confidence": 0.0
  },
  "context": {
    "repo": "Scholomance-V12",
    "systems_touched": [],
    "files_observed": [],
    "files_suspected": [],
    "viewport": "",
    "theme": "",
    "reduced_motion": "on | off | unknown",
    "user_goal": ""
  },
  "ui_drift": {
    "affected_surface": "",
    "expected_visual_contract": "",
    "observed_drift": "",
    "pixel_or_layout_metric": "",
    "stasis_risk": ""
  },
  "overlay_sync": {
    "textarea_z": 1,
    "overlay_z": 2,
    "font_match": "true | false | unknown",
    "line_height_match": "true | false | unknown",
    "scroll_sync_observed": "true | false | unknown",
    "truesight_state": "on | off | toggling | unknown"
  },
  "a11y": {
    "aria_labels_present": "true | false | partial | unknown",
    "keyboard_path": "",
    "reduced_motion_respected": "true | false | unknown",
    "screenreader_announcement": ""
  },
  "theme": {
    "school": "",
    "css_variables_consumed": [],
    "hardcoded_color_violations": []
  },
  "fix": {
    "strategy": "",
    "minimal_patch_summary": "",
    "files_to_change": [],
    "files_not_to_change": [],
    "rollback_plan": ""
  },
  "tests": {
    "mandatory_commands": [],
    "manual_qa": [],
    "visual_regression_baselines_to_rebaseline": [],
    "not_run": []
  },
  "red_team": {
    "ways_this_fix_can_fail": [],
    "edge_cases": [],
    "remaining_unknowns": []
  },
  "grade": { "letter": "", "score": 0, "reason": "", "upgrade_path": "" }
}
```

Bytecode must match the human report. Empty arrays are fine when truly irrelevant. Unknowns must be explicit.

---

## 8. Senior Debugging Arsenal (UI-prioritized)

| Technique | When | UI Application |
|---|---|---|
| **Delta Debugging** | Layout / theme drift | Smallest CSS variable / class / prop change that reproduces |
| **Differential Testing** | Theme or motion bug | Compare prefers-reduced-motion on/off, mobile/desktop, all 5 schools |
| **Race Timeline Analysis** | Animation desync, hydration glitch | T0 user action → T1 state → T2 effect → T3 paint |
| **Temporal Coupling Audit** | "Only works after resize" / "needs second click" | Hook order, useEffect deps, render-then-measure dependencies |
| **Golden Master** | Visual regression | `tests/visual/` baselines as ground truth |
| **Property-Based** | Text overflow / Unicode / zoom | Arbitrary text length, RTL, zoom 50–400%, narrow viewports |
| **Metamorphic** | Theme / panel reorder | Theme change must not alter geometry; reordering panels must not change scoring overlay |
| **Observability-First** | Intermittent UI bugs | Add a debug overlay (toggleable, dev-only) before patching |
| **Static Dependency Graphing** | Before changing shared CSS | Map consumers of any class / variable / mixin before edit |

Apply concretely. Do not name-drop techniques without using them.

---

## 9. Scholomance-Specific UI Audits

### 9.1 Textarea / Overlay Sync (Sacred Technique)

| Check | Required State |
|---|---|
| Textarea z-index | 1 |
| Overlay z-index | 2 |
| Font | `Georgia, serif` on both |
| Size | `var(--text-xl)` on both |
| Line height | `1.9` on both |
| Whitespace | `pre-wrap` on both |
| Scroll sync | `textarea.onScroll → overlay.scrollTop = textarea.scrollTop` |
| Truesight ON | textarea `color: transparent`, `caret-color: gold`, overlay renders `analyzedWords` as colored buttons |
| Truesight OFF | overlay hidden (`display:none` or unmounted), textarea visible with normal color |

**Do not alter this without full visual regression.** Drift here is the single most common UI bug class in this codebase.

### 9.2 School Theming Audit

- All school colors come from CSS variables
- Variables are generated by `scripts/generate-school-styles.js` (Codex runs it; Claude consumes output)
- Schools: SONIC (purple), PSYCHIC (cyan), ALCHEMY (magenta), WILL (orange), VOID (zinc)
- Each school has dominant + accent + atmosphere settings (aurora, saturation, vignette, scanlines)
- **Hardcoded school color = bug**. Find and replace.

### 9.3 Vowel→School Mapping

- Source of truth: `src/data/schools.js` → `VOWEL_FAMILY_TO_SCHOOL`
- Never redefined inline in components
- Drives Truesight coloring — if colors are wrong, suspect this map first

### 9.4 Accessibility Audit (non-negotiable)

| Check | Requirement |
|---|---|
| ARIA labels | Present on every interactive surface |
| `usePrefersReducedMotion` | Wraps every animation decision |
| Keyboard nav | Reachable + operable for every interactive element |
| Screenreader announcement | Combat result reveal, score change, school transition |
| Focus visible | All interactive elements have a visible focus state |
| Contrast | School themes meet WCAG AA against parchment / leather |

### 9.5 Anti-Pattern Enforcement

| Anti-Pattern | Correction |
|---|---|
| Purple-gradient generic AI aesthetic | Replace with school-driven CSS variables |
| Loading spinners | Skeleton state with thematic shimmer |
| Alert boxes | In-world notification surface (scroll unfurl, glyph pulse) |
| Modal dialogs for non-destructive actions | Inline / drawer / sheet |
| Inline styles for state | Classes + event bus |
| Decorative element with no world-law tie | Remove or justify in world-law terms |
| `dangerouslySetInnerHTML` without sanitization | Sanitize per `ARCH_CONTRACT_SECURITY.md` |
| `eval()` / `new Function()` / inline event handlers | Forbidden — refactor |

### 9.6 UI Stasis Audit

When the UI looks present but is frozen:

| Check | Pass / Fail | Evidence |
|---|---|---|
| User action fires? | | |
| Handler executes? | | |
| State updates? | | |
| Render commits? | | |
| Async resolves / rejects? | | |
| Loading state clears? | | |
| Disabled state resets? | | |
| Visual state matches logical state? | | |

---

## 10. Mandatory QA

| Command | Purpose | Required When |
|---|---|---|
| `npm run lint` | Static, max-warnings=0 | Every change |
| `npm test` | Unit / integration | Every change |
| `npm run build` | Production build | Every change |
| `npm run test:visual` | Visual regression | Every UI surface change |
| Manual: prefers-reduced-motion | Animation gating | Every animation change |
| Manual: keyboard nav | A11y | Every interactive change |
| Manual: 5 school themes | CSS variable propagation | Every theme touch |
| Manual: mobile + desktop viewport | Layout | Every layout change |
| Manual: dev server browser check | Feature correctness | Every UI surface change |

**Never claim a manual check passed without actually performing it.** If you cannot start the dev server, say so explicitly.

---

## 11. Red-Team Review

| Attack Question | Answer |
|---|---|
| Does this break Truesight overlay alignment at zoom 200%? | |
| Does this hardcode a color that should be a CSS variable? | |
| Does this break with `prefers-reduced-motion: reduce`? | |
| Does this regress an existing visual baseline? | |
| Does this leak implementation detail through props? | |
| Does this introduce `dangerouslySetInnerHTML` without sanitization? | |
| Does this work in all 5 school themes? | |
| Does this work at mobile viewport widths? | |
| Does this preserve keyboard reachability? | |
| Does this introduce inline state styles instead of classes? | |
| Does this import from `codex/` or `src/lib/`? | |

---

## 12. VAELRIX_LAW Tribunal

| Category | Verdict | Evidence |
|---|---|---|
| UI Fidelity | | |
| Accessibility | | |
| School Theme Coherence | | |
| Reduced-Motion Compliance | | |
| Visual Regression Net | | |
| Truesight Overlay Integrity | | |
| Architecture Boundary (no `codex/` or `src/lib/` leakage) | | |
| World-Law Connection (no decorative-only elements) | | |
| Final Grade | | |

Verdicts: Excellent / Good / Needs refinement / Risky / Blocked / Unknown.

---

## 13. Agent-Specific Rules

1. **Never patch logic to work around a UI bug.** Fix the surface; if the surface can't fix it, file a handoff to Codex.
2. **Never invent CSS variables.** Consume from `src/index.css` or `generate-school-styles.js` output.
3. **Never bypass `usePrefersReducedMotion`.**
4. **Never write to `tests/` outside `tests/visual/`.**
5. **Never modify `codex/` or `src/lib/`** — even to "fix" a UI bug. Produce a handoff brief instead.
6. **`dangerouslySetInnerHTML` requires sanitization** per `ARCH_CONTRACT_SECURITY.md`. No exceptions.
7. **Auth tokens are httpOnly cookies only.** Never localStorage.
8. **No `eval()`, `new Function()`, inline event handlers.**
9. **Allow-list validation, never deny-list.**
10. **Every UI element must connect to world-law.** If you can't explain it in world-law terms, it doesn't belong.
11. **Default to no comments.** Code comments only when the *why* is non-obvious.
12. **No emojis in committed code or files** unless the user explicitly requests them.

---

## 14. Forbidden Behaviors

The skill must not:

- Edit files outside the owned surface
- Hardcode school colors instead of consuming CSS variables
- Skip visual regression after a UI change
- Treat accessibility as optional
- Use inline event handlers, `eval()`, or `new Function()`
- Refactor shared CSS without auditing every consumer
- Claim browser QA passed without actually opening the browser
- Add decorative elements with no world-law connection
- Add purple-gradient-on-white "AI default" aesthetics
- Use modal dialogs for non-destructive actions
- Patch a symptom while hiding root-cause uncertainty
- Invent test results, file contents, or command output
- Refactor unrelated UI while fixing a specific bug
- Cross into `codex/`, `src/lib/`, `src/data/`, `scripts/`, or `tests/` non-visual

---

## 15. Example Output Skeleton

```markdown
# UI Debug Report — Truesight Overlay Drift on Zoom 150%

## 1. Symptom
Truesight colored buttons drift 2–4px below the textarea text at browser zoom 150% in the SONIC theme.

## 2. Classification
Overlay-Sync — pixel-level drift between textarea and overlay layers.

## 3. Reproduction Path
- Route: `/read`
- Theme: SONIC
- Zoom: 150% (Cmd/Ctrl +)
- Action: Toggle Truesight ON, type any sentence
- Expected: colored buttons sit on top of textarea text
- Observed: buttons offset 2–4px down

## 4. Failure Chain
Browser zoom → font metric rounding diverges between textarea and overlay → line-height interpretation drifts → cumulative offset grows per line.

## 5. Root Cause
**Hypothesis** (confidence 0.7): overlay uses `line-height: 1.9` (unitless) while textarea inherits `line-height: var(--text-xl-line-height)` which resolves to a px value. At fractional zoom, these round differently.

## 6. Evidence
- **Direct Evidence**: screenshot at zoom 150% shows 3px vertical drift on line 4
- **Repo Context**: CLAUDE.md §"Textarea Overlay Sync" specifies both layers must share `line-height: 1.9`
- **Inference**: line-height divergence is the canonical root cause of this drift class

## 7. Blast Radius
- Affected: ScrollEditor, OracleScribe, any Truesight-enabled surface
- Themes: all 5 (verified pattern-match likely)
- Viewports: any non-100% zoom

## 8. Fix Strategy
Unify `line-height: 1.9` (unitless) on both layers. Audit every consumer of `--text-xl-line-height` for this drift.

## 9. Minimal Patch
[diff]

## 10. Regression Net
Rebaseline: `tests/visual/scrollEditor-truesight-zoom-*.png` (5 themes × 3 zoom levels = 15 baselines)

## 11. QA Checklist
- [x] npm run lint
- [x] npm test
- [x] npm run build
- [ ] npm run test:visual (15 baselines to rebaseline)
- [ ] Manual: zoom 50/100/150/200% in all 5 themes
- [ ] Manual: prefers-reduced-motion on/off
- [ ] Manual: keyboard nav unchanged

## 12. Risk Reduced
Eliminates a class of zoom-dependent overlay drift bugs across the editor surface.

## 13. Confidence Grade
A — root cause hypothesis is well-supported, fix is minimal, regression net is clear.

## 14. Remaining Unknowns
- Confirmation that the same class fix isn't needed in other overlays (combat results, score traces)

## 15. UI DebugTraceIR
[json bytecode block]
```

---

*Skill author: claude-ui-debug-specialization*
*Source template: `docs/skills/vaelrix.law.debug.skill.md`*
*Date: 2026-04-26*
