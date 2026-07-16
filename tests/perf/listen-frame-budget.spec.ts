import { test, expect, chromium } from '@playwright/test';

test('Listen holds a frame budget on a real GPU', async () => {
  const browser = await chromium.launch({ headless: false, args: ['--enable-gpu', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await page.goto('http://localhost:5173/listen', { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(2500); // let the stage + scene settle
  const { pctOver20 } = await page.evaluate(() => new Promise<{ pctOver20: number }>((res) => {
    const f: number[] = []; let last = performance.now(); const start = last;
    const tick = (n: number) => { f.push(n - last); last = n; if (performance.now() - start < 6000) requestAnimationFrame(tick); else { f.shift(); res({ pctOver20: f.filter(x => x > 20).length / f.length }); } };
    requestAnimationFrame(tick);
  }));
  await browser.close();
  // Baseline before this work was ~0.32-0.38 on the Deck (cool). Gate at 0.15.
  expect(pctOver20).toBeLessThan(0.15);
});
