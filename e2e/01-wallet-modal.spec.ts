import { test, expect } from '@playwright/test';
import { HomePage, WalletModal, ConsoleCollector, debugScreenshot, TEST_CONFIG } from './helpers';

test.describe('Suite 1: Wallet Modal Behavior', () => {
  let home: HomePage;
  let modal: WalletModal;
  let console_: ConsoleCollector;

  test.beforeEach(async ({ page }) => {
    home = new HomePage(page);
    modal = new WalletModal(page);
    console_ = new ConsoleCollector();
    console_.attach(page);
    await home.goto();
    await debugScreenshot(page, '01-before');
  });

  test('Hero CTA opens the wallet modal', async ({ page }) => {
    await home.clickConnectWallet();
    await modal.waitForOpen();
    await debugScreenshot(page, '01-modal-open');
    expect(await modal.isOpen()).toBe(true);
  });

  test('Modal shows all 3 options and "or" divider', async ({ page }) => {
    await home.clickConnectWallet();
    await modal.waitForOpen();

    expect(await modal.isInGameWalletVisible()).toBe(true);
    expect(await modal.isCreateAccountVisible()).toBe(true);
    expect(await modal.isJoinWaitlistVisible()).toBe(true);
    expect(await modal.isOrDividerVisible()).toBe(true);

    await debugScreenshot(page, '01-all-options');
  });

  test('Close via X button', async ({ page }) => {
    await home.clickConnectWallet();
    await modal.waitForOpen();
    await modal.close();
    expect(await modal.isOpen()).toBe(false);
    await debugScreenshot(page, '01-closed-x');
  });

  test('Close via ESC key', async ({ page }) => {
    await home.clickConnectWallet();
    await modal.waitForOpen();
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    expect(await modal.isOpen()).toBe(false);
    await debugScreenshot(page, '01-closed-esc');
  });

  test('Close via backdrop click', async ({ page }) => {
    await home.clickConnectWallet();
    await modal.waitForOpen();
    await modal.closeViaBackdrop();
    await page.waitForTimeout(500);
    expect(await modal.isOpen()).toBe(false);
    await debugScreenshot(page, '01-closed-backdrop');
  });

  test('Body scroll locked when modal is open', async ({ page }) => {
    await home.clickConnectWallet();
    await modal.waitForOpen();

    const overflow = await page.evaluate(() => {
      const bodyOverflow = window.getComputedStyle(document.body).overflow;
      const htmlOverflow = window.getComputedStyle(document.documentElement).overflow;
      return { body: bodyOverflow, html: htmlOverflow };
    });
    // BUG FINDING: body scroll should be locked when modal is open
    // Check body OR html overflow — some implementations lock on <html>
    const isLocked = overflow.body === 'hidden' || overflow.html === 'hidden' ||
                     overflow.body === 'clip' || overflow.html === 'clip';
    expect(isLocked).toBeTruthy();

    await modal.close();

    const overflowAfter = await page.evaluate(() => {
      return window.getComputedStyle(document.body).overflow;
    });
    // Should restore
    expect(overflowAfter !== 'hidden').toBeTruthy();
    await debugScreenshot(page, '01-scroll-lock');
  });

  test('Double-click Connect Wallet only opens 1 modal', async ({ page }) => {
    const btn = page.locator('button:has-text("Connect Wallet")').first();
    await btn.dblclick();
    await page.waitForTimeout(500);

    const dialogs = page.locator('[role="dialog"]');
    const count = await dialogs.count();
    expect(count).toBeLessThanOrEqual(1);
    await debugScreenshot(page, '01-no-double-modal');
  });

  test('In-game wallet path: clicking shows address input', async ({ page }) => {
    await home.clickConnectWallet();
    await modal.waitForOpen();
    await modal.selectInGameWallet();

    // Should now show address input
    await expect(page.locator('input[placeholder*="0x"], input[type="text"]').first()).toBeVisible({ timeout: 5_000 });
    await debugScreenshot(page, '01-paste-view');
  });

  test('Valid address navigates to portfolio', async ({ page }) => {
    await home.clickConnectWallet();
    await modal.waitForOpen();
    await modal.selectInGameWallet();
    await modal.enterInGameAddress(TEST_CONFIG.wallets.inGame);
    await debugScreenshot(page, '01-address-entered');
    await modal.submitInGameAddress();

    // Should navigate to portfolio
    await page.waitForURL(/\/portfolio/, { timeout: TEST_CONFIG.timeouts.walletConnect });
    await debugScreenshot(page, '01-portfolio-nav');
    expect(page.url()).toContain('/portfolio');
  });

  test('Invalid address shows validation hint', async ({ page }) => {
    await home.clickConnectWallet();
    await modal.waitForOpen();
    await modal.selectInGameWallet();
    await modal.enterInGameAddress(TEST_CONFIG.wallets.inGameInvalid);

    // Should show validation hint
    const hint = await modal.getValidationHint();
    expect(hint).not.toBeNull();
    await debugScreenshot(page, '01-invalid-address');
  });

  test('Whitespace-padded address works', async ({ page }) => {
    await home.clickConnectWallet();
    await modal.waitForOpen();
    await modal.selectInGameWallet();
    await modal.enterInGameAddress(TEST_CONFIG.wallets.inGameWithSpaces);
    await modal.submitInGameAddress();

    await page.waitForURL(/\/portfolio/, { timeout: TEST_CONFIG.timeouts.walletConnect });
    expect(page.url()).toContain('/portfolio');
    await debugScreenshot(page, '01-trimmed-address');
  });

  test('No console errors during modal interactions', async ({ page }) => {
    await home.clickConnectWallet();
    await modal.waitForOpen();
    await modal.selectInGameWallet();
    // Try to go back if back button exists
    const backBtn = page.locator('[aria-label="Back to options"], [aria-label="Back"]');
    if (await backBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await backBtn.click();
    }
    await modal.close();

    console_.assertClean();
    await debugScreenshot(page, '01-no-console-errors');
  });
});
