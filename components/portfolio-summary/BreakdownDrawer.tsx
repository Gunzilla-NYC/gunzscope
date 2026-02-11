import { EnrichmentProgress } from '@/lib/types';
import { formatUsd } from '@/lib/portfolio/calcPortfolio';
import { NftPnL } from './types';

interface BreakdownDrawerProps {
  isOpen: boolean;
  onToggle: () => void;
  gunValue: number;
  gunHoldings: number;
  gunPrice: number | undefined;
  nftFloorValueUsd: number | null;
  totalGunSpent: number;
  nftPnL: NftPnL;
  isEnriching: boolean;
  enrichmentProgress?: EnrichmentProgress | null;
  progressPct: number | null;
}

export function BreakdownDrawer({
  isOpen, onToggle,
  gunValue, gunHoldings, gunPrice, nftFloorValueUsd, totalGunSpent,
  nftPnL, isEnriching, enrichmentProgress, progressPct,
}: BreakdownDrawerProps) {
  return (
    <>
      {/* Breakdown content */}
      {isOpen && (
        <div className="border-t border-white/[0.06] px-6 py-4 bg-white/[0.01] space-y-4">
          {/* Valuation Sources */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 border border-white/[0.06]">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--gs-profit)]" />
                <span className="font-mono text-micro tracking-widest uppercase text-[var(--gs-gray-4)]">
                  GUN Token
                </span>
              </div>
              <p className="font-mono text-sm font-semibold text-[var(--gs-white)]">
                ${formatUsd(gunValue)}
              </p>
              <p className="font-mono text-micro text-[var(--gs-gray-3)] mt-1">
                CoinGecko &middot; Live
              </p>
              {gunPrice && (
                <p className="font-mono text-micro text-[var(--gs-gray-2)] mt-0.5">
                  {gunHoldings.toLocaleString(undefined, { maximumFractionDigits: 0 })} &times; ${gunPrice.toFixed(4)}
                </p>
              )}
            </div>
            <div className="p-3 border border-white/[0.06]">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--gs-warning)]" />
                <span className="font-mono text-micro tracking-widest uppercase text-[var(--gs-gray-4)]">
                  NFT Holdings
                </span>
              </div>
              <p className="font-mono text-sm font-semibold text-[var(--gs-white)]">
                {nftFloorValueUsd !== null ? `$${formatUsd(nftFloorValueUsd)}` : '\u2014'}
              </p>
              <p className="font-mono text-micro text-[var(--gs-gray-3)] mt-1">
                Cost Basis
              </p>
              <p className="font-mono text-micro text-[var(--gs-gray-2)] mt-0.5">
                Mkt Est. &mdash; Not yet available
              </p>
            </div>
          </div>

          {/* Profit Breakdown */}
          {nftPnL.unrealizedGun !== null && (
            <div className={`p-3 border ${nftPnL.unrealizedGun >= 0 ? 'border-[var(--gs-profit)]/10 bg-[var(--gs-profit)]/[0.02]' : 'border-[var(--gs-loss)]/10 bg-[var(--gs-loss)]/[0.02]'}`}>
              <p className="font-mono text-micro tracking-widest uppercase text-[var(--gs-gray-4)] mb-2">
                Profit Breakdown
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                <div className="flex justify-between">
                  <span className="font-mono text-micro text-[var(--gs-gray-3)]">NFT Floor Value</span>
                  <span className="font-mono text-micro text-[var(--gs-white)] tabular-nums">
                    {nftPnL.coverage > 0 ? `${((nftPnL.unrealizedGun ?? 0) + (totalGunSpent > 0 ? totalGunSpent : 0)).toLocaleString(undefined, { maximumFractionDigits: 0 })} GUN` : '\u2014'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-mono text-micro text-[var(--gs-gray-3)]">Cost Basis</span>
                  <span className="font-mono text-micro text-[var(--gs-white)] tabular-nums">
                    {totalGunSpent > 0 ? `${totalGunSpent.toLocaleString(undefined, { maximumFractionDigits: 0 })} GUN` : '\u2014'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-mono text-micro text-[var(--gs-gray-3)]">Profit / Loss</span>
                  <span className={`font-mono text-micro tabular-nums ${nftPnL.unrealizedGun >= 0 ? 'text-[var(--gs-profit)]' : 'text-[var(--gs-loss)]'}`}>
                    {nftPnL.unrealizedGun >= 0 ? '+' : ''}{nftPnL.unrealizedGun.toLocaleString(undefined, { maximumFractionDigits: 0 })} GUN
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-mono text-micro text-[var(--gs-gray-3)]">Coverage</span>
                  <span className="font-mono text-micro text-[var(--gs-white)] tabular-nums">
                    {nftPnL.coverage}/{nftPnL.totalItems}
                  </span>
                </div>
              </div>
              <p className="font-mono text-micro text-[var(--gs-gray-2)] mt-2 italic">
                Floor price is collection-level, not per-item
              </p>
            </div>
          )}

          {/* Data Quality */}
          <div className="space-y-2">
            <p className="font-mono text-micro tracking-widest uppercase text-[var(--gs-gray-4)]">
              Data Quality
            </p>
            <div>
              <div className="flex justify-between mb-1">
                <span className="font-mono text-micro text-[var(--gs-gray-3)]">Cost Data</span>
                <span className="font-mono text-micro text-[var(--gs-gray-3)] tabular-nums">
                  {nftPnL.totalItems > 0 ? Math.round(((nftPnL.nftsWithCost + nftPnL.nftsFreeTransfer) / nftPnL.totalItems) * 100) : 0}% &middot; {nftPnL.nftsWithCost} enriched / {nftPnL.totalItems - nftPnL.nftsWithCost - nftPnL.nftsFreeTransfer} unknown
                </span>
              </div>
              <div className="h-[3px] bg-[var(--gs-dark-4)] overflow-hidden">
                <div
                  className="h-full bg-[var(--gs-lime)]"
                  style={{ width: `${nftPnL.totalItems > 0 ? ((nftPnL.nftsWithCost + nftPnL.nftsFreeTransfer) / nftPnL.totalItems) * 100 : 0}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="font-mono text-micro text-[var(--gs-gray-3)]">Market Data</span>
                <span className="font-mono text-micro text-[var(--gs-gray-2)] tabular-nums">
                  0% &middot; Per-item pricing planned
                </span>
              </div>
              <div className="h-[3px] bg-[var(--gs-dark-4)] overflow-hidden">
                <div className="h-full bg-[var(--gs-gray-2)]" style={{ width: '0%' }} />
              </div>
            </div>
          </div>

          {/* Enrichment Progress */}
          {enrichmentProgress && enrichmentProgress.total > 0 && (
            <div>
              <div className="flex justify-between mb-1">
                <span className="font-mono text-micro text-[var(--gs-gray-3)]">
                  Scan {isEnriching ? '' : 'Complete'}
                </span>
                <span className="font-mono text-micro text-[var(--gs-gray-3)] tabular-nums">
                  {enrichmentProgress.completed}/{enrichmentProgress.total}
                  {(enrichmentProgress.failedCount ?? 0) > 0 && (
                    <span className="text-[var(--gs-loss)] ml-1">({enrichmentProgress.failedCount} failed)</span>
                  )}
                </span>
              </div>
              <div className="h-[3px] bg-[var(--gs-dark-4)] overflow-hidden relative">
                <div
                  className="h-full bg-gradient-to-r from-[var(--gs-lime)] to-[var(--gs-purple)] transition-all duration-300 ease-out"
                  style={{ width: `${progressPct}%` }}
                />
                {isEnriching && <div className="absolute inset-0 enrichment-bar-shimmer" />}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Toggle button */}
      <div className="border-t border-white/[0.06]">
        <button
          onClick={onToggle}
          className="w-full px-6 py-2 flex items-center justify-center gap-1.5 font-mono text-micro tracking-widest uppercase text-[var(--gs-gray-3)] hover:text-[var(--gs-lime)] hover:bg-white/[0.01] transition-colors cursor-pointer"
        >
          <span className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
            {'\u25BE'}
          </span>
          {isOpen ? 'Hide Breakdown' : 'Breakdown'}
        </button>
      </div>
    </>
  );
}
