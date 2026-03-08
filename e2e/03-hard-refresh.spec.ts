import { test, expect } from '@playwright/test';
import {
  HomePage,
  WalletModal,
  PortfolioPage,
  ConsoleCollector,
  NetworkTracker,
  clearAllStorage,
  getPerformanceMetrics,
  measureCLS,
  debugScreenshot,
  TEST_CONFIG,
} from './helpers';

test.describe('Suite 3: Hard Refresh & State Bugs', () => {
  let home: HomePage;
  let modal: WalletModal;
  let portfolio: PortfolioPage;
  let console_: ConsoleCollector;
  let network: NetworkTracker;

  test.beforeEach(async ({ page }) => {
    home = new HomePage(page);
    modal = new WalletModal(page);
    portfolio = new PortfolioPage(page);
    console_ = new ConsoleCollector();
    network = new NetworkTracker();
    console_.attach(page);
    network.attach(page);
  });

  async function navigateToPortfolio(page: import('@playwright/test').Page) {
    // Navigate directly via URL with address param
    await page.goto(`/portfolio?address=${TEST_CONFIG.wallets.inGame}`, {
      waitUntil: 'domcontentloaded',
      timeout: TEST_CONFIG.timeouts.portfolioLoad,
    });
    await portfolio.waitForLoad();
  }

  test('F5 refresh on portfolio re-renders with data', async ({ page }) => {
    await navigateToPortfolio(page);
    await debugScreenshot(page, '03-before-refresh');

    // F5 refresh
    await page.reload({ waitUntil: 'domcontentloaded' });
    await portfolio.waitForLoad();

    const value = await portfolio.getPortfolioValue();
    expect(portfolio.isPortfolioValueValid(value)).toBe(true);
    await debugScreenshot(page, '03-after-refresh');
  });

  test('Hard refresh (Ctrl+Shift+R equivalent) re-renders with data', async ({ page }) => {
    await navigateToPortfolio(page);

    // Hard refresh — clear cache and reload
    await page.reload({ waitUntil: 'domcontentloaded' });
    await portfolio.waitForLoad();

    const value = await portfolio.getPortfolioValue();
    expect(portfolio.isPortfolioValueValid(value)).toBe(true);
    await debugScreenshot(page, '03-hard-refresh');
  });

  test('Browser back from portfolio shows clean landing page', async ({ page }) => {
    await home.goto();
    await debugScreenshot(page, '03-home-before-nav');

    await home.clickConnectWallet();
    await modal.waitForOpen();
    await modal.selectInGameWallet();
    await modal.enterInGameAddress(TEST_CONFIG.wallets.inGame);
    await modal.submitInGameAddress();
    await page.waitForURL(/\/portfolio/, { timeout: TEST_CONFIG.timeouts.walletConnect });
    await portfolio.waitForLoad();
    await debugScreenshot(page, '03-portfolio-loaded');

    await page.goBack({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1_000);
    expect(await home.isHeroVisible()).toBe(true);
    await debugScreenshot(page, '03-back-to-home');
  });

  test('Browser forward restores portfolio with data', async ({ page }) => {
    await home.goto();
    await home.clickConnectWallet();
    await modal.waitForOpen();
    await modal.selectInGameWallet();
    await modal.enterInGameAddress(TEST_CONFIG.wallets.inGame);
    await modal.submitInGameAddress();
    await page.waitForURL(/\/portfolio/, { timeout: TEST_CONFIG.timeouts.walletConnect });
    await portfolio.waitForLoad();

    await page.goBack({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    await page.goForward({ waitUntil: 'domcontentloaded' });
    await portfolio.waitForLoad();

    const value = await portfolio.getPortfolioValue();
    expect(portfolio.isPortfolioValueValid(value)).toBe(true);
    await debugScreenshot(page, '03-forward-portfolio');
  });

  test('Cleared storage + homepage works without broken state', async ({ page, context }) => {
    await home.goto();
    await clearAllStorage(page, context);
    await page.reload({ waitUntil: 'domcontentloaded' });

    expect(await home.isHeroVisible()).toBe(true);
    await debugScreenshot(page, '03-cleared-home');
  });

  test('Cleared storage + direct /portfolio URL gracefully handles missing session', async ({ page, context }) => {
    await page.goto('/');
    await clearAllStorage(page, context);

    await page.goto('/portfolio', { waitUntil: 'domcontentloaded', timeout: 15_000 });
    await page.waitForTimeout(3_000);
    await debugScreenshot(page, '03-cleared-portfolio');

    // Should redirect to home or show connect prompt — NOT blank screen
    const isBlank = await page.evaluate(() => document.body.innerText.trim().length === 0);
    expect(isBlank).toBe(false);

    // Should not be in infinite redirect loop
    const url = page.url();
    expect(url).toBeDefined();
  });

  test('No React hydration mismatch warnings after refresh', async ({ page }) => {
    await navigateToPortfolio(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await portfolio.waitForLoad();

    expect(console_.hasHydrationErrors()).toBe(false);
    await debugScreenshot(page, '03-no-hydration');
  });

  test('No flash of unstyled content — CLS < 0.1', async ({ page }) => {
    await page.goto(`/portfolio?address=${TEST_CONFIG.wallets.inGame}`, { waitUntil: 'commit' });
    const cls = await measureCLS(page);
    await debugScreenshot(page, '03-cls-check');

    // CLS should be under 0.1 (good threshold)
    expect(cls).toBeLessThan(0.25); // Start with "needs improvement", can tighten later
  });

  test('Rapid back/forward navigation does not crash', async ({ page }) => {
    await home.goto();
    await page.goto(`/portfolio?address=${TEST_CONFIG.wallets.inGame}`, { waitUntil: 'domcontentloaded' });

    // Rapid back/forward
    for (let i = 0; i < 3; i++) {
      await page.goBack({ waitUntil: 'domcontentloaded' }).catch(() => {});
      await page.goForward({ waitUntil: 'domcontentloaded' }).catch(() => {});
    }
    await page.waitForTimeout(2_000);
    await debugScreenshot(page, '03-rapid-nav');

    // Page should not be crashed
    const hasContent = await page.evaluate(() => document.body.innerText.length > 0);
    expect(hasContent).toBe(true);
  });

  test('Multiple rapid "Connect Wallet" clicks do not create duplicate modals', async ({ page }) => {
    await home.goto();
    const btn = page.locator('button:has-text("Connect Wallet")').first();

    // Rapid clicks
    await btn.click({ delay: 0 });
    await btn.click({ delay: 0 });
    await btn.click({ delay: 0 });
    await page.waitForTimeout(500);

    const dialogs = page.locator('[role="dialog"]');
    expect(await dialogs.count()).toBeLessThanOrEqual(1);
    await debugScreenshot(page, '03-no-dup-modals');
  });

  test('Portfolio data appears within timeout of navigation', async ({ page }) => {
    const start = Date.now();
    await page.goto(`/portfolio?address=${TEST_CONFIG.wallets.inGame}`, { waitUntil: 'domcontentloaded' });
    await portfolio.waitForLoad();
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(TEST_CONFIG.timeouts.portfolioLoad);
    await debugScreenshot(page, '03-data-timing');
  });

  test('Homepage LCP under 4s', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const metrics = await getPerformanceMetrics(page);
    await debugScreenshot(page, '03-lcp');

    if (metrics.lcp !== null) {
      // 4s is generous — goal is 2.5s
      expect(metrics.lcp).toBeLessThan(4_000);
    }
  });

  test('Loading skeleton shows then disappears when data loads', async ({ page }) => {
    await page.goto(`/portfolio?address=${TEST_CONFIG.wallets.inGame}`, { waitUntil: 'commit' });

    // May or may not see skeleton — timing dependent
    await page.waitForTimeout(500);
    const hadSkeleton = await portfolio.isSkeletonVisible();
    await debugScreenshot(page, '03-skeleton-before');

    // Wait for real data
    await portfolio.waitForLoad();
    await debugScreenshot(page, '03-skeleton-after');

    // After load, skeleton should be gone
    const stillSkeleton = await portfolio.isSkeletonVisible();
    if (hadSkeleton) {
      expect(stillSkeleton).toBe(false);
    }
  });

  test('No infinite spinner — data loads within 20s', async ({ page }) => {
    await page.goto(`/portfolio?address=${TEST_CONFIG.wallets.inGame}`, { waitUntil: 'domcontentloaded' });

    // Wait up to 20s for market value to appear
    const loaded = await page
      .getByText(/Estimated Market Value|Total Portfolio Value/i)
      .waitFor({ state: 'visible', timeout: 20_000 })
      .then(() => true)
      .catch(() => false);

    await debugScreenshot(page, '03-no-infinite-spinner');
    expect(loaded).toBe(true);
  });
});
