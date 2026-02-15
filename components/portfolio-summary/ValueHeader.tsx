'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { EnrichmentProgress } from '@/lib/types';
import { PortfolioCalcResult } from '@/lib/portfolio/calcPortfolio';
import ConfidenceIndicator from '@/components/ui/ConfidenceIndicator';
import BackdropChart from '@/components/charts/BackdropChart';
import { ChangeDisplay } from './types';

interface ValueHeaderProps {
  isInitializing: boolean;
  animatedTotal: string;
  confidence?: PortfolioCalcResult['confidence'];
  walletAddress?: string;
  change7d: ChangeDisplay;
  changePercent7d: ChangeDisplay;
  sparklineValues: number[];
  sparklineSpanDays: number;
  totalValue: number;
  isEnriching: boolean;
  enrichmentProgress?: EnrichmentProgress | null;
  isEnrichmentComplete: boolean;
  showGunOverlay: boolean;
  gunSparklineValues: number[];
  hasMarketValue?: boolean;
  costBasisTotal?: number;
  nftCount?: number;
  gunBalance?: number;
  nftPnlPct?: number | null;
}

export function ValueHeader({
  isInitializing,
  animatedTotal, confidence, walletAddress,
  change7d, changePercent7d,
  sparklineValues, sparklineSpanDays, totalValue,
  isEnriching,
  showGunOverlay, gunSparklineValues,
  hasMarketValue, costBasisTotal,
  nftCount, gunBalance, nftPnlPct,
}: ValueHeaderProps) {
  const hasSparkline = sparklineValues.length >= 2 && !isInitializing;

  // 7d performance badge state
  const show7dBadge = walletAddress && !change7d.isCalculating && !isInitializing;
  const is7dUp = changePercent7d.text.startsWith('+') || (!changePercent7d.text.startsWith('-') && changePercent7d.text !== '0.0%');
  const is7dDown = changePercent7d.text.startsWith('-');

  // Share button state
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(() => {
    if (!walletAddress) return;
    // Build share URL — the OG meta tags on the portfolio page use the address
    // to generate a rich preview card via /api/og/portfolio/[address]
    const url = new URL(`${window.location.origin}/portfolio`);
    url.searchParams.set('address', walletAddress);
    const base = url.toString();
    navigator.clipboard.writeText(base).then(() => {
      setCopied(true);
      toast.success('Portfolio link copied!', {
        description: 'Share this link so others can view this portfolio with a rich preview card.',
        duration: 3000,
      });
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      toast.error('Failed to copy link');
    });
  }, [walletAddress]);

  return (
    <div className="relative overflow-hidden">
      {/* Visx backdrop chart — top-fade mask prevents overlap with text */}
      {hasSparkline && (
        <div
          className="absolute inset-0"
          aria-hidden="true"
          style={{ maskImage: 'linear-gradient(to left, black 0%, black 70%, transparent 85%)', WebkitMaskImage: 'linear-gradient(to left, black 0%, black 70%, transparent 85%)' }}
        >
          <BackdropChart
            values={sparklineValues}
            overlayValues={gunSparklineValues}
            showOverlay={showGunOverlay}
            spanDays={sparklineSpanDays}
            height={140}
          />
        </div>
      )}

      {/* Content layer */}
      <div className="relative z-10 p-6 pb-4">
        <div className="flex justify-between items-start">
          <div aria-live="polite" aria-busy={isInitializing}>
            <div className="flex items-center gap-2 mb-1">
              <p className="font-mono text-caption tracking-widest uppercase text-[var(--gs-gray-4)]">
                {hasMarketValue ? 'Estimated Market Value' : 'Total Portfolio Value'}
              </p>
              {confidence && (
                <ConfidenceIndicator confidence={confidence} isGathering={isEnriching} />
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
                {hasMarketValue && costBasisTotal !== undefined && (
                  <p className="font-mono text-[11px] text-[var(--gs-gray-3)] mt-0.5">
                    Cost basis: ${costBasisTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                )}
                {show7dBadge && (
                  <div
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 mt-1 border text-[11px] ${
                      is7dUp
                        ? 'bg-[var(--gs-profit)]/8 border-[var(--gs-profit)]/20 text-[var(--gs-profit)]'
                        : is7dDown
                        ? 'bg-[var(--gs-loss)]/8 border-[var(--gs-loss)]/20 text-[var(--gs-loss)]'
                        : 'bg-white/5 border-white/10 text-[var(--gs-gray-4)]'
                    }`}
                    style={{ clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))' }}
                  >
                    {is7dUp && (
                      <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                    {is7dDown && (
                      <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                    <span className="font-mono font-semibold">
                      <span className="opacity-50 mr-0.5">7d</span>{changePercent7d.text}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Share button */}
          {walletAddress && !isInitializing && (
            <button
              onClick={handleShare}
              className="group flex items-center gap-1.5 px-2.5 py-1.5 border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] hover:border-[var(--gs-lime)]/20 transition-all duration-200 cursor-pointer"
              style={{ clipPath: 'polygon(0 0, calc(100% - 5px) 0, 100% 5px, 100% 100%, 5px 100%, 0 calc(100% - 5px))' }}
              title="Copy portfolio link"
            >
              {copied ? (
                <svg className="w-3.5 h-3.5 text-[var(--gs-profit)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5 text-[var(--gs-gray-4)] group-hover:text-[var(--gs-lime)] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              )}
              <span className={`font-mono text-[10px] tracking-wider uppercase ${copied ? 'text-[var(--gs-profit)]' : 'text-[var(--gs-gray-4)] group-hover:text-[var(--gs-lime)]'} transition-colors`}>
                {copied ? 'Copied' : 'Share'}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
