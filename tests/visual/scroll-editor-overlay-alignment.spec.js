import { test, expect } from "@playwright/test";

/**
 * Root-cause confirmation for the TrueSight annotation-layer misalignment.
 *
 * The overlay positions every word hit-box from a CANVAS simulation of the
 * text (codex/.../adaptiveWhitespaceGrid.ts: measureTextWidth +
 * buildTruesightOverlayLines), while the words you actually see are painted by
 * the real <textarea>. The textarea is styled with:
 *
 *     font-variant-ligatures: none;
 *     font-variant-numeric:  lining-nums;
 *     font-kerning:          normal;
 *     text-rendering:        geometricPrecision;
 *
 * The canvas measurement context only sets `font` (+ letter/word-spacing). It
 * never applies kerning / text-rendering / font-variant, so per-glyph advances
 * differ and the hit-boxes drift off the glyphs — which is why hover never
 * highlights (you are not over the shell) and clicks feel off.
 *
 * These tests run in real Chromium (real font shaping) and compare the
 * PRODUCTION measurement functions against the browser's own layout of an
 * element styled EXACTLY like the editor textarea. They encode the desired
 * behaviour (parity within sub-pixel tolerance) and therefore FAIL while the
 * bug is present.
 */

// One unwrapped line packed with kerning pairs + lining figures so any
// shaping/variant divergence is amplified rather than rounded away.
const PROBE = "AVATAR To Wander fjord Quick 1234567 — WAVE Ya.";
const TOLERANCE_PX = 0.5;

/**
 * Builds an element styled byte-for-byte like `.editor-textarea`, measures the
 * browser's real rendered width of `text`, then asks the PRODUCTION canvas
 * measurement code to size the same string with the same font inputs.
 * Returns both widths so the test can assert parity.
 */
async function measureBothWays(page, text) {
  return page.evaluate(async (probe) => {
    await document.fonts.ready;

    // Load the real production module via the Vite dev server.
    const mod = await import(
      "/src/lib/truesight/compiler/adaptiveWhitespaceGrid.ts"
    );

    // Ground truth: the browser's own text layout, styled like the textarea.
    const span = document.createElement("span");
    span.textContent = probe;
    Object.assign(span.style, {
      position: "absolute",
      visibility: "hidden",
      left: "-9999px",
      top: "0",
      whiteSpace: "pre",
      fontFamily:
        'var(--font-scroll, "Crimson Pro", Georgia, "Liberation Serif", serif)',
      fontSize: "24px",
      lineHeight: "normal",
      letterSpacing: "normal",
      wordSpacing: "normal",
      fontWeight: "400",
      fontStyle: "normal",
      fontVariantLigatures: "none",
      fontVariantNumeric: "lining-nums",
      fontKerning: "normal",
      textRendering: "geometricPrecision",
    });
    document.body.appendChild(span);
    const cs = getComputedStyle(span);
    const fontFamily = cs.fontFamily;
    const fontSize = cs.fontSize; // resolved, e.g. "24px"
    const domWidth = span.getBoundingClientRect().width;
    span.remove();

    // Production path 1: the raw width measurement.
    const canvasWidth = mod.measureTextWidth(probe, fontFamily, fontSize, {
      fontStyle: "normal",
      fontWeight: "400",
      letterSpacing: 0,
      wordSpacing: 0,
    });

    // Production path 2: the full topology + token-layout the overlay actually
    // uses. Sum of per-token advances should equal the line's rendered width.
    const topology = mod.computeAdaptiveGridTopology({
      fontFamily,
      fontSize,
      fontStyle: "normal",
      fontWeight: "400",
      lineHeight: cs.lineHeight === "normal" ? "32px" : cs.lineHeight,
      paddingLeft: 0,
      paddingTop: 0,
      paddingRight: 0,
      letterSpacing: 0,
      wordSpacing: 0,
      tabSize: 2,
      containerWidth: 100000, // huge → never wraps
    });
    const built = mod.buildTruesightOverlayLines(probe, 100000, topology);
    const tokens = built.lines.flatMap((l) => l.tokens);
    const last = tokens[tokens.length - 1];
    const overlayLineWidth = last ? last.x + last.width : 0;

    return { domWidth, canvasWidth, overlayLineWidth };
  }, text);
}

test.describe("TrueSight overlay measurement parity (alignment root cause)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/read", { waitUntil: "load" });
    await page.waitForSelector(".ide-layout-wrapper", {
      state: "visible",
      timeout: 15000,
    });
  });

  test("canvas measureTextWidth matches the browser's rendered width", async ({
    page,
  }) => {
    const { domWidth, canvasWidth } = await measureBothWays(page, PROBE);
    const delta = Math.abs(domWidth - canvasWidth);
    console.log(
      `[parity] DOM=${domWidth.toFixed(3)} canvas=${canvasWidth.toFixed(
        3
      )} delta=${delta.toFixed(3)}px`
    );
    expect(domWidth).toBeGreaterThan(0);
    expect(delta).toBeLessThanOrEqual(TOLERANCE_PX);
  });

  test("overlay token layout width matches the browser's rendered width", async ({
    page,
  }) => {
    const { domWidth, overlayLineWidth } = await measureBothWays(page, PROBE);
    const delta = Math.abs(domWidth - overlayLineWidth);
    console.log(
      `[layout] DOM=${domWidth.toFixed(3)} overlay=${overlayLineWidth.toFixed(
        3
      )} delta=${delta.toFixed(3)}px`
    );
    expect(overlayLineWidth).toBeGreaterThan(0);
    expect(delta).toBeLessThanOrEqual(TOLERANCE_PX);
  });
});
