# Gallery Pipeline Fix

## What Was Done
- Fixed gallery data pipeline where floorPrice/purchasePriceGun data wasn't properly available at the gallery level
- Fixed metadata remaining uncached, which caused application resets during timeouts
- Commit: 3b56839

## Gotchas
- Metadata fetch can timeout — always handle the timeout case gracefully
- floorPrice and purchasePriceGun may be undefined at the gallery level even after the fix; null-check before using
- Security vulnerabilities reduced from 31 to 9 (commit c0a9215); remaining 9 are transitive via @dynamic-labs SDK and not actionable

## Related CLAUDE.md Rules
- "Never assume floorPrice, purchasePriceGun, or metadata is available — always null-check"
- "Always add loading states and error handling for async data"