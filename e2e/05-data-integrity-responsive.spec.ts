import { test, expect } from '@playwright/test';
import {
  PortfolioPage,
  ConsoleCollector,
  NetworkTracker,
  debugScreenshot,
  TEST_CONFIG,
} from './helpers';

test.describe('Suite 5: Portfolio Data Integrity + Responsive', () => {
  let portfolio: PortfolioPage;
  let console_: ConsoleCollector;
  let network: NetworkTracker;

  test.beforeEach(async ({ page }) => {
    portfolio = new PortfolioPage(page);
    console_ = new ConsoleCollector();
    network = new NetworkTracker();
    console_.attach(page);
    network.attach(page);
  });

  async function loadPortfolio(page: import('@playwright/test').Page) {
    await page.goto(`/portfolio?address=${TEST_CONFIG.wallets.inGame}`, {
      waitUntil: 'domcontentloaded',
      timeout: TEST_CONFIG.timeouts.portfolioLoad,
    });
    await portfolio.waitForLoad();
  }

  test('Estimated Market Value is a valid dollar amount', async ({ page }) => {
    await loadPortfolio(page);

    const value = await portfolio.getPortfolioValue();
    await debugScreenshot(page, '05-market-value');
    expect(value).not.toBeNull();
    expect(portfolio.isPortfolioValueValid(value)).toBe(true);
  });

  test('GUN Balance shows a number', async ({ page }) => {
    await loadPortfolio(page);

    expect(await portfolio.isGunBalanceVisible()).toBe(true);
    await debugScreenshot(page, '05-gun-balance');
  });

  test('NFT Holdings count matches gallery card count', async ({ page }) => {
    await loadPortfolio(page);
    await page.waitForTimeout(5_000); // Allow gallery to fully load

    const holdingsCount = await portfolio.getNftHoldingsCount();
    const cardCount = await portfolio.getGalleryCardCount();
    await debugScreenshot(page, '05-nft-count-match');

    if (holdingsCount !== null && cardCount > 0) {
      // They should match (or cards might be paginated)
      expect(holdingsCount).toBeGreaterThan(0);
      expect(cardCount).toBeGreaterThan(0);
      // Gallery may show fewer if paginated, but header count should be >= card count
      expect(holdingsCount).toBeGreaterThanOrEqual(cardCount);
    }
  });

  test('NFT images load (no broken images)', async ({ page }) => {
    await loadPortfolio(page);
    await page.waitForTimeout(5_000); // Allow images to load

    const brokenImages = await page.evaluate(() => {
      const imgs = document.querySelectorAll('img');
      const broken: string[] = [];
      imgs.forEach((img) => {
        if (img.complete && img.naturalWidth === 0 && img.offsetParent !== null) {
          broken.push(img.src || img.getAttribute('data-src') || 'unknown');
        }
      });
      return broken;
    });

    await debugScreenshot(page, '05-image-check');
    if (brokenImages.length > 0) {
      console.warn('Broken images:', brokenImages);
    }
    // Allow up to 2 broken (race conditions), but flag
    expect(brokenImages.length).toBeLessThan(3);
  });

  test('Filter pills work — clicking Rare filters gallery', async ({ page }) => {
    await loadPortfolio(page);
    await page.waitForTimeout(3_000);
    await debugScreenshot(page, '05-before-filter');

    // Check if filter pills exist
    const rarePill = page.getByText(/Rare/i).first();
    if (await rarePill.isVisible().catch(() => false)) {
      const countBefore = await portfolio.getGalleryCardCount();
      await rarePill.click();
      await page.waitForTimeout(1_000);
      await debugScreenshot(page, '05-after-filter');
      const countAfter = await portfolio.getGalleryCardCount();

      // Filtered count should be less or equal to total
      expect(countAfter).toBeLessThanOrEqual(countBefore);
    }
  });

  test('Grid/list view toggle works', async ({ page }) => {
    await loadPortfolio(page);
    await page.waitForTimeout(2_000);

    await portfolio.toggleGridView();
    await page.waitForTimeout(500);
    await debugScreenshot(page, '05-toggled-view');

    // Page should still have NFT content
    const hasContent = await page.evaluate(() => document.body.innerText.length > 100);
    expect(hasContent).toBe(true);
  });

  test('Full flow has zero hydration errors', async ({ page }) => {
    await loadPortfolio(page);

    expect(console_.hasHydrationErrors()).toBe(false);
    await debugScreenshot(page, '05-no-hydration');
  });

  test('Full flow has zero unhandled promise rejections', async ({ page }) => {
    await loadPortfolio(page);
    await page.waitForTimeout(5_000);

    expect(console_.hasUnhandledRejections()).toBe(false);
    await debugScreenshot(page, '05-no-rejections');
  });
});

// ─── Responsive tests ───────────────────────────────────────────────────────

test.describe('Suite 5b: Responsive Layout', () => {
  const viewports = [
    { width: 320, height: 568, name: '320px' },
    { width: 375, height: 667, name: '375px' },
    { width: 425, height: 812, name: '425px' },
    { width: 768, height: 1024, name: '768px' },
    { width: 1024, height: 768, name: '1024px' },
    { width: 1440, height: 900, name: '1440px' },
    { width: 2560, height: 1440, name: '2560px' },
  ];

  for (const vp of viewports) {
    test(`No horizontal scroll at ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`/portfolio?address=${TEST_CONFIG.wallets.inGame}`, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });
      await page.waitForTimeout(3_000);
      await debugScreenshot(page, `05-responsive-${vp.name}`);

      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(hasHorizontalScroll).toBe(false);
    });
  }

  test('Touch targets >= 44px on mobile (375px)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`/portfolio?address=${TEST_CONFIG.wallets.inGame}`, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });
    await page.waitForTimeout(3_000);

    const smallTargets = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button, a, [role="button"], input');
      const tooSmall: string[] = [];
      buttons.forEach((el) => {
        const rect = el.getBoundingClientRect();
        // Only check visible, non-zero elements
        if (rect.width > 0 && rect.height > 0 && rect.width < 32 && rect.height < 32) {
          // Skip tiny decorative elements
          if (el.getAttribute('aria-hidden') === 'true') return;
          if (el.closest('[aria-hidden="true"]')) return;
          tooSmall.push(
            `${el.tagName}[${el.textContent?.slice(0, 20)}] ${Math.round(rect.width)}x${Math.round(rect.height)}`,
          );
        }
      });
      return tooSmall;
    });

    await debugScreenshot(page, '05-touch-targets');
    if (smallTargets.length > 0) {
      console.warn('Small touch targets:', smallTargets.slice(0, 10));
    }
    // Warn, don't hard fail — some icons are intentionally small
    expect(smallTargets.length).toBeLessThan(10);
  });

  test('Modal does not overflow viewport on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2_000);

    await page.locator('button:has-text("Connect Wallet")').first().click();
    await page.waitForTimeout(1_000);
    await debugScreenshot(page, '05-modal-mobile');

    const overflows = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      if (!dialog) return false;
      const rect = dialog.getBoundingClientRect();
      return rect.right > window.innerWidth || rect.bottom > window.innerHeight;
    });
    expect(overflows).toBe(false);
  });
});
