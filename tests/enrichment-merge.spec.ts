import { test, expect } from '@playwright/test';
import { SEED_CACHE, TEST_WALLET } from './fixtures/enrichment-seed';

const BASE_URL = 'http://localhost:3000';

test.setTimeout(60_000);

test.beforeEach(async ({ page }) => {
  await page.addInitScript((seed) => {
    for (const [key, value] of Object.entries(seed)) {
      localStorage.setItem(key, value);
    }
  }, SEED_CACHE);
});

test('1 — enrichment merge applies seeded cache', async ({ page }) => {
  const consoleLogs: string[] = [];
  page.on('console', msg => {
    if (msg.text().includes('enrichment')) consoleLogs.push(msg.text());
  });
  await page.goto(`${BASE_URL}/portfolio?address=${TEST_WALLET}`);
  await expect.poll(() =>
    consoleLogs.find(l => l.includes('enrichedFieldsMerged')), { timeout: 15000 }
  ).toBeTruthy();
  const mergeLog = consoleLogs.find(l => l.includes('enrichedFieldsMerged'))!;
  const match = mergeLog.match(/enrichedFieldsMerged[":]+\s*(\d+)/);
  expect(Number(match?.[1])).toBeGreaterThan(0);
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
  await page.waitForTimeout(10_000);
  const values: string[] = await page.evaluate(() => (window as unknown as Record<string, string[]>).__marketValues || []);
  const zeroFlash = values.some(v => v === '$0' || v === '$0.00');
  expect(zeroFlash, `Market value flashed zero. Values seen: ${values.join(', ')}`).toBe(false);
});

test('3 — data quality bars reflect seeded state', async ({ page }) => {
  await page.goto(`${BASE_URL}/portfolio?address=${TEST_WALLET}`);
  await expect(page.locator('text=Enriched').locator('..').locator('[data-value]'))
    .not.toHaveText('0%', { timeout: 15_000 });
});

test('4 — localStorage TTL is 72h', async ({ page }) => {
  await page.goto(`${BASE_URL}/portfolio?address=${TEST_WALLET}`);
  const ttlCheck = await page.evaluate((keys) => {
    const results: number[] = [];
    for (const key of keys) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (parsed.expiresAt && parsed.cachedAt) {
        const diff = new Date(parsed.expiresAt).getTime() - new Date(parsed.cachedAt).getTime();
        results.push(diff);
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
