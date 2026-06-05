import { test, expect } from '@playwright/test';

/**
 * Proves the Phaser runtime decoupling at the network level: the ~1.36 MB engine must NOT
 * be fetched while navigating non-Phaser routes, and MUST be fetched only when a Phaser
 * view mounts. This is the "not requested until mount" claim, moved from assertion to test.
 *
 * Matches the engine module in both dev (Vite pre-bundled dep: `.vite/deps/phaser*`) and
 * preview/prod (`phaser.esm-<hash>.js`), while excluding the adapter file itself
 * (`phaser-runtime.adapter`), which legitimately loads with a Phaser route's code chunk.
 */
const PHASER_ENGINE_RE = /(?:\.vite\/deps\/phaser|phaser(?:\.esm)?-[A-Za-z0-9_]+\.js)/;
const isPhaserEngineRequest = (url) =>
  PHASER_ENGINE_RE.test(url) && !/phaser-runtime/.test(url);

function trackPhaserRequests(page) {
  const urls = [];
  page.on('request', (req) => {
    if (isPhaserEngineRequest(req.url())) urls.push(req.url());
  });
  return urls;
}

test.describe('Phaser runtime is demand-loaded, not navigation-loaded', () => {
  test('engine is NOT fetched while navigating non-Phaser routes', async ({ page }) => {
    const phaserRequests = trackPhaserRequests(page);

    await page.goto('/watch', { waitUntil: 'load' });
    await page.goto('/career', { waitUntil: 'load' });
    // Give any stray dynamic import a chance to fire before asserting the negative.
    await page.waitForTimeout(750);

    expect(phaserRequests, `unexpected Phaser engine fetch: ${phaserRequests.join(', ')}`).toEqual([]);
  });

  test('engine IS fetched when a Phaser view mounts (/listen)', async ({ page }) => {
    const phaserRequests = trackPhaserRequests(page);

    // ListenPage renders <AlchemicalLabBackground/> unconditionally on load, which calls
    // mountPhaserGame -> dynamic import('phaser').
    await page.goto('/listen', { waitUntil: 'load' });

    await expect
      .poll(() => phaserRequests.length, { timeout: 10_000 })
      .toBeGreaterThan(0);
  });
});
