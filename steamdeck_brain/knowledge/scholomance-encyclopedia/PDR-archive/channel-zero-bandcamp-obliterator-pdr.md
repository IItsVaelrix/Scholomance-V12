# PDR — Channel Zero: The Bandcamp Obliterator

- **Date:** 2026-06-10
- **Status:** Vision PDR (pre-build). Signature feature (Resonance Orb) is the first slice.
- **Skill:** professional-ui-architect (UI as a deterministic state renderer — every surface traces to data, tokens, state, and law)
- **Author:** Scholomance Developer + Claude

---

## 0. Spite Thesis (the mission)

Bandcamp banned an artist for using AI. So the wedge writes itself:

> **We are the platform that bans the *ban*, not the artist.** AI-native, immersive, phonemically intelligent, creator-first. Every place Bandcamp is plain, slow, hostile, or owned-by-a-megacorp — we are the opposite.

Bandcamp is a *storefront with a player*. Channel Zero is a **resonance instrument that happens to also sell music** — where listening is an experience (the holographic Resonance Chamber), discovery is semantic (TurboQuant phonemic vector search), and creation is augmented (the Wand / ScholoCandy / PixelBrain toolchain you already own).

**Honest framing up front (calibration law):** this PDR is a *vision*. Sections are tagged **[BUILDABLE NOW]** (exists on current infra), **[LIFT]** (real backend/work, weeks), or **[ASPIRATIONAL]** (needs partners/legal/$$). I will not pretend the marketplace ships next week. The *signature listening experience* genuinely can.

---

## 1. Competitive teardown — beat it row by row

| Bandcamp does | Channel Zero does instead | Verdict |
|---|---|---|
| **Bans AI music** | Welcomes it; **transparency labels, not bans** (opt-in provenance badge) | Their weakness → our manifesto |
| Static HTML5 player | **Holographic Resonance Orb** — spectral graph + sacred geometry reacting to FFT/BPM | Obliterate |
| Genre-tag discovery | **Phonemic/semantic resonance search** (TurboQuant vectors) — "sounds like this *feeling*" | Obliterate |
| Plain storefront | Grimoire aesthetic — school-themed worlds, Truesight lyric overlays | Obliterate |
| ~82–85% to artist, slow payouts | **90%+, instant/streaming payouts**, fiat + opt-in crypto | Beat |
| Bandcamp Daily (editorial) | **Channel Zero** blog (already shipped) + AI-assisted editorial | Parity+ |
| Limited analytics | **Bytecode diagnostic dashboards** — deterministic, deep, exportable | Beat |
| Merch / vinyl | Print-on-demand + **phygital** (physical unlocks a resonance experience) | Beat |
| Owned by Epic→Songtradr (layoffs) | Independent; **import-your-Bandcamp-catalog** migration tool | Spite + moat |
| No creation tools | **Wand / DivWand / ScholoCandy / PixelBrain** in-browser studio | New category |

---

## 2. The eight obliteration pillars

1. **AI-Native** (the spite core)
2. **Immersive Listening** (Resonance Chamber)
3. **Phonemic Intelligence** (the Scholomance engine for discovery/analysis)
4. **Creator Economy** (revenue, payouts, splits, subscriptions)
5. **Semantic Discovery** (TurboQuant resonance matching)
6. **Community & Collab**
7. **Audio Superiority** (ParaEQ, lossless, spatial)
8. **Merch / Phygital**

---

## 3. Feature catalog

Each headline feature is framed as the architect law requires: **data → state → UI**. Tags: [BUILDABLE NOW] / [LIFT] / [ASPIRATIONAL].

### Pillar 1 — AI-Native (the wedge)
- **AI-friendly manifesto + "No-Ban" policy page** [BUILDABLE NOW] — the anti-Bandcamp statement; SEO + brand.
- **Provenance badges** [BUILDABLE NOW] — `track.aiProvenance: { human | assisted | generated, tools[] }` → a hover-able sigil chip, *opt-in transparency, never a penalty*.
- **In-browser studio** (Wand / DivWand / ScholoCandy / PixelBrain) [BUILDABLE NOW–LIFT] — create cover art, master, EQ, generate visualizers on-platform.
- **AI A&R / auto-promotion** [LIFT] — your upload is vectorized (TurboQuant) and surfaced to resonance-matched listeners. Data: `trackVector` → `recommendedListeners[]`.
- **AI metadata & auto-tagging** [BUILDABLE NOW] — phoneme analysis (TrueSight) fills mood/school/tempo/"phonemic fingerprint."
- **AI stem separation + remix-license marketplace** [ASPIRATIONAL] — license stems explicitly *for* AI remixing (the thing Bandcamp fears, sold as a product).

### Pillar 2 — Immersive Listening (the signature)
- **Resonance Orb** [BUILDABLE NOW] — see §4. Holographic circular screen, WMP-style spectral graph, sacred geometry animated to BPM/FFT.
- **School-themed listening worlds** [BUILDABLE NOW] — the `AlchemicalLabBackground` re-skins per active resonance (SONIC/PSYCHIC/ALCHEMY/WILL/VOID).
- **Truesight lyric overlay** [BUILDABLE NOW] — phoneme-colored, beat-synced lyrics (reuse the Read overlay technique).
- **Shareable Resonance Cards** [LIFT] — the QbitPulse/bytecode fingerprint of a track rendered as deterministic shareable art (a real "this song's soul as a sigil").
- **Synced Listening Rooms** [ASPIRATIONAL] — group listening, shared orb. Data: `room.playheadMs` broadcast.

### Pillar 3 — Phonemic Intelligence
- **Phonemic fingerprint per track** [BUILDABLE NOW] — TrueSight/phoneme engine → vowel-family histogram, rhyme-astrology key, density.
- **Mood/school auto-classification** [BUILDABLE NOW] — `VOWEL_FAMILY_TO_SCHOOL` drives a deterministic school assignment.
- **Lyric intelligence** [LIFT] — searchable lyric phoneme density, "find the hook," readability/meter.

### Pillar 4 — Creator Economy
- **90%+ revenue, instant streaming payouts** [ASPIRATIONAL] — needs payments backend (Stripe Connect + opt-in crypto).
- **PWYW + fixed + subscription + tip jar** [LIFT] — `release.pricingModel` → pricing UI variant.
- **"Resonance Days"** [BUILDABLE NOW—policy] — Bandcamp-Friday but 100% to artist; a calendar feature.
- **Transparent artist analytics** [BUILDABLE NOW] — reuse the bytecode diagnostic dashboards for plays/geos/resonance-matches; deterministic + exportable.
- **Fan funding goals, direct messaging** [LIFT] — reuse the collab message system.

### Pillar 5 — Semantic Discovery
- **Resonance search** [BUILDABLE NOW] — TurboQuant vector search: "find tracks that resonate like this." Data: `queryVector` → ranked `trackHits[]`.
- **"Fans also resonated with"** [LIFT] — neighbor search over listener vectors.
- **Discovery map** [LIFT] — the phonemic space as a navigable constellation (sacred-geometry UI reuse).

### Pillar 6 — Community & Collab
- **Grimoire (your collection)** [BUILDABLE NOW] — owned tracks as a personal spellbook (the `/grimoire/:trackId` route already exists).
- **Artist collectives / co-release** [LIFT] — reuse collab pipeline.
- **Channel Zero editorial** [SHIPPED] — the blog (already built this session).

### Pillar 7 — Audio Superiority
- **Lossless (FLAC) + hi-res** [LIFT].
- **In-browser ParaEQ for listeners** [BUILDABLE NOW] — your EQ as a listener feature Bandcamp will never have.
- **Gapless / crossfade / spatial** [LIFT–ASPIRATIONAL].

### Pillar 8 — Merch / Phygital
- **Print-on-demand merch, vinyl** [ASPIRATIONAL] — partner integration.
- **Phygital unlocks** [LIFT] — physical purchase grants a digital resonance experience / exclusive visualizer.
- **Import-your-Bandcamp-catalog** [LIFT] — the migration moat; scrape/import a public Bandcamp page → draft releases.

---

## 4. Signature build: The Resonance Orb (data → state → UI)

The first slice and the reason this PDR exists.

**Concept:** the orb becomes a **holographic circular screen** showing a **WMP-style spectral graph** with **sacred geometry animated to the song's rhythm**, all inside the existing circular frame.

**Data Contract (the inputs already exist):**
```ts
interface OrbVisualInput {
  getByteFrequencyData: (a: Uint8Array) => void; // FFT — already on ListenPage (feeds ScholoCandy)
  bpm: number;            // already pushed to SignalChamberScene.updateState
  signalLevel: number;    // 0..1, already pushed
  schoolColor: string;    // already pushed (--accent)
  isPlaying: boolean;
}
```

**State model:** `isPlaying` → live vs idle; `signalLevel`/FFT → bar heights + geometry pulse; `bpm` → geometry rotation cadence (the scene already has `getRotationAtTime(time, bpm, …)`); `schoolColor` → tint. Deterministic: same audio frame → same frame (seeded, no `Math.random` in the draw loop).

**Component architecture (reuse, don't reinvent — "wire don't archive"):**
- `SpectrumCanvas.tsx` already renders an FFT spectral graph from `getByteFrequencyData`. → Render it **clipped to a circle**, inside the orb, as a glowing holographic layer.
- `SignalChamberScene.js` already bakes + rotates **sacred-geometry sprites** (hex, star, flower, **metatron**) to BPM. → Drive their alpha/scale from `signalLevel`/FFT bands for beat reactivity.
- `genomeGeometry.ts` (`polygonPoints`, `buildSigilModel`) → additional procedural geometry if needed.
- `HolographicEmbed.jsx` already provides the holographic glow/scanline shell. → Add the spectral layer beneath the controls.

**The one wiring gap:** `getByteFrequencyData` is **not** currently pushed into `SignalChamberScene.updateState()` (only `signalLevel`/`bpm` are). The build = pass the FFT accessor into the scene/canvas. Small, known, surgical.

**What Wand / DivWand / photonic-retina actually contribute (honest):**
- **Wand / DivWand** — their **magic-canvas procedural rendering** patterns (brush/geometry on canvas) are reusable *technique* for the spectral+geometry layer. Source of craft, not a drop-in page.
- **photonic-retina** — it is an **encoder, not a renderer**. It cannot draw the spectrum. Its honest role: the "**bytecode visualizer**" framing — encode each audio/spectrum frame into a retina-bytecode packet and render *that encoding* as the holographic substance (the orb literally visualizes bytecode). Real and on-theme, but it's the *encode* half; a canvas/Phaser layer is still the *display* half.

---

## 5. Architecture (per UI-architect law, platform-wide)

- **Design tokens:** reuse `channel-zero.tokens.css` (`--cz-*`) + the school CSS variables. No new magic palettes; AI/provenance/resonance get semantic tokens.
- **Determinism:** all generative visuals seeded (your VAELRIX determinism contract); same track → same fingerprint → same sigil/orb frame. No `Date.now()`/`Math.random()` in render or pricing paths.
- **State is hook-driven:** `useAmbientPlayer`, `useSonicAnalysis` already model playback; new surfaces consume hooks, never globals.
- **Accessibility (structural):** every interactive surface keyboard + ARIA (the orb already ships an sr-only control layer + live region — keep that pattern for every visual); all motion behind `prefers-reduced-motion`; no info by color alone (pair school color with label/sigil).
- **Responsive:** Flexbox/Grid; the cockpit already proven non-overflowing 480–1280; the orb scales by container.
- **Loading/empty/error states:** every data surface (search, catalog, analytics) ships all three — Bandcamp's blank spinners are a bar to clear, not match.

---

## 6. Phasing

- **Phase 0 — Signature (now):** Resonance Orb (spectral graph + reactive geometry + holographic). Pure frontend on existing data. **[BUILDABLE NOW]**
- **Phase 1 — Listening experience:** Truesight lyrics, school worlds, ParaEQ-for-listeners, shareable Resonance Cards.
- **Phase 2 — Catalog & creator pages:** release/artist pages (extend the channel-zero kit), grimoire collection, analytics dashboards.
- **Phase 3 — Discovery:** TurboQuant resonance search + "fans also resonated."
- **Phase 4 — Economy:** payments backend, payouts, subscriptions, merch. **[LIFT–ASPIRATIONAL]**
- **Phase 5 — Moat:** Bandcamp import tool, phygital, remix-license marketplace.

---

## 7. Risks & honest calibration

- **Scope is enormous.** A music *marketplace* (payments, payouts, tax, merch fulfillment, DMCA, licensing) is a company, not a sprint. **Real now:** the listening experience + discovery on your existing engine. **Not now:** payments/merch/legal.
- **The AI-music quality bar.** "AI-friendly" is the wedge, but the platform's reputation rides on curation; transparency badges + resonance ranking must keep signal high or "AI-friendly" reads as "slop-friendly." This is a *product* risk, not a tech one.
- **Audio licensing / hosting cost** at scale is real.
- **The spite must not become the product.** "Obliterate Bandcamp" is fuel; the *durable* value is the immersive, phonemically-intelligent experience. If we only ship spite, we lose.
- **Determinism vs WebGL headless** — the orb's WebGL crashed headless during this session's testing; visual regression needs a real-GPU path or a 2D-canvas fallback.

---

## 8. QA checklist (gate for every surface)
- [ ] UI driven by data/JSON, not hardcoded display values
- [ ] All color/spacing/type from `--cz-*` / school tokens
- [ ] Flexbox/Grid; no fragile absolute positioning (except decorative/orb layers)
- [ ] Loading + empty + error states present
- [ ] Keyboard nav + visible focus + ARIA on every interactive surface
- [ ] `prefers-reduced-motion` respected; no info by color alone
- [ ] Deterministic — no `Math.random()`/`Date.now()` in render/pricing
- [ ] Reduced-motion + sr-only control layer for every canvas/Phaser visual

---

## 9. Next action
Build **Phase 0 — the Resonance Orb** (spectral graph + reactive sacred geometry + holographic circle), wiring `getByteFrequencyData` into the scene/canvas. Everything for it already exists; it is the smallest slice that makes the whole spite thesis *felt* on first listen.
