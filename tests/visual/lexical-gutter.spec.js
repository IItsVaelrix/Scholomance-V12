import { test, expect } from '@playwright/test';

// Guards the editor gutter: "N.)" line numbering + per-line syllable bars, wired
// from the Lexical editor's totalLines/syllablesPerLine/currentLine props.
// (The Gutter previously read a mismatched prop API and rendered nothing.)
test('gutter renders N.) line numbers and syllable bars', async ({ page }) => {
  await page.goto('/__immune/lexical', { waitUntil: 'load' });
  await page.waitForSelector('.editor-gutter', { timeout: 10000 });

  const nums = await page.locator('.editor-gutter .line-number').allInnerTexts();
  expect(nums[0]).toBe('1.)');
  expect(nums[1]).toBe('2.)');

  // Harness feeds lineSyllableCounts={[2, 3]}.
  const rows = page.locator('.editor-gutter .gutter-row');
  expect(await rows.nth(0).locator('.syllable-bar').count()).toBe(2);
  expect(await rows.nth(1).locator('.syllable-bar').count()).toBe(3);

  // Gutter must sit LEFT of the editor (side-by-side), not stacked above it.
  const g = await page.locator('.editor-gutter').boundingBox();
  const e = await page.locator('.lexical-content-editable').boundingBox();
  expect(e.x).toBeGreaterThanOrEqual(g.x + g.width - 2);
  expect(Math.abs(e.y - g.y)).toBeLessThan(40);
});
