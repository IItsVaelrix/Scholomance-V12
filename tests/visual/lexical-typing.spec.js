import { test, expect } from '@playwright/test';

// Each variant must accept typing. The `full` cases (analysis + onCursorChange +
// spellcheck + highlight together) guard against the update↔render loop that froze
// typing when the node transform re-registered on every keystroke.
const VARIANTS = ['', '?truesight=1', '?full=1', '?truesight=1&full=1'];
for (const query of VARIANTS) {
test(`Lexical editor accepts typed input ${query || '(plain)'}`, async ({ page }) => {
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

  await page.goto(`/__immune/lexical${query}`, { waitUntil: 'load' });
  await page.waitForSelector('.lexical-content-editable', { state: 'visible', timeout: 15000 });
  await page.waitForSelector('body[data-lexical-ready="true"]', { timeout: 15000 });

  const editable = page.locator('.lexical-content-editable');
  const before = await editable.innerText();
  const editableAttr = await editable.getAttribute('contenteditable');
  console.log('IS_CONTENTEDITABLE:', editableAttr);
  console.log('TEXT_BEFORE:', JSON.stringify(before));

  // Place caret at end and type.
  await editable.click();
  await page.keyboard.press('End');
  await page.keyboard.type('XYZ', { delay: 30 });
  await page.waitForTimeout(300);

  const after = await editable.innerText();
  const harness = await page.evaluate(() => window.__HARNESS__);
  console.log('TEXT_AFTER:', JSON.stringify(after));
  console.log('HARNESS_STATE:', JSON.stringify(harness));
  console.log('CONSOLE_ERRORS:', JSON.stringify(errors.slice(0, 10)));

  expect(editableAttr, 'editor must be contenteditable').toBe('true');
  expect(after, 'typed text XYZ must appear in the editor').toContain('XYZ');
});
}
