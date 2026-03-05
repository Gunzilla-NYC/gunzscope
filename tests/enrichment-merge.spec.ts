import { test, expect } from '@playwright/test';
import { SEED_CACHE, TEST_WALLET } from './fixtures/enrichment-seed';

const BASE_URL = 'http://localhost:3000';

test.setTimeout(60_000);

test.beforeEach(async ({ page }) => {
  // Navigate to origin first to establish localStorage context
  await page.goto(`${BASE_URL}`);
  // Seed localStorage directly via evaluate
  await page.evaluate((seed) => {
    for (const [key, value] of Object.entries(seed)) {
      localStorage.setItem(key, value);
    }
  }, SEED_CACHE);
  // Verify seed landed
  const keyCount = await page.evaluate((keys) =>
    keys.filter(k => localStorage.getItem(k) !== null).length,
  Object.keys(SEED_CACHE));
  console.log(`Seeded ${keyCount} of ${Object.keys(SEED_CACHE).length} cache entries`);
});

test('1 — seeded cache entries survive navigation and are valid', async ({ page }) => {
  // Navigate to portfolio page (cache was seeded in beforeEach)
  await page.goto(`${BASE_URL}/portfolio?address=${TEST_WALLET}`);
  // Verify all seeded entries survived the navigation
  const cacheCheck = await page.evaluate((keys) => {
    const results: { key: string; valid: boolean; hasData: boolean; reason?: string }[] = [];
    for (const key of keys) {
      const raw = localStorage.getItem(key);
      if (!raw) { results.push({ key, valid: false, hasData: false, reason: 'missing' }); continue; }
      try {
        const parsed = JSON.parse(raw);
        const hasSchema = parsed.schemaVersion === 'v25';
        const hasExpiry = typeof parsed.expiresAt === 'number' && parsed.expiresAt > Date.now();
        const hasData = parsed.data != null;
        const hasCost = typeof parsed.data?.purchasePriceGun === 'number';
        const hasDate = typeof parsed.data?.purchaseDate === 'string';
        results.push({
          key,
          valid: hasSchema && hasExpiry && hasData,
          hasData: hasCost && hasDate,
          reason: !hasSchema ? 'bad schema' : !hasExpiry ? 'expired' : !hasData ? 'no data' : undefined,
        });
      } catch { results.push({ key, valid: false, hasData: false, reason: 'parse error' }); }
    }
    return results;
  }, Object.keys(SEED_CACHE));
  // All entries should be present and valid
  expect(cacheCheck.length).toBe(Object.keys(SEED_CACHE).length);
  for (const entry of cacheCheck) {
    expect(entry.valid, `Cache entry ${entry.key}: ${entry.reason}`).toBe(true);
    expect(entry.hasData, `Cache entry ${entry.key} missing cost/date fields`).toBe(true);
  }
});

test('2 — market value never shows $0 during load', async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as Record<string, string[]>).__marketValues = [];
    const observer = new MutationObserver(() => {
      const el = document.querySelector('p.text-4xl');
      if (el?.textContent) {
        const store = (window as unknown as Record<string, string[]>).__marketValues;
        store.push(el.textContent.trim());
      }
    });
    const waitForBody = () => {
      if (document.body) {
        observer.observe(document.body, { childList: true, subtree: true });
      } else {
        requestAnimationFrame(waitForBody);
      }
    };
    waitForBody();
  });
  await page.goto(`${BASE_URL}/portfolio?address=${TEST_WALLET}`);
  // Wait for a non-zero market value to appear
  await page.waitForFunction(() => {
    const el = document.querySelector('p.text-4xl');
    return el && el.textContent !== '$0' && el.textContent !== '$0.00';
  }, { timeout: 30_000 });
  // Check captured values for zero-flash regression
  const values: string[] = await page.evaluate(() => (window as unknown as Record<string, string[]>).__marketValues || []);
  let seenNonZero = false;
  const isZero = (v: string) => /^\$0(\.0{1,2})?$/.test(v);
  for (const val of values) {
    if (!isZero(val)) seenNonZero = true;
    if (seenNonZero && isZero(val)) {
      expect(false, `Market value flashed zero after showing non-zero. Values: ${values.join(', ')}`).toBe(true);
    }
  }
});

test('3 — data quality card renders with expected structure', async ({ page }) => {
  await page.goto(`${BASE_URL}/portfolio?address=${TEST_WALLET}`);
  // Target the Data Quality card specifically via data-testid
  const dataQualityCard = page.locator('[data-testid="data-quality-card"]');
  await expect(dataQualityCard).toBeVisible({ timeout: 15_000 });
  // The card should contain the three progress bar labels regardless of NFT data
  await expect(dataQualityCard).toContainText('With dates', { timeout: 15_000 });
  await expect(dataQualityCard).toContainText('With cost', { timeout: 15_000 });
  await expect(dataQualityCard).toContainText('Enriched', { timeout: 15_000 });
});

test('4 — localStorage TTL is 72h', async ({ page }) => {
  await page.goto(`${BASE_URL}/portfolio?address=${TEST_WALLET}`);
  const ttlCheck = await page.evaluate((keys) => {
    const results: number[] = [];
    for (const key of keys) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (typeof parsed.expiresAt === 'number' && typeof parsed.cachedAt === 'number') {
        results.push(parsed.expiresAt - parsed.cachedAt);
      }
    }
    return results;
  }, Object.keys(SEED_CACHE));
  expect(ttlCheck.length).toBeGreaterThan(0);
  for (const diff of ttlCheck) {
    expect(diff).toBeGreaterThan(71 * 60 * 60 * 1000);
    expect(diff).toBeLessThan(73 * 60 * 60 * 1000);
  }
});
