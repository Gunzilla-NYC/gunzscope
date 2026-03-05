## [0.7.0] — 2026-03-05

### Added
- Portfolio Pins: FavoriteButton wired onto NFT grid cards (bottom-right image overlay, own portfolio only), PinButton toggle, pinned NFTs sort to top via useNFTGalleryFilters
- Wishlist: `type: 'wishlist'` on FavoriteItem with externalContract/externalTokenId/externalChain/lastKnownValue/lastValueAt fields, Wishlist tab in AccountPanel
- GET /api/favorites: returns owned favorites and wishlist split by type via listFavorites()
- GET /api/favorites/refresh-wishlist: refreshes lastValueAt timestamps for wishlist items
- PATCH /api/favorites/[id]: toggles pinned state via toggleFavoritePin()
- Admin Users tab: listUsers() service, GET /api/admin/users with whitelist cross-reference, UsersTools component with search
- Feature Requests GlitchLink added to desktop navbar (gated behind hasWallet)
- isOwnPortfolio prop threaded through NFTGalleryProps → NFTGalleryGridCardProps → NFTGalleryGridCard
- useUserProfile: togglePin() action, pinned field on FavoriteItem, wishlist fields
- Display name fallback: truncated wallet address instead of raw email in UsersTools, ShareLeaderboard, admin shares page

### Fixed
- Duplicate cryptohaki UserProfile cleaned up via raw SQL script
- shareService getShareLeaderboard() now includes primaryWallet in response

## [1.0.1] — 2026-03-04

### Added
- Sparkline rebuilt in Visx: % change from cost basis, lime/orchid profit/loss fill, curveMonotoneX, pulsing endpoint glyph
- Timeline lollipop chart: gradient stems, horizontal crosshair on hover, full tooltip with weapon name, date, GUN cost, USD value
- Cost vs Value chart: break-even diagonal, profit/loss zone shading, simplified legend, rotated break-even label, floor cluster annotation
- Data Quality loading states: shimmer during pagination, scan animation during enrichment, amber stale indicator
- Playwright regression suite: 4 tests covering enrichment merge, zero flash, data quality bars, localStorage TTL
- GitHub Actions CI: Playwright suite runs on push/PR to main and dev, trace artifact upload on failure
- Branch protection: main requires Enrichment Regression Tests to pass before merge

### Fixed
- Enrichment merge fix: cached enrichment fields now merged before setWalletMap, eliminating zero flash on portfolio reload
- localStorage TTL bumped from 24h to 72h to match ENRICHMENT_STALE_MS
- Sparkline Y-axis floor clipping resolved with paddingTop/paddingBottom margins
- Tooltip overflow clipping fixed with edge-detection flip logic
