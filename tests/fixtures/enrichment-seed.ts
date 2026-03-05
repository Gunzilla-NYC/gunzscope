export const TEST_WALLET = '0xf9434e3057432032bb621aa5144329861869c72f';

const CONTRACT = '0x9ed98e159be43a8d42b64053831fcae5e4d7d271';
const CHAIN = 'avalanche';
const TOKEN_IDS = ['247585', '1088272', '1288769', '1552957', '5705477', '5056414'];

const now = Date.now();
const TTL_MS = 72 * 60 * 60 * 1000;

/**
 * Seed data matching the CacheEntry<CachedNFTDetailData> structure used by nftCache.ts.
 * cacheGet() checks: schemaVersion === 'v25', expiresAt > Date.now(), then returns entry.data.
 * mergeEnrichmentFromCache() then checks data.cachedAtIso age < 72h.
 */
export const SEED_CACHE: Record<string, string> = Object.fromEntries(
  TOKEN_IDS.map((id, i) => [
    `gunzscope:nft:detail:v25:${TEST_WALLET}:${CHAIN}:${CONTRACT}:${id}`,
    JSON.stringify({
      schemaVersion: 'v25',
      cachedAt: now,
      expiresAt: now + TTL_MS,
      data: {
        purchasePriceGun: 200 + i * 150,
        purchasePriceUsd: (200 + i * 150) * 0.03,
        purchaseDate: new Date('2025-12-25').toISOString(),
        hasAcquisition: true,
        cachedAtIso: new Date(now).toISOString(),
        currentLowestListing: 150 + i * 100,
      },
    })
  ])
);
