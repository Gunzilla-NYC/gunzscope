/**
 * Waterfall Price Resolution for Historical GUN/USD Rates
 *
 * Resolves the per-GUN USD rate for a given date by trying multiple sources
 * in order: local cache → server cache → CoinGecko → DefiLlama → nearest cached price.
 *
 * Returns ONE atomic PriceResult — no intermediate state updates.
 */

import { CoinGeckoService } from '@/lib/api/coingecko';
import {
  getCachedHistoricalGunPrice,
  setCachedHistoricalGunPrice,
  findNearestCachedGunPrice,
  type HistoricalPriceSource,
  type PriceConfidence,
} from '@/lib/utils/nftCache';
import { getServerCachedPrice, writeServerCachedPrice } from './serverPriceCache';

// =============================================================================
// Constants
// =============================================================================

/** GUN all-time high in USD. Rates above this are likely stale/incorrect. */
export const GUN_ATH_USD = 0.115;

/** Maximum valid rate: ATH × 1.1 (10% margin for new highs). */
const MAX_VALID_RATE = GUN_ATH_USD * 1.1;

/** Per-source timeout in milliseconds. */
const SOURCE_TIMEOUT_MS = 5_000;

/** DefiLlama coins API endpoint. */
const DEFILLAMA_BASE = 'https://coins.llama.fi/prices/historical';

// =============================================================================
// Types
// =============================================================================

export type PriceSource = 'cache' | HistoricalPriceSource;

export interface PriceResult {
  /** Per-GUN USD rate (NOT the total cost — multiply by GUN amount yourself). */
  rate: number;
  source: PriceSource;
  confidence: PriceConfidence;
}

// =============================================================================
// ATH Guard
// =============================================================================

/** Returns null if the per-GUN rate exceeds ATH × 1.1 (likely stale data). */
function validateRate(rate: number | null | undefined): number | null {
  if (rate == null) return null;
  if (rate <= 0) return null;
  if (rate > MAX_VALID_RATE) return null;
  return rate;
}

// =============================================================================
// Waterfall Sources
// =============================================================================

/** Source 1: Local cache (localStorage). */
function tryCache(date: Date): PriceResult | null {
  const cached = getCachedHistoricalGunPrice(date);
  if (!cached.hit || !cached.value) return null;

  const rate = validateRate(cached.value.gunUsdRate);
  if (!rate) return null;

  return {
    rate,
    source: 'cache',
    confidence: cached.value.confidence ?? 'daily',
  };
}

/** Source 2: Server-side GunPriceHistory (shared across all users). */
async function tryServerCache(date: Date): Promise<PriceResult | null> {
  try {
    const hit = await getServerCachedPrice(date);
    if (!hit) return null;

    const rate = validateRate(hit.priceUsd);
    if (!rate) return null;

    return { rate, source: hit.source, confidence: hit.confidence };
  } catch {
    return null;
  }
}

/** Source 3: CoinGecko via server-side proxy. */
async function tryCoinGecko(date: Date): Promise<PriceResult | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SOURCE_TIMEOUT_MS);

  try {
    const service = new CoinGeckoService();
    const raw = await service.getHistoricalGunPrice(date);
    const rate = validateRate(raw);
    if (!rate) return null;

    return { rate, source: 'coingecko', confidence: 'daily' };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/** Source 4: DefiLlama (free, no auth, public API). */
async function tryDefiLlama(date: Date): Promise<PriceResult | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SOURCE_TIMEOUT_MS);

  try {
    const unix = Math.floor(date.getTime() / 1000);
    const coin = 'coingecko:gunz';
    const url = `${DEFILLAMA_BASE}/${unix}/${coin}`;

    const resp = await fetch(url, { signal: controller.signal });
    if (!resp.ok) return null;

    const data = await resp.json();
    const price = data?.coins?.[coin]?.price;
    const rate = validateRate(typeof price === 'number' ? price : null);
    if (!rate) return null;

    return { rate, source: 'defillama', confidence: 'daily' };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/** Source 5: Nearest cached price before the target date. */
function tryNearestCached(date: Date): PriceResult | null {
  const nearest = findNearestCachedGunPrice(date);
  if (!nearest) return null;

  const rate = validateRate(nearest.gunUsdRate);
  if (!rate) return null;

  return { rate, source: 'estimated', confidence: 'estimated' };
}

// =============================================================================
// Main Waterfall
// =============================================================================

/**
 * Resolve the historical GUN/USD rate for a given date.
 *
 * Tries sources in order: cache → server cache → CoinGecko → DefiLlama → nearest cached price.
 * Returns ONE atomic PriceResult, or null if all sources fail.
 *
 * Automatically caches successful resolutions for future use.
 */
export async function resolveHistoricalGunPrice(
  date: Date,
): Promise<PriceResult | null> {
  const dateStr = date.toISOString().slice(0, 10);

  // 1. Local cache — return immediately if confidence is not 'estimated'
  const cached = tryCache(date);
  if (cached && cached.confidence !== 'estimated') {
    console.debug(`[Waterfall] ${dateStr}: $${cached.rate.toFixed(4)} via cache (${cached.confidence})`);
    return cached;
  }
  // If we have an estimated cache hit, keep as fallback but try to upgrade
  const estimatedFallback = cached;

  // 2. Server-side shared cache (GunPriceHistory via API)
  const sc = await tryServerCache(date);
  if (sc && sc.confidence !== 'estimated') {
    // Write through to localStorage for future instant hits
    setCachedHistoricalGunPrice(date, sc.rate, sc.source as HistoricalPriceSource, sc.confidence);
    console.debug(`[Waterfall] ${dateStr}: $${sc.rate.toFixed(4)} via server-cache (${sc.confidence})`);
    return sc;
  }

  // 3. CoinGecko
  const cg = await tryCoinGecko(date);
  if (cg) {
    setCachedHistoricalGunPrice(date, cg.rate, 'coingecko', 'daily');
    writeServerCachedPrice(date, cg.rate, 'coingecko', 'daily');
    console.debug(`[Waterfall] ${dateStr}: $${cg.rate.toFixed(4)} via coingecko (daily)`);
    return cg;
  }

  // 4. DefiLlama
  const dl = await tryDefiLlama(date);
  if (dl) {
    setCachedHistoricalGunPrice(date, dl.rate, 'defillama', 'daily');
    writeServerCachedPrice(date, dl.rate, 'defillama', 'daily');
    console.debug(`[Waterfall] ${dateStr}: $${dl.rate.toFixed(4)} via defillama (daily)`);
    return dl;
  }

  // 5. Return estimated fallback if we had one from cache
  if (estimatedFallback) {
    console.debug(`[Waterfall] ${dateStr}: $${estimatedFallback.rate.toFixed(4)} via cache (estimated, kept)`);
    return estimatedFallback;
  }

  // 6. Nearest cached price (last resort)
  const nearest = tryNearestCached(date);
  if (nearest) {
    setCachedHistoricalGunPrice(date, nearest.rate, 'estimated', 'estimated');
    console.debug(`[Waterfall] ${dateStr}: $${nearest.rate.toFixed(4)} via nearest-cache (estimated)`);
    return nearest;
  }

  // All sources failed
  console.debug(`[Waterfall] ${dateStr}: no price resolved`);
  return null;
}
