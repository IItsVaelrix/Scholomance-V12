# UX Report — Scrying-Orb Landing & Photonic Storm

**Date:** 2026-06-03
**Surface:** `/` (LandingPage) — first impression / entry portal
**Author:** Claude Opus 4.8 (GrimDesign-grounded implementation)
**Status:** Implemented, verified in-browser (Playwright, headless)

---

## 1. What shipped

The landing page was reworked from a flat gold/teal portal with **CSS opacity-flash "lightning"** into a **glass scrying orb resting in an abandoned dungeon**, with a **procedurally-generated electrical storm**:

- **Algorithmic lightning** — bolts grown by midpoint displacement + branching, **not** CSS opacity blinks. Each bolt is jagged, forks within the cloud mass, and lives ~220 ms with an additive-glow render (halo → arc-blue glow → white-hot core).
- **Cumulous clouds** — clustered radial "puffs" that drift slowly. When struck, a cloud's `charge` spikes and decays over ~160 ms, lighting it **from within** (the "bursting within cumulous clouds" effect).
- **Dual composition** — a full-bleed storm fills the dungeon sky *behind* the orb, and a second, denser storm renders the contained scrying **vision inside** the orb (circle-clipped, `screen` blend under a glass specular shell).
- **Palette shift** — divination amethyst `#7b6cff` + electric arc-blue `#bfe3ff`, with gold `#d4af37` retained as a residual relic accent on the rim.

### The headline: the storm is driven by the Photonic Bridge

This is not decorative. Every strike runs the real pipeline:

```
strike → encodeToPhotonicRetina(coords)  →  analyzePhotonicQuantizationBridge
       → routeRetinaPacketToPhotonicBridge → { packet, bridgeReport, opticalSimulation }
```

- The packet's Int8 `data` (bitWidth-4, signed-hash rotation) is consumed as the **deterministic noise stream** that drives every perpendicular offset and branch decision in the bolt — replacing `Math.random()`.
- The optical simulation's `phaseBuckets` (forward/inverted/dark) modulate bolt **displacement**; `opticalFit` modulates **branch density**.
- `intensity` scales strike frequency **and** packet `targetDimension`, so turning it up is a genuine load test of the photonic bridge.

---

## 2. Verification

Rendered in headless Chromium (Playwright) at 1280×800.

| Check | Result |
|---|---|
| Page console / runtime errors | **None** |
| Photonic route returns valid packet | ✅ `ok: true`, dim 176, grade **C**, score 0.50 |
| Bolt seeded from packet | ✅ 65 main points + 6 branches, deterministic |
| Lightning visible (not a flash) | ✅ jagged forked bolts captured mid-life |
| Cloud internal burst | ✅ struck clouds light from within |
| Glass orb + dungeon framing | ✅ specular shell, amethyst rim, plinth glow, vignette |
| `prefers-reduced-motion` | ✅ storm halts; static lit cloudbank rendered once |
| Tab-blur | ✅ rAF paused on `visibilitychange` |

**Live debug overlay** (`/?debug`) read: `fps 25 · bolts 0 · clouds 11 · bridge C · fit 0.33 · dim 176 · strikes 2`.

---

## 3. UX assessment

### Strengths
- **Strong first impression.** The orb reads immediately as a magical scrying instrument; the dungeon vignette + plinth glow give it place and weight.
- **Motion has meaning.** Lightning is organic and non-repeating (every bolt is a distinct packet), which avoids the "looping GIF" feeling of the old CSS flash.
- **Accessible by default.** Decorative canvases are `aria-hidden`; the orb keeps `role="button"`, `aria-label`, and Enter/Space handlers; reduced-motion users get a calm still.
- **Honest stress test.** The `intensity` knob and `?debug` overlay make the photonic load observable and tunable.

### Risks / things to watch
1. **Performance — the real concern.** 25 fps was measured in **software-rendered headless Chromium (no GPU)**, so it is a floor, not the Steam Deck figure. Two hotspots are real regardless of GPU:
   - **Cloud gradients are recreated every frame** (~11 clouds × ~7 puffs = ~77 `createRadialGradient` calls/frame, ×2 canvases). When a cloud is uncharged this work is wasted.
   - **`shadowBlur` on bolt halo passes** is the most expensive canvas op; at high `intensity` (many concurrent bolts) it dominates.
   - *Recommended fix (fast win):* pre-render each cloud's resting puff stack to an offscreen canvas once per resize; only composite the live `charge` flash on top per frame. Expect a large fps recovery.
2. **Readability of suspended text.** "SCHOLOMANCE" and the tagline sit over a moving, sometimes-bright vision. A subtle text-shadow was added, but during a bright in-orb strike contrast can dip. Consider a faint radial scrim behind `.portal-content`.
3. **Bolt prominence.** Bolts currently read as delicate filaments; clouds visually dominate. If the brief wants lightning to *star*, raise core `lineWidth`/alpha and strike frequency, or bias more strikes to the orb vision.
4. **Two engines, two bridge call streams.** The scene and orb each call the bridge independently. Fine today; if more storm instances appear, consider a shared scheduler to bound bridge calls globally.

### Deviation from GrimDesign QA
The GrimDesign checklist says "no logic imported from `src/lib/`." That was **deliberately overridden** per the explicit instruction to *use the photonic bridge*. The storm imports `src/lib/photonic-retina`. This is the intended architecture, not an oversight.

---

## 4. Files

| File | Role |
|---|---|
| `src/pages/Landing/storm/photonicBolt.js` | Packet→bolt geometry (midpoint displacement + branching, packet-seeded) |
| `src/pages/Landing/storm/photonicStorm.js` | Headless engine: clouds, strike scheduler → bridge route, render |
| `src/pages/Landing/StormCanvas.jsx` | React wrapper: DPR, rAF, visibility pause, reduced-motion, `?debug` |
| `src/pages/Landing/LandingPage.jsx` | Mounts scene + orb storms; dropped CSS flash/smoke divs |
| `src/pages/Landing/LandingPage.css` | Dungeon + glass-orb + plinth styling; removed `lightning-flash`/smoke |

## 5. Recommended next steps
1. Offscreen-cache cloud puff stacks (perf) — highest priority.
2. Measure fps on the Steam Deck GPU with `?debug`; set the default `intensity` from that.
3. Add a radial scrim behind `.portal-content` if strike-time text contrast tests poorly.
4. Capture the reduced-motion still as the visual-regression baseline (storm is non-deterministic).
