import { test, expect } from '@playwright/test';
import { runImmuneScan, summarizeReport } from '../../codex/core/diagnostic/truesightImmuneProbe.js';
import { writeResonanceAntibody } from '../../codex/core/diagnostic/resonanceAntibody.js';

/**
 * TrueSight Immune Probe — live diagnostic.
 *
 * Renders the real overlay (dev harness /__immune/truesight), reads every word
 * node from the live DOM, and runs the spatial immune scan. A healthy lattice
 * has zero distress seeds. If the overlay is broken, the assertion fails AND the
 * log names the root node + failing invariant, and an antibody is persisted.
 */

function countWords(content) {
  const matches = String(content || '').match(/[A-Za-z]+(?:['’][A-Za-z]+)*/g);
  return matches ? matches.length : 0;
}

const VARIANTS = [
  { name: 'read · short · 820', query: 'mode=read&content=short&width=820' },
  { name: 'edit · short · 820', query: 'mode=edit&content=short&width=820' },
  { name: 'read · long · 820', query: 'mode=read&content=long&width=820' },
  { name: 'edit · long · 820', query: 'mode=edit&content=long&width=820' },
  { name: 'read · long · narrow 360', query: 'mode=read&content=long&width=360' },
  { name: 'edit · long · narrow 360', query: 'mode=edit&content=long&width=360' },
];

for (const variant of VARIANTS) {
  test(`TrueSight overlay healthy — ${variant.name}`, async ({ page }) => {
    await page.goto(`/__immune/truesight?${variant.query}`, { waitUntil: 'load' });
    await page.waitForSelector('.word-background-layer', { state: 'attached', timeout: 15000 });
    await page.waitForSelector('body[data-immune-ready="true"]', { timeout: 15000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(250);

    const { collected, content } = await page.evaluate(async () => {
      const mod = await import('/src/lib/truesight/immune/collectTruesightNodes.js');
      const layer = document.querySelector('.word-background-layer');
      return { collected: mod.collectTruesightNodes(layer), content: window.__IMMUNE_CONTENT__ };
    });

    const expectedWordCount = countWords(content);
    const report = runImmuneScan(collected, { expectedWordCount });

    // eslint-disable-next-line no-console
    console.log(`\n[${variant.name}] ${summarizeReport(report)}`);
    // eslint-disable-next-line no-console
    console.log('IMMUNE-DETAIL ' + JSON.stringify({
      variant: variant.name,
      shellCount: report.shellCount,
      nodeCount: report.nodeCount,
      expectedWordCount,
      peakCell: report.peakCell,
      rootNode: report.rootNode,
      distress: report.distress.slice(0, 6),
    }));

    if (!report.healthy && report.antibody) {
      const res = writeResonanceAntibody(report.antibody);
      // eslint-disable-next-line no-console
      console.log(`IMMUNE-ANTIBODY ${res.recognized ? 'RECOGNIZED' : 'NEW'} → ${res.path}`);
    }

    expect(report.shellCount, 'overlay rendered no shells (harness/layout problem)').toBeGreaterThan(0);
    expect(report.healthy, summarizeReport(report)).toBe(true);
  });
}

// The user reproduces the bug WHILE EDITING — actively typing. This exercises the
// per-keystroke setContentForOverlay(startTransition) path that static variants miss.
test('TrueSight overlay healthy — edit · TYPING live', async ({ page }) => {
  await page.goto('/__immune/truesight?mode=edit&content=short&width=820', { waitUntil: 'load' });
  await page.waitForSelector('.word-background-layer', { state: 'attached', timeout: 15000 });
  await page.waitForSelector('body[data-immune-ready="true"]', { timeout: 15000 });
  await page.evaluate(() => document.fonts.ready);

  const editor = page.locator('#scroll-content');
  await editor.click();
  
  page.on('console', msg => {
    if (msg.text().includes('MACROPHAGE') || msg.text().includes('DEEP SPECTRAL')) {
      console.log(`\n${msg.text()}`);
    }
  });

  // Compose a fresh multi-word, multi-line passage keystroke-by-keystroke.
  await editor.press('Control+A');
  await editor.press('Delete');
  await editor.type('the lantern keeper wanders\nthrough the crimson archive\ncounting silent vowels', { delay: 8 });
  await page.waitForTimeout(1000); // Wait long enough for the 200ms hook to scan!

  const { collected, content } = await page.evaluate(async () => {
    const mod = await import('/src/lib/truesight/immune/collectTruesightNodes.js');
    const layer = document.querySelector('.word-background-layer');
    return { collected: mod.collectTruesightNodes(layer), content: document.querySelector('#scroll-content').value };
  });

  const expectedWordCount = countWords(content);
  const report = runImmuneScan(collected, { expectedWordCount });

  // eslint-disable-next-line no-console
  console.log(`\n[edit · TYPING] ${summarizeReport(report)}`);
  // eslint-disable-next-line no-console
  console.log('IMMUNE-DETAIL ' + JSON.stringify({
    shellCount: report.shellCount, nodeCount: report.nodeCount, expectedWordCount,
    peakCell: report.peakCell, rootNode: report.rootNode, distress: report.distress.slice(0, 6),
  }));

  if (!report.healthy && report.antibody) {
    const res = writeResonanceAntibody(report.antibody);
    // eslint-disable-next-line no-console
    console.log(`IMMUNE-ANTIBODY ${res.recognized ? 'RECOGNIZED' : 'NEW'} → ${res.path}`);
  }

  expect(report.shellCount, 'overlay rendered no shells while typing').toBeGreaterThan(0);
  expect(report.healthy, summarizeReport(report)).toBe(true);
});
