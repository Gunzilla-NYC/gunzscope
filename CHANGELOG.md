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
