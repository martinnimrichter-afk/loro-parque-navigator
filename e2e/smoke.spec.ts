import { expect, test } from '@playwright/test';

// The about dialog auto-opens as a modal on first launch (src/main.ts checks
// localStorage for `lpn.seen-disclaimer`). Playwright gives each test a fresh
// browser context, so without this the dialog would open on every `goto`.
// Pre-seeding the flag before the page's own scripts run keeps the assertions
// below deterministic without touching the brief's test bodies.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('lpn.seen-disclaimer', '1'));
});

test('app shell loads with map canvas and shows panel', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('#map canvas')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('#shows-panel')).toBeVisible();
  await expect(page.locator('#topbar')).toContainText('Park Navigator');
});

test('works offline after first visit (service worker)', async ({ page, context }) => {
  await page.goto('./');
  await expect(page.locator('#map canvas')).toBeVisible({ timeout: 15000 });
  await page.evaluate(async () => { await navigator.serviceWorker?.ready; });
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('#map canvas')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('#shows-panel')).toBeVisible();
  await context.setOffline(false);
});
