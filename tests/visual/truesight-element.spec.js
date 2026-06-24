import { test, expect } from '@playwright/test';

test('inspect element stacking', async ({ page }) => {
  // Wait for networkidle
  await page.goto('http://localhost:5174/read/truesight-sandbox', { waitUntil: 'networkidle' });
  
  await page.waitForTimeout(2000);
  
  const results = await page.evaluate(() => {
    const shells = Array.from(document.querySelectorAll('.truesight-word-shell')).slice(0, 5);
    return shells.map((shell) => {
      const rect = shell.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const elementsFromPoint = document.elementsFromPoint(centerX, centerY);
      
      return {
        text: shell.getAttribute('aria-label') || shell.innerText || 'no-text',
        left: rect.left,
        width: rect.width,
        top: rect.top,
        height: rect.height,
        hitElements: elementsFromPoint.map(e => e.className || e.tagName)
      };
    });
  });
  
  console.log('BROWSER_RESULTS:', JSON.stringify(results, null, 2));
  expect(true).toBe(true);
});
