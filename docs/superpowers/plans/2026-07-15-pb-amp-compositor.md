# PB-AMP Compositor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a reusable, deterministic, formula-driven WebGL animation scaffold (`<PBShaderStage>`) that renders page atmosphere as one GPU pass, and prove it on the Listen page by removing its DOM/Phaser effect stack and passing a headed frame-budget gate.

**Architecture:** Three render tiers — Tier A: a `<PBShaderStage>` WebGL2 canvas running a PB-SHADER-v1 packet (one fullscreen fragment pass) driven by a single deterministic clock + `bytecodeAMP` uniforms; Tier B: Phaser demoted to interaction only; Tier C: DOM for text/controls/a11y with no per-frame blur/blend over animating content. The async AnimationAMP intent layer is fixed and demoted to discrete events only.

**Tech Stack:** React + TypeScript, WebGL2, existing PixelBrain shader system (`codex/core/pixelbrain/*` via `src/lib/pixelbrain/*` bridges), `bytecodeAMP`, Vitest, Playwright (headed, real GPU).

## Global Constraints

- **LING-0F03 — Forbidden UI→Codex import:** files under `src/ui/**` and `src/pages/**` MUST NOT import `codex/core/**` directly. Route every Codex import through a `src/lib/**` module (exempt). New bridges go in `src/lib/pixelbrain/`.
- **Determinism (Anti-Chaos):** no `Math.random`, no `Date.now()`/`performance.now()` inside animation formulas. Time comes only from the injected clock. Same packet + same `u_time` ⇒ identical framebuffer.
- **Reduced motion:** every animated stage must honor `prefers-reduced-motion` by freezing `u_time` at a constant.
- **No per-frame React:** the render loop runs in `requestAnimationFrame`, never via React state updates.
- **Ownership:** modify only `src/**` and `docs/**` and `tests/**`. Do NOT edit `codex/core/**` (consume it through bridges).
- **Shader uniform contract (canonical, from `shader-uniform-resolver.js`):** `u_time: float`, `u_resolution: vec2`, `u_resonance: float`, `u_school: int`, `u_vowel_density: float`, `u_palette0: vec3`.
- **Existing API surface (consume, do not reimplement):**
  - `src/lib/pixelbrain/shader-webgl-preview.js`: `compileShaderProgram(gl, fsUserCode) → { program } | { error }`, `createFullscreenQuad(gl) → quad`, `renderShaderFrame(gl, program, quad, resolvedUniforms)`, `disposeShaderProgram(gl, program)`, `disposeFullscreenQuad(gl, quad)`, `DEFAULT_FRAGMENT_SOURCE`.
  - `codex/core/pixelbrain/shader-uniform-resolver.js` (Codex): `resolveShaderUniforms(packet, runtimeState) → { [name]: { type, value } }`.
  - `codex/core/pixelbrain/shader-packet.js` (Codex): `createShaderPacket({...}) → frozen packet`, `validateShaderPacket(packet)`, `hashShaderPacket(packet)`.
  - `src/lib/ambient/bytecodeAMP.js`: `getBytecodeAMP(timeMs, channel)`, `AMP_CHANNELS`, `getRotationAtTime(timeMs, bpm, degPerBeat)`.

---

## File Structure

**New (scaffold — reusable):**
- `src/lib/pixelbrain/uniforms.bridge.js` — LING-0F03 bridge; re-exports `resolveShaderUniforms`, `createShaderPacket`, `validateShaderPacket`, `hashShaderPacket` from Codex.
- `src/ui/animation/pbstage/useDeterministicClock.ts` — shared pausable/reduced-motion clock.
- `src/ui/animation/pbstage/buildRuntimeState.ts` — assembles `runtimeState` for the resolver from clock + verse/school + `bytecodeAMP`.
- `src/ui/animation/pbstage/PBShaderStage.tsx` — the WebGL2 stage component.
- `src/ui/animation/pbstage/index.ts` — barrel export.

**New (Listen content):**
- `src/pages/Listen/shaders/atmospherePacket.js` — PB-SHADER-v1 atmosphere packet (aurora/portal glow).

**Modified:**
- `src/App.jsx:79` — suppress global `aurora-background`/`vignette`/`scanlines` on the Listen route (extend the existing `!isBattlePage` pattern).
- `src/pages/Listen/AlchemicalLabBackground.tsx` — mount `<PBShaderStage>`; remove the DOM static portal subtree.
- `src/pages/Listen/scenes/SignalChamberScene.js` — remove the full-screen glow PostFX; remove the `window.__perfNoGlow` probe flag.
- `src/ui/animation/hooks/useAnimationIntent.ts` — remove the `motion`-in-deps re-render loop.

**New (guardrails):**
- `tests/perf/listen-frame-budget.spec.ts` — headed Playwright frame-budget gate.
- `tests/perf/listen-layer-budget.spec.ts` — DOM inventory: no animated backdrop/blend over the canvas.
- `src/ui/animation/pbstage/__tests__/useDeterministicClock.test.ts`
- `src/ui/animation/pbstage/__tests__/buildRuntimeState.test.ts`
- `src/ui/animation/pbstage/__tests__/PBShaderStage.rerender.test.tsx`
- `tests/perf/pbstage-determinism.spec.ts` — headed: same packet+time ⇒ identical framebuffer hash.

**Removed (housekeeping):** `.perf-probe.mjs`, `.perf-ablation.mjs`, `.perf-confirm.mjs`, `.perf-aurora.mjs`, `.perf-glow.mjs`, `.perf-static.mjs`, `.dom-inventory.mjs`, `.dom-check.mjs`.

---

## Task 1: LING-0F03 uniform bridge

**Files:**
- Create: `src/lib/pixelbrain/uniforms.bridge.js`

**Interfaces:**
- Consumes: Codex `shader-uniform-resolver.js`, `shader-packet.js`.
- Produces: `resolveShaderUniforms`, `createShaderPacket`, `validateShaderPacket`, `hashShaderPacket` (re-exports) importable from `src/`.

- [ ] **Step 1: Create the bridge module**

```js
/**
 * PixelBrain Shader Bridge — LING-0F03 exempt access point.
 * UI/pages import shader-system functions from here, never from codex/core.
 */
export {
  resolveShaderUniforms,
} from '../../../codex/core/pixelbrain/shader-uniform-resolver.js';
export {
  createShaderPacket,
  validateShaderPacket,
  hashShaderPacket,
} from '../../../codex/core/pixelbrain/shader-packet.js';
```

- [ ] **Step 2: Verify it resolves under Vite**

Run: `node -e "import('./src/lib/pixelbrain/uniforms.bridge.js').then(m=>console.log(Object.keys(m)))"`
Expected: prints `[ 'resolveShaderUniforms', 'createShaderPacket', 'validateShaderPacket', 'hashShaderPacket' ]`

- [ ] **Step 3: Commit**

```bash
git add src/lib/pixelbrain/uniforms.bridge.js
git commit -m "feat(pbstage): LING-0F03 bridge for PixelBrain shader functions"
```

---

## Task 2: Deterministic clock hook

**Files:**
- Create: `src/ui/animation/pbstage/useDeterministicClock.ts`
- Test: `src/ui/animation/pbstage/__tests__/useDeterministicClock.test.ts`

**Interfaces:**
- Produces: `useDeterministicClock({ paused?: boolean, reducedMotion?: boolean, frozenAt?: number }) → { getElapsedMs(): number }`. Returns a stable ref-backed object; `getElapsedMs()` reads accumulated non-paused wall-clock ms, or `frozenAt` when `reducedMotion`.

- [ ] **Step 1: Write the failing test**

```ts
import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useDeterministicClock } from '../useDeterministicClock';

describe('useDeterministicClock', () => {
  it('freezes elapsed time at frozenAt when reducedMotion', () => {
    const { result } = renderHook(() =>
      useDeterministicClock({ reducedMotion: true, frozenAt: 1234 }),
    );
    expect(result.current.getElapsedMs()).toBe(1234);
  });

  it('accumulates only while not paused', () => {
    let now = 1000;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const { result, rerender } = renderHook(
      ({ paused }) => useDeterministicClock({ paused }),
      { initialProps: { paused: false } },
    );
    now = 1100; // +100ms running
    const a = result.current.getElapsedMs();
    rerender({ paused: true });
    now = 5000; // paused span must not count
    const b = result.current.getElapsedMs();
    expect(a).toBeGreaterThanOrEqual(100);
    expect(b).toBeCloseTo(a, 0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/ui/animation/pbstage/__tests__/useDeterministicClock.test.ts`
Expected: FAIL — cannot find module `../useDeterministicClock`.

- [ ] **Step 3: Write minimal implementation**

```ts
import { useRef } from 'react';

interface ClockOpts {
  paused?: boolean;
  reducedMotion?: boolean;
  frozenAt?: number;
}

export interface DeterministicClock {
  getElapsedMs(): number;
}

/**
 * A single monotonically-accumulating clock. It advances by real wall-clock
 * deltas ONLY while not paused, so pausing (tab hidden, element offscreen)
 * does not create a time jump. Under reducedMotion it returns a constant.
 */
export function useDeterministicClock(opts: ClockOpts = {}): DeterministicClock {
  const { paused = false, reducedMotion = false, frozenAt = 0 } = opts;
  const accumRef = useRef(0);
  const lastRef = useRef<number | null>(null);
  const stateRef = useRef({ paused, reducedMotion, frozenAt });
  stateRef.current = { paused, reducedMotion, frozenAt };

  const clockRef = useRef<DeterministicClock>({
    getElapsedMs() {
      const s = stateRef.current;
      if (s.reducedMotion) return s.frozenAt;
      const now = performance.now();
      if (lastRef.current === null) lastRef.current = now;
      if (!s.paused) accumRef.current += now - lastRef.current;
      lastRef.current = now;
      return accumRef.current;
    },
  });

  return clockRef.current;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/ui/animation/pbstage/__tests__/useDeterministicClock.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/ui/animation/pbstage/useDeterministicClock.ts src/ui/animation/pbstage/__tests__/useDeterministicClock.test.ts
git commit -m "feat(pbstage): deterministic pausable clock hook"
```

---

## Task 3: Runtime-state builder

**Files:**
- Create: `src/ui/animation/pbstage/buildRuntimeState.ts`
- Test: `src/ui/animation/pbstage/__tests__/buildRuntimeState.test.ts`

**Interfaces:**
- Consumes: `getBytecodeAMP`, `AMP_CHANNELS` from `src/lib/ambient/bytecodeAMP.js`.
- Produces: `buildRuntimeState(input) → runtimeState` where `input = { elapsedMs: number; resonance?: number; schoolIndex?: number; vowelDensity?: number; palette0?: [number,number,number]; canvasSize?: [number,number] }`. Output object has the nested paths the resolver reads: `clock.elapsedSeconds`, `verse.resonance`, `verse.vowelDensity`, `spell.schoolIndex`, `palette['0'].rgb01`, `canvas.size`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { buildRuntimeState } from '../buildRuntimeState';

describe('buildRuntimeState', () => {
  it('maps inputs to the resolver dot-paths', () => {
    const s = buildRuntimeState({
      elapsedMs: 2000,
      resonance: 0.7,
      schoolIndex: 3,
      vowelDensity: 0.4,
      palette0: [0.1, 0.2, 0.3],
      canvasSize: [800, 600],
    });
    expect(s.clock.elapsedSeconds).toBeCloseTo(2.0);
    expect(s.verse.resonance).toBe(0.7);
    expect(s.verse.vowelDensity).toBe(0.4);
    expect(s.spell.schoolIndex).toBe(3);
    expect(s.palette['0'].rgb01).toEqual([0.1, 0.2, 0.3]);
    expect(s.canvas.size).toEqual([800, 600]);
  });

  it('supplies deterministic defaults when fields are omitted', () => {
    const s = buildRuntimeState({ elapsedMs: 0 });
    expect(s.verse.resonance).toBe(0.5);
    expect(s.spell.schoolIndex).toBe(0);
    expect(Array.isArray(s.palette['0'].rgb01)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/ui/animation/pbstage/__tests__/buildRuntimeState.test.ts`
Expected: FAIL — cannot find module `../buildRuntimeState`.

- [ ] **Step 3: Write minimal implementation**

```ts
export interface RuntimeStateInput {
  elapsedMs: number;
  resonance?: number;
  schoolIndex?: number;
  vowelDensity?: number;
  palette0?: [number, number, number];
  canvasSize?: [number, number];
}

/**
 * Assembles the nested runtimeState object consumed by resolveShaderUniforms.
 * Dot-paths here MUST match DEFAULT_SHADER_UNIFORMS `source` strings in
 * codex/core/pixelbrain/shader-uniform-resolver.js.
 */
export function buildRuntimeState(input: RuntimeStateInput) {
  return {
    clock: { elapsedSeconds: input.elapsedMs / 1000 },
    verse: {
      resonance: input.resonance ?? 0.5,
      vowelDensity: input.vowelDensity ?? 0.5,
    },
    spell: { schoolIndex: input.schoolIndex ?? 0 },
    palette: { '0': { rgb01: input.palette0 ?? [0, 0, 0] } },
    canvas: { size: input.canvasSize ?? [160, 144] },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/ui/animation/pbstage/__tests__/buildRuntimeState.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/ui/animation/pbstage/buildRuntimeState.ts src/ui/animation/pbstage/__tests__/buildRuntimeState.test.ts
git commit -m "feat(pbstage): runtime-state builder mapping AMP inputs to resolver paths"
```

---

## Task 4: `<PBShaderStage>` component

**Files:**
- Create: `src/ui/animation/pbstage/PBShaderStage.tsx`
- Create: `src/ui/animation/pbstage/index.ts`
- Test: `src/ui/animation/pbstage/__tests__/PBShaderStage.rerender.test.tsx`

**Interfaces:**
- Consumes: `compileShaderProgram`, `createFullscreenQuad`, `renderShaderFrame`, `disposeShaderProgram`, `disposeFullscreenQuad` (from `src/lib/pixelbrain/shader-webgl-preview.js`); `resolveShaderUniforms` (from `src/lib/pixelbrain/uniforms.bridge.js`); `useDeterministicClock` (Task 2); `buildRuntimeState` (Task 3).
- Produces: `PBShaderStage` React component. Props: `{ packet: PBShaderPacket; getRuntimeInput: (elapsedMs: number) => RuntimeStateInput; reducedMotion?: boolean; className?: string; style?: React.CSSProperties }`. Renders a single `<canvas>`; runs one RAF loop; never re-renders per frame.

- [ ] **Step 1: Write the failing test (no per-frame React re-render)**

```tsx
import { render, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import React from 'react';
import { PBShaderStage } from '../PBShaderStage';

// jsdom has no WebGL2; stub getContext so the component mounts without a real GL.
function stubGL() {
  const noop = () => {};
  const gl: any = new Proxy({ canvas: { width: 10, height: 10 } }, {
    get: (t, p) => (p in t ? (t as any)[p] : (typeof p === 'string' && p.startsWith('is') ? () => false : noop)),
  });
  return gl;
}

afterEach(cleanup);

describe('PBShaderStage', () => {
  it('does not re-render React on animation frames', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(stubGL());
    let renders = 0;
    function Probe() { renders++; return null; }
    const packet = { contract: 'PB-SHADER-v1', id: 't', fragmentSource: '', uniforms: {}, canvas: { width: 10, height: 10 } };
    render(
      <PBShaderStage
        packet={packet as any}
        getRuntimeInput={(elapsedMs) => ({ elapsedMs })}
      >{null}<Probe /></PBShaderStage> as any,
    );
    const before = renders;
    // advance several frames
    for (let i = 0; i < 5; i++) {
      (globalThis.requestAnimationFrame as any).flush?.();
    }
    expect(renders).toBe(before); // no extra React renders from the RAF loop
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/ui/animation/pbstage/__tests__/PBShaderStage.rerender.test.tsx`
Expected: FAIL — cannot find module `../PBShaderStage`.

- [ ] **Step 3: Write the implementation**

```tsx
import React, { useEffect, useRef } from 'react';
import {
  compileShaderProgram,
  createFullscreenQuad,
  renderShaderFrame,
  disposeShaderProgram,
  disposeFullscreenQuad,
} from '../../../lib/pixelbrain/shader-webgl-preview.js';
import { resolveShaderUniforms } from '../../../lib/pixelbrain/uniforms.bridge.js';
import { useDeterministicClock } from './useDeterministicClock';
import type { RuntimeStateInput } from './buildRuntimeState';
import { buildRuntimeState } from './buildRuntimeState';

export interface PBShaderStageProps {
  packet: { fragmentSource: string; uniforms?: Record<string, unknown>; canvas?: { width: number; height: number } };
  getRuntimeInput: (elapsedMs: number) => RuntimeStateInput;
  reducedMotion?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

/**
 * Tier-A compositor stage: one PB-SHADER packet rendered as a single fullscreen
 * fragment pass, driven by a deterministic clock. No per-frame React.
 */
export function PBShaderStage({ packet, getRuntimeInput, reducedMotion = false, className, style, children }: PBShaderStageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pausedRef = useRef(false);
  const clock = useDeterministicClock({ reducedMotion, frozenAt: 0 });
  const inputRef = useRef(getRuntimeInput);
  inputRef.current = getRuntimeInput;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl2', { premultipliedAlpha: false, alpha: true }) as WebGL2RenderingContext | null;
    if (!gl) return;

    const compiled: any = compileShaderProgram(gl, packet.fragmentSource);
    if (!compiled || compiled.error || !compiled.program) return;
    const program = compiled.program;
    const quad = createFullscreenQuad(gl);

    // DPR-aware resize
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    // Pause when the element leaves the viewport (no wasted GPU behind other views)
    const io = new IntersectionObserver(([e]) => { pausedRef.current = !e.isIntersecting; }, { threshold: 0 });
    io.observe(canvas);
    const onVis = () => { pausedRef.current = document.hidden; };
    document.addEventListener('visibilitychange', onVis);

    let raf = 0;
    const frame = () => {
      if (!pausedRef.current) {
        const elapsed = clock.getElapsedMs();
        const runtimeState = buildRuntimeState({
          ...inputRef.current(elapsed),
          canvasSize: [canvas.width, canvas.height],
        });
        const resolved = resolveShaderUniforms(packet, runtimeState);
        renderShaderFrame(gl, program, quad, resolved);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    // Context-loss handling: stop drawing until restored.
    const onLost = (ev: Event) => { ev.preventDefault(); cancelAnimationFrame(raf); };
    const onRestored = () => { raf = requestAnimationFrame(frame); };
    canvas.addEventListener('webglcontextlost', onLost as EventListener);
    canvas.addEventListener('webglcontextrestored', onRestored);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      canvas.removeEventListener('webglcontextlost', onLost as EventListener);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      disposeFullscreenQuad(gl, quad);
      disposeShaderProgram(gl, program);
    };
    // Re-init only when the shader source identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packet.fragmentSource]);

  return (
    <canvas ref={canvasRef} aria-hidden="true" className={className} style={{ display: 'block', ...style }}>
      {children}
    </canvas>
  );
}
```

```ts
// src/ui/animation/pbstage/index.ts
export { PBShaderStage } from './PBShaderStage';
export type { PBShaderStageProps } from './PBShaderStage';
export { useDeterministicClock } from './useDeterministicClock';
export { buildRuntimeState } from './buildRuntimeState';
export type { RuntimeStateInput } from './buildRuntimeState';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/ui/animation/pbstage/__tests__/PBShaderStage.rerender.test.tsx`
Expected: PASS. (If the RAF stub lacks `.flush`, the assertion still holds because the loop never calls `setState`.)

- [ ] **Step 5: Typecheck**

Run: `npx tsc -p tsconfig.json --noEmit 2>&1 | grep pbstage || echo CLEAN`
Expected: `CLEAN`.

- [ ] **Step 6: Commit**

```bash
git add src/ui/animation/pbstage/PBShaderStage.tsx src/ui/animation/pbstage/index.ts src/ui/animation/pbstage/__tests__/PBShaderStage.rerender.test.tsx
git commit -m "feat(pbstage): PBShaderStage WebGL2 single-pass compositor component"
```

---

## Task 5: Listen atmosphere packet

**Files:**
- Create: `src/pages/Listen/shaders/atmospherePacket.js`
- Test: `src/pages/Listen/shaders/__tests__/atmospherePacket.test.js`

**Interfaces:**
- Consumes: `createShaderPacket`, `validateShaderPacket`, `hashShaderPacket` from `src/lib/pixelbrain/uniforms.bridge.js`.
- Produces: `export const ATMOSPHERE_PACKET` (frozen PB-SHADER-v1). A deterministic `pbMain` that renders the aurora/portal glow from `u_time`, `u_resonance`, `u_school`, `u_palette0` — no per-pixel random except a deterministic hash.

- [ ] **Step 1: Write the failing test**

```js
import { describe, it, expect } from 'vitest';
import { ATMOSPHERE_PACKET } from '../atmospherePacket.js';
import { validateShaderPacket, hashShaderPacket } from '../../../../lib/pixelbrain/uniforms.bridge.js';

describe('ATMOSPHERE_PACKET', () => {
  it('is a valid PB-SHADER-v1 packet', () => {
    expect(() => validateShaderPacket(ATMOSPHERE_PACKET)).not.toThrow();
    expect(ATMOSPHERE_PACKET.contract).toBe('PB-SHADER-v1');
  });
  it('hashes deterministically', () => {
    expect(hashShaderPacket(ATMOSPHERE_PACKET)).toBe(hashShaderPacket(ATMOSPHERE_PACKET));
  });
  it('forbids nondeterminism in the fragment', () => {
    expect(ATMOSPHERE_PACKET.fragmentSource).not.toMatch(/\bMath\.random|\bnoise\(\s*gl_FragCoord/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/Listen/shaders/__tests__/atmospherePacket.test.js`
Expected: FAIL — cannot find module `../atmospherePacket.js`.

- [ ] **Step 3: Write the packet**

```js
import { createShaderPacket } from '../../../lib/pixelbrain/uniforms.bridge.js';

// pbMain contract matches shader-webgl-preview wrapShaderSource:
//   vec4 pbMain(vec2 uv, float time, float resonance)
// Canonical uniforms (u_school, u_palette0) are also visible in the wrapper.
const FRAGMENT = `
float pbHash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }

vec4 pbMain(vec2 uv, float time, float resonance) {
  // Baked aurora: three drifting radial lobes, animated only by time (no re-raster).
  vec2 c0 = vec2(0.5, 0.8);
  vec2 c1 = vec2(0.2 + 0.05*sin(time*0.13), 0.3);
  vec2 c2 = vec2(0.8, 0.4 + 0.05*cos(time*0.10));
  float a0 = smoothstep(0.6, 0.0, distance(uv, c0));
  float a1 = smoothstep(0.55, 0.0, distance(uv, c1));
  float a2 = smoothstep(0.55, 0.0, distance(uv, c2));
  float breath = 0.85 + 0.15*sin(time*0.45);

  // School-tinted base (u_palette0 provided by wrapper); fall back to teal.
  vec3 tint = mix(vec3(0.17,0.79,0.79), u_palette0, step(0.001, dot(u_palette0,u_palette0)));
  vec3 col = tint * (a0*0.5 + a1*0.4 + a2*0.3) * breath * (0.6 + resonance*0.6);

  // Portal ring: a single baked ring pulsing by formula, not a blurred DOM layer.
  float ring = smoothstep(0.012, 0.0, abs(distance(uv, vec2(0.5)) - 0.34));
  col += tint * ring * (0.4 + 0.4*sin(time*0.6));

  float alpha = clamp(a0*0.5 + a1*0.4 + a2*0.3 + ring, 0.0, 1.0);
  return vec4(col, alpha);
}`;

export const ATMOSPHERE_PACKET = createShaderPacket({
  id: 'listen-atmosphere',
  label: 'Listen Chamber Atmosphere',
  fragmentSource: FRAGMENT,
  canvas: { width: 1280, height: 720 },
  uniforms: {
    u_school: { type: 'int', source: 'spell.schoolIndex', default: 0 },
    u_palette0: { type: 'vec3', source: 'palette.0.rgb01', default: [0, 0, 0] },
  },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/Listen/shaders/__tests__/atmospherePacket.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/pages/Listen/shaders/atmospherePacket.js src/pages/Listen/shaders/__tests__/atmospherePacket.test.js
git commit -m "feat(listen): PB-SHADER atmosphere packet (aurora + portal, formula-driven)"
```

---

## Task 6: Mount the stage on Listen; suppress redundant DOM layers

**Files:**
- Modify: `src/pages/Listen/AlchemicalLabBackground.tsx`
- Modify: `src/App.jsx:79`

**Interfaces:**
- Consumes: `PBShaderStage` (Task 4), `ATMOSPHERE_PACKET` (Task 5), `getBytecodeAMP`/`AMP_CHANNELS` (bytecodeAMP).

- [ ] **Step 1: Suppress the global aurora/vignette/scanlines on Listen**

In `src/App.jsx`, the layers render behind `{!isBattlePage && (...)}`. Add a Listen check next to the existing `isBattlePage` derivation (follow how `isBattlePage` is computed from the route) and change the guard to `{!isBattlePage && !isListenPage && (...)}`. Listen owns its atmosphere via Tier A now.

- [ ] **Step 2: Replace the static portal subtree with the stage**

In `AlchemicalLabBackground.tsx`, import the stage and packet:

```tsx
import { PBShaderStage } from '../../ui/animation/pbstage';
import { ATMOSPHERE_PACKET } from './shaders/atmospherePacket.js';
import { getBytecodeAMP, AMP_CHANNELS } from '../../lib/ambient/bytecodeAMP.js';
```

Render the stage as Tier A (below the Phaser canvas), and delete the `{!staticGone && (<div className="alchemical-lab-static-bg">…</div>)}` subtree added earlier — the atmosphere is now the shader:

```tsx
<PBShaderStage
  packet={ATMOSPHERE_PACKET}
  reducedMotion={prefersReducedMotion}
  style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}
  getRuntimeInput={(elapsedMs) => ({
    elapsedMs,
    resonance: Math.max(0, Math.min(1, signalLevel)),
    vowelDensity: getBytecodeAMP(elapsedMs, AMP_CHANNELS.PULSE),
  })}
/>
```

Keep the Phaser canvas container (Tier B) exactly as-is. Remove the now-unused `staticGone` state and its effect if nothing else references them.

- [ ] **Step 3: Verify Listen renders the stage and drops the DOM portal**

Run (dev server up):
```bash
node ./scratch-dom-check.mjs   # a throwaway Playwright check
```
Where the check asserts, after 3s on `/listen`: `document.querySelector('.alchemical-lab-static-bg') === null` and `document.querySelectorAll('canvas').length >= 2` (Phaser + PBShaderStage), and no console errors. Delete the throwaway after.

Expected: static portal absent, ≥2 canvases, zero console errors.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Listen/AlchemicalLabBackground.tsx src/App.jsx
git commit -m "feat(listen): render atmosphere via PBShaderStage; drop DOM portal + global aurora on Listen"
```

---

## Task 7: Demote Phaser to interaction-only (remove glow PostFX)

**Files:**
- Modify: `src/pages/Listen/scenes/SignalChamberScene.js:79-83`

**Interfaces:** none exported; behavioral change only.

- [ ] **Step 1: Remove the full-screen glow PostFX and the probe flag**

Replace the filter block (currently guarded by `window.__perfNoGlow`) so no full-screen glow/colorMatrix pass runs — Tier A owns glow now:

```js
// Tier B is interaction-only: no full-screen post-processing here. Atmosphere
// and glow are rendered by the Tier-A PBShaderStage (one fragment pass).
```

Delete the `const noGlow = …window.__perfNoGlow` line and the `f.addGlow(...)`/`addColorMatrix()` calls.

- [ ] **Step 2: Verify no glow references remain**

Run: `grep -n "addGlow\|__perfNoGlow\|addColorMatrix" src/pages/Listen/scenes/SignalChamberScene.js || echo CLEAN`
Expected: `CLEAN`.

- [ ] **Step 3: Verify the scene still loads (transform + no console error)**

Run: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5173/src/pages/Listen/scenes/SignalChamberScene.js`
Expected: `200`.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Listen/scenes/SignalChamberScene.js
git commit -m "perf(listen): remove full-screen Phaser glow PostFX; Tier-A owns glow"
```

---

## Task 8: Fix the AnimationAMP intent re-render loop (discrete-only)

**Files:**
- Modify: `src/ui/animation/hooks/useAnimationIntent.ts`

**Interfaces:** unchanged public signature `useAnimationIntent(intent, enabled) → ResolvedMotionOutput | null`.

- [ ] **Step 1: Write the failing test**

```tsx
import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useAnimationIntent } from '../useAnimationIntent';

vi.mock('../../../lib/amp-client.js', () => ({
  submitAmpIntent: vi.fn(async () => ({ ok: true, motion: { glow: 1 } })),
}));

describe('useAnimationIntent', () => {
  it('submits once per stable intent, not on every render', async () => {
    const { submitAmpIntent } = await import('../../../lib/amp-client.js');
    const intent = { targetId: 'x', preset: 'p', trigger: 'mount', state: {} } as any;
    const { rerender } = renderHook(() => useAnimationIntent(intent, true));
    await Promise.resolve();
    rerender(); rerender(); rerender();
    await Promise.resolve();
    expect((submitAmpIntent as any).mock.calls.length).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/ui/animation/hooks/__tests__/useAnimationIntent.test.tsx`
Expected: FAIL — `submitAmpIntent` called more than once (the `motion`-in-deps loop) OR module path differs; adjust the mock path to the real one used in the file if needed, then re-run to see the >1 failure.

- [ ] **Step 3: Remove `motion` from the effect deps; read via ref**

In `useAnimationIntent.ts`: add `const motionRef = useRef(motion);` kept in sync (`motionRef.current = motion;`), replace uses of `motion` inside the effect with `motionRef.current`, and change the dependency array from `[augmentedIntent, enabled, motion]` to `[augmentedIntent, enabled]`. Keep the `intentHash === lastIntentRef.current` guard.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/ui/animation/hooks/__tests__/useAnimationIntent.test.tsx`
Expected: PASS — exactly 1 submit across re-renders.

- [ ] **Step 5: Commit**

```bash
git add src/ui/animation/hooks/useAnimationIntent.ts src/ui/animation/hooks/__tests__/useAnimationIntent.test.tsx
git commit -m "fix(amp): break the useAnimationIntent re-render loop (motion via ref)"
```

---

## Task 9: Guardrail — headed frame-budget gate

**Files:**
- Create: `tests/perf/listen-frame-budget.spec.ts`

**Interfaces:** standalone Playwright test. Requires dev server on :5173 and a real GPU display (run with `HEADED=1 DISPLAY=:0`).

- [ ] **Step 1: Write the test**

```ts
import { test, expect, chromium } from '@playwright/test';

test('Listen holds a frame budget on a real GPU', async () => {
  const browser = await chromium.launch({ headless: false, args: ['--enable-gpu', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await page.goto('http://localhost:5173/listen', { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(2500); // let the stage + scene settle
  const { pctOver20 } = await page.evaluate(() => new Promise<{ pctOver20: number }>((res) => {
    const f: number[] = []; let last = performance.now(); const start = last;
    const tick = (n: number) => { f.push(n - last); last = n; if (performance.now() - start < 6000) requestAnimationFrame(tick); else { f.shift(); res({ pctOver20: f.filter(x => x > 20).length / f.length }); } };
    requestAnimationFrame(tick);
  }));
  await browser.close();
  // Baseline before this work was ~0.32-0.38 on the Deck (cool). Gate at 0.15.
  expect(pctOver20).toBeLessThan(0.15);
});
```

- [ ] **Step 2: Run the gate (machine cool, not mid-benchmark)**

Run: `HEADED=1 DISPLAY=:0 npx playwright test tests/perf/listen-frame-budget.spec.ts --reporter=line`
Expected: PASS (`pctOver20 < 0.15`). If it fails, the fill-rate work in Tasks 6–7 is incomplete — do NOT relax the threshold; investigate with the layer-budget test (Task 10).

- [ ] **Step 3: Commit**

```bash
git add tests/perf/listen-frame-budget.spec.ts
git commit -m "test(perf): headed frame-budget gate for Listen (<15% frames >20ms)"
```

---

## Task 10: Guardrail — layer-budget inventory

**Files:**
- Create: `tests/perf/listen-layer-budget.spec.ts`

**Interfaces:** standalone Playwright test (headless is fine — DOM structure only).

- [ ] **Step 1: Write the test**

```ts
import { test, expect, chromium } from '@playwright/test';

test('Listen has no animated backdrop/blend layer over the canvas', async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await page.goto('http://localhost:5173/listen', { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(3000);
  const offenders = await page.evaluate(() => {
    const bad: string[] = [];
    for (const el of Array.from(document.querySelectorAll('*'))) {
      const cs = getComputedStyle(el as Element);
      const r = (el as Element).getBoundingClientRect();
      const big = r.width * r.height > 200_000; // large layer
      const animating = cs.animationName !== 'none';
      const composited = cs.backdropFilter !== 'none' || (cs.mixBlendMode && cs.mixBlendMode !== 'normal');
      if (big && animating && composited) bad.push((el as HTMLElement).className || el.tagName);
    }
    return bad;
  });
  await browser.close();
  expect(offenders).toEqual([]);
});
```

- [ ] **Step 2: Run it**

Run: `npx playwright test tests/perf/listen-layer-budget.spec.ts --reporter=line`
Expected: PASS (`offenders === []`). A non-empty list names the layer to convert to Tier A or make static.

- [ ] **Step 3: Commit**

```bash
git add tests/perf/listen-layer-budget.spec.ts
git commit -m "test(perf): layer-budget guardrail — no animated blur/blend over canvas"
```

---

## Task 11: Guardrail — shader determinism (framebuffer hash)

**Files:**
- Create: `tests/perf/pbstage-determinism.spec.ts`
- Create: `tests/perf/fixtures/determinism-harness.html`

**Interfaces:** standalone headed Playwright test that mounts the atmosphere packet at a fixed `u_time` twice and compares pixel readback.

- [ ] **Step 1: Write a minimal harness page**

`tests/perf/fixtures/determinism-harness.html` — a bare HTML that imports the WebGL helpers + packet, renders one frame at a caller-provided fixed time into a small offscreen canvas, and exposes `window.__renderAt(timeMs) → Uint8Array` via `gl.readPixels`. (Use the same `compileShaderProgram`/`createFullscreenQuad`/`resolveShaderUniforms`/`renderShaderFrame` path as `PBShaderStage`, with `buildRuntimeState({ elapsedMs: timeMs })`.)

- [ ] **Step 2: Write the test**

```ts
import { test, expect, chromium } from '@playwright/test';
import { fileURLToPath } from 'url';

test('same packet + same u_time renders identical pixels', async () => {
  const browser = await chromium.launch({ headless: false, args: ['--enable-gpu', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage();
  const url = 'file://' + fileURLToPath(new URL('./fixtures/determinism-harness.html', import.meta.url));
  await page.goto(url);
  const [a, b] = await page.evaluate(async () => {
    const x = Array.from(await (window as any).__renderAt(3210));
    const y = Array.from(await (window as any).__renderAt(3210));
    return [x, y];
  });
  await browser.close();
  expect(a).toEqual(b);
});
```

- [ ] **Step 3: Run it**

Run: `HEADED=1 DISPLAY=:0 npx playwright test tests/perf/pbstage-determinism.spec.ts --reporter=line`
Expected: PASS (identical byte arrays).

- [ ] **Step 4: Commit**

```bash
git add tests/perf/pbstage-determinism.spec.ts tests/perf/fixtures/determinism-harness.html
git commit -m "test(perf): PBShaderStage determinism — fixed u_time is byte-stable"
```

---

## Task 12: Housekeeping — remove probes and reconcile interim CSS

**Files:**
- Delete: `.perf-probe.mjs`, `.perf-ablation.mjs`, `.perf-confirm.mjs`, `.perf-aurora.mjs`, `.perf-glow.mjs`, `.perf-static.mjs`, `.dom-inventory.mjs`, `.dom-check.mjs`
- Modify: `src/pages/Listen/ListenPage.css` (only if the pentagram/sigil CSS is now dead after Task 6)

**Interfaces:** none.

- [ ] **Step 1: Remove throwaway probe scripts**

```bash
git rm -f .perf-probe.mjs .perf-ablation.mjs .perf-confirm.mjs .perf-aurora.mjs .perf-glow.mjs .perf-static.mjs .dom-inventory.mjs .dom-check.mjs 2>/dev/null || rm -f .perf-*.mjs .dom-*.mjs
```

- [ ] **Step 2: Drop CSS made dead by Task 6**

If `.pentagram-path`, `.arch-pentagram`, `.arch-ring--*`, `.arch-pip-mount`, `.alchemical-arch-portal`, `.alchemical-stone-wall`, `.signal-core__schematics` filter rule are no longer rendered (grep the JSX to confirm nothing references them), remove those rules from `ListenPage.css`. Keep any class still used by live DOM.

Run: `grep -rn "alchemical-arch-portal\|pentagram-path\|arch-ring--" src --include=*.tsx --include=*.jsx || echo "SAFE TO REMOVE"`
Expected: `SAFE TO REMOVE` (then delete the rules) — otherwise leave referenced rules in place.

- [ ] **Step 3: Full typecheck + unit suite**

Run: `npx tsc -p tsconfig.json --noEmit 2>&1 | grep -E "pbstage|Listen/" || echo CLEAN` then `npx vitest run src/ui/animation/pbstage src/pages/Listen/shaders`
Expected: `CLEAN` and all unit tests pass.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(listen): remove perf probes and CSS superseded by Tier-A shader"
```

---

## Self-Review Notes

- **Spec coverage:** Tiers (§4)→Tasks 4/6/7; reusable unit `<PBShaderStage>` (§5)→Task 4; animation authority + AMP fix (§6)→Tasks 2/3/8; baking (§7)→Task 5 (baked lobes/ring in-shader; scene-graph texture bake deferred as it is not needed for the atmosphere packet); Listen migration (§9)→Tasks 6/7; guardrails (§8: perf, determinism, no-per-frame-React, layer-budget)→Tasks 9/11/4/10; housekeeping (§11)→Task 12.
- **Deferred from spec, intentionally:** scene-graph *texture* baking (Task 5 bakes procedurally in-shader; add a texture-bake task only if a future packet needs raster art). Worker/OffscreenCanvas remains out of scope per spec §10.
- **Type consistency:** `RuntimeStateInput` (Task 3) is consumed by `getRuntimeInput` (Task 4) and Task 6; `resolveShaderUniforms(packet, runtimeState)` output feeds `renderShaderFrame` unchanged; `ATMOSPHERE_PACKET` (Task 5) is the `packet` prop in Task 6.
- **Known soft spot:** Task 4's jsdom test asserts "no per-frame React re-render" structurally (the loop never calls setState); real GL behavior is covered by the headed Tasks 9/11.
