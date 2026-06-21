import { test, expect } from '@playwright/test';

/**
 * Cross-mode layout fidelity (the "text morph" hypothesis).
 *
 * The annotation layer's geometry is measured against the scroll's NON-TrueSight
 * text (font-weight 400, no viseme styling). When TrueSight colors a word it also
 * applies the VerseIR class stack (truesight-word-inner / grimoire-word / chip /
 * vb-effect / vb-school / vb-anchor) + viseme custom-properties. If ANY of those
 * changes the glyph's advance width, the rendered text no longer matches the
 * boxes — cumulative drift down the line (the visible word-cramming).
 *
 * This renders the same words plain vs TrueSight-styled in the real CSS cascade
 * and measures the advance delta. Nonzero delta = morph confirmed + magnitude.
 */

const WORDS = ['archive', 'lantern', 'Disrespectful', 'relationships', 'wanders'];
const TOLERANCE_PX = 0.5;

test('TrueSight styling does not morph glyph advance width', async ({ page }) => {
  await page.goto('/__immune/truesight?mode=read&content=short&width=820', { waitUntil: 'load' });
  await page.waitForSelector('.word-background-layer', { state: 'attached', timeout: 15000 });
  await page.evaluate(() => document.fonts.ready);

  const results = await page.evaluate((words) => {
    const wrapper = document.querySelector('.ide-layout-wrapper');
    const ta = document.querySelector('#scroll-content');
    const cs = ta ? getComputedStyle(ta) : getComputedStyle(document.body);

    // A measuring host that mimics the textarea's text context.
    const makeSpan = (cls, withViseme) => {
      const s = document.createElement('span');
      s.style.position = 'absolute';
      s.style.visibility = 'hidden';
      s.style.whiteSpace = 'pre';
      s.style.left = '-9999px';
      if (cls) s.className = cls;
      if (withViseme) {
        // Representative viseme custom-properties decodeBytecode emits.
        s.style.setProperty('--vb-viseme-weight', '650');
        s.style.setProperty('--vb-viseme-tracking', '0.04em');
        s.style.setProperty('--vb-viseme-skew', '4deg');
        s.style.setProperty('--w', '#1980e6');
        s.style.color = '#1980e6';
      }
      return s;
    };

    const measure = (word, cls, withViseme, hostSel) => {
      // Host carries the line/wrapper context so descendant CSS applies.
      const line = document.createElement('div');
      line.className = 'truesight-line truesight-line--normal';
      const span = makeSpan(cls, withViseme);
      span.textContent = word;
      line.appendChild(span);
      (document.querySelector(hostSel) || document.body).appendChild(line);
      const w = span.getBoundingClientRect().width;
      line.remove();
      return w;
    };

    const host = '.ide-layout-wrapper .word-background-layer';
    // Decomposition: isolate which contributor changes advance width.
    const measureRaw = (word, mutate) => {
      const line = document.createElement('div');
      line.className = 'truesight-line truesight-line--normal';
      const span = document.createElement('span');
      span.style.position = 'absolute'; span.style.visibility = 'hidden';
      span.style.whiteSpace = 'pre'; span.style.left = '-9999px';
      span.textContent = word;
      mutate(span);
      line.appendChild(span);
      (document.querySelector(host) || document.body).appendChild(line);
      const w = span.getBoundingClientRect().width;
      line.remove();
      return +w.toFixed(3);
    };

    return words.map((word) => {
      const plain = measureRaw(word, () => {});
      const classesOnly = measureRaw(word, (s) => {
        s.className = 'truesight-word-inner pixel-brain-chip grimoire-word vb-effect--resonant vb-school--sonic vb-anchor';
      });
      const weightDirect = measureRaw(word, (s) => { s.style.fontWeight = '650'; });
      const trackingDirect = measureRaw(word, (s) => { s.style.letterSpacing = '0.04em'; });
      const full = measureRaw(word, (s) => {
        s.className = 'truesight-word-inner pixel-brain-chip grimoire-word vb-effect--resonant vb-school--sonic vb-anchor';
        s.style.setProperty('--vb-viseme-weight', '650');
        s.style.setProperty('--vb-viseme-tracking', '0.04em');
        s.style.color = '#1980e6';
      });
      return {
        word, plain, classesOnly, weightDirect, trackingDirect, full,
        deltaClasses: +(classesOnly - plain).toFixed(3),
        deltaWeight: +(weightDirect - plain).toFixed(3),
        deltaTracking: +(trackingDirect - plain).toFixed(3),
        deltaFull: +(full - plain).toFixed(3),
      };
    });
  }, WORDS);

  // eslint-disable-next-line no-console
  console.log('\nCROSS-MODE ADVANCE DELTA');
  for (const r of results) {
    // eslint-disable-next-line no-console
    console.log(`  ${r.word.padEnd(15)} plain=${r.plain}  styled=${r.styled}  Δ=${r.delta}px`);
  }
  const worst = results.reduce((m, r) => Math.max(m, r.delta), 0);
  // eslint-disable-next-line no-console
  console.log(`  worst Δ = ${worst.toFixed(3)}px`);

  for (const r of results) {
    expect(r.delta, `"${r.word}" advance morphs between plain and TrueSight by ${r.delta}px`).toBeLessThanOrEqual(TOLERANCE_PX);
  }
});
