import { test, expect } from '@playwright/test';

// Guards the \n\n double-newline corruption: each scroll line is its own Lexical
// paragraph, and root.getTextContent() joins blocks with '\n\n'. $getScrollText()
// joins with a single '\n' so onContentChange/save round-trip the source exactly.
test('editor content round-trips with single newlines (no \\n\\n corruption)', async ({ page }) => {
  await page.goto('/__immune/lexical', { waitUntil: 'load' });
  await page.waitForSelector('.lexical-content-editable', { timeout: 10000 });

  const ed = page.locator('.lexical-content-editable');
  await ed.click();
  await page.keyboard.press('End');
  await page.keyboard.type('X', { delay: 30 });
  await page.waitForTimeout(300);

  const emitted = await page.evaluate(() => window.__HARNESS__?.editorContent);
   
  console.log('EMITTED', JSON.stringify(emitted));
  expect(emitted, 'onContentChange must not double newlines').not.toMatch(/\n\n/);
  expect(emitted, 'content must stay multi-line').toContain('\n');
});
