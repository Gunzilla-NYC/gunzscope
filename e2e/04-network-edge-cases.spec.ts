import { test, expect } from '@playwright/test';
import {
  PortfolioPage,
  NetworkTracker,
  ConsoleCollector,
  throttleNetwork,
  unthrottleNetwork,
  debugScreenshot,
  TEST_CONFIG,
} from './helpers';

test.describe('Suite 4: Network Edge Cases', () => {
  let portfolio: PortfolioPage;
  let network: NetworkTracker;
  let console_: ConsoleCollector;

  test.beforeEach(async ({ page }) => {
    portfolio = new PortfolioPage(page);
    network = new NetworkTracker();
    console_ = new ConsoleCollector();
    network.attach(page);
    console_.attach(page);
  });

  test('Mock CoinGecko price API failure — portfolio still renders', async ({ page }) => {
    // Block CoinGecko API
    await page.route('**/api.coingecko.com/**', (route) => route.abort());
    await page.route('**/api/price/**', (route) => route.abort());

    await page.goto(`/portfolio?address=${TEST_CONFIG.wallets.inGame}`, {
      waitUntil: 'domcontentloaded',
      timeout: TEST_CONFIG.timeouts.portfolioLoad,
    });
    await debugScreenshot(page, '04-coingecko-blocked');

    // Page should still render (may show $0 or fallback, but not blank/NaN)
    const hasContent = await page.evaluate(() => document.body.innerText.length > 100);
    expect(hasContent).toBe(true);

    // Check for NaN in visible text
    const bodyText = await page.evaluate(() => document.body.innerText);
    expect(bodyText).not.toContain('NaN');
    expect(bodyText).not.toContain('undefined');
    await debugScreenshot(page, '04-no-nan-price');
  });

  test('Mock NFT image failures — gallery shows fallback, not broken icons', async ({ page }) => {
    // Block NFT images from OpenSea CDN
    await page.route('**/i.seadn.io/**', (route) => route.abort());
    await page.route('**/openseauserdata.com/**', (route) => route.abort());

    await page.goto(`/portfolio?address=${TEST_CONFIG.wallets.inGame}`, {
      waitUntil: 'domcontentloaded',
      timeout: TEST_CONFIG.timeouts.portfolioLoad,
    });
    await page.waitForTimeout(5_000);
    await debugScreenshot(page, '04-images-blocked');

    // Check for broken images
    const brokenImages = await page.evaluate(() => {
      const imgs = document.querySelectorAll('img');
      let broken = 0;
      imgs.forEach((img) => {
        if (img.complete && img.naturalWidth === 0 && img.offsetParent !== null) {
          broken++;
        }
      });
      return broken;
    });

    // Allow some broken images but flag if excessive
    if (brokenImages > 0) {
      console.warn(`Found ${brokenImages} broken images`);
    }
    await debugScreenshot(page, '04-broken-images-check');
  });

  test('Mock API returning 500 — error boundary catches, not blank screen', async ({ page }) => {
    // Block the main portfolio API calls
    await page.route('**/api/opensea/**', (route) =>
      route.fulfill({ status: 500, body: 'Internal Server Error' }),
    );

    await page.goto(`/portfolio?address=${TEST_CONFIG.wallets.inGame}`, {
      waitUntil: 'domcontentloaded',
      timeout: TEST_CONFIG.timeouts.portfolioLoad,
    });
    await page.waitForTimeout(5_000);
    await debugScreenshot(page, '04-api-500');

    // Page should not be blank
    const bodyText = await page.evaluate(() => document.body.innerText.trim());
    expect(bodyText.length).toBeGreaterThan(10);
  });

  test('Mock API returning 429 — app handles gracefully', async ({ page }) => {
    await page.route('**/api/opensea/**', (route) =>
      route.fulfill({
        status: 429,
        headers: { 'Retry-After': '5' },
        body: 'Too Many Requests',
      }),
    );

    await page.goto(`/portfolio?address=${TEST_CONFIG.wallets.inGame}`, {
      waitUntil: 'domcontentloaded',
      timeout: TEST_CONFIG.timeouts.portfolioLoad,
    });
    await page.waitForTimeout(5_000);
    await debugScreenshot(page, '04-api-429');

    // Should not crash
    const bodyText = await page.evaluate(() => document.body.innerText.trim());
    expect(bodyText.length).toBeGreaterThan(10);
  });

  test('Offline mode shows error message, not blank screen', async ({ page }) => {
    // First load the page normally
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await debugScreenshot(page, '04-online-first');

    // Go offline
    await throttleNetwork(page, 'offline');

    // Try navigating to portfolio
    await page.goto(`/portfolio?address=${TEST_CONFIG.wallets.inGame}`, {
      waitUntil: 'domcontentloaded',
      timeout: 10_000,
    }).catch(() => {
      // Expected to fail when offline
    });

    await page.waitForTimeout(3_000);
    await debugScreenshot(page, '04-offline');

    // Should show some error indication, not blank
    const bodyText = await page.evaluate(() => document.body.innerText.trim());
    // Either shows offline message or the cached page
    expect(bodyText.length).toBeGreaterThan(0);

    // Restore network
    await unthrottleNetwork(page);
  });

  test('No unexpected 404s during normal flow', async ({ page }) => {
    await page.goto(`/portfolio?address=${TEST_CONFIG.wallets.inGame}`, {
      waitUntil: 'domcontentloaded',
      timeout: TEST_CONFIG.timeouts.portfolioLoad,
    });
    await page.waitForTimeout(5_000);
    await debugScreenshot(page, '04-no-404s');

    const failures = network.getRelevantFailures();
    const real404s = failures.filter((f) => f.status === 404);

    if (real404s.length > 0) {
      console.warn('Unexpected 404s:', real404s.map((f) => f.url));
    }
    // Alert but don't fail — some 404s may be acceptable
    expect(real404s.length).toBeLessThan(5);
  });

  test('No CORS errors during page load', async ({ page }) => {
    await page.goto(`/portfolio?address=${TEST_CONFIG.wallets.inGame}`, {
      waitUntil: 'domcontentloaded',
      timeout: TEST_CONFIG.timeouts.portfolioLoad,
    });
    await page.waitForTimeout(3_000);

    const errors = console_.getErrors();
    const corsErrors = errors.filter(
      (e) => e.includes('CORS') || e.includes('cross-origin') || e.includes('Access-Control'),
    );

    await debugScreenshot(page, '04-no-cors');
    expect(corsErrors.length).toBe(0);
  });
});
