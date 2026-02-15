# Insights Panel Expansion Plan

**Status**: Planned
**Priority**: Medium
**Date**: 2025-02-14

## Current State

`lib/portfolio/portfolioInsights.ts` generates at most 2 insight types:
1. **Best performer** — NFT with highest % gain (only shown if gain > 0)
2. **Below cost basis** — count of NFTs where floor < purchase price

The `PortfolioInsight` interface defines `worst_performer` and `most_valuable` types but they're never generated.

Gate: `usePortfolioSummaryData.ts` suppresses all insights if < 30% of NFTs have cost data.

## Proposed New Insights

### Phase 1 — Quick wins (use existing data)

| Insight | Logic | Display |
|---------|-------|---------|
| **Most valuable** | NFT with highest `floorPrice * gunPrice` | "Most valuable · Kestrel Punisher — $142" |
| **Biggest loss** | NFT with worst % decline | "Biggest loss · Common Charm — -67%" |
| **Total unrealized P&L** | Sum of (floor - cost) across all priced NFTs | "+$340 unrealized" or "-$120 unrealized" |

### Phase 2 — Collection-level insights

| Insight | Logic | Display |
|---------|-------|---------|
| **Best collection** | Group by collection, avg % gain | "Best collection · Assault Rifles — +23%" |
| **Most concentrated** | Collection with most NFTs | "62% of holdings in Charms" |

### Phase 3 — Time-based insights

| Insight | Logic | Display |
|---------|-------|---------|
| **Recently acquired** | NFT with most recent `acquiredAt` | "Latest pickup · 2d ago" |
| **Longest held** | NFT with oldest `acquiredAt` | "Diamond hands · 45d held" |
| **Floor trending** | Compare current floor to 7d ago (if sparkline data exists) | "Floors up 12% this week" |

## Implementation Notes

- Keep `maxInsights = 3` default — show the 3 most interesting/actionable
- Priority ranking: total P&L > best performer > below cost > most valuable > biggest loss
- Each insight type needs an icon in `InsightsPanel.tsx` (currently only has up/down arrows)
- Consider making insights clickable — e.g. clicking "best performer" opens that NFT's detail modal
- The `onInsightClick` prop already exists but is never wired up

## Files to Modify

- `lib/portfolio/portfolioInsights.ts` — add new insight generators
- `lib/portfolio/__tests__/portfolioInsights.test.ts` — add tests
- `components/ui/InsightsPanel.tsx` — add icons for new types
- `components/portfolio-summary/PortfolioSummaryBar.tsx` — wire `onInsightClick` to open NFT modal
