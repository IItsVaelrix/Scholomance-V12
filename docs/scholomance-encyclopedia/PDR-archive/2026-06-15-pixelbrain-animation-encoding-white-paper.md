# PixelBrain Animation Encoding — White Paper
**Date:** 2026-06-15  
**Author:** Claude (Scholomance UI Agent)  
**Topic:** How to correctly encode multi-frame sprite animations in the PixelBrain / Aseprite pipeline

---

## Why This Exists

An AI agent produced a walk animation script that ran without errors but generated a file that would not play. The output was a 1-frame 128×48 spritesheet instead of a 4-frame 32×48 animation. This document exists so the next AI does not make the same mistake.

---

## The Aseprite Binary Format — What Every AI Needs to Know

An Aseprite file is a sequence of **frames**. Each frame contains **CEL chunks** (pixel data per layer). The header declares how many frames exist. Layer definitions (**LAYER chunks**) live in frame 0 only — subsequent frames only contain CEL chunks.

```
File Header (128 bytes)
  frames: N
  width: W
  height: H

Frame 0
  LAYER chunks (layer names, order, flags) ← only here
  CEL chunks   (pixel data for frame 0)

Frame 1
  CEL chunks   (pixel data for frame 1, same layer order)

Frame N-1
  CEL chunks   (pixel data for frame N-1)
```

An animation with 4 poses **must** have 4 frames. A 128×48 single-frame image with 4 columns is a **spritesheet**, not an **animation**. Aseprite cannot play it as animation — it is a static image.

---

## The PixelBrain Aseprite Codec

**File:** `codex/core/pixelbrain/aseprite-binary-codec.js`

The codec exposes two functions:

```js
encodeAsepriteBinary(payload)  // payload → binary Buffer
decodeAsepriteBinary(input)    // binary → payload
```

### Payload Shape

```js
{
  width: 32,      // width of ONE frame (not the total spritesheet width)
  height: 48,
  frames: [
    {
      frame: 0,
      duration: 150,  // milliseconds
      layers: [
        {
          name: 'body',
          cells: [
            { x: 10, y: 20, color: '#FF8040', emphasis: 1 },
            // one entry per visible pixel
          ],
        },
        // more layers...
      ],
    },
    // more frames...
  ],
}
```

Each frame has its own `layers` array with its own `cells`. Cells are individual pixels — not rectangles.

### Encoder Law

The encoder writes LAYER chunks from `frames[0].layers` (layer names/order are fixed). It writes CEL chunks from **each frame's own `frame.layers`**. If `frame.layers` is missing, it falls back to `frames[0].layers`.

**Do not share a single `layers` array across frames.** Each frame must have its own deep copy of the layer/cell data with that frame's pixel positions applied.

### Decoder Warning: Cell Accumulation Bug

`decodeAsepriteBinary` has a known design issue: the internal `layers` array is shared across frame iterations, so cells accumulate. `frames[1].layers[0].cells` will contain cells from both frame 0 and frame 1. **Do not use the decoder to verify frame isolation.** The encoded binary is correct; the decoder misrepresents it.

Workaround: only decode for round-trip testing on single-frame files. For multi-frame verification, check frame count and canvas dimensions instead.

---

## The Walk Cycle — Correct Pattern

A standard 4-pose walk cycle: **Contact → Down → Passing → Up**

```
Frame 0: Contact — front leg forward, back leg back (widest stance)
Frame 1: Down    — body at lowest point, legs mid-stride
Frame 2: Passing — legs crossing, body rising
Frame 3: Up      — front leg pushing off, body at highest point
```

### Correct Script Structure

```js
// 1. Decode the idle sprite (single frame, all 4 directions side-by-side)
const payload = decodeAsepriteBinary(readFileSync(IN_PATH));
const baseLayers = payload.frames[0].layers;

// 2. Extract one direction's pixels (East = x:32-63) and normalize
const eastLayers = baseLayers.map(layer => ({
  name: layer.name,
  cells: layer.cells
    .filter(c => c.x >= 32 && c.x < 64)
    .map(c => ({ ...c, x: c.x - 32 })),
}));

// 3. Build 4 animation frames — one per walk pose
const animFrames = [];
for (let frameIndex = 0; frameIndex < 4; frameIndex++) {
  const frameLayers = eastLayers.map(layer => {
    const frameCells = layer.cells.map(cell => {
      const c = { ...cell };          // deep copy — never mutate the source
      applyWalkPose(c, layer.name, frameIndex);
      return c;
    });
    return { name: layer.name, cells: frameCells };
  });
  animFrames.push({ frame: frameIndex, duration: 150, layers: frameLayers });
}

// 4. Set width to ONE frame's width, not the total spritesheet width
payload.frames = animFrames;
payload.width = 32;  // ← NOT 128

// 5. Encode and write
writeFileSync(OUT_PATH, encodeAsepriteBinary(payload));
```

### The Fatal Mistake to Avoid

```js
// WRONG — produces 1 frame at 128px wide (a spritesheet, not an animation)
const mergedLayers = [];
for (let frameIndex = 0; frameIndex < 4; frameIndex++) {
  const offsetX = frameIndex * 32;  // ← offsets pixels horizontally
  for (const cell of layer.cells) {
    c.x += offsetX;                 // ← packs all poses into one wide image
    allCells.push(c);
  }
}
payload.frames = [{ frame: 0, duration: 150, layers: mergedLayers }];
payload.width = 128;  // ← tells Aseprite "one frame, 128 wide"
```

This is the exact bug that was committed. It runs without errors. The file is valid Aseprite binary. But Aseprite opens it as a single static image. No animation plays.

---

## Checklist: Before Shipping a Walk Animation Script

- [ ] `payload.frames.length === 4` (or N, matching pose count)
- [ ] `payload.width === 32` (single frame width, not `32 * N`)
- [ ] Each frame has its own `layers` array — no shared references
- [ ] Cells are deep-copied before mutation (`{ ...cell }`)
- [ ] No `offsetX = frameIndex * 32` applied to cell positions
- [ ] `duration` on each frame is set (e.g. 150ms per walk pose at ~180 BPM walk speed)

---

## Isometric / Multi-Direction Convention

The idle sprite sheet layout for Scholomance characters:

```
x:  0-31   = South (front-facing)
x: 32-63   = East
x: 64-95   = North (back-facing)
x: 96-127  = West
```

To extract a direction: `filter(c => c.x >= dirStart && c.x < dirStart + 32).map(c => ({ ...c, x: c.x - dirStart }))`

---

## PixelBrain Animation Laws (Summary)

**Law 1 — Absolute Time Is Sovereign**  
All rotation/oscillation uses absolute time, never delta. `rotation = radiansPerSecond * timeSeconds`. Never `rotation += delta * speed`.

**Law 2 — Bytecode Channels Drive Motion**  
`getBytecodeAMP(time, CHANNEL)` is O(1). Never simulate physics per-frame.

**Law 3 — Pre-Generate, Never Compute Per-Frame**  
Patterns are pre-generated at init and cached. Runtime selects from cache.

**Animation Frame Law (this document)**  
N animation poses = N Aseprite frames. Never pack multiple poses into a single wide frame unless the consumer is a spritesheet-cutting tool (not Aseprite animation).
