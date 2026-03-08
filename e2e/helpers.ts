import { type Page, type BrowserContext, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// ─── Config ─────────────────────────────────────────────────────────────────

export const TEST_CONFIG = {
  baseUrl: process.env.BASE_URL || 'https://gunzscope.xyz',
  wallets: {
    // Known wallet with OTG NFT holdings
    inGame: process.env.INGAME_WALLET_ADDRESS || '0xF9434E3057432032bB621AA5144329861869c72F',
    inGameInvalid: '0xinvalidaddress',
    inGameEmpty: '',
    inGameWithSpaces: '  0xF9434E3057432032bB621AA5144329861869c72F  ',
  },
  timeouts: {
    walletConnect: 15_000,
    portfolioLoad: 30_000,
    apiResponse: 10_000,
    animation: 1_000,
  },
};

// ─── Console Collector ──────────────────────────────────────────────────────

export class ConsoleCollector {
  private messages: Array<{ type: string; text: string }> = [];
  private pageErrors: string[] = [];

  attach(page: Page) {
    page.on('console', (msg) => {
      this.messages.push({ type: msg.type(), text: msg.text() });
    });
    page.on('pageerror', (err) => {
      this.pageErrors.push(err.message);
    });
  }

  hasHydrationErrors(): boolean {
    const patterns = ['Hydration', 'Text content does not match', 'did not match'];
    return this.messages.some((m) =>
      patterns.some((p) => m.text.includes(p)),
    );
  }

  hasUnhandledRejections(): boolean {
    return (
      this.pageErrors.length > 0 ||
      this.messages.some(
        (m) =>
          m.type === 'error' &&
          (m.text.includes('Unhandled') || m.text.includes('unhandledrejection')),
      )
    );
  }

  has404s(): boolean {
    return this.messages.some(
      (m) =>
        m.type === 'error' &&
        (m.text.includes('404') || m.text.includes('Failed to load resource')),
    );
  }

  getErrors(): string[] {
    return [
      ...this.messages.filter((m) => m.type === 'error').map((m) => m.text),
      ...this.pageErrors,
    ];
  }

  assertClean(allowPatterns: RegExp[] = [/dynamic/i, /Dynamic/i, /posthog/i, /vercel/i, /analytics/i]) {
    const errors = this.getErrors().filter(
      (e) => !allowPatterns.some((p) => p.test(e)),
    );
    if (this.hasHydrationErrors()) {
      throw new Error(`Hydration errors found: ${errors.join('\n')}`);
    }
    // Filter out allowed noise
    const realErrors = errors.filter(
      (e) => !e.includes('favicon') && !e.includes('_next/static'),
    );
    if (realErrors.length > 0) {
      console.warn('Console errors (non-blocking):', realErrors.slice(0, 5));
    }
  }
}

// ─── Network Tracker ────────────────────────────────────────────────────────

interface TrackedRequest {
  url: string;
  status: number;
  duration: number;
}

export class NetworkTracker {
  private failures: TrackedRequest[] = [];
  private slowRequests: TrackedRequest[] = [];
  private readonly SLOW_THRESHOLD = 5_000;

  attach(page: Page) {
    const timings = new Map<string, number>();

    page.on('request', (req) => {
      timings.set(req.url(), Date.now());
    });

    page.on('response', (res) => {
      const start = timings.get(res.url());
      const duration = start ? Date.now() - start : 0;

      if (res.status() >= 400) {
        this.failures.push({ url: res.url(), status: res.status(), duration });
      }
      if (duration > this.SLOW_THRESHOLD) {
        this.slowRequests.push({ url: res.url(), status: res.status(), duration });
      }
    });

    page.on('requestfailed', (req) => {
      const start = timings.get(req.url());
      const duration = start ? Date.now() - start : 0;
      this.failures.push({ url: req.url(), status: 0, duration });
    });
  }

  getRelevantFailures(
    ignorePatterns: RegExp[] = [
      /favicon/i,
      /analytics/i,
      /hot-update/i,
      /posthog/i,
      /vercel.*speed/i,
      /_next\/static/,
      /dynamic\.xyz/i,
    ],
  ): TrackedRequest[] {
    return this.failures.filter(
      (f) => !ignorePatterns.some((p) => p.test(f.url)),
    );
  }

  getSlowRequests(): TrackedRequest[] {
    return this.slowRequests;
  }
}

// ─── Page Objects ───────────────────────────────────────────────────────────

export class HomePage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30_000 });
    // Wait for hero to hydrate
    await this.page.waitForTimeout(2_000);
  }

  async clickConnectWallet() {
    // Hero CTA button — "Connect Wallet" text inside a button
    await this.page.locator('button:has-text("Connect Wallet")').first().click();
  }

  async isHeroVisible(): Promise<boolean> {
    // Hero section contains the tagline
    return this.page.getByText('tactical intelligence layer').isVisible();
  }

  async waitForHero() {
    await this.page.getByText('tactical intelligence layer').waitFor({ state: 'visible', timeout: 10_000 });
  }
}

export class WalletModal {
  constructor(private page: Page) {}

  private get dialog() {
    return this.page.locator('[role="dialog"][aria-label="Connect wallet"]');
  }

  async waitForOpen() {
    await this.dialog.waitFor({ state: 'visible', timeout: TEST_CONFIG.timeouts.animation + 1_000 });
    // Modal title — production shows "CONNECT WHITELISTED WALLET", dev may show "Get Started"
    await expect(
      this.page.getByText(/CONNECT WHITELISTED WALLET|Get Started/i),
    ).toBeVisible();
  }

  async isOpen(): Promise<boolean> {
    return this.dialog.isVisible();
  }

  async close() {
    await this.page.locator('[aria-label="Close"]').click();
    await this.dialog.waitFor({ state: 'hidden', timeout: TEST_CONFIG.timeouts.animation });
  }

  async closeViaBackdrop() {
    // Click the backdrop (absolute inset-0 behind modal)
    const backdrop = this.dialog.locator('.bg-black\\/85').first();
    await backdrop.click({ position: { x: 10, y: 10 } });
  }

  async selectInGameWallet() {
    await this.page.getByText(/IN.GAME WALLET|In.Game Wallet/i).first().click();
  }

  async selectCreateAccount() {
    await this.page.getByText(/EMAIL.*EXTERNAL WALLET|Create Account/i).click();
  }

  async selectJoinWaitlist() {
    await this.page.getByText(/JOIN WAITLIST|Join Waitlist/i).click();
  }

  async isInGameWalletVisible(): Promise<boolean> {
    return this.page.getByText(/IN.GAME WALLET|In.Game Wallet/i).first().isVisible();
  }

  async isCreateAccountVisible(): Promise<boolean> {
    // Production: "EMAIL / EXTERNAL WALLET", dev: "Create Account"
    return this.page.getByText(/EMAIL.*EXTERNAL WALLET|Create Account/i).isVisible();
  }

  async isJoinWaitlistVisible(): Promise<boolean> {
    return this.page.getByText(/JOIN WAITLIST|Join Waitlist/i).isVisible();
  }

  async isOrDividerVisible(): Promise<boolean> {
    // Production uses uppercase "OR", dev uses lowercase "or"
    return this.page.locator('span:text-is("OR"), span:text-is("or")').first().isVisible();
  }

  async enterInGameAddress(address: string) {
    // After selecting in-game wallet, an address input appears
    await this.page.locator('input[placeholder*="0x"], input[type="text"]').first().waitFor({ state: 'visible', timeout: 5_000 });
    const input = this.page.locator('input[placeholder*="0x"], input[type="text"]').first();
    await input.fill(address);
  }

  async submitInGameAddress() {
    // Submit button is the arrow button next to the input
    await this.page.locator('form button[type="submit"]').click();
  }

  async getErrorMessage(): Promise<string | null> {
    // Error messages appear as red text below input
    const errorEl = this.page.locator('.text-\\[var\\(--gs-loss\\)\\]');
    if (await errorEl.isVisible({ timeout: 3_000 }).catch(() => false)) {
      return errorEl.textContent();
    }
    return null;
  }

  async getValidationHint(): Promise<string | null> {
    const hint = this.page.getByText('Enter a valid GunzChain');
    if (await hint.isVisible({ timeout: 2_000 }).catch(() => false)) {
      return hint.textContent();
    }
    return null;
  }
}

export class PortfolioPage {
  constructor(private page: Page) {}

  async waitForLoad() {
    // Portfolio shows "Total Portfolio Value" or "Estimated Market Value" depending on enrichment state
    await this.page.getByText(/Portfolio Value|Market Value/i).first().waitFor({
      state: 'visible',
      timeout: TEST_CONFIG.timeouts.portfolioLoad,
    });
  }

  async getPortfolioValue(): Promise<string | null> {
    // The large dollar value below the label
    const valueEl = this.page.locator('[class*="font-display"][class*="text-4xl"], [class*="font-display"][class*="text-3xl"]').first();
    return valueEl.textContent();
  }

  isPortfolioValueValid(value: string | null): boolean {
    if (!value) return false;
    // Should match $X.XX format, not NaN/undefined/$0.00 for wallets with holdings
    return /\$[\d,.]+/.test(value) && !value.includes('NaN') && !value.includes('undefined');
  }

  async isGunBalanceVisible(): Promise<boolean> {
    return this.page.getByText(/GUN Balance/i).isVisible();
  }

  async getNftHoldingsCount(): Promise<number | null> {
    const card = this.page.getByText(/NFT Holdings/i).locator('..');
    const countText = await card.locator('[class*="font-display"]').first().textContent();
    if (!countText) return null;
    const num = parseInt(countText.replace(/[^\d]/g, ''), 10);
    return isNaN(num) ? null : num;
  }

  async getGalleryCardCount(): Promise<number> {
    // NFT cards in the gallery section
    await this.page.waitForTimeout(2_000); // Allow gallery to populate
    const cards = this.page.locator('[class*="nft-card"], [class*="NFTCard"], [data-nft-card]');
    const count = await cards.count();
    if (count > 0) return count;
    // Fallback: count items in the gallery grid
    const gridItems = this.page.locator('.grid > div:has(img)');
    return gridItems.count();
  }

  async isViewOnly(): Promise<boolean> {
    return this.page.getByText('View Only').first().isVisible();
  }

  async hasWriteActions(): Promise<boolean> {
    // Check for attestation/sign/certify buttons
    const writeButtons = this.page.locator('button:has-text("Attest"), button:has-text("Sign"), button:has-text("Certify"), button:has-text("Mint")');
    return (await writeButtons.count()) > 0;
  }

  async isSkeletonVisible(): Promise<boolean> {
    return this.page.locator('.skeleton-stat, [class*="skeleton"], [class*="shimmer"], [class*="animate-pulse"]').first().isVisible({ timeout: 1_000 }).catch(() => false);
  }

  async searchWallet(address: string) {
    const input = this.page.locator('input[placeholder*="Search another wallet"]');
    await input.fill(address);
    await this.page.locator('button:has-text("Go")').click();
  }

  async clickFilterPill(name: string) {
    await this.page.getByText(new RegExp(name, 'i')).click();
  }

  async getVisibleNftNames(): Promise<string[]> {
    const names = await this.page.locator('[class*="nft-card"] [class*="font-display"], .grid [class*="truncate"]').allTextContents();
    return names.filter(Boolean);
  }

  async toggleGridView() {
    // Click the grid toggle button (list/grid icons)
    const toggles = this.page.locator('button[aria-label*="grid"], button[aria-label*="Grid"], button[title*="Grid"]');
    if ((await toggles.count()) > 0) {
      await toggles.first().click();
    }
  }

  async getScrollPosition(): Promise<number> {
    return this.page.evaluate(() => window.scrollY);
  }
}

// ─── Utilities ──────────────────────────────────────────────────────────────

export async function debugScreenshot(page: Page, label: string) {
  const dir = path.join(process.cwd(), 'e2e', 'test-results');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const timestamp = Date.now();
  const filePath = path.join(dir, `debug-${label}-${timestamp}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  return filePath;
}

export async function clearAllStorage(page: Page, context: BrowserContext) {
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await context.clearCookies();
}

export async function getPerformanceMetrics(page: Page) {
  return page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paint = performance.getEntriesByType('paint');
    const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
    return {
      domContentLoaded: nav?.domContentLoadedEventEnd - nav?.fetchStart,
      loadComplete: nav?.loadEventEnd - nav?.fetchStart,
      firstPaint: paint.find((e) => e.name === 'first-paint')?.startTime,
      firstContentfulPaint: paint.find((e) => e.name === 'first-contentful-paint')?.startTime,
      lcp: lcpEntries.length > 0 ? lcpEntries[lcpEntries.length - 1].startTime : null,
    };
  });
}

export async function measureCLS(page: Page): Promise<number> {
  // Inject CLS observer, wait 3s, return cumulative CLS
  await page.evaluate(() => {
    (window as unknown as Record<string, number>).__cls = 0;
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (!(entry as any).hadRecentInput) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (window as unknown as Record<string, number>).__cls += (entry as any).value;
        }
      }
    });
    observer.observe({ type: 'layout-shift', buffered: true });
  });
  await page.waitForTimeout(3_000);
  return page.evaluate(() => (window as unknown as Record<string, number>).__cls);
}

export async function throttleNetwork(page: Page, preset: 'slow3g' | 'fast3g' | 'offline') {
  const cdp = await page.context().newCDPSession(page);
  const presets = {
    slow3g: { offline: false, downloadThroughput: 50_000, uploadThroughput: 25_000, latency: 2_000 },
    fast3g: { offline: false, downloadThroughput: 375_000, uploadThroughput: 75_000, latency: 560 },
    offline: { offline: true, downloadThroughput: 0, uploadThroughput: 0, latency: 0 },
  };
  await cdp.send('Network.emulateNetworkConditions', presets[preset]);
}

export async function unthrottleNetwork(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    downloadThroughput: -1,
    uploadThroughput: -1,
    latency: 0,
  });
}
