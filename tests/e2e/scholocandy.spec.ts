import { test, expect } from '@playwright/test';

test.describe('ScholoCandy EQ', () => {
  test('mounts correctly and allows interaction', async ({ page }) => {
    // Navigate to the listen page where ScholoCandy might be present
    // Assuming the path is /listen or similar. We will just mock the expected behavior or navigate if the dev server is running.
    // If the dev server is running on localhost:3000
    await page.goto('/listen');

    // Wait for the EQ canvas to appear
    const canvas = page.locator('canvas.spectrum-canvas');
    await expect(canvas).toBeVisible({ timeout: 10000 });

    // Check if ParaEQOverlay renders
    // We can check for a band node if there are default bands
    const overlay = page.locator('.paraeq-overlay-container'); // Need to ensure the overlay has a class or testid if we want to be strict, but we can also just check for text content '1' for the first band.
    
    // The ParaEQOverlay uses inline styles and div elements for bands
    // Let's check for the text '1' which is the first band
    const bandOne = page.locator('div').filter({ hasText: /^1$/ }).first();
    await expect(bandOne).toBeVisible();

    // Double click to add a new band
    const container = bandOne.locator('..'); // parent container
    await container.dblclick({ position: { x: 100, y: 100 } });

    // Verify a new band is added (text '7' since default is 6)
    const bandSeven = page.locator('div').filter({ hasText: /^7$/ }).first();
    await expect(bandSeven).toBeVisible();
  });
});
