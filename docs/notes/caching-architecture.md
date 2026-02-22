# Caching Architecture (3 Layers)

When historical price data is wrong, ALL THREE layers must be purged:

| Layer | Location | TTL | How to Clear |
|-------|----------|-----|-------------|
| Next.js fetch cache | `.next/cache/` | 24h (`revalidate: 86400`) | `rm -rf .next/cache` |
| CDN/browser HTTP cache | Response headers | 24h (`s-maxage=86400`) | Set `no-store` temporarily |
| localStorage (client) | `nftCache.ts` schema | Until schema bump | Bump `nftDetail: 'vXX'` |

## Critical Gotchas

**Schema bump alone does NOT fix stale prices.** The enrichment pipeline immediately re-fetches from the still-stale server cache and writes the wrong value right back into fresh localStorage.

**`purchasePriceUsdEstimated === false` means "locked."** The backfill guard in nftCache.ts skips entries with this flag, trusting them as confirmed. If the "confirmed" value was computed from bad price data, it's permanently locked. Only a schema bump clears it.

## Purge Checklist

1. `rm -rf .next/cache`
2. Temporarily set `cache: 'no-store'` on the upstream fetch in route.ts
3. Temporarily set `Cache-Control: no-store` on the response
4. Bump localStorage schema version
5. Clear browser cache / test with DevTools "Disable cache"
6. After confirming fix, revert cache headers to production values

## Historical Price Route

`/api/price/history` has 3-layer caching (Next.js fetch, CDN, browser). When prices are wrong, ALL layers must be cleared per the checklist above.
