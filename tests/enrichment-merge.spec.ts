import { test, expect, type Page } from '@playwright/test';

// Known wallet address with OTG NFT holdings (20 items)
const TEST_WALLET = '0xF9434E3057432032bB621AA5144329861869c72F';
const BASE_URL = 'http://localhost:3000';
const PORTFOLIO_URL = `${BASE_URL}/portfolio?address=${TEST_WALLET}`;

// ---------------------------------------------------------------------------
// Console capture helper — shared across all tests
// ---------------------------------------------------------------------------
function attachConsoleCapture(page: Page) {
  const consoleLogs: string[] = [];
  page.on('console', msg => {
    if (msg.text().includes('enrichment') || msg.text().includes('walletMap') || msg.text().includes('Enrichment') || msg.text().includes('PortfolioClient')) {
      consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
    }
  });
  return consoleLogs;
}

/**
 * Wait for enrichment to complete by listening for the Enrichment Summary log.
 * Returns the summary text or throws after timeout.
 */
function waitForEnrichmentComplete(page: Page, timeoutMs = 30_000): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Enrichment did not complete within ${timeoutMs / 1000}s`)),
      timeoutMs,
    );
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('[Enrichment Summary]')) {
        clearTimeout(timer);
        resolve(text);
      }
    });
  });
}

/**
 * Wait for the enrichedFieldsMerged console log.
 * Returns the full log text.
 */
function waitForMergeLog(page: Page, timeoutMs = 20_000): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timed out waiting for enrichedFieldsMerged log after ${timeoutMs / 1000}s`)),
      timeoutMs,
    );
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('enrichedFieldsMerged')) {
        clearTimeout(timer);
        resolve(text);
      }
    });
  });
}

// ---------------------------------------------------------------------------
// Test 1 — Enrichment fields merge on load
//
// Two-load pattern: first load populates localStorage cache via enrichment,
// second load (reload) verifies the merge applies cached data to fresh NFTs.
// ---------------------------------------------------------------------------
test('enrichment fields merge on load', async ({ page }) => {
  test.setTimeout(90_000);
  const consoleLogs = attachConsoleCapture(page);

  // --- First load: populate localStorage cache ---
  const enrichmentDone = waitForEnrichmentComplete(page);
  await page.goto(PORTFOLIO_URL);
  await enrichmentDone;

  // Verify cache was populated
  const cacheCount = await page.evaluate(() => {
    let count = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('zillascope:nft:detail:')) count++;
    }
    return count;
  });
  expect(cacheCount, 'First load should populate localStorage cache').toBeGreaterThan(0);

  // --- Second load: reload and verify merge ---
  const mergeLogPromise = waitForMergeLog(page);
  await page.reload();
  const logText = await mergeLogPromise;

  // Extract enrichedFieldsMerged value from the log
  const match = logText.match(/enrichedFieldsMerged[:\s]+(\d+)/);
  expect(match, 'Could not parse enrichedFieldsMerged from console log').not.toBeNull();

  const mergedCount = parseInt(match![1], 10);
  expect(
    mergedCount,
    'Enrichment merge failed — cached fields not applied. Check tokenId format mismatch in console.\n' +
      `Console logs:\n${consoleLogs.join('\n')}`,
  ).toBeGreaterThan(0);
});

// ---------------------------------------------------------------------------
// Test 2 — No zero flash in market value
//
// Two-load pattern: first load seeds cache, second load injects a
// MutationObserver before navigation to capture every rendered value.
// ---------------------------------------------------------------------------
test('market value never shows $0 during load', async ({ page }) => {
  test.setTimeout(90_000);
  const consoleLogs = attachConsoleCapture(page);

  // --- First load: populate cache ---
  const enrichmentDone = waitForEnrichmentComplete(page);
  await page.goto(PORTFOLIO_URL);
  await enrichmentDone;

  // --- Second load: inject observer, reload, capture values ---
  // addInitScript persists across navigations so it runs before page JS on reload
  await page.addInitScript(() => {
    (window as unknown as Record<string, string[]>).__capturedMarketValues = [];

    const observer = new MutationObserver(() => {
      // The market value is inside [aria-live="polite"] — a <p> starting with $
      const container = document.querySelector('[aria-live="polite"]');
      if (!container) return;
      const el = container.querySelector('p');
      if (!el) return;
      const text = (el.textContent || '').trim();
      if (!text.startsWith('$')) return;
      const store = (window as unknown as Record<string, string[]>).__capturedMarketValues;
      if (text && store[store.length - 1] !== text) {
        store.push(text);
      }
    });

    const waitForBody = () => {
      if (document.body) {
        observer.observe(document.body, { childList: true, subtree: true, characterData: true });
      } else {
        requestAnimationFrame(waitForBody);
      }
    };
    waitForBody();
  });

  await page.reload();

  // Wait for the main market value heading to appear (text-4xl is unique to it)
  await page.locator('[aria-live="polite"] p.text-4xl').first().waitFor({ timeout: 30_000 });

  // Let any state transitions settle
  await page.waitForTimeout(3_000);

  const capturedValues: string[] = await page.evaluate(
    () => (window as unknown as Record<string, string[]>).__capturedMarketValues,
  );

  // Check for a regression: value dropped FROM non-zero TO zero.
  // A wallet with no listings may legitimately show $0.00 from the start,
  // but if it ever shows a non-zero value and then drops to $0, that's a
  // flash caused by the overwrite bug.
  let seenNonZero = false;
  const isZero = (v: string) => /^\$0(\.0{1,2})?$/.test(v);
  for (const val of capturedValues) {
    if (!isZero(val)) seenNonZero = true;
    if (seenNonZero && isZero(val)) {
      expect(
        false,
        'Market value flashed zero during load — enrichment merge may not be applying before first render.\n' +
          `All captured values: ${JSON.stringify(capturedValues)}\n` +
          `Console logs:\n${consoleLogs.join('\n')}`,
      ).toBe(true);
    }
  }
});

// ---------------------------------------------------------------------------
// Test 3 — Data Quality bars never reset to zero
//
// Two-load pattern: first load enriches data and populates cache,
// second load checks that bars never transition from non-zero to zero.
// ---------------------------------------------------------------------------
test('data quality bars never drop to 0% after showing non-zero', async ({ page }) => {
  test.setTimeout(90_000);
  const consoleLogs = attachConsoleCapture(page);

  // --- First load: populate cache ---
  const enrichmentDone = waitForEnrichmentComplete(page);
  await page.goto(PORTFOLIO_URL);
  await enrichmentDone;

  // --- Second load: inject observer, reload, capture values ---
  await page.addInitScript(() => {
    const store: Record<string, string[]> = {
      'With dates': [],
      'With cost': [],
      'Enriched': [],
    };
    (window as unknown as Record<string, unknown>).__dqValues = store;

    const observer = new MutationObserver(() => {
      for (const label of Object.keys(store)) {
        const labels = document.querySelectorAll('span');
        for (const el of labels) {
          if (el.textContent?.trim() !== label) continue;
          const parent = el.parentElement;
          if (!parent) continue;
          // Find the value span — it's the sibling span with tabular-nums class
          const spans = parent.querySelectorAll('span');
          for (const span of spans) {
            if (span === el) continue;
            if (!span.className.includes('tabular-nums')) continue;
            const val = (span.textContent || '').trim();
            const arr = store[label];
            if (val && arr[arr.length - 1] !== val) {
              arr.push(val);
            }
          }
        }
      }
    });

    const waitForBody = () => {
      if (document.body) {
        observer.observe(document.body, { childList: true, subtree: true, characterData: true });
      } else {
        requestAnimationFrame(waitForBody);
      }
    };
    waitForBody();
  });

  await page.reload();

  // Wait for enrichment merge log to confirm data loaded
  await waitForMergeLog(page, 20_000);

  // Let enrichment + UI transitions settle
  await page.waitForTimeout(8_000);

  const dqValues: Record<string, string[]> = await page.evaluate(
    () => (window as unknown as Record<string, unknown>).__dqValues as Record<string, string[]>,
  );

  for (const [label, values] of Object.entries(dqValues)) {
    let seenNonZero = false;
    for (const val of values) {
      const isZero = val === '0%' || val === '0/0';
      if (!isZero) seenNonZero = true;
      if (seenNonZero && isZero) {
        expect(
          false,
          `Data Quality bar "${label}" dropped to 0% after showing enriched state — ` +
            `setWalletMap overwrite regression detected.\n` +
            `Value history for "${label}": ${JSON.stringify(values)}\n` +
            `Console logs:\n${consoleLogs.join('\n')}`,
        ).toBe(true);
      }
    }
  }
});

// ---------------------------------------------------------------------------
// Test 4 — localStorage TTL consistency
//
// Fresh context: navigate, wait for enrichment to complete and write to
// localStorage, then verify the TTL on cache entries is ~72h.
// ---------------------------------------------------------------------------
test('enrichment cache TTL is 72h, not 24h', async ({ browser }) => {
  test.setTimeout(90_000);

  const context = await browser.newContext();
  const page = await context.newPage();
  const consoleLogs = attachConsoleCapture(page);

  // Wait for enrichment to complete (writes cache entries to localStorage)
  const enrichmentDone = waitForEnrichmentComplete(page, 60_000);
  await page.goto(PORTFOLIO_URL);
  await enrichmentDone;

  // Small buffer for all cache writes to flush
  await page.waitForTimeout(2_000);

  // Inspect localStorage cache entries
  const ttlInfo = await page.evaluate(() => {
    const prefix = 'zillascope:nft:detail:';
    const entries: { key: string; cachedAt: number; expiresAt: number; ttlHours: number }[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(prefix)) continue;

      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw) as { cachedAt: number; expiresAt: number };
        if (!parsed.cachedAt || !parsed.expiresAt) continue;

        const ttlMs = parsed.expiresAt - parsed.cachedAt;
        entries.push({
          key: key.slice(0, 80) + '...',
          cachedAt: parsed.cachedAt,
          expiresAt: parsed.expiresAt,
          ttlHours: Math.round((ttlMs / (1000 * 60 * 60)) * 100) / 100,
        });
      } catch {
        // skip corrupted entries
      }
    }

    return entries;
  });

  expect(
    ttlInfo.length,
    `No enrichment cache entries found in localStorage.\n` +
      `Console logs:\n${consoleLogs.join('\n')}`,
  ).toBeGreaterThan(0);

  // Check that TTL is in the 71-73h range (72h expected)
  for (const entry of ttlInfo) {
    expect(
      entry.ttlHours,
      `Cache entry TTL is ~${entry.ttlHours}h (expected ~72h). ` +
        `If TTL is ~24h, the old DEFAULT_TTL_SECONDS value is still in use.\n` +
        `Entry: ${entry.key}\n` +
        `Console logs:\n${consoleLogs.join('\n')}`,
    ).toBeGreaterThanOrEqual(71);

    expect(entry.ttlHours).toBeLessThanOrEqual(73);
  }

  await context.close();
});
