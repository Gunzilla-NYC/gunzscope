/**
 * Client-side service for the shared GunPriceHistory server cache.
 *
 * Thin wrapper around /api/gun-price/history — called by resolveHistoricalGunPrice()
 * as tier 2 in the waterfall (between localStorage and CoinGecko).
 */

import type { HistoricalPriceSource, PriceConfidence } from '@/lib/utils/nftCache';

/** Shorter timeout than per-source 5s — don't let cache check be slower than CoinGecko. */
const SERVER_CACHE_TIMEOUT_MS = 3_000;

/** Format date as YYYY-MM-DD string. */
function toDateStr(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Read a cached historical GUN/USD price from the server.
 * Returns null on any error — non-blocking fallthrough.
 */
export async function getServerCachedPrice(date: Date): Promise<{
  priceUsd: number;
  source: HistoricalPriceSource;
  confidence: PriceConfidence;
} | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SERVER_CACHE_TIMEOUT_MS);

    const resp = await fetch(
      `/api/gun-price/history?date=${toDateStr(date)}`,
      { signal: controller.signal },
    );
    clearTimeout(timeout);

    if (!resp.ok) return null;

    const data = await resp.json();
    if (!data.found) return null;

    return {
      priceUsd: data.priceUsd,
      source: data.source as HistoricalPriceSource,
      confidence: data.confidence as PriceConfidence,
    };
  } catch {
    return null;
  }
}

/**
 * Write a confirmed historical price to the server cache.
 * Fire-and-forget — no await, silently catches errors.
 * Only call for 'coingecko' or 'defillama' results (not 'estimated').
 */
export function writeServerCachedPrice(
  date: Date,
  priceUsd: number,
  source: string,
  confidence: string,
): void {
  // Don't write estimated prices to the shared server table
  if (source === 'estimated' || confidence === 'estimated') return;

  fetch('/api/gun-price/history', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      date: toDateStr(date),
      priceUsd,
      source,
      confidence,
    }),
  }).catch(() => {
    // Silently ignore — server cache write is best-effort
  });
}
