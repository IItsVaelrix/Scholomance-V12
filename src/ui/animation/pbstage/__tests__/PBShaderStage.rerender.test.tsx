import { render, cleanup, act } from '@testing-library/react';
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import React, { Profiler } from 'react';
import { PBShaderStage } from '../PBShaderStage';

/**
 * jsdom has no WebGL2. This stub is intentionally MORE complete than a bare
 * no-op proxy: every GL call the real compileShaderProgram/createFullscreenQuad/
 * renderShaderFrame path touches must report SUCCESS (truthy COMPILE_STATUS /
 * LINK_STATUS, real object handles from createShader/createProgram/createBuffer),
 * otherwise compileShaderProgram throws before the RAF loop is ever scheduled and
 * the "no re-render on RAF" assertion below would pass vacuously for ANY
 * implementation (including a broken one that never starts a loop at all).
 */
function stubGL(): any {
  const noop = () => {};
  return {
    VERTEX_SHADER: 1,
    FRAGMENT_SHADER: 2,
    COMPILE_STATUS: 3,
    LINK_STATUS: 4,
    ARRAY_BUFFER: 5,
    STATIC_DRAW: 6,
    TRIANGLES: 7,
    COLOR_BUFFER_BIT: 8,
    FLOAT: 9,
    canvas: { width: 10, height: 10 },
    createShader: () => ({}),
    shaderSource: noop,
    compileShader: noop,
    getShaderParameter: () => true,
    getShaderInfoLog: () => '',
    deleteShader: noop,
    createProgram: () => ({}),
    attachShader: noop,
    detachShader: noop,
    linkProgram: noop,
    getProgramParameter: () => true,
    getProgramInfoLog: () => '',
    deleteProgram: noop,
    createBuffer: () => ({}),
    bindBuffer: noop,
    bufferData: noop,
    deleteBuffer: noop,
    useProgram: noop,
    viewport: noop,
    clearColor: noop,
    clear: noop,
    getAttribLocation: () => -1,
    enableVertexAttribArray: noop,
    vertexAttribPointer: noop,
    getUniformLocation: () => null,
    uniform1f: noop,
    uniform1i: noop,
    uniform2f: noop,
    uniform3f: noop,
    drawArrays: noop,
  };
}

// Controllable RAF: real jsdom setups (see tests/setup.js) alias
// requestAnimationFrame to a setTimeout-based stub with no `.flush()`, so a test
// that calls `(globalThis.requestAnimationFrame as any).flush?.()` never pumps a
// frame — it would pass even for a component that re-renders every frame via
// React state. We replace it here with a real queue + pump() so frames are
// actually driven synchronously inside the test.
let rafQueue: Array<(t: number) => void> = [];
let rafTime = 0;
let rafNextId = 1;

function pump(times: number) {
  for (let i = 0; i < times; i++) {
    const callbacks = rafQueue;
    rafQueue = [];
    rafTime += 16;
    for (const cb of callbacks) cb(rafTime);
  }
}

class FakeIntersectionObserver {
  private callback: IntersectionObserverCallback;
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
  }
  observe(target: Element) {
    // Report the stage as visible immediately so the RAF loop is not paused.
    this.callback(
      [{ isIntersecting: true, target } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

beforeEach(() => {
  rafQueue = [];
  rafTime = 0;
  rafNextId = 1;
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    const id = rafNextId++;
    rafQueue.push(cb as unknown as (t: number) => void);
    return id;
  });
  vi.stubGlobal('cancelAnimationFrame', (_id: number) => {
    // Frames are consumed wholesale by pump(); nothing to remove per-id here.
  });
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver as unknown as typeof IntersectionObserver);
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(stubGL());
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('PBShaderStage', () => {
  it('does not re-render React on animation frames', async () => {
    let renders = 0;
    function Probe() {
      renders++;
      return null;
    }

    // Primary assertion: count React COMMITS of the whole profiled subtree via
    // the Profiler API, not just Probe's own render count.
    //
    // Why not rely on Probe alone: Probe is passed down as PBShaderStage's
    // `children` prop from this single `render()` call, so it is the SAME
    // React element reference across every one of PBShaderStage's own
    // re-renders. React bails out of reconciling a child subtree when the
    // element reference is referentially unchanged, so if PBShaderStage were
    // (hypothetically) rewritten to call its own setState every animation
    // frame, Probe's function body would still NOT be invoked again — the
    // renders counter would stay flat even though PBShaderStage itself is
    // re-rendering every frame. Verified empirically: a sabotaged build that
    // added `const [, tick] = useState(0)` and called `tick(n => n + 1)`
    // inside the per-frame `frame()` callback still left `renders` unchanged.
    // Profiler's onRender fires on every commit of its wrapped subtree
    // (including updates where only the outer component re-rendered), so it
    // catches that case; re-sabotaging with this assertion in place turned it
    // red as expected before being reverted.
    let commits = 0;
    const onRender = () => {
      commits++;
    };

    const packet = {
      contract: 'PB-SHADER-v1',
      id: 't',
      fragmentSource: '',
      uniforms: {},
      canvas: { width: 10, height: 10 },
    };

    render(
      <Profiler id="pb-shader-stage-probe" onRender={onRender}>
        <PBShaderStage packet={packet as any} getRuntimeInput={(elapsedMs) => ({ elapsedMs })}>
          <Probe />
        </PBShaderStage>
      </Profiler>,
    );

    const rendersBefore = renders;
    const commitsBefore = commits;
    // Sanity: the loop actually scheduled at least one frame after mount.
    expect(rafQueue.length).toBeGreaterThan(0);

    // Pump inside act() and flush a microtask afterward: React 18's
    // createRoot batches/defers setState calls made outside of a React
    // event handler (e.g. from a rAF callback we invoke ourselves), so an
    // un-flushed assertion right after a synchronous pump() can pass
    // vacuously even when the implementation DOES call setState every
    // frame — the update just hasn't committed yet. Flushing here is what
    // makes the sabotage check below meaningful.
    await act(async () => {
      pump(5);
      await Promise.resolve();
    });

    expect(commits).toBe(commitsBefore); // no extra commits from the RAF loop
    expect(renders).toBe(rendersBefore); // and no extra Probe renders either
  });
});
