# Post-Implementation Report

## 1. Change Identity
- **Report ID:** PIR-20260613-STARBOUND-ESPER-CHIBI-STYLE
- **Feature / Fix Name:** Starbound Esper chibi character art style
- **Author / Agent:** Codex
- **Date:** 2026-06-13
- **Branch / Environment:** local workspace
- **Related Task / Ticket / Prompt:** "implement what is necessary to get a Unique art style fusing Star Ocean, FF6, and Earthbound"
- **Classification:** Structural / Behavioral / UI
- **Priority:** High

---

## 2. Executive Summary
Implemented a new deterministic PixelBrain character style family for the Actor Forge character creator. The style is intentionally original: compact chibi proportions, readable 16-bit fantasy silhouette, space-opera trim, and offbeat saturated accent colors. It adds new material ramps, body/hair/clothing/accessory/detail profiles, SVG shader fallback slots, and a creator-screen style preset. The new forge output remains inside the 32-color sprite palette budget.

---

## 3. Intent and Reasoning
### Problem Statement
PixelBrain had a functioning character foundry, but the creator lacked a distinctive house style for chibi RPG characters. Existing profiles could make generic scholar sprites, but not a strong fusion of sci-fantasy, classic opera-era JRPG readability, and quirky grounded charm.

### Why This Change Was Chosen
The existing profile registry and material registry are the correct extension points. Adding new profiles keeps the system deterministic and avoids hand-painted special cases.

### Assumptions Made
- The requested references should guide broad art-direction traits, not direct character or asset copying.
- The creator should expose the new style as a selectable preset while preserving existing controls.
- Palette budget must stay at or below 32 colors per direction.

### Alternatives Considered
- AI-generated bitmap sprites: rejected because PixelBrain already has deterministic lattice output and bytecode provenance.
- Replacing all existing creator defaults without a selector: rejected because current scholar presets remain useful.
- Updating old golden SVG snapshots: rejected because the observed `npc.void.v1` golden mismatch is outside this new style scope.

---

## 4. Scope of Change
### In Scope
- New character material ramps.
- New chibi body, hair, clothing, accessory, and detail profiles.
- Actor Forge style preset and style selector.
- Regression coverage for the new style profile family.

### Out of Scope
- Direct replication of any external game's characters, costumes, or sprites.
- Golden SVG snapshot refresh for existing `npc.void.v1`.
- Broad Actor Forge layout redesign.

### Change Type
- [x] UI only
- [x] Logic only
- [x] Data model
- [x] Styling / layout
- [x] Documentation
- [x] Multi-layer / cross-cutting

---

## 5. Verification
- `npm test -- tests/core/pixelbrain/character-creator.test.js tests/core/pixelbrain/material-shader-index.test.js`
- `npm run build`
- Direct `forgeCharacter()` sample produced four directions with palette sizes 27-29 and all style overlay parts present.
- Face refinement follow-up:
  - Added `character.face.eye.humanSoft`, `character.face.nose.humanSoft`, and `character.face.mouth.humanSoft`.
  - Updated the Starbound Esper creator preset to use the softer human face profiles and leave the visor off by default so the face remains visible.
  - Removed the creator-screen SVG illustrated preview so the character creator presents only PixelBrain PNG pixel art and the pixel spritesheet.
  - Added canonical Starbound chibi silhouette row masks for head, torso, arms, legs, and feet so the body is constructed from rounded pixel-art anatomy instead of stacked rectangular modules.
  - Fitted Starbound jacket, shorts, and boots to matching clothing masks so outfit pixels no longer force the sprite back into a block torso/limb shape.
  - Added side-specific sleeve masks and boot bitmap masks to reduce plug-in shoulder joints and symmetric boot blocks.
  - Pulled the constellation chest detail inward so costume ornaments stay inside the torso silhouette instead of defining the body contour.
  - Softened the long-straight hair profile side falloff so user-selected long hair does not reintroduce vertical column edges.
  - Added `scripts/generate-starbound-esper-aseprite.mjs` and generated a native Aseprite-compatible 128x48 S/E/N/W sheet with editable part layers for the void chibi variant.
  - Replaced formula-driven `character.hair.longStraight` row widths with explicit south/north/profile bitmap masks after diagnosing visible stair-stepping as profile math rather than PNG/Aseprite engine behavior.
  - Removed the inner antenna base pixels from `signalAntenna` so the stems grow out of the head rather than sitting on top.
  - Reworked `jacketConstellation` into a fixed-color, centered motif with identical relative coordinates across S/E/N/W slots.
  - Straightened the Starbound chibi leg mask to remove mid-leg inner-line wobble.
  - Verified with `npm test -- tests/core/pixelbrain/character-creator.test.js tests/core/pixelbrain/character-face-composer.test.js`.
  - Verified with `npm run build`.
  - Direct `forgeCharacter()` sample produced all face parts with palette sizes south 30, east 30, north 27, west 32.
  - Screenshot-like direct `forgeCharacter()` sample using Starbound body, long-straight void hair, void skin, and void-glow eyes produced palette sizes south 27, east 27, north 21, west 28.
  - Post boot/sleeve tuning screenshot-like direct `forgeCharacter()` sample produced palette sizes south 25, east 26, north 22, west 28.
  - Generated `output/foundry/starbound-esper-void-chibi/starbound-esper-void-chibi.aseprite` and decoded it through `decodeFoundryAsepriteBinary()`: 128x48, Aseprite magic `0xA5E0`, 32-bit RGBA, 12 editable part layers.
  - Verified with `npm test -- tests/core/pixelbrain/foundry-aseprite-bridge.test.js tests/qa/generation/pixelbrain-aseprite-export.test.js`.
  - Regenerated the Aseprite deliverable after the long-hair mask fix: total cells 1586, palette sizes south 25, east 26, north 22, west 27; decoded native file remains 128x48, 32-bit RGBA, 12 layers.
  - Regenerated the Aseprite deliverable after antenna/constellation/leg cleanup: total cells 1600, palette sizes south 25, east 23, north 22, west 25; constellation layer matches the same relative coordinates and colors in all four slots.

## 6. Known Residuals
- Full lint still fails on pre-existing repository issues outside this change.
- The broader character SVG test run still reports an existing golden mismatch for `npc.void.v1`; the new style tests pass.
