import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('IDE accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/read');
    await page.waitForSelector('.ide-topbar', { timeout: 10000 });
  });

  test('IDE: no axe violations on initial load', async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .include('.ide-layout, .ide-topbar, .ide-statusbar, .tools-sidebar')
      .withTags(['wcag2a', 'wcag2aa', 'best-practice'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('SearchPanel: no duplicate IDs when sidebar open', async ({ page }) => {
    await page.click('[aria-label="Open Oracle Search"]');
    await page.waitForSelector('.search-panel', { timeout: 5000 });

    const results = await new AxeBuilder({ page })
      .include('.search-panel')
      .withRules(['duplicate-id', 'label'])
      .analyze();

    expect(results.violations).toEqual([]);
  });
});
