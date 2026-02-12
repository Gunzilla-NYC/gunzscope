# GunzScan Transfer API Migration (Phase 1)

**Date**: 2026-02-11
**Files modified**: `lib/blockchain/avalanche.ts`

## What Changed

Replaced the slow RPC block scanning in `getTransferEvents()` with a fast path using the GunzScan V2 pre-indexed API.

**Before**: `getTransferEvents()` scanned 13M+ blocks via chunked `eth_getLogs` RPC calls (100k blocks per chunk), taking 15-45 seconds per NFT.

**After**: Tries `GET /api/v2/tokens/{contract}/instances/{tokenId}/transfers` first (1-3 seconds), falls back to RPC if GunzScan is unavailable or returns empty results.

## Architecture

- New private method: `getTransferEventsViaGunzScan()` on `AvalancheService`
- Returns identical shape to existing `getTransferEvents()` — zero downstream changes
- All 6 callsites of `getNFTHoldingAcquisition()` benefit automatically
- Venue classification (`classifyVenue`) and cost extraction (`computeNetGunOutflowFromReceipt`) are untouched — they still use RPC for tx details (3 parallel calls, ~200ms each)

## Performance Impact

| Metric | Before | After |
|--------|--------|-------|
| Transfer lookup per NFT | 15-45s | 1-3s |
| 15-NFT portfolio enrichment | 2-4 min | ~30-45s |
| RPC calls per NFT | 120+ | 3 (tx details only) |

## GunzScan V2 Response Mapping

| GunzScan field | Maps to |
|---|---|
| `item.from.hash` | `event.from` |
| `item.to.hash` | `event.to` |
| `item.total.token_id` | `event.tokenId` |
| `item.block_number` | `event.blockNumber` |
| `item.log_index` | `event.logIndex` |
| `item.transaction_hash` | `event.transactionHash` |

## Follow-Up Phases

- **Phase 2**: Replace tx detail RPC calls with GunzScan `gettxinfo` endpoint
- **Phase 3**: Batch wallet-level transfer prefetch (15 API calls -> 1)

## Gotchas

- GunzScan V2 pagination uses `next_page_params` object — must be followed until null
- `log_index` may be undefined in some responses — defaults to 0
- `total.token_id` may be missing in edge cases — falls back to the queried tokenId
- Very new tokens may not be indexed yet — RPC fallback handles this
- 10 second timeout on GunzScan calls (generous but prevents hanging)
