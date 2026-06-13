# Construction Lines (SketchAMP + Construction Line Microprocessor)

The single highest-leverage habit in professional pixel art for any radial, circular, shield, orb, lens, or focal element: **draw the construction first**.

This reference exists so the PixelBrain mentorship persona (and you) always have the exact mental model, Aseprite workflow, critique language, and (emerging) deterministic substrate to use.

## Why Construction Lines Matter (The Brutal Truth)

Almost every amateur shield or energy effect fails at the **geometry stage**, not the shading stage.

- Off-center "center"
- Rings that drift 1–2px between each other
- Radials that are not actually radial
- Ellipses that are egg-shaped because the artist eyeballed the bounding box

Once the rings and center are wrong, no amount of beautiful energy glow or metal shading will save the silhouette. It will always read as "hand-made by someone who didn't measure."

Construction lines solve this by making the geometry **explicit and external** before you commit a single "real" pixel.

## The Authoritative Model: SketchAMP + Construction Line Microprocessor

In the PixelBrain / Scholomance Item Foundry architecture there is now (see the 2026-06-12 PDR) a formal **SketchAMP** whose job is the early reference / sketch phase.

Inside it lives the **Construction Line Microprocessor** — a focused, spec-driven unit that can:

- Generate perfect (pixel-correct) center, concentric rings, radials, axes, and proportion guides from a tiny declarative spec.
- Extract and audit construction geometry from existing reference pixels.
- Emit tagged cells for the canonical `00_Reference` layer.
- Hand off exact `center`, `ringRadii`, and symmetry data to every later pass (Structure, Energy, Focal, emblems, shading, contrast AMPs).

This is the engineering reality. When we say "lock your rings to the construction," in the future the engine itself will be able to enforce or at least strongly suggest it.

For now (and for manual work), we still do it by eye and discipline — but we do it using the same mental model the microprocessor will use.

## Canonical Layer Home (Aseprite + Foundry Bridge)

For shield-like and radial assets the Foundry Aseprite bridge expects this layer order:

- `00_Reference` — construction lines + any loose reference marks (low opacity, usually locked on import, bright non-destructive guide color)
- `10_Structure` — the "inked" outer silhouette and major structural rings
- `20_Energy` — concentric energy cells, inner rings, etc.
- `30_Focal` — the center emblem or highest-contrast focal element
- `40_Shading`
- `50_Glow_Effects`
- `99_Final` (hidden flattened preview)

**Rule:** Construction lives in 00_Reference. It should not contribute final non-transparent pixels unless the artist deliberately promotes a guide into structure.

## Practical Aseprite Workflow (Today)

1. **Create the reference layer first**
   - New layer at the very bottom (or top with low opacity), name it exactly `00_Reference` (the bridge cares about the prefix).
   - Use a bright, saturated color that is **not** in your final palette (classic choices: pure cyan #00FFFF, magenta, or lime). This color must die before final export.

2. **Establish the center immediately**
   - Draw a small cross or 1px dot + 4 cardinal ticks. This is now law.
   - For a 64x64 shield, center is often at (31,31) or (32,32) depending on parity. Decide once and never move it.

3. **Draw the major rings using the best ellipse tool you have**
   - Aseprite's Ellipse tool + holding Shift for circles, or the pixel-perfect mode.
   - For each important radius, draw the full ellipse, then (optionally) "ink" only the cardinal and 45-degree points if you want sparse guides.
   - Better: keep the full faint rings. They are cheap.

4. **Add radials / spokes**
   - From the center, draw straight lines at regular angular intervals (6, 8, 12 spokes are common for energy shields).
   - Use the Line tool with pixel-perfect snap. For perfect symmetry you can draw one and then duplicate + rotate (Aseprite has rotation by pixel or you can use the transform + grid).
   - These spokes are gold for placing energy "sparks" or ensuring your focal element has correct rotational symmetry.

5. **Add bounding box / proportion guides**
   - Light rectangle or ellipse that represents the final outer silhouette.
   - Horizontal, vertical, and sometimes diagonal axes through the center.
   - Occasional proportion ticks at 1/4, 1/2, 3/4 along major axes (useful for non-circular shields too).

6. **Lock it and drop opacity**
   - 10–25% opacity is usually perfect. You want to see it while drawing on Structure but not have it fight the eye.
   - Lock the layer so you cannot accidentally draw "real" pixels on it.

7. **Work outward-in or inward-out on Structure**
   - Many pros draw the outermost ring first (it defines the silhouette), then the inner rings, snapping to the construction.
   - The center focal is drawn *last* among the structural elements because it is the most sensitive to being off-center.

8. **Before you shade, hide or delete the construction (or keep it until final review)**
   - In the bridge workflow the reference layer is preserved for future editing sessions.

## Critique Language (Use These Phrases)

When reviewing a shield or radial piece (yours or someone else's):

- "Center is +1px down-right. The whole design is torqued."
- "Ring 2 and Ring 3 have 2px vertical drift between 9 o'clock and 3 o'clock. That's visible even at icon size."
- "Your spokes are not truly radial — the 2 o'clock and 8 o'clock lines are canted. Rebuild from the construction cross."
- "The focal element is fighting the outer ring. The construction would have told you the safe zone was 2px smaller."
- "Good ring regularity on the outer two. The inner core is the only one that drifted — fix the center marker first."

Always be specific about which ring / which angle / how many pixels. Vague "it feels a bit off" is useless.

## Quick Void Shield Construction Drill (20–40 minutes)

Target: a clean 4–7 ring energy shield.

Spec (you can write this on a sticky note):

- Canvas: 64x64 or 48x48
- Center: dead middle (31,31 or 32,32)
- Rings at radii: 4 / 9 / 14 / 19 / 24 (adjust for your size)
- 6 or 8 radials
- One outer bounding ellipse that will become your silhouette

Steps:
1. 5 minutes: only the center cross + outer bound ellipse on Reference.
2. 10 minutes: add all the rings as clean ellipses. Do not shade or fill anything.
3. 5 minutes: add the radials. Check by eye that opposite spokes align through the center.
4. Hide Reference. Now draw only the "inked" versions of the rings you actually want on a Structure layer, snapping to the ghost guides.
5. Unhide Reference and compare. Any ring that wobbled more than 1px gets corrected while Reference is still visible.
6. Promote the best version. Hide or lock Reference again.
7. Only *then* begin energy coloring, shading, and the focal.

Repeat this exact drill 5 times with different ring counts and eccentricities. After the 5th you will hate the idea of ever drawing a shield without construction again.

## Future State (When the Microprocessor Lands)

You will be able to hand a tiny JSON spec (or even just click "Generate Construction" in the editor) and get a perfect `00_Reference` layer dropped in with mathematically regular rings and spokes.

The same spec will be stored in the asset packet so:

- Later passes can read the authoritative center and ring list.
- The diagnostic system can scream if a final asset deviates too far from its own construction.
- The PixelBrain Grok mentor can load the exact spec and say "your ring-3 should be at radius 17; you are at 16.3 on average — here is the delta map."

Until then, we emulate the microprocessor with discipline, bright guide colors, and the layer convention.

## Related References (load these together)

- `fundamentals.md` (especially silhouette + readability)
- `aseprite-mastery.md` (layer discipline, pixel-perfect tools, grid)
- `critique-checklist.md` (construction evaluation always happens in step 1–2)
- `exercises-drills.md` (the shield construction drill above should live there too once expanded)
- The official engineering PDR: `2026-06-12-sketchamp-construction-line-microprocessor-pdr.md` (in the encyclopedia PDR-archive)

Construction lines are not decoration. They are the skeleton. Everything else is meat on those bones.
