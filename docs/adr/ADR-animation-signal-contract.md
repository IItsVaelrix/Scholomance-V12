# ADR: Read Word Animation Signal Contract

## Status

Accepted.

## Context

`ScrollEditor.jsx` writes per-word `animationSignal` values that are consumed by `AnimatedSurface` through the animation spec resolver.

The intended lineage is:

```txt
word state
  -> animationSignal
  -> computeAnimationSpec / useAnimationSpec
  -> AnimatedSurface props
  -> CSS class / overlay / emergent effect
```

## Contract

### When reduced-motion is true

- `animClass` must be `null` or an inert class.
- `overlays` must be disabled unless static.
- `emergent` animation effects must be disabled.
- Layout-affecting transforms must not be emitted.
- Opacity-only visibility changes are allowed only with zero-duration transitions.

### When reduced-motion is false

- Word-level animation may use CSS classes.
- Truesight ghost layers may animate.
- Palette interpolation may run.
- GPU promotion is allowed for heavy overlays.

## Test Expectations

A reduced-motion test must assert that `computeAnimationSpec` emits no active animation class, no animated overlay, and no emergent effect for every supported `animationSignal`.

## Ownership

- `ScrollEditor.jsx` owns signal assignment.
- `computeAnimationSpec` owns signal interpretation.
- `AnimatedSurface` owns final render application.
