# GunzChain RPC Whitelisting Justification

## Current Architecture

GUNZscope is a multi-chain portfolio tracker for the GUNZILLA/Off The Grid ecosystem. Every portfolio load, NFT detail view, and enrichment cycle depends on GunzChain RPC calls.

### Endpoints in Use

| Endpoint | Purpose | Auth |
|----------|---------|------|
| `rpc.gunzchain.io` (public) | Block scanning, balances, transfer events | None |
| `gunzscan.io/api/v2` (Blockscout) | Token metadata, transfer history (fast path) | None |
| Solana public RPC | SOL balance, SPL token accounts | None |
| OpenSea API | Listings, sales, floor prices | API key |
| CoinGecko API | GUN token price | API key (optional) |

### Dual-Path Architecture

GunzScan (Blockscout API) is the fast path for transfer history (1-3s). When GunzScan is unavailable, the fallback scans the full chain via RPC `eth_getLogs` across 13M+ blocks in 100k-block chunks — **130+ sequential RPC calls taking 30-45 seconds per NFT contract**.

## RPC Call Volume Per User Session

### Portfolio Load (single wallet)
- `eth_getBalance` — 1 call
- `eth_getTransactionCount` — 1 call
- `eth_getLogs` (ERC-721 Transfer events) — 1-130+ calls depending on GunzScan availability
- Token metadata resolution via GunzScan — 10 concurrent requests per batch, 50ms delay between batches

### NFT Enrichment (per NFT)
- Transfer event query for acquisition data — 1 call (GunzScan) or 130+ calls (RPC fallback)
- IPFS metadata resolution — parallel requests to multiple gateways

### NFT Detail Modal (per click)
- `getTransferEvents` — independent pipeline, can re-query RPC
- Additional metadata lookups

### Estimated Calls Per Session
- **Best case** (GunzScan up): ~20-50 RPC calls per wallet load
- **Worst case** (GunzScan down): ~500-1000+ RPC calls per wallet with 50 NFTs
- **Enrichment cycle**: multiplied by number of NFTs being enriched

## Current Mitigations

| Protection | Implementation | Limitation |
|------------|---------------|------------|
| GunzScan fast path | Avoids RPC block scanning when available | Single point of failure — no SLA |
| Chunk-based retry | 100k-block chunks with adaptive size reduction on failure | Still 130+ calls per contract |
| Client-side cache | localStorage with 24h TTL for acquisition data | Only helps repeat visits |
| Server-side cache | In-memory per-invocation + CDN `s-maxage` headers | Doesn't persist across Vercel cold starts |
| Request deduplication | 5-second in-flight request reuse | Per-instance only |
| CORS proxy | Server-side `/api/rpc` route proxies browser RPC calls | Extra hop adds latency |

## What's Missing Without Whitelisting

### No CORS Headers
The public RPC at `rpc.gunzchain.io` does not return CORS headers. We built a server-side proxy (`/api/rpc`) to work around this, adding an extra network hop to every browser-initiated RPC call.

### No Rate Limit Visibility
We have no way to know when we're being throttled. The public RPC silently drops or delays responses. There's no `429` status or `Retry-After` header — calls just slow down or fail with generic errors.

### No Guaranteed Availability
Public RPC has no SLA. During chain congestion or maintenance, all portfolio loads fail. Users see a broken loading screen with no recourse.

### Block Range Limitations
We chunk `eth_getLogs` at 100k blocks because the public endpoint chokes on larger ranges. A whitelisted endpoint with higher limits could reduce 130 calls to 13 or fewer.

## Growth Context

- Currently behind an early-access whitelist (9 addresses)
- Waitlist system with viral referral loop just deployed — user base will grow
- Each new user multiplies RPC load linearly
- GUNZscope is the most visible third-party portfolio tracker for the Off The Grid ecosystem

## The Ask

1. **RPC whitelisting** — higher rate limits or no throttling for our server IP / API key
2. **Larger `eth_getLogs` block ranges** — reduce 130 chunk calls to ~13 per query
3. **CORS headers** for `gunzscope.xyz` — eliminate the proxy hop
4. **Priority during congestion** — portfolio loads shouldn't fail when the chain is busy

## What Gunzilla Gets

- The primary third-party tool driving player engagement with on-chain assets
- Reliable portfolio experience that reflects well on the GunzChain ecosystem
- Reduced load on public RPC (fewer retry storms when chunks fail)
- A partner who's already built the infrastructure and just needs the access tier
