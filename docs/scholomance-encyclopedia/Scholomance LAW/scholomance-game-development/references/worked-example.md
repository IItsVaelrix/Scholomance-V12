# Worked Example: Isometric Animated VOID Brazier

This example demonstrates route selection and proof. Adapt neighboring palettes, materials, canvas sizes, and renderer paths rather than treating the sample as a universal asset.

## 1. Declare Authority

```text
source: void_brazier.scdl
contract: SCDL-AST-v1 -> PixelBrainAssetPacket per frame
processor: SCDL compiler with SemQuant and frame expansion
derived: JSON, PNG, SVG, Aseprite, SCDL-FRAME-LOOP-v1
proof: check, repeated compile, alpha/anchor/live-grid inspection
```

The prop is geometry-changing pixel animation, so SCDL frames own it. The isometric gene also applies because the prop will be placed in a 2.5D combat cell.

## 2. Author One SCDL Source

```scdl
# Bottom-center anchored prop; upper-left/NW light law.
asset void_brazier canvas 32x48

palette {
  metal_hi = #6E7899
  metal    = #293149
  metal_lo = #0B0D18
  flame_hi = #E8FCFF
  flame    = #00E5FF
  flame_lo = #3157A8
}

part stand material voidsteel {
  symmetry x
  polygon 12 24 15 24 15 44 10 44 metal
  line 12 24 10 44 metal_hi
  line 15 24 15 44 metal_lo
}

part bowl material voidsteel {
  ellipse 15.5 23 radius 10 ry 4 metal_hi
  polygon 6 23 25 23 21 30 10 30 metal
  line 10 30 21 30 metal_lo
}

part flame material cyan_glow {
  polygon 15.5 8 21 22 15.5 19 10 22 flame
  polygon 15.5 12 18 21 15.5 18 13 21 flame_hi
  glow radius 2
}

loop idle duration 160

frame 1 "lean-left" {
  part flame material cyan_glow {
    polygon 12 9 21 22 15 19 10 22 flame
    polygon 13 13 18 21 15 18 13 21 flame_hi
    glow radius 2
  }
}

frame 2 "surge" {
  part flame material cyan_glow {
    polygon 15.5 5 22 22 15.5 18 9 22 flame
    polygon 15.5 10 19 21 15.5 17 12 21 flame_hi
    glow radius 3
  }
}

frame 3 "lean-right" {
  part flame material cyan_glow {
    polygon 19 9 22 22 16 19 10 22 flame
    polygon 18 13 19 21 16 18 13 21 flame_hi
    glow radius 2
  }
}

export json png svg aseprite
```

Frame indices are dense. Each `flame` block is a replacement, so it keeps the base painter slot and has no `after` anchor. The stand and bowl remain unchanged.

## 3. Check and Compile

```bash
node codex/core/pixelbrain/scdl/scdl.cli.js check path/to/void_brazier.scdl
node codex/core/pixelbrain/scdl/scdl.cli.js compile path/to/void_brazier.scdl \
  --export json,png,svg,aseprite
```

Expected derived files include per-frame target-suffixed exports, one combined `void_brazier-aseprite.aseprite`, and `void_brazier-frameloop.json`. Never hand-edit them.

## 4. Prove Determinism

Compile twice from unchanged source into separate temporary output directories and compare corresponding JSON, manifests, SVG, Aseprite, and PNG outputs. Packet IDs and bytes must match.

If only semantic annotations change, geometry identity should remain stable. If pixels change, explain the source operation that changed them.

## 5. Integrate in Isometric Space

Use the compiled SCDL alpha as silhouette authority. Restore the exact `32x48` canvas after any external enhancement and mask it with the SCDL-derived alpha. The bottom-center anchor is `(16, 48)` in local canvas terms.

Draw the floor tile first. Draw the brazier afterward at its native dimensions with its bottom center registered to the projected cell anchor. Do not replace the floor diamond with the prop and do not force the prop into a `128x64` tile rectangle.

## 6. Verify

```bash
file path/to/void_brazier-f0-png.png
```

Confirm:

- Every frame is exactly `32x48` RGBA.
- Alpha contains fully transparent pixels outside the silhouette.
- The base and frame-0 packet identity remain stable across recompiles.
- Painter order remains stand, bowl, flame.
- The prop sits on the floor at bottom center without covering the tile.
- All frames retain the same anchor and do not jump.
- Highlights and flame shading read from upper-left/NW.
- The procedural grid, targeting overlays, and units remain aligned in the live combat view.

The `.scdl` is production source. All listed image, vector, binary, packet, and manifest files are derived artifacts.
