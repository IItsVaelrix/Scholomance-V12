import { test, expect } from '@playwright/test';

// Guards the classList space-token crash: a colored word's __truesightClass is
// space-separated ("grimoire-word--SONIC grimoire-word--active"); classList.add()
// throws on a string with spaces, which broke reconciliation so typing a colored
// word on a new line silently failed ("line 2 doesn't write").
test('typing colored words on a new line works in TrueSight', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));

  await page.goto('/__immune/lexical?single=1&truesight=1', { waitUntil: 'load' });
  await page.waitForSelector('.lexical-content-editable', { timeout: 10000 });

  const ed = page.locator('.lexical-content-editable');
  await ed.click();
  await page.keyboard.press('Control+End');
  await page.keyboard.press('Enter');
  await page.keyboard.type('World wander necro', { delay: 40 });
  await page.waitForTimeout(400);

  const content = await page.evaluate(() => window.__HARNESS__?.editorContent);
  expect(content, 'second line must capture typed words').toContain('World wander necro');
  expect(pageErrors.join('\n'), 'no DOMTokenList / reconciliation errors').not.toMatch(/DOMTokenList|Reconciliation/);
});
