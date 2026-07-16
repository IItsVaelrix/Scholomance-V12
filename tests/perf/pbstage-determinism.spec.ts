import { test, expect, chromium } from '@playwright/test';

// Inlined ES module injected into the dev-server page (same-origin so Vite
// resolves /src/... specifiers, including on-the-fly .ts transpilation for
// buildRuntimeState.ts). A raw file:// harness can't do this because the
// atmosphere packet's import chain needs Vite's module graph.
//
// Mirrors the exact render path used by PBShaderStage
// (src/ui/animation/pbstage/PBShaderStage.tsx): compileShaderProgram ->
// createFullscreenQuad -> per-frame buildRuntimeState -> resolveShaderUniforms
// -> renderShaderFrame, then a synchronous gl.readPixels().
const HARNESS_SOURCE = `
import { compileShaderProgram, createFullscreenQuad, renderShaderFrame } from '/src/lib/pixelbrain/shader-webgl-preview.js';
import { resolveShaderUniforms } from '/src/lib/pixelbrain/uniforms.bridge.js';
import { ATMOSPHERE_PACKET } from '/src/pages/Listen/shaders/atmospherePacket.js';
import { buildRuntimeState } from '/src/ui/animation/pbstage/buildRuntimeState.ts';

const WIDTH = 160;
const HEIGHT = 144;

const canvas = document.createElement('canvas');
canvas.width = WIDTH;
canvas.height = HEIGHT;
document.body.appendChild(canvas);

const gl = canvas.getContext('webgl2', { premultipliedAlpha: false, alpha: true });
window.__glAvailable = !!gl;

if (gl) {
  try {
    const program = compileShaderProgram(gl, ATMOSPHERE_PACKET.fragmentSource);
    const quad = createFullscreenQuad(gl);

    window.__renderAt = (timeMs) => {
      const runtimeState = buildRuntimeState({
        elapsedMs: timeMs,
        canvasSize: [canvas.width, canvas.height],
      });
      const resolved = resolveShaderUniforms(ATMOSPHERE_PACKET, runtimeState);
      renderShaderFrame(gl, program, quad, resolved);
      const pixels = new Uint8Array(WIDTH * HEIGHT * 4);
      gl.readPixels(0, 0, WIDTH, HEIGHT, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      return pixels;
    };
  } catch (err) {
    // compileShaderProgram throws a structured BytecodeError on GLSL
    // compile/link failure rather than returning { error } -- surface it
    // instead of leaving __renderAt undefined.
    window.__shaderError = (err && err.message) ? err.message : String(err);
  }
}

window.__ready = true;
`;

test('same packet + same u_time renders identical pixels', async () => {
  // Headless SwiftShader is deterministic and avoids display/thermal
  // flakiness; no real GPU needed to prove byte-for-byte determinism.
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await page.addScriptTag({ type: 'module', content: HARNESS_SOURCE });
  await page.waitForFunction(() => (window as any).__ready === true);

  const glAvailable = await page.evaluate(() => (window as any).__glAvailable);
  const shaderError = await page.evaluate(() => (window as any).__shaderError);

  if (!glAvailable || shaderError) {
    await browser.close();
    test.fail(true, `BLOCKED: webgl2 unavailable (${glAvailable}) or shader compile error: ${shaderError}`);
    return;
  }

  const [a, b] = await page.evaluate(async () => {
    const x = Array.from(await (window as any).__renderAt(3210));
    const y = Array.from(await (window as any).__renderAt(3210));
    return [x, y];
  });
  await browser.close();

  // Sanity: a fully transparent/black readback would mean nothing drew.
  expect(a.length).toBe(160 * 144 * 4);
  expect(a.some((v: number) => v !== 0)).toBe(true);

  expect(a).toEqual(b);
});
