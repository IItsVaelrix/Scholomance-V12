import { test, expect } from '@playwright/test';

// Guards spelling-suggestion wiring: typing a misspelled prefix surfaces
// getSpellingSuggestions corrections in the IntelliSense dropdown.
test('misspelled prefix surfaces spelling corrections in IntelliSense', async ({ page }) => {
  await page.goto('/__immune/lexical?spell=1', { waitUntil: 'load' });
  await page.waitForSelector('.lexical-content-editable', { timeout: 10000 });

  const ed = page.locator('.lexical-content-editable');
  await ed.click();
  await page.keyboard.press('End');
  // harness checkSpelling marks words > 4 chars "misspelled" → corrections offered
  await page.keyboard.type(' wronng', { delay: 40 });
  await page.waitForTimeout(400);

  const dropdown = page.locator('.intellisense');
  await expect(dropdown, 'IntelliSense dropdown should appear for a misspelled word').toBeVisible({ timeout: 4000 });
  await expect(dropdown).toContainText('correctme');
});
