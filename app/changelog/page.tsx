import { Suspense } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

// =============================================================================
// Version History Data
// =============================================================================

interface VersionEntry {
  version: string;
  date: string;
  tag?: string;
  items: string[];
}

const VERSIONS: VersionEntry[] = [
  {
    version: 'v0.3.9',
    date: 'Feb 26, 2026',
    tag: 'current',
    items: [
      'Admin-gated /strategy page \u2014 6-phase strategic roadmap (Portfolio Intelligence \u2192 Bloomberg of Gaming); vertical timeline with phase nodes, pill-tag items, market scope expansion bar; same isAdminWallet() gate as /brand and /roadmap',
      'Admin panel Links tab \u2014 new third tab in AdminPanel with card grid linking to all admin/internal pages (/brand, /strategy, /roadmap, /changelog, /updates); colored dot indicators, descriptions, route paths',
      'Brand page Working Links section \u2014 section 00 at top of brand page with link to Build Games landing preview; Waitlist Flow section 06 with gate redirect, waitlist state, and promotion flow test panels',
    ],
  },
  {
    version: 'v0.3.8',
    date: 'Feb 26, 2026',
    items: [
      'Waitlist redirect fix \u2014 paste\u2011address flow (non\u2011Dynamic\u2011SDK users) now passes address as query param to /waitlist; WaitlistClient reads from primaryWallet?.address || searchParams.get(\u2018address\u2019); previously redirected back to / because no Dynamic wallet was connected',
      'Waitlist page Suspense boundary \u2014 wrapped WaitlistClient in <Suspense> in app/waitlist/page.tsx; required by Next.js for useSearchParams() during static prerender',
      'Waitlist status API auth removed \u2014 GET /api/waitlist/status no longer requires Dynamic JWT; position and referral count are non\u2011sensitive; paste\u2011address users have no auth token',
      'useWaitlist hook auth optional \u2014 getAuthToken() now called inside try block; token sent as Authorization header only when available; missing token no longer causes early return that left isLoading stuck at true',
      'Reusable WalletAddressInput component \u2014 components/ui/WalletAddressInput.tsx; unified chain detection (GunzChain/Solana badge, validation border, hint text) across 5 input locations: home page, admin panel, account page, insanity mode, portfolio search',
      'WalletAddressInput validateChain prop \u2014 when false, disables red border for non\u2011matching input; used by Handle Tools where slugs are valid input alongside wallet addresses',
      'Admin panel column layout standardization \u2014 WhitelistTools, WaitlistTools, ShareLeaderboard all use same toolbar\u2011at\u2011top pattern with shrink\u20110 pb\u20113 mb\u20113 border\u2011b divider; address + action button on same row',
      'Stale .next cache diagnosis \u2014 dev server was serving compiled chunks with old error text "This address isn\u2019t on the early access list yet." from cached .next/dev/ files while source had been updated',
    ],
  },
  {
    version: 'v0.3.7',
    date: 'Feb 23, 2026',
    items: [
      'Referral register GET handler \u2014 added try/catch around getReferrerByWallet() DB call; was the only API route handler without error wrapping, causing unhandled throws to return HTML 500 instead of JSON',
      'useReferral client hook \u2014 added regRes.ok guard before .json() parse; non\u20112xx responses now log status + body via console.warn("[Referral]") and show status code in error message instead of generic "Failed to load referral data"',
      'Admin\u2011gated /roadmap page \u2014 app/roadmap/page.tsx; converted gunzscope\u2011blockchain\u2011architecture.html to React/Tailwind with brand CSS vars, clip\u2011path corners, proper typography; isAdminWallet() gate with redirect',
    ],
  },
  {
    version: 'v0.3.6',
    date: 'Feb 22, 2026',
    items: [
      'Updates page accordion refactor \u2014 extracted UPDATES data + UpdateEntry interface to lib/data/updates.ts; page.tsx slimmed from 449\u00a0\u2192\u00a048 lines, imports data and delegates to new UpdateTimeline client component',
      'UpdateTimeline component \u2014 components/updates/UpdateTimeline.tsx; \u2018use client\u2019 accordion with useState\u2011based open set, CSS height transition (200ms ease\u2011in\u2011out), chevron rotation; tag:\u2019current\u2019 entry auto\u2011expanded, others collapsed, multiple can be open simultaneously',
      'Push\u2011to\u2011main workflow updated \u2014 CLAUDE.md and docs/notes/push\u2011to\u2011main\u2011workflow.md now reference lib/data/updates.ts instead of app/updates/page.tsx for user\u2011facing update entries',
    ],
  },
  {
    version: 'v0.3.5',
    date: 'Feb 22, 2026',
    items: [
      'Card/modal market data unification \u2014 NFTDetailPositionCard Track\u00a0B now uses same waterfall as deriveCardData(): marketExitGun \u2192 comparableSalesMedian \u2192 rarityFloor \u2192 currentLowestListing; previously modal only checked marketExitGun + computeMarketInputs (which excluded rarityFloor)',
      'Tier\u2011confidence gating \u2014 new trackBIsSalesBased boolean on NFTCardData; gallery cards and list rows only show Track\u00a0B MARKET line for sales\u2011based tiers (1\u20114: EXACT, VIA\u00a0SALES, VIA\u00a0SKIN, VIA\u00a0WEAPON); statistical proxies (tiers 5\u20116: RARITY, FLOOR, LISTED, SIMILAR) suppressed from card display',
      'Modal low\u2011confidence treatment \u2014 tiers 5\u20116 render "Reference Estimate" card instead of "Market Reality": dimmer styling (opacity\u201180), no VS\u00a0COST row, no MARKET\u00a0P&L percentage, warning text explaining it\u2019s a proxy not sales data',
      'exitTierLabel fallback chain \u2014 modal\u2019s Track\u00a0B exitTierLabel now falls back through VIA\u00a0SALES \u2192 RARITY \u2192 LISTED when marketExitTierLabel is null, matching card behavior',
    ],
  },
  {
    version: 'v0.3.4',
    date: 'Feb 22, 2026',
    items: [
      'Dual\u2011track P&L card redesign \u2014 NFTDetailPositionCard restructured into two distinct cards: Track\u00a0A ("Your Deal", lime border) shows GUN token appreciation since purchase; Track\u00a0B ("Market Reality", purple border) shows market\u2011based P&L from comparable sales waterfall',
      'Cost Basis merged into Track\u00a0A \u2014 standalone COST BASIS section removed; cost basis row now lives inside the Track\u00a0A card as the first data row, followed by TODAY\u2019S VALUE row, providing a natural reading flow from "what you paid" \u2192 "what it\u2019s worth" \u2192 "your P&L"',
      'P&L hero treatment \u2014 both track cards use a border\u2011top divider to separate data rows from the P&L value, displayed in font\u2011display 20px bold with profit/loss coloring; italic subtext below explains the number in plain English',
      'Label\u2011left / value\u2011right row pattern \u2014 all data rows use flex justify\u2011between with shrink\u20110 labels (mono 9px uppercase gray) and right\u2011aligned values (display 14px semibold white tabular\u2011nums); arrow separator (\u2192) between GUN and USD amounts',
      'Track\u00a0B confidence line \u2014 shows data quality indicator (green dot + tier label like "VIA\u00a0SALES" + sample count), plus ABOVE/BELOW FLOOR pill when market exit differs from collection floor',
      'Card styling standardized \u2014 bg\u2011[var(\u2011\u2011gs\u2011dark\u20113)] with subtle border, 3px colored left border (lime for Track\u00a0A, purple for Track\u00a0B), p\u20115 padding, rounded\u2011lg corners',
      'Removed Observed Market Range section \u2014 NFTDetailObservedMarketRange component no longer rendered in modal; getPositionOnRange helper removed',
      'Admin gate on /brand page \u2014 /brand now restricted to admin wallets using existing isAdminWallet() utility; non\u2011admin users redirected to /',
    ],
  },
  {
    version: 'v0.3.3',
    date: 'Feb 22, 2026',
    items: [
      'Tiered valuation waterfall (Track\u00a0B) \u2014 6\u2011tier Market Exit estimate per NFT: EXACT (same tokenId), VIA\u00a0SALES (same baseName), VIA\u00a0SKIN (same skinDesign), VIA\u00a0WEAPON (same weapon), SIMILAR (deferred), FLOOR (collection floor)',
      'Time\u2011weighted median \u2014 comparable sales weighted by recency (7d\u00a0=\u00a01.0, 7\u201130d\u00a0=\u00a00.75, 30\u201190d\u00a0=\u00a00.50, 90+\u00a0=\u00a00.25); weighted\u2011median walk instead of simple median',
      'Item name parser \u2014 new parseItemName() extracts skinDesign and weapon from "X for the Y" naming pattern, enabling Tier\u00a03 and Tier\u00a04 waterfall groupings',
      'Pure valuation service \u2014 lib/portfolio/valuationService.ts walks waterfall with minimum\u2011sale\u2011count gates (1 for EXACT, 2 for all others), returns estimatedGun + tier + tierLabel',
      'Waterfall data in comparable\u2011sales API \u2014 /api/opensea/comparable\u2011sales now returns waterfall (byTokenId, byName, bySkin, byWeapon) alongside existing items; backward\u2011compatible optional field',
      'applyValuationTables enhanced \u2014 calls getMarketExitValuation() per NFT, writes marketExitGun, marketExitTier, marketExitTierLabel to NFT objects',
      'Track\u00a0B on gallery cards \u2014 grid cards (medium+) and list rows show "~592\u00a0GUN \u00b7 VIA\u00a0SALES" below existing P&L and ValuationLabel',
      'Track\u00a0B in modal QuickStats \u2014 4th column "Market Exit" shows estimated GUN, USD conversion, tier label, and P&L vs cost basis; grid adapts 3\u2192\u20094 columns when data available',
      'Scarcity tracking prep \u2014 useNFTEnrichmentOrchestrator now tracks max observed mint number per baseName in scarcityMapRef for future Tier\u00a05 matching',
      'NFT type extended \u2014 3 new fields: marketExitGun, marketExitTier (1\u20116), marketExitTierLabel',
    ],
  },
  {
    version: 'v0.3.2',
    date: 'Feb 21, 2026',
    items: [
      'Full\u2011pagination enrichment \u2014 enrichment now defers until all NFT pages are loaded (was firing per\u201150\u2011item page, causing concurrent enrichment races and backward progress jumps on wallets with 50+ NFTs)',
      'Generation\u2011guarded enrichment \u2014 startEnrichment increments a generation counter; all state updates (setProgress, setEnrichedNFTs, updateCallback, setIsEnriching) check gen === generationRef.current before writing, preventing stale enrichments from wallet switches',
      'Enrichment diagnostic summary \u2014 console.info after completion logs total/cached/fresh/failed counts, date/costGUN/costUSD/listing resolution percentages, free transfer count, and venue breakdown',
      'Incremental refresh \u2014 handleRefresh uses new invalidateListingPrices() instead of clearWalletCache(); only clears listingFetchedAt/currentLowestListing/currentHighestListing on each cached entry, preserving all acquisition data',
      'Removed groupNFTsByMetadata import from PortfolioClient \u2014 handleLoadMoreNFTs now passes mergedNFTs (already grouped) directly to startEnrichment instead of re\u2011grouping per page',
      'cumulativeBaseRef reset \u2014 new startEnrichment calls reset cumulativeBaseRef to 0 alongside generation bump, preventing stale cumulative offsets',
    ],
  },
  {
    version: 'v0.3.1',
    date: 'Feb 21, 2026',
    items: [
      'Server\u2011side GUN price history cache \u2014 new GunPriceHistory Prisma model stores confirmed historical GUN/USD rates in Neon PostgreSQL; shared across all users so the first person to resolve a date\u2019s price populates it for everyone',
      'Waterfall tier 2: server cache \u2014 resolveHistoricalGunPrice now checks the shared server table between localStorage and CoinGecko (3s timeout), with write\u2011through to localStorage on hit and fire\u2011and\u2011forget write\u2011back on CoinGecko/DefiLlama success',
      'GET /api/gun\u2011price/history \u2014 public endpoint with CDN caching (1h fresh, 24h stale\u2011while\u2011revalidate); 404s cached for 5 min to avoid hammering DB for missing dates',
      'POST /api/gun\u2011price/history \u2014 validated write endpoint with ATH guard, confidence\u2011based upgrade logic (won\u2019t overwrite daily with estimated), rejects estimated prices from shared table',
      '"Synced X ago" indicator \u2014 ValueHeader shows when the portfolio was last loaded from server cache, with staleness coloring (>24h = brighter gray)',
      'Manual refresh button \u2014 spinning refresh icon next to the synced timestamp clears localStorage cache and re\u2011triggers full wallet fetch + enrichment',
      'Refresh disabled during enrichment \u2014 button grays out and spins while NFT enrichment is active to prevent redundant requests',
    ],
  },
  {
    version: 'v0.3.0',
    date: 'Feb 21, 2026',
    items: [
      'Modal P&L reorganization \u2014 separated market valuation from GUN appreciation into two distinct P&L stories: market-based (via listings/sales/floor) when available, xGUN fallback otherwise',
      'Unified P&L computation \u2014 QuickStats UNREALIZED and YOUR POSITION P&L now always agree (both use market-first, xGUN fallback)',
      'Valuation method labels \u2014 QuickStats and YOUR POSITION show specific source: VIA LISTING, VIA SALES, VIA FLOOR, or GUN \u0394',
      'GUN Based Performance sub-section \u2014 when market data drives headline P&L, a separate section shows pure GUN token appreciation with explanatory narrative',
      'CoinGecko fetch guard \u2014 modal acquisition pipeline skips redundant historical price fetches when enrichment data already provides confirmed USD values',
      'Valuation method badges on gallery cards \u2014 6-tier taxonomy (LISTED, SALES, RARITY, FLOOR, COST, UNLISTED) shown on NFT cards',
      'Hidden redundant GUN @ line \u2014 cost basis section no longer shows "GUN @ $X.XXXX at time of purchase" when GUN Based Performance section is visible',
    ],
  },
  {
    version: 'v0.2.9',
    date: 'Feb 21, 2026',
    items: [
      'xGUN P&L formula \u2014 PnL now purely reflects GUN/USD price appreciation: Y\u00a0=\u00a0historicalGunPrice, Z\u00a0=\u00a0currentGunPrice, P&L\u00a0=\u00a0costGun\u00a0\u00d7\u00a0(Z\u2011Y). Removed market\u2011data waterfall (listing/comparable\u2011sales/rarity\u2011floor) from cards, modal, sort, and portfolio summary',
      'Removed pnlSource labels \u2014 "vs listing" / "vs sales" / "vs floor" badges no longer appear on NFT cards since PnL is now single\u2011source',
      'OpenSea event_timestamp fix \u2014 4 parse sites were treating Unix seconds as milliseconds, producing dates in January 1970 and triggering $0.0776 fallback prices',
      'Stale closure overwrite fix \u2014 async modal loadItemDetails captured resolvedAcquisitions at effect start time; cache\u2011rendered data was overwritten ~1s later. Fixed via resolvedAcquisitionsRef pattern in both NFTDetailModal and useNFTAcquisitionPipeline',
      'Transfer chain tracing fix \u2014 buildCandidateFromHoldingRaw now uses senderAcquiredAtIso, senderVenue, and senderTxHash when using sender cost data, instead of the transfer date/venue',
      'Transaction fee extraction \u2014 txFeeGun and senderTxFeeGun computed from receipt.gasUsed \u00d7 receipt.gasPrice in avalanche.ts; propagated through ResolvedAcquisition, selectBestAcquisition, and all candidate builders',
      'Gas fees display \u2014 YOUR POSITION section in NFTDetailModal shows purchase and transfer gas fees when available',
      'Server cache hydration sanitization \u2014 PortfolioClient strips legacy purchasePriceUsd values from server\u2011cached NFTs when purchasePriceUsdEstimated !== false',
      'CoinGecko ATH sanity check \u2014 /api/price/history rejects prices above $0.12 (GUN ATH ~$0.115) and logs a warning',
      'Stale Next.js server cache bypass \u2014 /api/price/history temporarily switched to cache: \'no\u2011store\' to purge incorrect CoinGecko historical data (revert to revalidate: 86400 after confirmation)',
      'Enrichment trust guard \u2014 modal no longer overwrites confirmed purchasePriceUsd (purchasePriceUsdEstimated === false) with its own recomputation',
      'Cache schema v24 \u2014 full client\u2011side re\u2011enrichment forced after CoinGecko data correction and server cache purge',
      'MetaMask fallback \u2014 main page wallet connect falls back to MetaMask deep link when Dynamic SDK fails to trigger wallet',
      'wGUN acquisition support \u2014 enrichment orchestrator handles wGUN\u2011based purchases for cost extraction',
      'useNftPnL hook rewrite \u2014 portfolio summary P&L now uses xGUN formula instead of floor\u2011based calculation',
      'PnL sort rewrite \u2014 useNFTGalleryFilters pnl\u2011desc sort uses xGUN unrealized USD gain with currentGunPrice threading',
    ],
  },
  {
    version: 'v0.2.8',
    date: 'Feb 19, 2026',
    items: [
      'Historical price CORS fix \u2014 new /api/price/history server\u2011side proxy routes CoinGecko historical price requests through the server, fixing silent CORS failure that left purchasePriceUsd undefined on all client\u2011side lookups',
      '14\u2011day sparkline \u2014 /api/price/gun now fetches 14d market_chart alongside 7d sparkline; PriceData type extended with sparkline14d; bootstrap and performance hooks prefer 14d data',
      'Portfolio history backwards extension \u2014 bootstrapPortfolioHistory can now prepend synthetic points from the sparkline when the sparkline reaches further back than stored history, with 30\u2011min buffer gap and ~24\u2011point sampling',
      'On\u2011chain cost extraction for transfers \u2014 acquisition pipeline now captures costGunFromChain for cross\u2011wallet transfers with wGUN payment, calculates USD from historical GUN price',
      'Universal GUN\u2192USD fallback \u2014 any item with finalPurchasePriceGun > 0 and no USD value gets historical price lookup as a last\u2011resort conversion',
      'Transfer cost basis propagation \u2014 NFTDetailModal costBasisGun now falls through to traced original purchase price for TRANSFER acquisitions instead of always returning null',
      'Enrichment cache invalidation \u2014 marketplace purchases (opensea, in_game_marketplace) with missing price are treated as incomplete and retried on next enrichment cycle',
      'USD\u2011first acquisition card \u2014 NFTDetailAcquisitionCard shows $USD as primary line with GUN as secondary when USD is available, for both decode cost and purchase price sections',
      'Chart tooltip dynamic positioning \u2014 BackdropChart tooltip now renders above the point when point is in lower half of chart, below when in upper half, with hoverY null\u2011check guard',
      'ValueHeader pointer\u2011events \u2014 elements with [title] attribute now receive pointer\u2011events for native tooltip hover',
      'Item origins expansion \u2014 new categories early_access, reward, content_pack; Pioneer Set, Player Zero Set, Prankster Set, Anarchist Set reclassified; Going Ape Shit, Hump for Dominance added to Aperil Fools',
      'Empty wallet state \u2014 portfolios with 0 GUN and 0 NFTs show centered "Nothing Detected" message with inline search bar + Leaderboard/Market CTAs instead of empty $0.00 dashboard',
      'CLAUDE.md \u2014 documented Production Whitelist API endpoints and admin workflow',
    ],
  },
  {
    version: 'v0.2.7',
    date: 'Feb 18, 2026',
    items: [
      'Item origin registry scaled to 35+ releases \u2014 added Enforcer BP, Pink Fury BP, Mr Fuckles BP, Hopper Pilot BP, Mad Biker BP, Neotokyo event, Trick Treat or Die event expansion, plus dozens of individual items',
      'AIRDROP label \u2014 any NFT with a known origin and sub\u20111\u2011GUN acquisition cost now displays "AIRDROP" instead of "0 GUN"; unknown\u2011origin items keep their raw price',
      'Contains match rules \u2014 Don DeLulu CP and Mrs Crackhead Santa CP items now use fuzzy\u2011contains matching to catch blockchain name variations that exact\u2011match missed',
      'ItemRelease description field \u2014 releases can now carry rich event descriptions (lore, mechanics, reward details); Trick, Treat or Die is the first with full event metadata',
      'Trick, Treat or Die event badge \u2014 Halloween items now show the actual event name instead of generic "Halloween"',
      'Loading messages refreshed \u2014 three new OTG\u2011themed quips in the portfolio loading rotation',
      'Welcome popup streamlined \u2014 merged feedback paragraphs, removed redundant bug\u2011report CTA; single "Got it, let me explore" button',
    ],
  },
  {
    version: 'v0.2.6',
    date: 'Feb 18, 2026',
    items: [
      'Search bar validation \u2014 invalid addresses (e.g. trailing special characters) now show inline chain detection badge and hint text instead of silently failing; "Go" button properly gates on address validity',
      'Wallet actions relocated \u2014 Watch and Portfolio buttons moved from search dropdown to the wallet identity bar, where users have context after viewing a wallet\u2019s data',
      'Item origin database \u2014 curated lookup table mapping NFT items to their release origin (Battle Pass, Content Pack, Event) with 26 releases catalogued',
      'Navbar dropdown contrast \u2014 darker background and stronger shadow on wallet dropdown so it no longer blends into the page behind it',
    ],
  },
  {
    version: 'v0.2.5',
    date: 'Feb 18, 2026',
    items: [
      'Hook extraction \u2014 five custom hooks pulled from PortfolioClient (loading messages, chart milestone gating, portfolio snapshots, wallet search actions, multi\u2011wallet gallery), reducing component from 1,203 to 1,012 lines',
      'Lazy\u2011load below\u2011fold \u2014 ChartInsightsRow and NFTGallery dynamically imported with skeleton placeholders for faster initial paint',
      'Accessibility \u2014 skip\u2011to\u2011content link, aria\u2011live on metrics grid, ARIA tablist with roving tabIndex and arrow\u2011key navigation on chart tabs',
      'Wallet switch race fix \u2014 request ID ref pattern on handleWalletSubmit discards stale responses when rapidly switching wallets',
      'Gallery card stagger \u2014 first 24 NFT cards fade\u2011in with translateY stagger animation (30ms grid, 20ms list); cards beyond 24 render instantly',
    ],
  },
  {
    version: 'v0.2.4',
    date: 'Feb 17, 2026',
    items: [
      'Cost basis sparkline \u2014 dashed white line on the portfolio value chart shows historical cost basis alongside market value, visually revealing unrealized P&L gap',
      'Star\u2011appear animation \u2014 chart dots fade in like stars appearing in a night sky as NFTs enrich, growing from tiny pinpoints to full size over ~10 seconds',
      'Random dot stagger \u2014 new dots appear in randomized order across the chart (Fisher\u2011Yates shuffle) instead of chronologically, for a more organic night\u2011sky feel',
      '"Under Active Dev" label \u2014 moved from chart tab headers into the Insights section for a cleaner chart UI',
    ],
  },
  {
    version: 'v0.2.3',
    date: 'Feb 17, 2026',
    items: [
      'Share image redesign \u2014 tactical HUD aesthetic OG image with dot\u2011grid background, corner brackets, gradient accent line, metric cards for GUN balance / NFTs / cost basis',
      'Download portfolio image \u2014 new button in share dropdown fetches the OG image and saves it as PNG',
      'Cost basis in share links \u2014 GUN spent on NFTs is now stored in share snapshots and displayed on the OG card',
      'Chart zoom fix \u2014 zooming no longer pushes dots off\u2011screen; scales use base width so data positions stay stable',
      'Zoom to cursor \u2014 Shift+scroll zooms toward the mouse pointer; zoom buttons auto\u2011scroll to the densest data cluster',
      'Gallery performance \u2014 React.memo on card components + memoized card data prevents unnecessary re\u2011renders',
      'Search debounce \u2014 200ms debounce on gallery search input eliminates lag from keystroke\u2011driven re\u2011filtering',
      'content\u2011visibility: auto on NFT cards \u2014 browser skips painting offscreen cards, reducing compositor work on large galleries',
      'Enrichment speed \u2014 batch delay reduced from 800ms to 200ms, priority window expanded from 12 to 18 above\u2011fold NFTs',
    ],
  },
  {
    version: 'v0.2.2',
    date: 'Feb 17, 2026',
    items: [
      'Chart crossfade \u2014 Timeline and Cost\u2011vs\u2011Value charts stay mounted simultaneously, opacity crossfade via motion/react eliminates DOM rebuild flicker',
      'Aligned chart dimensions \u2014 embedded Timeline now matches Scatter plot margins and height so content doesn\u2019t shift during crossfade',
      'Multi\u2011wallet NFT total fix \u2014 portfolio wallets that load after the primary wallet now correctly update the NFT count',
      'NFT count includes duplicates \u2014 gallery item count sums quantities instead of unique token count',
      'Holdings card cleanup \u2014 removed per\u2011category GUN amounts, combined Bought+Minted on one row, consistent vertical spacing',
      'Navbar wallet dropdown \u2014 converted from slide\u2011out panel to positioned dropdown with spring animation, click\u2011outside and ESC\u2011key close',
      'Navbar layout fix \u2014 three\u2011group flex prevents wallet address width changes from shifting navigation links',
      'Transition demo \u2014 interactive comparison of four chart transition styles added to brand page',
    ],
  },
  {
    version: 'v0.2.1',
    date: 'Feb 17, 2026 \u00B7 6:30 AM EST',
    items: [
      'Spring\u2011physics animations site\u2011wide \u2014 all panels, modals, drawers, and accordions now use motion/react with consistent spring config',
      'Custom green arrow cursor \u2014 replaces default pointer everywhere, zero\u2011lag tracking via direct mousemove transform',
      'Drop\u2011panel close fix \u2014 resolved race condition where trigger button click re\u2011opened panel immediately after click\u2011outside closed it',
      'Active\u2011state indicators \u2014 wallet\u2011switcher and share trigger icons stay green while their panels are open',
      'Navbar layout stability \u2014 three\u2011group flex prevents wallet address from shifting navigation links',
      'BreakdownDrawer accordion \u2014 smooth height expand/collapse replaces instant show/hide',
      'UnlockBanner trust section \u2014 spring\u2011animated height reveal instead of instant toggle',
      'WeaponLabDrawer exit animation \u2014 drawer now slides out instead of vanishing on close',
      'ConnectPromptModal entrance \u2014 scale + fade spring animation replaces no\u2011animation mount',
    ],
  },
  {
    version: 'v0.2.0',
    date: 'Feb 16, 2026 \u00B7 5:48 AM EST',
    items: [
      'wGUN cost extraction fix \u2014 OpenSea offer fills now resolve acquisition cost from ERC\u201120 receipt logs',
      'Offer fill detection \u2014 NFTs acquired via pre\u2011signed OpenSea offers show "OpenSea (Offer)" as source',
      'Hardcoded wGUN contract address as constant \u2014 no longer depends on env var for cost extraction',
    ],
  },
  {
    version: 'v0.1.9',
    date: 'Feb 16, 2026 \u00B7 3:21 AM EST',
    items: [
      'Bundle diet \u2014 removed 15 unused dependencies (210 packages), including Nivo, GSAP, tsparticles, force\u2011graph, reaviz',
      'Replaced axios with native fetch across all API services (\u221230\u202FKB)',
      'Replaced framer\u2011motion with a single CSS keyframe for page transitions (\u221245\u202FKB)',
      'Code\u2011split 13 heavy components via next/dynamic \u2014 charts, modals, debug panels load on demand',
      'Deferred PostHog initialization to after hydration for faster first paint',
      'Added optimizePackageImports for visx, ethers, posthog\u2011js \u2014 tree\u2011shakes unused exports',
      'AVIF image format enabled site\u2011wide (20\u201150% smaller than WebP on supported browsers)',
      'Converted barrel\u2011file imports to direct imports in key components for better tree\u2011shaking',
    ],
  },
  {
    version: 'v0.1.8',
    date: 'Feb 16, 2026 \u00B7 1:10 AM EST',
    items: [
      'Market page \u2014 search all active OpenSea listings, drill into individual items with buy links',
      'Scarcity upgrades \u2014 quality badges, Best Deal sort, price range filter, cross\u2011links to Market',
      'OpenSea listing coverage tripled \u2014 fetches up to 3,000 listings (was 1,000)',
      'PnL scatter plot redesign \u2014 gradient stems, lighter grid, boosted zone labels, legend row, bordered data strip',
      'Sqrt\u2011aware Y\u2011axis ticks \u2014 labels evenly spaced in visual space instead of bunching at the bottom',
      'Chart height increase \u2014 both charts get more vertical breathing room',
      'Fixed zoom height jump \u2014 switching between charts no longer causes jarring layout shift',
      'Quality metadata pipeline \u2014 GunzScan rarity trait extracted and propagated end\u2011to\u2011end',
    ],
  },
  {
    version: 'v0.1.7',
    date: 'Feb 15, 2026 \u00B7 8:23 PM EST',
    items: [
      'Acquisition Timeline \u2014 log\u2011scale Y\u2011axis with curated tick marks for better dot distribution',
      'Data\u2011driven dot entrance animation \u2014 new dots materialize as enrichment discovers them',
      'Portfolio sparkline stability \u2014 snapshots only record after enrichment completes, eliminating jagged reloads',
      'Backdrop sparkline clipping fix \u2014 increased top margin and enforced minimum container height',
      'Hydration fix \u2014 loading text no longer mismatches between server and client renders',
      'CSS shorthand/longhand conflict resolved in chart metadata card and insights border',
      'Chart zoom no longer inflates container height \u2014 fixed\u2011height chart area with hidden scrollbar',
      'ShareDropdown cleanup \u2014 removed dead code, simplified conditional logic',
      'SimpleMetrics and usePortfolioSummaryData reduced by ~700 lines of dead code',
      'PnLScatterPlot simplified \u2014 removed unused tooltip state and redundant computations',
    ],
  },
  {
    version: 'v0.1.6',
    date: 'Feb 14, 2026 \u00B7 8:57 PM EST',
    items: [
      'Social sharing \u2014 Share on X, Discord, or copy link with rich OG preview cards showing portfolio value, P&L, and NFT count',
      'Valuation waterfall upgrade \u2014 per\u2011item listing > comparable sales median > rarity\u2011tier floor > cost basis',
      'Insights panel expansion \u2014 unrealized P&L, most valuable, biggest loss (5 insight types total)',
      'Acquisition Timeline chart \u2014 interactive visx timeline of NFT purchases by venue and date',
      'P&L Scatter Plot promoted to main portfolio view (was insanity\u2011only)',
      'All charts now use full valuation waterfall (listing > comparable > rarity > floor)',
      'Chart visual overhaul \u2014 sqrt scales, glow effects, gradient zones, smarter axis formatting',
    ],
  },
  {
    version: 'v0.1.5',
    date: 'Feb 14, 2026 \u00B7 4:05 PM EST',
    items: [
      'NFT valuation waterfall: per\u2011item listings, rarity\u2011tier floors, comparable sales medians',
      'Dual\u2011value display \u2014 cost basis vs market value side by side',
      'Per\u2011item P&L with visx interactive charts',
      'Feature request system with community voting, bug reports, and screenshot attachments',
      'Collapsible request cards with lightbox image viewer',
      'UXR welcome popup for new testers with onboarding guidance',
      'Crosshair cursor performance: removed backdrop\u2011blur from overlays, cached DOM walks, targeted cursor rules',
      'Display name support for wallet profiles',
      'Portfolio history bootstrap with sparkline seeding',
      'Hybrid portfolio: aggregated summary + per\u2011wallet gallery with SWITCH',
      'Read\u2011only portfolio access via ?address= param \u2014 browse any wallet without logging in',
      'Migrate from SQLite to Neon PostgreSQL \u2014 full read/write in production',
    ],
  },
  {
    version: 'v0.1.4',
    date: 'Feb 13, 2026 \u00B7 4:56 AM EST',
    items: [
      'Scramble\u2011decode loading text matching home hero animation',
      '10pm Easter egg \u2014 because someone had to',
      'NFT Holdings sparkline toggle on first wallet search',
      'Server\u2011side RPC proxy for reliable production wallet loading',
      'View transitions with framer\u2011motion page animations',
      'Wallet address help panel for new users',
      'Auto\u2011populate credits from completed feature requests',
    ],
  },
  {
    version: 'v0.1.3',
    date: 'Feb 12, 2026 \u00B7 4:35 PM EST',
    items: [
      'NFT sparkline toggle with historical hover counts',
      'Dynamic Labs SDK upgrade (4.59.1 \u2192 4.61.2)',
      'Crosshair cursor performance fix',
      'UX polish: onboarding flow, nav, login gate, multi\u2011admin',
      'Grouped NFT visual overhaul: dynamic rarity accents, mergeIntoGroups',
      'Decode cost extraction fix for relayer\u2011submitted transactions',
    ],
  },
  {
    version: 'v0.1.2',
    date: 'Feb 11, 2026 \u00B7 10:37 PM EST',
    items: [
      'GunzScan API migration with infinite scroll',
      'Ambient backdrop sparkline with smooth curves and overlay toggles',
      'Auto\u2011load portfolio on wallet connect',
      'Component decomposition: Navbar, PortfolioSummaryBar, scarcity, feature\u2011requests',
      'Wallet dropdown enhancements + identity bar refactor',
      'SEO metadata for all pages',
      'Standardized API response types',
    ],
  },
  {
    version: 'v0.1.1',
    date: 'Feb 10, 2026 \u00B7 11:47 PM EST',
    items: [
      'Confidence indicator overhaul with enrichment reliability fixes',
      'Insanity Mode toggle + clip\u2011corner card design',
      'Sticky accent lines and container transparency polish',
      'Email auth flow + adaptive onboarding',
      'Scarcity page UX improvements',
      'Disconnect UX and network switch visibility fixes',
    ],
  },
  {
    version: 'v0.1.0',
    date: 'Feb 9, 2026 \u00B7 7:20 PM EST',
    items: [
      'Public feature request and management system',
      'Dynamic wallet onboarding with styled connect flow',
      'Redesigned footer with social links',
      'Leaderboard page with access gate and active wallet display',
      'Nav glitch effect + gallery refactor',
    ],
  },
  {
    version: 'v0.0.3',
    date: 'Feb 5\u20138, 2026',
    items: [
      'NFTDetailModal decomposition (3,163 \u2192 1,069 lines via 4 extracted hooks)',
      'Portfolio context + hooks architecture refactor',
      'useWalletDataFetcher, useNFTEnrichmentOrchestrator, useWalletAggregation hooks',
      'WaffleChart composition visualization with stagger animation',
      'Marketplace price enrichment pipeline',
      'Portfolio three\u2011section layout with Simple/Detailed toggle',
    ],
  },
  {
    version: 'v0.0.2',
    date: 'Jan 31 \u2013 Feb 1, 2026',
    items: [
      'NFT P&L pipeline with historical prices, rarity floors, and comparable sales',
      'Interactive rarity filter pills in NFT gallery',
      'YOUR POSITION section in NFT detail modal',
      'Floor price enrichment + metadata caching',
      'Security vulnerability fixes (31 \u2192 9)',
      'Functional tier support from raw metadata',
      'Native GUN balance fetch fix',
    ],
  },
  {
    version: 'v0.0.1',
    date: 'Jan 19\u201322, 2026',
    tag: 'initial',
    items: [
      'Initial release \u2014 GUNZscope is born',
      'Multi\u2011chain portfolio tracker for Off The Grid',
      'NFT Armory/Lab feature with weapon compatibility',
      'Acquisition truth layer using RPC\u2011only fingerprints',
      'Progressive accounts implementation',
      'OpenSea + in\u2011game marketplace data integration',
    ],
  },
];

// =============================================================================
// Components
// =============================================================================

function VersionBlock({ entry, isFirst }: { entry: VersionEntry; isFirst: boolean }) {
  const isInitial = entry.tag === 'initial';
  const isCurrent = entry.tag === 'current';

  return (
    <section className="relative">
      {/* Version header */}
      <div className="flex items-center gap-3 mb-3">
        <h2 className="font-display font-bold text-lg uppercase text-[var(--gs-white)]">
          {entry.version}
        </h2>
        {isCurrent && (
          <span className="font-mono text-[9px] uppercase tracking-widest px-1.5 py-0.5 text-[var(--gs-lime)] border border-[var(--gs-lime)]/30 bg-[var(--gs-lime)]/[0.06]">
            Current
          </span>
        )}
        {isInitial && (
          <span className="font-mono text-[9px] uppercase tracking-widest px-1.5 py-0.5 text-[var(--gs-purple)] border border-[var(--gs-purple)]/30 bg-[var(--gs-purple)]/[0.06]">
            Genesis
          </span>
        )}
      </div>
      <p className="font-mono text-caption tracking-wider uppercase text-[var(--gs-gray-3)] mb-4">
        {entry.date}
      </p>

      {/* Items */}
      <ul className="space-y-2">
        {entry.items.map((item, i) => (
          <li key={i} className="flex gap-2.5 text-sm text-[var(--gs-gray-4)] leading-relaxed font-body">
            <span
              className={`mt-[7px] w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                isFirst ? 'bg-[var(--gs-lime)]' : 'bg-[var(--gs-gray-1)]'
              }`}
            />
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

function ChangelogContent() {
  return (
    <div className="min-h-dvh bg-[var(--gs-black)] text-[var(--gs-white)]">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header */}
        <h1 className="font-display font-bold text-3xl uppercase mb-2">Version History</h1>
        <p className="font-mono text-caption tracking-wider uppercase text-[var(--gs-gray-3)] mb-2">
          Early Access &middot; Public Development Log
        </p>
        <p className="font-body text-sm text-[var(--gs-gray-4)] leading-relaxed mb-12">
          GUNZscope is under active development. This page tracks every meaningful release
          since the first commit. Features ship fast &mdash; if something&rsquo;s missing,{' '}
          <a href="/feature-requests" className="text-[var(--gs-purple)] hover:text-[var(--gs-lime)] transition-colors underline underline-offset-2">
            request it
          </a>.
        </p>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical timeline line */}
          <div
            className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-[var(--gs-lime)]/40 via-[var(--gs-purple)]/20 to-transparent"
            aria-hidden="true"
          />

          <div className="space-y-10 pl-6">
            {VERSIONS.map((entry, i) => (
              <VersionBlock key={entry.version} entry={entry} isFirst={i === 0} />
            ))}
          </div>
        </div>

        {/* Footer note */}
        <div className="mt-16 pt-8 border-t border-white/[0.06]">
          <p className="font-mono text-[10px] tracking-wider uppercase text-[var(--gs-gray-2)]">
            Built for the Off The Grid community &middot; Not affiliated with GUNZILLA Games
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function ChangelogPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-[var(--gs-black)]" />}>
      <ChangelogContent />
    </Suspense>
  );
}
