import { test, expect } from '@playwright/test';
import {
  buildIdeWhitespaceBaselineCell,
  evaluateIdeWhitespaceOsmosis,
} from '../../codex/core/immunity/memory-cell-osmosis.js';

const LINE = 'Lyrical rapper spilling my heart out clip Bonkers detest jokers';
const TOLERANCE_PX = 0.5;
const MEMBRANE = Object.freeze({
  similarityFloor: 0.98,
  driftCeiling: 0.03,
  concentrationLimit: 0.99,
});

async function measureTrueSightWhitespaceMetrics(page, line = LINE) {
  return page.evaluate((probe) => {
    const host = document.querySelector('.word-background-layer')
      || document.querySelector('.ide-layout-wrapper')
      || document.body;
    const words = probe.split(' ');

    const makeMeasureNode = (className) => {
      const el = document.createElement('div');
      Object.assign(el.style, {
        position: 'absolute',
        visibility: 'hidden',
        left: '-9999px',
        top: '0',
        whiteSpace: 'pre',
        fontFamily: "var(--font-scroll, 'Crimson Pro', Georgia, 'Liberation Serif', serif)",
        fontSize: '24px',
        fontWeight: '400',
        fontStyle: 'normal',
        letterSpacing: 'normal',
        wordSpacing: 'normal',
        fontVariantLigatures: 'none',
        fontVariantNumeric: 'lining-nums',
        fontKerning: 'normal',
        textRendering: 'geometricPrecision',
      });

      for (let i = 0; i < words.length; i += 1) {
        const span = document.createElement('span');
        span.textContent = words[i];
        if (className) {
          span.className = className;
          span.style.setProperty('--w', '#1980e6');
          span.style.color = '#1980e6';
        }
        el.appendChild(span);
        if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
      }

      return el;
    };

    const measure = (className) => {
      const el = makeMeasureNode(className);
      host.appendChild(el);
      const box = el.getBoundingClientRect();
      const lefts = Array.from(el.querySelectorAll('span'))
        .map((span) => span.getBoundingClientRect().left - box.left);
      const total = box.width;
      el.remove();
      return { lefts, total };
    };

    const plain = measure('');
    const styled = measure('truesight-word-inner pixel-brain-chip grimoire-word vb-effect--resonant vb-school--sonic vb-anchor');
    const wordDriftsPx = styled.lefts.map((left, index) => Number((left - plain.lefts[index]).toFixed(3)));
    const absDrifts = wordDriftsPx.map((value) => Math.abs(value));
    const maxWordDriftPx = absDrifts.length ? Math.max(...absDrifts) : 0;
    const meanWordDriftPx = absDrifts.length
      ? absDrifts.reduce((sum, value) => sum + value, 0) / absDrifts.length
      : 0;

    return {
      line: probe,
      tolerancePx: 0.5,
      wordCount: words.length,
      plainTotalPx: Number(plain.total.toFixed(3)),
      styledTotalPx: Number(styled.total.toFixed(3)),
      totalDeltaPx: Number((styled.total - plain.total).toFixed(3)),
      maxWordDriftPx: Number(maxWordDriftPx.toFixed(3)),
      meanWordDriftPx: Number(meanWordDriftPx.toFixed(3)),
      wordDriftsPx,
    };
  }, line);
}

test.describe('Memory Cell Osmosis — IDE TrueSight whitespace substrate', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/__immune/truesight?mode=read&content=short&width=820', { waitUntil: 'load' });
    await page.waitForSelector('.word-background-layer', { state: 'attached', timeout: 15000 });
    await page.waitForSelector('body[data-immune-ready="true"]', { timeout: 15000 });
    await page.evaluate(() => document.fonts.ready);
  });

  test('stays silent when colored TrueSight text preserves normal-mode advance', async ({ page }) => {
    const metrics = await measureTrueSightWhitespaceMetrics(page);
    const cell = buildIdeWhitespaceBaselineCell({
      tolerancePx: TOLERANCE_PX,
      membrane: MEMBRANE,
      stableContext: { route: '__immune/truesight', mode: 'read' },
    });
    const result = evaluateIdeWhitespaceOsmosis(metrics, cell);

     
    console.log('MEMCELL-IDE-HEALTH ' + JSON.stringify({ metrics, result }, null, 2));

    expect(result.status, JSON.stringify({ metrics, result }, null, 2)).toBe('silent');
    expect(Math.abs(metrics.totalDeltaPx)).toBeLessThanOrEqual(TOLERANCE_PX);
    expect(metrics.maxWordDriftPx).toBeLessThanOrEqual(TOLERANCE_PX);
  });

  test('fires when TrueSight styling injects whitespace disparity', async ({ page }) => {
    await page.addStyleTag({
      content: `
        .ide-layout-wrapper .truesight-word-inner {
          letter-spacing: 0.12em !important;
        }
      `,
    });

    const metrics = await measureTrueSightWhitespaceMetrics(page);
    const cell = buildIdeWhitespaceBaselineCell({
      tolerancePx: TOLERANCE_PX,
      membrane: MEMBRANE,
      stableContext: { route: '__immune/truesight', injectedFault: 'letter-spacing' },
    });
    const result = evaluateIdeWhitespaceOsmosis(metrics, cell);

     
    console.log('MEMCELL-IDE-ANOMALY ' + JSON.stringify({ metrics, result }, null, 2));

    expect(metrics.maxWordDriftPx).toBeGreaterThan(TOLERANCE_PX);
    expect(result.status).toBe('anomaly');
    expect(['baseline_drift', 'concentration']).toContain(result.anomalyKind);
  });
});
