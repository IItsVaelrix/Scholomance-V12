import { test, expect, chromium } from '@playwright/test';

test('Listen has no animated backdrop/blend layer over the canvas', async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await page.goto('http://localhost:5173/listen', { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(3000);
  const offenders = await page.evaluate(() => {
    const bad: string[] = [];
    for (const el of Array.from(document.querySelectorAll('*'))) {
      const cs = getComputedStyle(el as Element);
      const r = (el as Element).getBoundingClientRect();
      const big = r.width * r.height > 200_000; // large layer
      const animating = cs.animationName !== 'none';
      const composited = cs.backdropFilter !== 'none' || (cs.mixBlendMode && cs.mixBlendMode !== 'normal');
      if (big && animating && composited) bad.push((el as HTMLElement).className || el.tagName);
    }
    return bad;
  });
  await browser.close();
  expect(offenders).toEqual([]);
});
