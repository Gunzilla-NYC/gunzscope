'use client';

import { useMemo, useState } from 'react';
import Sparkline from '@/components/ui/Sparkline';
import CompositionBar from '@/components/ui/CompositionBar';
import { calculatePortfolioChanges, getSparklineValues, PortfolioChanges } from '@/lib/utils/portfolioHistory';

interface PortfolioBreakdown {
  gunValue: number;
  nftValue: number;
  otherValue: number;
  nftCount: number;
}

interface CostBasis {
  tokens: number | null;
  nfts: number | null;
  total: number | null;
}

interface PortfolioGlanceCardProps {
  address: string;
  totalValue: number;
  breakdown: PortfolioBreakdown;
  costBasis?: CostBasis;
  className?: string;
}

/**
 * Format a number as USD currency
 */
function formatUSD(value: number, decimals: number = 2): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format a change value with sign and appropriate styling
 */
function formatChange(
  value: number | null,
  isPercent: boolean = false
): { text: string; colorClass: string; isCalculating: boolean } {
  if (value === null) {
    return { text: 'Calculating…', colorClass: 'text-white/40', isCalculating: true };
  }

  const sign = value >= 0 ? '+' : '';
  const formatted = isPercent
    ? `${sign}${value.toFixed(2)}%`
    : `${sign}$${formatUSD(Math.abs(value))}`;

  const colorClass = value > 0 ? 'text-[#beffd2]' : value < 0 ? 'text-[#ff6b6b]' : 'text-white/55';

  return {
    text: value >= 0 ? formatted : `-$${formatUSD(Math.abs(value))}`,
    colorClass,
    isCalculating: false,
  };
}

export default function PortfolioGlanceCard({
  address,
  totalValue,
  breakdown,
  costBasis,
  className = '',
}: PortfolioGlanceCardProps) {
  const [showPerformanceTooltip, setShowPerformanceTooltip] = useState(false);

  // Get portfolio changes from history
  const changes = useMemo<PortfolioChanges>(() => {
    return calculatePortfolioChanges(address, totalValue);
  }, [address, totalValue]);

  // Get sparkline values
  const sparklineValues = useMemo(() => {
    return getSparklineValues(address, 24);
  }, [address]);

  // Calculate PnL if cost basis is available
  const pnl = useMemo(() => {
    if (!costBasis) return null;

    const tokenPnL = costBasis.tokens !== null ? breakdown.gunValue - costBasis.tokens : null;
    const nftPnL = costBasis.nfts !== null ? breakdown.nftValue - costBasis.nfts : null;
    const totalPnL = costBasis.total !== null ? totalValue - costBasis.total : null;

    return { tokens: tokenPnL, nfts: nftPnL, total: totalPnL };
  }, [breakdown, totalValue, costBasis]);

  // Composition bar segments
  const compositionSegments = useMemo(() => {
    const segments = [];

    if (breakdown.gunValue > 0) {
      segments.push({
        id: 'gun',
        label: 'GUN',
        value: breakdown.gunValue,
        color: '#64ffff',
      });
    }

    if (breakdown.nftValue > 0 || breakdown.nftCount > 0) {
      segments.push({
        id: 'nfts',
        label: 'NFTs',
        value: breakdown.nftValue,
        color: '#96aaff',
        isUnpriced: breakdown.nftValue === 0 && breakdown.nftCount > 0,
        count: breakdown.nftCount,
      });
    }

    if (breakdown.otherValue > 0) {
      segments.push({
        id: 'other',
        label: 'Other',
        value: breakdown.otherValue,
        color: '#fbbf24',
      });
    }

    return segments;
  }, [breakdown]);

  // Format changes
  const change24h = formatChange(changes.change24h);
  const changePercent24h = formatChange(changes.changePercent24h, true);
  const change7d = formatChange(changes.change7d);
  const changePercent7d = formatChange(changes.changePercent7d, true);

  const isCalculating = change24h.isCalculating || change7d.isCalculating;

  return (
    <div className={`bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-2xl p-5 ${className}`}>
      {/* Top row: Eyebrow + Sparkline aligned */}
      <div className="flex items-start justify-between gap-4 mb-1">
        {/* Eyebrow label */}
        <span className="text-[11px] tracking-[0.12em] uppercase text-white/50 font-medium">
          Portfolio Value
        </span>
        {/* Sparkline - muted, aligned to hero baseline */}
        <div className="flex-shrink-0 opacity-80">
          <Sparkline
            values={sparklineValues.length > 0 ? sparklineValues : [totalValue, totalValue]}
            width={90}
            height={36}
            strokeWidth={1.25}
            showFill={true}
            showCurrentDot={true}
          />
        </div>
      </div>

      {/* Hero number */}
      <div className="text-[40px] leading-[1.05] font-semibold text-white tracking-tight mb-4 md:text-[40px] max-md:text-[34px]">
        ${formatUSD(totalValue)}
      </div>

      {/* Performance section */}
      <div className="border-t border-white/10 pt-3 mt-3">
        {/* Performance eyebrow with tooltip */}
        <div className="flex items-center gap-1.5 mb-2 relative">
          <span className="text-[11px] tracking-[0.12em] uppercase text-white/50 font-medium">
            Performance
          </span>
          {isCalculating && (
            <button
              className="relative"
              onMouseEnter={() => setShowPerformanceTooltip(true)}
              onMouseLeave={() => setShowPerformanceTooltip(false)}
              aria-label="Performance info"
            >
              <svg className="w-3 h-3 text-white/30 hover:text-white/50 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {showPerformanceTooltip && (
                <div className="absolute left-0 top-full mt-1 z-50 w-48 bg-black/95 border border-white/20 rounded-lg px-3 py-2 text-[11px] text-white/70 shadow-xl">
                  Change metrics appear after enough history is collected.
                </div>
              )}
            </button>
          )}
        </div>

        {/* Performance metrics - two columns */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[12px] text-white/55">24h:</span>
            {change24h.isCalculating ? (
              <span className="text-[13px] font-medium text-white/40 italic">{change24h.text}</span>
            ) : (
              <>
                <span className={`text-[13px] font-medium ${change24h.colorClass}`}>{change24h.text}</span>
                <span className={`text-[11px] ${changePercent24h.colorClass}`}>({changePercent24h.text})</span>
              </>
            )}
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[12px] text-white/55">7d:</span>
            {change7d.isCalculating ? (
              <span className="text-[13px] font-medium text-white/40 italic">{change7d.text}</span>
            ) : (
              <>
                <span className={`text-[13px] font-medium ${change7d.colorClass}`}>{change7d.text}</span>
                <span className={`text-[11px] ${changePercent7d.colorClass}`}>({changePercent7d.text})</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Cost Basis & PnL section */}
      {costBasis && (
        <div className="border-t border-white/10 pt-3 mt-3">
          <span className="text-[11px] tracking-[0.12em] uppercase text-white/50 font-medium mb-2 block">
            Cost Basis & P/L
          </span>
          <div className="grid grid-cols-3 gap-3">
            {/* Tokens */}
            <div>
              <div className="text-[12px] text-white/55 mb-0.5">Tokens</div>
              <div className="text-[13px] font-medium text-white/85">
                {costBasis.tokens !== null ? `$${formatUSD(costBasis.tokens)}` : '—'}
              </div>
              {pnl && pnl.tokens !== null && (
                <div className={`text-[12px] ${pnl.tokens >= 0 ? 'text-[#beffd2]' : 'text-[#ff6b6b]'}`}>
                  {pnl.tokens >= 0 ? '+' : ''}{formatUSD(pnl.tokens)}
                </div>
              )}
            </div>

            {/* NFTs */}
            <div>
              <div className="text-[12px] text-white/55 mb-0.5">NFTs</div>
              <div className="text-[13px] font-medium text-white/85">
                {costBasis.nfts !== null ? `$${formatUSD(costBasis.nfts)}` : '—'}
              </div>
              {pnl && pnl.nfts !== null && (
                <div className={`text-[12px] ${pnl.nfts >= 0 ? 'text-[#beffd2]' : 'text-[#ff6b6b]'}`}>
                  {pnl.nfts >= 0 ? '+' : ''}{formatUSD(pnl.nfts)}
                </div>
              )}
            </div>

            {/* Total */}
            <div>
              <div className="text-[12px] text-white/55 mb-0.5">Total</div>
              <div className="text-[13px] font-medium text-white/85">
                {costBasis.total !== null ? `$${formatUSD(costBasis.total)}` : '—'}
              </div>
              {pnl && pnl.total !== null && (
                <div className={`text-[12px] font-medium ${pnl.total >= 0 ? 'text-[#beffd2]' : 'text-[#ff6b6b]'}`}>
                  {pnl.total >= 0 ? '+' : ''}{formatUSD(pnl.total)}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Composition section */}
      <div className="border-t border-white/10 pt-3 mt-3">
        <span className="text-[11px] tracking-[0.12em] uppercase text-white/50 font-medium mb-2 block">
          Composition
        </span>
        <CompositionBar
          segments={compositionSegments}
          height={6}
          showInlineLabels={true}
        />
      </div>

      {/* Status line - tertiary helper text */}
      {!changes.hasEnoughData && (
        <div className="mt-2 text-[12px] text-white/40 flex items-center gap-1.5">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Collecting history data…</span>
        </div>
      )}
    </div>
  );
}
