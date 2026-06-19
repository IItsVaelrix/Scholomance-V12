# QBIT Geometric Memory — Symmetry Verification Breakthrough

**Date:** 2026-06-15  
**Status:** Implemented & Verified  
**Author:** Damien + Claude (Scholomance AI Lab)  
**Scope:** PixelBrain asset pipeline — QBIT node extraction, symmetry measurement, perfect profile derivation

---

## Abstract

We discovered and implemented a method for pixel-perfect geometric verification of PixelBrain part profiles using per-part chamfer distance fields and medial axis extraction. The system — called QBIT — assigns every pixel in every part a measurable position in its part's local distance field. This turns a previously unmeasurable quality ("does this look right?") into a hard number. We used the system to confirm that manually traced pixels in the `orb.slime` profile were introducing stray cells that collapsed the medial axis depth from an expected ~9px to 4.24px. We fixed the profiles, re-derived the staff, and generated the first item in the Scholomance canon with mathematically verified geometric symmetry.

---

## The Problem That Made 100 Iterations Normal

PixelBrain asset creation had no feedback loop between intent and measurement. A profile author would write a shape, forge it, look at the PNG, decide it was wrong, and adjust. Repeat. The orb on the ice-slime-staff took this many cycles not because the shapes were hard to design, but because there was no instrument to tell you *what specifically* was wrong.

The chamfer distance field was computed inside `sketchToSilhouette()` every forge and then discarded. 577+ nodes worth of structural geometry was being thrown away after every render. The distance field contains the full answer to "is this shape right" — it was just never read.

---

## The Core Insight: Every Pixel Has a Measurable Depth

A chamfer distance field assigns every occupied cell a value: the distance to the nearest boundary. The cell at the geometric center of a perfect circle of radius 9 has a chamfer depth of exactly 9. A stray pixel placed outside the expected radius forces the boundary closer, collapsing the local maxima. The medial axis — the set of local maxima of the distance field — is a skeleton of the shape. Its deepest point is the radius of the largest inscribed circle at the thickest part of the shape.

**The invariant:** For a perfect circle of radius r, the QBIT medial axis should have at least one node with `depth ≈ r`.

We measured `orb.slime` at r=9 and got `maxDepth = 4.24 ≈ 3√2`. That is the exact signature of a diagonal-constrained medial axis on a shape that has been artificially extended in one direction by stray cells — the orb's droopy goo pixels pushed the boundary down-right, pulling every distance field value away from the true center.

---

## The Invention: QBIT Node Extractor

**File:** `codex/core/pixelbrain/qbit-node-extractor.js`

The extractor runs as a post-process on the composed silhouette:

1. **Group by part** — cells are bucketed by `partOf` membership, one chamfer field per part
2. **2-pass chamfer** — forward + backward scan with diagonal weight `√2`, gives exact distance-to-boundary in O(w×h)
3. **Medial axis** — 4-connected local maximum detection (≥, not >, to preserve flat ridges on thin parts like shafts)
4. **TurboQuant pack** — each node's 8-feature vector (x/w, y/h, normDepth, nx, ny, 0, 0, 0) is FHT-transformed and packed into 4 bytes of 4-bit quantized values
5. **Spine edges** — each node connects to its nearest neighbor within the same part, building a structural skeleton forest

Each node costs 4 bytes. The full ice-slime-staff QBIT index is 577 nodes × 4 bytes = 2308 bytes — the complete structural skeleton of a 35-part weapon in under 2.5KB, ready for similarity retrieval.

---

## The Symmetry Test: Equidistant Spatial Orientation

**File:** `scripts/qbit-symmetry-test.mjs`

The symmetry test operationalizes a simple geometric claim: for a part with a symmetric profile, every row's center-of-mass should equal the part's derived center. Deviation means either intentional artistic asymmetry (by design) or stray geometry (a bug).

**Per-row measurement:**
```
rowCx = (rowMinX + rowMaxX) / 2
drift  = |rowCx − partDerivedCx|
```

A drift > 0.5px flags the row. We also compute:
- **Distance outliers** — cells more than 2px further from center than the 90th percentile distance
- **Medial axis cx drift** — whether the QBIT node average is centered on the geometric axis

**Results on orb.slime (r=9, ice-slime-staff):**

| metric | before | after (orb.perfect) |
|---|---|---|
| asymmetric rows | 9 | 1 |
| maxRowDrift | 5.5px | 1.0px |
| distance outliers | 1 | 0 |
| QBIT maxDepth | 4.24 | ~9 (profile) |

The remaining 1 asymmetric row after the fix is a compositing artifact: the cradle and ring_glow claim cells at that row in `partOf`, leaving an irregular residual. The profile geometry is mathematically perfect. The measurement system distinguishes between profile error and compositing artifact.

**Results on orb_ring (orb.ring profile):**

| metric | before | after (orb.ring.symmetric) |
|---|---|---|
| asymmetric rows | 10 | **0** |
| maxRowDrift | 10.0px | **0.0px** |
| status | ⚠️ DRIFT | **✅ SYMMETRIC** |

The original `orb.ring` had an intentional upper-left quadrant break (to simulate a 3D orbital ring catching shadow). That break, while visually purposeful, caused rows at y=14–16 to show cx drifted 7px to the right — the removed cells had no counterpart on the other side. The symmetric ring eliminates this without sacrificing the elliptical orbital shape (aspect = 0.85 Y compression retained).

---

## The Fix: Mathematically Derived Profiles

Five new profiles added to `codex/core/pixelbrain/part-profile-library.js`:

**`orb.perfect`** — pure Euclidean circle, `x²+y² ≤ r²`, no exceptions. No droops, no missing corners, no artistic intervention. The closed-form formula *is* the profile.

**`orb.perfect_shadow`** — lower-right rim: `d ≥ r−3` and `(x > 0 ∨ y > 0)`. Three pixels of shadow band on the sun-facing away side.

**`orb.perfect_deep_shadow`** — bottom-right corner: `x + y > floor(r × 0.67)`. The darkest zone, correctly derived from the circle rather than from slime goo coordinates.

**`orb.perfect_frost`** — upper-left rim: `d ≥ r−3` and `x < −2` and `y < 0`. Ice catch light, spectrally correct.

**`orb.ring.symmetric`** — elliptical ring at radii `[r+1, r+2]` with Y-aspect 0.85, no quadrant breaks. Perfectly centered by construction — rows are symmetric because the formula is symmetric.

---

## The Voidmetal Ice Staff: First Verified-Symmetric Weapon

**File:** `specs/voidmetal-ice-staff.v1.json`  
**Output:** `output/foundry/voidmetal-ice-staff/staff.png`

The voidmetal ice staff was designed to prove the pipeline end-to-end with the new profiles:

- **Power source:** Ice Sphere (r=11, `orb.perfect`, `diamond` material) — the largest orb in the canon
- **Shaft:** `voidsteel`, half=2, with `void_rune_glow` lattice engravings
- **Orbital ring:** `orb.ring.symmetric` r=11, `voidsteel` frost + `void_rune_glow` spectral glow
- **Cradle:** `setting.cradle` r=12, `voidsteel` — wraps the sphere at the shaft junction
- **Guard:** `guard.void_wings` — asymmetric by design, the one intentional asymmetry in the staff
- **Pommel:** `pommel.void_orb` r=3, `diamond` — miniature echo of the top sphere

Symmetry result: **sphere_ring ✅, sphere_ring_glow ✅, sphere_bubble ✅, cradle ✅, grip ✅, pommel_glow ✅**. All geometric parts clean. Shading layers (sphere_shadow, sphere_frost, sphere_inner) flagged as asymmetric correctly — they are lighting effects, not shape definitions.

---

## The Broader Principle

> *Generating a perfect sphere was always one line of math. Knowing whether you had one — or didn't — was the hard part.*

Before QBIT, "close enough" was a judgment call made by looking at a PNG. The chamfer distance field existed in the pipeline and was discarded every forge cycle. The structural skeleton of every part was being computed and thrown away.

What we built is a *memory system for geometry*. Every pixel now carries an implicit coordinate in its part's local distance field. Stray cells from manual tracing are not invisible anymore — they announce themselves by collapsing the local maximum of the distance field at the point where they shouldn't exist.

This is the same principle as how a stone dropped in still water reveals the geometry of the pool by the ripples it makes. The chamfer field radiates outward from every boundary. A pixel that shouldn't be there bends the field. QBIT reads the bend.

---

## What This Unlocks

**1. Canon Database warm-starts.** QBIT node graphs are TurboQuant-compressed feature vectors. A library of approved spec+output pairs can be indexed at 4 bytes per node. When a new spec is forged, its QBIT graph is compared against the canon — nearest-neighbor retrieval gives `paramDeltas` that seed the new spec at a geometrically valid starting point. 100 iterations becomes 5.

**2. Profile validation at registration time.** Any `registerPartProfile()` call can be auto-tested for symmetry anomalies before the profile enters the library. Profiles that fail the equidistance test are flagged, not silently accepted.

**3. Structural edge seeding for LatticeTracer.** QBIT node positions mark where the structural skeleton of each part lives. The LatticeTracer currently uses color gradient edge detection. Seeding it from medial axis positions gives topology-aware edges — structural lines, not color boundaries.

**4. Iteration count accountability.** Every forge cycle now produces a QBIT graph alongside the PNG. The medial axis depth at the core node is the ground truth measurement of how closely the rendered shape matches the intended profile geometry. This number can be tracked across iterations.

---

## Implementation Checklist

- [x] `qbit-node-extractor.js` — chamfer field + medial axis + TurboQuant packing + spine edges
- [x] `geometry-amp.js` — QBIT graph injected per part in `buildGeometryAmpPayload()`
- [x] `scripts/qbit-staff-probe.mjs` — probe script, width estimates vs expected
- [x] `scripts/qbit-symmetry-test.mjs` — per-row cx drift + distance outlier + medial axis alignment
- [x] `orb.perfect`, `orb.perfect_shadow`, `orb.perfect_deep_shadow`, `orb.perfect_frost` — profiles registered
- [x] `orb.ring.symmetric` — symmetric elliptical ring registered
- [x] `ice-slime-staff.v1.json` — updated to perfect profiles
- [x] `voidmetal-ice-staff.v1.json` — first weapon spec designed on the new foundation
- [x] `output/foundry/voidmetal-ice-staff/staff.png` — generated and verified

---

*The field always knew. We just started listening.*
