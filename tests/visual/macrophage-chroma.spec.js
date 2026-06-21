import { test, expect } from '@playwright/test';

test('Spectral Macrophage live DOM Phagocytosis', async ({ page }) => {
  // Capture Macrophage logs from the browser console
  page.on('console', msg => {
    if (msg.text().includes('MACROPHAGE') || msg.text().includes('DEEP SPECTRAL')) {
      // eslint-disable-next-line no-console
      console.log(`BROWSER: ${msg.text()}`);
    }
  });

  console.log('\n💉 1. Loading TrueSight Immune Harness...');
  await page.goto('/__immune/truesight?mode=read&content=short&width=820', { waitUntil: 'load' });
  await page.waitForSelector('.word-background-layer', { state: 'attached', timeout: 15000 });
  await page.waitForSelector('.truesight-word', { timeout: 15000 });
  await page.evaluate(() => document.fonts.ready);
  
  // Wait a moment for initial render
  await page.waitForTimeout(500);

  console.log('🦠 2. Deliberately poisoning a DOM node with a toxic color payload (#NaN)...');
  await page.evaluate(() => {
    const spans = document.querySelectorAll('.truesight-word');
    if (spans.length > 5) {
      // Poison the 5th word
      spans[5].style.setProperty('--w', '#NaN');
      spans[5].style.setProperty('color', '#NaN');
    }
  });

  console.log('⏳ 3. Waiting for continuous Macrophage patrol sweep (1000ms tick rate)...');
  // Wait for the Macrophage to detect it on its next patrol tick
  await page.waitForTimeout(2000);

  console.log('🔬 4. Verifying Phagocytosis successfully restored the node to neutral baseline...');
  const restoredColor = await page.evaluate(() => {
    const spans = document.querySelectorAll('.truesight-word');
    return spans[5] ? spans[5].style.getPropertyValue('--w') : null;
  });

  expect(restoredColor).toContain('50%'); // hsl(0, 0%, 50%) is the neutral baseline
  console.log(`✅ Success! Node restored to: ${restoredColor}`);
});
