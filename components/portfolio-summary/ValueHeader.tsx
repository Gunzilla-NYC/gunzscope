import { EnrichmentProgress } from '@/lib/types';
import { PortfolioCalcResult, formatUsd } from '@/lib/portfolio/calcPortfolio';
import ConfidenceIndicator from '@/components/ui/ConfidenceIndicator';
import Sparkline from '@/components/ui/Sparkline';
import { PortfolioViewMode, ChangeDisplay } from './types';

interface ValueHeaderProps {
  viewMode: PortfolioViewMode;
  isInitializing: boolean;
  topExpanded: boolean;
  onToggleTop: () => void;
  animatedTotal: string;
  confidence?: PortfolioCalcResult['confidence'];
  walletAddress?: string;
  change24h: ChangeDisplay;
  changePercent24h: ChangeDisplay;
  change7d: ChangeDisplay;
  changePercent7d: ChangeDisplay;
  sparklineValues: number[];
  totalValue: number;
  gunHoldings: number;
  gunValue: number;
  nftCount: number;
  nftFloorValueUsd: number | null;
  totalGunSpent: number;
  gunPct: number;
  nftPct: number;
  isEnriching: boolean;
  enrichmentProgress?: EnrichmentProgress | null;
  isEnrichmentComplete: boolean;
  hasFailures: boolean;
  progressPct: number | null;
  totalPnLPct: number | null;
  isProfit: boolean;
  isLoss: boolean;
  onToggleViewMode: () => void;
}

export function ValueHeader({
  viewMode, isInitializing, topExpanded, onToggleTop,
  animatedTotal, confidence, walletAddress,
  change24h, changePercent24h, change7d, changePercent7d,
  sparklineValues, totalValue,
  gunHoldings, gunValue, nftCount, nftFloorValueUsd, totalGunSpent, gunPct, nftPct,
  isEnriching, enrichmentProgress, isEnrichmentComplete, hasFailures, progressPct,
  totalPnLPct, isProfit, isLoss, onToggleViewMode,
}: ValueHeaderProps) {
  return (
    <div
      className={`p-6 pb-4 ${viewMode === 'detailed' && !isInitializing ? 'cursor-pointer transition-colors duration-200 hover:bg-white/[0.01]' : ''}`}
      onClick={viewMode === 'detailed' && !isInitializing ? onToggleTop : undefined}
    >
      <div className="relative" style={{ minHeight: '64px' }}>
        {/* Default: Total Value + P&L Badge + View Toggle */}
        <div
          className={`transition-all duration-200 ${
            topExpanded && viewMode === 'detailed' ? 'opacity-0 -translate-y-2 pointer-events-none' : 'opacity-100 translate-y-0'
          }`}
        >
          <div className="flex justify-between items-start">
            <div aria-live="polite" aria-busy={isInitializing}>
              <div className="flex items-center gap-2 mb-1">
                <p className="font-mono text-caption tracking-widest uppercase text-[var(--gs-gray-4)]">
                  Total Portfolio Value
                </p>
                {confidence && (
                  <ConfidenceIndicator confidence={confidence} isGathering={isEnriching} />
                )}
                {viewMode === 'detailed' && !isInitializing && confidence && (
                  <span className="font-mono text-micro tracking-wider text-[var(--gs-gray-3)] border border-white/[0.08] px-1.5 py-0.5 ml-1">
                    {confidence.percentage}% data confidence
                  </span>
                )}
              </div>
              {isInitializing ? (
                <div className="space-y-2">
                  <span className="font-display text-4xl font-bold text-[var(--gs-gray-3)]">
                    Calculating
                  </span>
                  <div
                    className="h-[3px] w-48 bg-[var(--gs-dark-4)] overflow-hidden"
                    style={{ clipPath: 'polygon(0 0, calc(100% - 2px) 0, 100% 2px, 100% 100%, 2px 100%, 0 calc(100% - 2px))' }}
                  >
                    <div
                      className="h-full bg-gradient-to-r from-[var(--gs-lime)] to-[var(--gs-purple)] animate-loading-bar"
                      style={{ width: '40%' }}
                    />
                  </div>
                </div>
              ) : (
                <>
                  <p className="font-display text-4xl font-bold text-[var(--gs-white)]">
                    ${animatedTotal}
                  </p>
                  {walletAddress && (
                    <div className="flex items-center gap-3 mt-1">
                      <span className="font-mono text-[13px]">
                        <span className="text-[var(--gs-gray-3)] mr-1">24h</span>
                        {change24h.isCalculating ? (
                          <span className="text-[var(--gs-gray-2)] italic">{change24h.text}</span>
                        ) : (
                          <>
                            <span className={change24h.colorClass}>{change24h.text}</span>
                            <span className={`text-data ml-0.5 ${changePercent24h.colorClass}`}>({changePercent24h.text})</span>
                          </>
                        )}
                      </span>
                      <span className="font-mono text-[13px]">
                        <span className="text-[var(--gs-gray-3)] mr-1">7d</span>
                        {change7d.isCalculating ? (
                          <span className="text-[var(--gs-gray-2)] italic">{change7d.text}</span>
                        ) : (
                          <>
                            <span className={change7d.colorClass}>{change7d.text}</span>
                            <span className={`text-data ml-0.5 ${changePercent7d.colorClass}`}>({changePercent7d.text})</span>
                          </>
                        )}
                      </span>
                    </div>
                  )}
                  {viewMode === 'detailed' && (
                    <p className="font-mono text-caption text-[var(--gs-gray-3)] mt-1">
                      <span className="text-[var(--gs-lime)]">{gunHoldings.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                      <span className="text-[var(--gs-gray-2)]"> GUN</span>
                      <span className="text-[var(--gs-gray-2)] mx-1.5">&middot;</span>
                      <span className="text-[var(--gs-purple)]">{nftCount.toLocaleString()}</span>
                      <span className="text-[var(--gs-gray-2)]"> NFTs</span>
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Right column: Sparkline + View toggle + P&L Badge */}
            <div className="flex items-center gap-2">
              {!isInitializing && walletAddress && (
                <div className="flex-shrink-0 opacity-80 hidden sm:block">
                  <Sparkline
                    values={sparklineValues.length > 0 ? sparklineValues : [totalValue, totalValue]}
                    width={80}
                    height={28}
                    strokeWidth={1.25}
                    showFill={true}
                    showCurrentDot={true}
                  />
                </div>
              )}

              {/* Insanity Mode toggle */}
              {!isInitializing && (
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleViewMode(); }}
                  className="flex items-center gap-2 cursor-pointer group/toggle"
                  aria-pressed={viewMode === 'detailed'}
                  title={viewMode === 'detailed' ? 'Insanity Mode: ON \u2014 showing full enrichment data' : 'Insanity Mode: OFF \u2014 clean summary view'}
                >
                  <span className={`font-mono text-micro tracking-wider uppercase whitespace-nowrap transition-colors ${
                    viewMode === 'detailed' ? 'text-[var(--gs-lime)]' : 'text-[var(--gs-gray-3)] group-hover/toggle:text-[var(--gs-gray-4)]'
                  }`}>
                    Insanity Mode
                  </span>
                  <div className={`relative w-7 h-3.5 rounded-full transition-colors duration-200 ${
                    viewMode === 'detailed'
                      ? 'bg-[var(--gs-lime)]/30 border border-[var(--gs-lime)]/40'
                      : 'bg-white/[0.08] border border-white/[0.12] group-hover/toggle:border-white/[0.2]'
                  }`}>
                    <div className={`absolute top-[2px] w-2 h-2 rounded-full transition-all duration-200 ${
                      viewMode === 'detailed'
                        ? 'left-[13px] bg-[var(--gs-lime)] shadow-[0_0_6px_rgba(166,247,0,0.4)]'
                        : 'left-[2px] bg-[var(--gs-gray-3)]'
                    }`} />
                  </div>
                </button>
              )}

              {/* Detailed mode: enrichment indicator */}
              {viewMode === 'detailed' && !isInitializing && (isEnriching || isEnrichmentComplete) && (
                <span className="font-mono text-micro text-[var(--gs-gray-3)] tabular-nums whitespace-nowrap">
                  {isEnriching ? (
                    <><span className="text-[var(--gs-lime)] animate-pulse">{'\u229B'}</span> {enrichmentProgress?.completed ?? 0}/{enrichmentProgress?.total ?? 0}</>
                  ) : (
                    <><span className="text-[var(--gs-gray-3)]">{'\u25CF'}</span> {enrichmentProgress?.total ?? nftCount}/{enrichmentProgress?.total ?? nftCount}</>
                  )}
                </span>
              )}

              {/* P&L Badge */}
              {totalPnLPct !== null && !isInitializing ? (
                <div
                  className={`flex items-center gap-1.5 px-3 py-1.5 border ${
                    isProfit
                      ? 'bg-[var(--gs-profit)]/10 border-[var(--gs-profit)]/30 text-[var(--gs-profit)]'
                      : isLoss
                      ? 'bg-[var(--gs-loss)]/10 border-[var(--gs-loss)]/30 text-[var(--gs-loss)]'
                      : 'bg-white/5 border-white/10 text-[var(--gs-gray-4)]'
                  }`}
                  style={{ clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))' }}
                >
                  {isProfit && (
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                  {isLoss && (
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                  <span className="font-mono text-sm font-semibold">
                    {totalPnLPct >= 0 ? '+' : ''}{totalPnLPct.toFixed(1)}%
                  </span>
                </div>
              ) : !isInitializing && viewMode === 'detailed' && (isEnriching || totalGunSpent === 0) ? (
                <div
                  className={`flex items-center gap-1.5 px-3 py-1.5 border bg-white/5 ${hasFailures ? 'border-[var(--gs-loss)]/20' : 'border-white/10'}`}
                  style={{ clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))' }}
                >
                  {isEnriching ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--gs-lime)] animate-pulse" />
                      <span className="font-mono text-data text-[var(--gs-gray-3)] tabular-nums">
                        {enrichmentProgress && enrichmentProgress.total > 0
                          ? `${enrichmentProgress.completed}/${enrichmentProgress.total}`
                          : 'Scanning'}
                      </span>
                    </>
                  ) : isEnrichmentComplete ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--gs-gray-3)]" />
                      <span className="font-mono text-data text-[var(--gs-gray-3)] tabular-nums">
                        All transferred
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--gs-lime)] animate-pulse" />
                      <span className="font-mono text-data text-[var(--gs-gray-3)] tabular-nums">
                        Scanning
                      </span>
                    </>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Toggled: Portfolio Construction Detail (Detailed mode only) */}
        {viewMode === 'detailed' && (
          <div
            className={`absolute inset-0 transition-all duration-200 ${
              topExpanded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <p className="font-mono text-caption tracking-widest uppercase text-[var(--gs-gray-4)]">
                Portfolio Construction
              </p>
              <span className="font-mono text-micro text-[var(--gs-gray-3)] ml-auto">
                {'\u25C0'} back
              </span>
            </div>

            {isEnriching && enrichmentProgress && enrichmentProgress.total > 0 ? (
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-caption uppercase tracking-wider text-[var(--gs-gray-4)]">Scanning</span>
                  <span className="font-mono text-2xl font-semibold text-[var(--gs-white)] tabular-nums">
                    {enrichmentProgress.completed}
                  </span>
                  <span className="font-mono text-sm text-[var(--gs-gray-3)] tabular-nums">
                    / {enrichmentProgress.total}
                  </span>
                </div>
                <div className="h-[3px] bg-[var(--gs-dark-4)] overflow-hidden relative">
                  <div
                    className="h-full bg-gradient-to-r from-[var(--gs-lime)] to-[var(--gs-purple)] transition-all duration-300 ease-out"
                    style={{ width: `${progressPct}%` }}
                  />
                  <div className="absolute inset-0 enrichment-bar-shimmer" />
                </div>
              </div>
            ) : isEnriching ? (
              <p className="font-mono text-sm text-[var(--gs-gray-3)] animate-pulse">
                Scanning&hellip;
              </p>
            ) : (
              <div className="flex items-baseline gap-4 flex-wrap">
                <div>
                  <span className="font-mono text-caption text-[var(--gs-gray-4)] block mb-0.5">GUN Tokens</span>
                  <span className="font-mono text-lg font-semibold text-[var(--gs-white)]">
                    ${formatUsd(gunValue)}
                  </span>
                  <span className="font-mono text-caption text-[var(--gs-gray-3)] ml-2">
                    {gunPct.toFixed(0)}%
                  </span>
                </div>
                <div>
                  <span className="font-mono text-caption text-[var(--gs-gray-4)] block mb-0.5">NFTs</span>
                  <span className="font-mono text-lg font-semibold text-[var(--gs-white)]">
                    {nftFloorValueUsd !== null ? `$${formatUsd(nftFloorValueUsd)}` : '\u2014'}
                  </span>
                  <span className="font-mono text-caption text-[var(--gs-gray-3)] ml-2">
                    {nftPct.toFixed(0)}%
                  </span>
                </div>
                {totalGunSpent > 0 && (
                  <div>
                    <span className="font-mono text-caption text-[var(--gs-gray-4)] block mb-0.5">Spent</span>
                    <span className="font-mono text-lg font-semibold text-[var(--gs-white)]">
                      {totalGunSpent.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} GUN
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
