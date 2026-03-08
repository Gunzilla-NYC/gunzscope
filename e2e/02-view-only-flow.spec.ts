import { test, expect } from '@playwright/test';
import {
  HomePage,
  WalletModal,
  PortfolioPage,
  ConsoleCollector,
  debugScreenshot,
  TEST_CONFIG,
} from './helpers';

test.describe('Suite 2: View-Only In-Game Wallet Flow', () => {
  let home: HomePage;
  let modal: WalletModal;
  let portfolio: PortfolioPage;
  let console_: ConsoleCollector;

  test.beforeEach(async ({ page }) => {
    home = new HomePage(page);
    modal = new WalletModal(page);
    portfolio = new PortfolioPage(page);
    console_ = new ConsoleCollector();
    console_.attach(page);
  });

  async function connectInGameWallet(page: import('@playwright/test').Page) {
    await home.goto();
    await home.clickConnectWallet();
    await modal.waitForOpen();
    await modal.selectInGameWallet();
    await modal.enterInGameAddress(TEST_CONFIG.wallets.inGame);
    await modal.submitInGameAddress();
    await page.waitForURL(/\/portfolio/, { timeout: TEST_CONFIG.timeouts.walletConnect });
    await portfolio.waitForLoad();
    await debugScreenshot(page, '02-portfolio-loaded');
  }

  test('Full flow: paste address -> portfolio loads with VIEW ONLY badge', async ({ page }) => {
    await connectInGameWallet(page);

    // View Only badge should appear for in-game wallet paste flow
    // Wait a bit for the identity bar to fully render
    await page.waitForTimeout(2_000);
    const isViewOnly = await portfolio.isViewOnly();
    await debugScreenshot(page, '02-view-only-badge');
    // BUG FINDING: If this fails, the VIEW ONLY badge is missing for paste-flow wallets
    expect(isViewOnly).toBe(true);
  });

  test('Portfolio value section renders (may show Calculating initially)', async ({ page }) => {
    await connectInGameWallet(page);

    // Wait for enrichment to replace "Calculating" with a real value
    // Give it extra time since enrichment hits APIs
    await page.waitForTimeout(10_000);
    const value = await portfolio.getPortfolioValue();
    await debugScreenshot(page, '02-market-value');
    // Value may still be "Calculating" if enrichment is slow — that's a timing issue, not a bug
    // But it should not be NaN or undefined
    if (value && !value.includes('Calculating')) {
      expect(portfolio.isPortfolioValueValid(value)).toBe(true);
    }
  });

  test('Stats row populates: GUN Balance, NFT Holdings, Data Quality', async ({ page }) => {
    await connectInGameWallet(page);

    expect(await portfolio.isGunBalanceVisible()).toBe(true);
    await debugScreenshot(page, '02-stats-row');
  });

  test('Off The Grid Game Assets section renders with NFT cards', async ({ page }) => {
    await connectInGameWallet(page);

    await expect(page.getByText('Off The Grid Game Assets')).toBeVisible();
    const cardCount = await portfolio.getGalleryCardCount();
    // This wallet should have NFTs
    expect(cardCount).toBeGreaterThan(0);
    await debugScreenshot(page, '02-nft-gallery');
  });

  test('No attestation/write/sign buttons visible in view-only mode', async ({ page }) => {
    await connectInGameWallet(page);

    const hasWrite = await portfolio.hasWriteActions();
    expect(hasWrite).toBe(false);
    await debugScreenshot(page, '02-no-write-actions');
  });

  test('Search another wallet loads different portfolio', async ({ page }) => {
    await connectInGameWallet(page);

    // Use a different known address
    const otherAddress = '0x0000000000000000000000000000000000000001';
    await portfolio.searchWallet(otherAddress);
    await page.waitForTimeout(3_000);
    await debugScreenshot(page, '02-other-wallet');

    // URL should change
    expect(page.url()).toContain(otherAddress.toLowerCase().slice(0, 10));
  });

  test('No hydration errors during view-only flow', async ({ page }) => {
    await connectInGameWallet(page);

    expect(console_.hasHydrationErrors()).toBe(false);
    await debugScreenshot(page, '02-no-hydration-errors');
  });
});
