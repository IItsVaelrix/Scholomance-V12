# Ice Slime Staff — Void/Eldritch Beautification (Spectral Cage)

**Date:** 2026-06-14  
**Spec ID:** ice-slime-staff-void-eldritch-v1  
**Source spec:** `specs/ice-slime-staff.v1.json`  
**Direction:** Void / Eldritch — Spectral Cage  
**Scope:** New profiles allowed

---

## Summary

The ice slime staff reads flat in its current form. The orb is undersized and static, the ribbon barely registers, and the bezel feels decorative rather than threatening. This spec adds four targeted enhancements — all new profiles — that turn the staff into a void conduit: a caged orb at the top, engraved shaft, jagged void wings at the guard, and a shadow orb echo at the pommel.

---

## Section 1: Orb Ring (Spectral Cage)

**New profiles:** `orb.ring`, `orb.ring_glow`

A thin pixel halo (1–2px wide, slightly elliptical) wraps the outside of the existing orb. The ellipse implies a floating orbit rather than a flat border.

**Parts to add:**

```json
{
  "id": "orb_ring",
  "profile": "orb.ring",
  "params": { "r": 9 },
  "attach": { "parent": "orb", "at": "center" },
  "fill": { "material": "void_ice", "anchor": "deep" },
  "outline": { "material": "void_ice", "anchor": "spectral" }
},
{
  "id": "orb_ring_glow",
  "profile": "orb.ring_glow",
  "params": { "r": 9 },
  "attach": { "parent": "orb", "at": "center" },
  "fill": { "material": "void_ice", "anchor": "frost" }
}
```

The `spectral` anchor highlight lands at the top-left quadrant to simulate light catch. The `frost` glow layer bleeds outward 1px, making the orb read as charged rather than inert.

---

## Section 2: Shaft Rune Lattice

**New profile:** `shaft.rune_lattice`

A sparse repeating pattern of single-pixel rune marks along the shaft. Every ~8px a subtle crosshatch or rune fragment, offset slightly from center to read as engraving.

**Parts to add:**

```json
{
  "id": "shaft_rune_lattice",
  "profile": "shaft.rune_lattice",
  "params": { "cx": 24, "span": [30, 90], "half": 2 },
  "attach": { "parent": "shaft", "at": "base" },
  "fill": { "material": "void_ice", "anchor": "deep" }
},
{
  "id": "shaft_lattice_glow",
  "profile": "shaft.rune_lattice",
  "params": { "cx": 24, "span": [30, 90], "half": 2 },
  "attach": { "parent": "shaft", "at": "base" },
  "fill": { "material": "cyan_glow", "anchor": "shadow" }
}
```

The `shadow` anchor on `cyan_glow` keeps the glow faint — the marks read as inscribed and lit from within, not glowing independently.

---

## Section 3: Bezel — Void Wings

**New profiles:** `guard.void_wings`, `guard.void_wings_trim`, `guard.void_wings_glow`

Replace the current `guard.marquise` bezel with `guard.void_wings`. Same diamond core but lateral extensions become jagged and asymmetric — one wing 3–4px longer than the other. Asymmetry is load-bearing: symmetrical guards read as decorative, asymmetric ones read as dangerous.

**Parts to replace/add:**

```json
{
  "id": "bezel",
  "profile": "guard.void_wings",
  "attach": { "parent": "shaft", "at": "base" },
  "fill": { "material": "silver" }
},
{
  "id": "bezel_highlight",
  "profile": "guard.highlight",
  "attach": { "parent": "bezel", "at": "center" },
  "fill": { "material": "silver", "anchor": "spectral" },
  "outline": { "material": "silver", "anchor": "spectral" }
},
{
  "id": "bezel_void_trim",
  "profile": "guard.void_wings",
  "attach": { "parent": "shaft", "at": "base" },
  "fill": { "material": "void_ice", "anchor": "deep" }
},
{
  "id": "bezel_void_glow",
  "profile": "guard.void_wings",
  "attach": { "parent": "shaft", "at": "base" },
  "fill": { "material": "cyan_glow", "anchor": "spectral" }
}
```

The void_trim traces the inner edge of the wings in darkness. The glow adds a hairline cyan bleed on the wing tips, echoing the shaft lattice glow and tying the staff together vertically.

---

## Section 4: Pommel — Shadow Orb Echo

**New profile:** `pommel.void_orb`, `pommel.void_orb_glow`

Replace `staff.pommel` with a small dark orb (r=3) that mirrors the top orb. No ribbon, no cradle — just a contained dark sphere implying the staff is charged at both ends. Silver outline is dropped; the orb sits bare against the grip.

**Parts to replace:**

```json
{
  "id": "pommel",
  "profile": "pommel.void_orb",
  "params": { "r": 3 },
  "attach": { "parent": "grip", "at": "tip" },
  "fill": { "material": "void_ice", "anchor": "deep" }
},
{
  "id": "pommel_glow",
  "profile": "pommel.void_orb_glow",
  "params": { "r": 3 },
  "attach": { "parent": "grip", "at": "tip" },
  "fill": { "material": "cyan_glow", "anchor": "spectral" }
}
```

The glow ring is smaller and dimmer than the top ring — recognisably related, but subordinate. The staff reads as a conduit with the void captured at both termini.

---

## New Profiles Required

| Profile | Shape Description |
|---|---|
| `orb.ring` | Elliptical 1–2px halo outside orb boundary, parameterised by `r` |
| `orb.ring_glow` | Same ellipse, 1px larger, for bleed layer |
| `shaft.rune_lattice` | Repeating single-pixel rune marks every ~8px along shaft span, center-offset |
| `guard.void_wings` | Marquise diamond core with jagged asymmetric lateral extensions (L wing 3–4px longer than R) |
| `pommel.void_orb` | Small filled circle, parameterised by `r` |
| `pommel.void_orb_glow` | Same circle, 1px larger, for glow bleed |

---

## Visual Cohesion

The four changes form a vertical rhythm: top orb cage → shaft engravings → void wing guard → bottom orb echo. The `cyan_glow` at `spectral` anchor appears at all four points, creating a spine of eldritch light up the staff. The `void_ice` at `deep` anchor provides consistent darkness in the new elements without competing with the existing `darksteel` shaft.

---

## Out of Scope

- Ribbon / slime drip changes (retained as-is)
- Palette changes to existing materials
- Animation or shader effects
