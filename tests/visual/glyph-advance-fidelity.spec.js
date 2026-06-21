import { test, expect } from '@playwright/test';

/**
 * I6 — GLYPH_ADVANCE_FIDELITY.
 *
 * The plain textarea lays out the verse at one set of metrics; the colored
 * TrueSight overlay paints the SAME text tighter (spaces visibly collapse:
 * "heart out" → "heartout"). The hit-box geometry is measured from the plain
 * metrics, so any style on the colored glyph that changes its advance width
 * desyncs box ↔ glyph and compounds down the line.
 *
 * This A/B renders the identical line many ways inside the real .ide-layout-wrapper
 * (real CSS loaded by the harness route) and diffs each word's left + the line's
 * total width against the PLAIN baseline. The variant with a non-zero delta is
 * the culprit property. Zero everywhere ⇒ the morph is not a static style
 * (look to animations / computed overlay state next).
 */

const LINE = 'Lyrical rapper spilling my heart out clip Bonkers detest jokers';
const TOLERANCE_PX = 0.5;

test('I6: which style property collapses TrueSight word spacing', async ({ page }) => {
  await page.goto('/__immune/truesight?mode=read&content=short&width=820', { waitUntil: 'load' });
  await page.waitForSelector('.ide-layout-wrapper', { timeout: 15000 });
  await page.evaluate(() => document.fonts.ready);

  const result = await page.evaluate((line) => {
    const wrap = document.querySelector('.ide-layout-wrapper');
    const words = line.split(' ');

    // Render `line` as inline word-spans with class `cls` + inline `style`, and
    // return the line's total width + each word's left (relative to the box).
    const measure = (cls, style) => {
      const el = document.createElement('div');
      Object.assign(el.style, {
        position: 'absolute', visibility: 'hidden', left: '-9999px', top: '0',
        whiteSpace: 'pre',
        // Plain textarea baseline metrics (see .editor-textarea CSS).
        fontFamily: "var(--font-scroll, 'Crimson Pro', Georgia, 'Liberation Serif', serif)",
        fontSize: '24px', fontWeight: '400', fontStyle: 'normal',
        letterSpacing: 'normal', wordSpacing: 'normal',
        fontVariantLigatures: 'none', fontVariantNumeric: 'lining-nums',
        fontKerning: 'normal', textRendering: 'geometricPrecision',
      });
      const styleAttr = style
        ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';')
        : '';
      el.innerHTML = words
        .map((w, i) => `<span class="${cls}" style="${styleAttr}">${w}</span>${i < words.length - 1 ? ' ' : ''}`)
        .join('');
      wrap.appendChild(el);
      const box = el.getBoundingClientRect();
      const lefts = [...el.querySelectorAll('span')].map((s) => s.getBoundingClientRect().left - box.left);
      const total = box.width;
      el.remove();
      return { lefts, total };
    };

    const plain = measure('', null);

    // Variants: the real colored-word class stack, plus isolated suspect props.
    const variants = {
      'real-class-stack': measure('truesight-word-inner pixel-brain-chip grimoire-word vb-effect--resonant vb-school--sonic vb-anchor', null),
      'grimoire-only': measure('grimoire-word', null),
      'rhyme-highlight': measure('grimoire-word grimoire-word--rhyme-highlight', null),
      'font-weight:700': measure('', { 'font-weight': '700' }),
      'font-weight:600': measure('', { 'font-weight': '600' }),
      'font-weight:500': measure('', { 'font-weight': '500' }),
      'letter-spacing:0.05em': measure('', { 'letter-spacing': '0.05em' }),
      'letter-spacing:0.08em': measure('', { 'letter-spacing': '0.08em' }),
      'font-size:1.02em': measure('', { 'font-size': '1.02em' }),
    };

    const report = { plainTotalPx: +plain.total.toFixed(2), variants: {} };
    for (const [name, v] of Object.entries(variants)) {
      const maxWordDrift = Math.max(...v.lefts.map((l, i) => Math.abs(l - plain.lefts[i])));
      report.variants[name] = {
        totalDeltaPx: +(v.total - plain.total).toFixed(2),
        maxWordDriftPx: +maxWordDrift.toFixed(2),
      };
    }
    return report;
  }, LINE);

  // eslint-disable-next-line no-console
  console.log('I6-REPORT ' + JSON.stringify(result, null, 2));

  const culprits = Object.entries(result.variants)
    .filter(([, v]) => Math.abs(v.totalDeltaPx) > TOLERANCE_PX)
    .map(([name, v]) => `${name} (Δtotal=${v.totalDeltaPx}px, maxWordDrift=${v.maxWordDriftPx}px)`);
  // eslint-disable-next-line no-console
  console.log('I6-CULPRITS ' + (culprits.length ? culprits.join(' | ') : 'none (static styles fidelity-clean)'));

  expect(result.plainTotalPx).toBeGreaterThan(0);
});
