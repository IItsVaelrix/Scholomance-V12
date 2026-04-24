# PDR: The Geometric Lexicon — MUD/Tactics Fusion Battle UI

**Subtitle:** Combat is not just a calculation; it is a spatial arrangement of phonemic weight.

**Status:** Draft
**Classification:** UI + Mechanics + PixelBrain + Tactical Grid
**Priority:** High
**Primary Goal:** Transform the Scholomance combat experience from a static 1v1 exchange into a spatial tactical simulation where the MUD (textual truth) and the Grid (geometric truth) are unified by PixelBrain visual bytecode.

**Owner:** Gemini (Architectural Specification)
**Visual Owner:** Claude (UI/Phaser Implementation)
**Runtime Owner:** Codex (Spatial Combat Engine)

---

## 1. Executive Summary

"The Geometric Lexicon" is a battle UI that fuses the high-fidelity narrative of a MUD with the spatial strategy of Final Fantasy Tactics. Instead of static sprites, combatants are **Visual Bytecode Entities** — geometric sigils that mutate based on their current "Verse" (state). The arena is a **Resonance Grid**, where the position of a combatant relative to the source of a phoneme affects its potency.

The UI utilizes **GrimDesign** to ensure every grid cell, unit sigil, and area-of-effect indicator is computed from the same phonemic physics that govern the magic itself.

---

## 2. World-Law / Visual Metaphor

**The Metaphor:** The arena is a "Linguistic Soundboard."
Spells are physical vibrations that travel across a geometric medium. A word spoken at (0,0) has a physical "travel time" and "falloff" as it reaches a target at (4,4).

- **The MUD (The Chronicle):** The absolute source of truth. It doesn't just say "You hit for 10"; it describes the spatial ripple: *"Your SONIC resonance at (2,2) cascaded outward, catching the Void Wraith in its third harmonic tier at (4,2)."*
- **The Grid (The Visionglass):** A PixelBrain-driven visualization of the Chronicle. It shows the "interference patterns" of active spells.
- **PixelBrain Integration:** Every unit is a "Living Sigil." If a unit is silenced, its PixelBrain bytecode becomes `INERT` (gray, static). If it is "Empowered by Will," it becomes `TRANSCENDENT` (glowing, high-frequency pulse).

---

## 3. Input & Output

**Input:**
- **Spatial Verse Submission:** Scroll text + target grid coordinates (or relative direction).
- **Tactical Movement:** Choosing a destination cell on the Resonance Grid.
- **Intent-based Commands:** MUD-style text input for movement (e.g., "move north", "approach wraith").

**Output:**
- **Phaser Grid Visualization:** Real-time rendering of school-specific area-of-effect (AoE) patterns on the grid.
- **PixelBrain Sigil Mutation:** Visual updates to unit appearance based on status effects.
- **Chronicle Update:** Spatial narrative logs.
- **Schema Update:** `BattleState` now includes `gridPositions`, `unitOrientations`, and `activeFieldEffects`.

---

## 4. Implementation Strategy

### 4.1 The Resonance Grid (Phaser + React)
A 7x7 isometric or top-down grid rendered in Phaser.
- **React Layer:** Handles the "Tactical HUD" (unit info, turn order, spell range previews).
- **Phaser Layer:** Handles the grid lines, unit sigils, and "Phonemic Ripples" (AoE animations).
- **GrimDesign Integration:** Grid cell highlights use `computeBlendedHsl(schoolWeights)` to show the "flavor" of the ground (e.g., a "Void-chilled" cell is zinc-blue).

### 4.2 PixelBrain Unit Sigils
Units are not sprites. They are dynamic SVG/Canvas entities composed of PixelBrain primitives:
- **Core:** The school glyph (e.g., `♩` for SONIC).
- **Ring 1 (Vowel Intensity):** Rotates at a speed derived from `vowelFamilyDistribution`.
- **Ring 2 (Syllable Depth):** Geometry complexity (Triangle for 1, Square for 2, Octagon for 4+).
- **Aura (EffectClass):** `HARMONIC` sigils have a soft glow; `TRANSCENDENT` sigils leave trails.

### 4.3 Spatial Combat Logic (Codex)
Extend `combat.session.js` to support:
- `Position { x: number, y: number }`
- `Range { min: number, max: number, shape: 'radial' | 'linear' | 'arc' }`
- **Damage Falloff:** `damage * (1 - (distance * 0.1))`
- **Resonance Bonus:** Standing in a cell that matches your school gives +15% power.

---

## 5. Architectural Spec (GrimComponent: "TacticalLattice")

**Name:** TacticalLattice
**World-law Metaphor:** A loom where phonemes are woven into space.
**Visuals:**
- **Cells:** Obsidian glass with etched lines.
- **Selection:** Glowing outline in `dominantSchool` color.
- **AoE:** Semi-transparent "interference patterns" (CSS gradients + Phaser particles).

**Codex Handoff:**
- New `BattleState` schema with `grid` mapping.
- `calculateDistance(p1, p2)` utility.
- `getAoECells(origin, rangeShape)` utility.

**QA Request to Blackbox:**
- Verify that "move north" updates `playerPos.y`.
- Verify that spells only hit targets within their spatial range.
- Verify that PixelBrain sigils correctly transition from `RESONANT` to `INERT` on death.

---

## 6. Implementation Phases

1. **Phase 1: Grid Foundation (Phaser)** — Render a 7x7 grid with basic movement.
2. **Phase 2: Spatial Schema (Codex)** — Integrate positions into `useCombatEngine`.
3. **Phase 3: PixelBrain Sigils (UI)** — Create the `SigilEntity` component that renders based on bytecode.
4. **Phase 4: MUD-Tactics Integration** — Sync the text terminal with grid movements.
5. **Phase 5: GrimDesign Polish** — Apply phonemic colors to grid effects.

---

## 7. Success Criteria
1. The player can move their sigil on a grid using both mouse and text commands.
2. The visual appearance of the unit (glow, geometry, color) is purely derived from its current combat bytecode.
3. The combat log describes the geometry of the battle, not just the math.
4. The UI feels like a modern, "living" grimoire that understands space.

---
*Author: Gemini CLI*
*Role: World Architect & Lead UI Designer*
*Date: 2026-04-19*
