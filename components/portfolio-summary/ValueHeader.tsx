'use client';

import { useState, useMemo, useCallback } from 'react';
import { EnrichmentProgress } from '@/lib/types';
import { PortfolioCalcResult, formatUsd } from '@/lib/portfolio/calcPortfolio';
import ConfidenceIndicator from '@/components/ui/ConfidenceIndicator';
import { PortfolioViewMode, ChangeDisplay } from './types';

// SVG viewBox dimensions for the backdrop sparkline
const SVG_W = 800;
const SVG_H = 120;

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
  sparklineSpanDays: number;
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
  showNftOverlay: boolean;
  nftSparklineValues: number[];
  showGunOverlay: boolean;
  gunSparklineValues: number[];
}

// ────────────────────────────────────────────────────────────
// Monotone cubic Hermite interpolation (Fritsch-Carlson method)
// Produces smooth curves that never overshoot — same algorithm
// used by visx curveMonotoneX / d3-shape curveMonotoneX.
// ────────────────────────────────────────────────────────────
function monotoneCubicPath(points: { x: number; y: number }[]): string {
  const n = points.length;
  if (n < 2) return '';
  if (n === 2) return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)} L ${points[1].x.toFixed(1)} ${points[1].y.toFixed(1)}`;

  // Slopes between adjacent points
  const dxs: number[] = [];
  const dys: number[] = [];
  const deltas: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const dx = points[i + 1].x - points[i].x;
    const dy = points[i + 1].y - points[i].y;
    dxs.push(dx);
    dys.push(dy);
    deltas.push(dx === 0 ? 0 : dy / dx);
  }

  // Tangents (monotone Fritsch-Carlson)
  const tangents: number[] = [deltas[0]];
  for (let i = 1; i < n - 1; i++) {
    if (deltas[i - 1] * deltas[i] <= 0) {
      tangents.push(0);
    } else {
      tangents.push((deltas[i - 1] + deltas[i]) / 2);
    }
  }
  tangents.push(deltas[n - 2]);

  // Enforce monotonicity — clamp alpha/beta to the 3-circle
  for (let i = 0; i < n - 1; i++) {
    if (Math.abs(deltas[i]) < 1e-12) {
      tangents[i] = 0;
      tangents[i + 1] = 0;
    } else {
      const alpha = tangents[i] / deltas[i];
      const beta = tangents[i + 1] / deltas[i];
      const s = alpha * alpha + beta * beta;
      if (s > 9) {
        const t = 3 / Math.sqrt(s);
        tangents[i] = t * alpha * deltas[i];
        tangents[i + 1] = t * beta * deltas[i];
      }
    }
  }

  // Build cubic bezier path
  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const seg = dxs[i] / 3;
    const cp1x = points[i].x + seg;
    const cp1y = points[i].y + tangents[i] * seg;
    const cp2x = points[i + 1].x - seg;
    const cp2y = points[i + 1].y - tangents[i + 1] * seg;
    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${points[i + 1].x.toFixed(1)} ${points[i + 1].y.toFixed(1)}`;
  }
  return d;
}

/** Compute smooth SVG sparkline path using monotone cubic interpolation */
function computeSparklinePath(
  values: number[],
  w: number,
  h: number,
  globalMin: number,
  globalMax: number,
): { path: string; fillPath: string; points: { x: number; y: number }[] } {
  if (values.length < 2) return { path: '', fillPath: '', points: [] };

  const range = globalMax - globalMin || 1;
  const points = values.map((v, i) => ({
    x: (i / (values.length - 1)) * w,
    y: h - ((v - globalMin) / range) * h,
  }));

  const path = monotoneCubicPath(points);
  const fillPath = `${path} L ${points[points.length - 1].x.toFixed(1)} ${h} L 0 ${h} Z`;

  return { path, fillPath, points };
}

export function ValueHeader({
  viewMode, isInitializing, topExpanded, onToggleTop,
  animatedTotal, confidence, walletAddress,
  change24h, changePercent24h, change7d, changePercent7d,
  sparklineValues, sparklineSpanDays, totalValue,
  gunHoldings, gunValue, nftCount, nftFloorValueUsd, totalGunSpent, gunPct, nftPct,
  isEnriching, enrichmentProgress, isEnrichmentComplete, hasFailures, progressPct,
  totalPnLPct, isProfit, isLoss, onToggleViewMode,
  showNftOverlay, nftSparklineValues,
  showGunOverlay, gunSparklineValues,
}: ValueHeaderProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const hasSparkline = sparklineValues.length >= 2 && !isInitializing;

  // Determine trend color from sparkline direction
  const trend = hasSparkline
    ? sparklineValues[sparklineValues.length - 1] >= sparklineValues[0] ? 'up' : 'down'
    : 'up';
  const color = trend === 'up' ? 'var(--gs-lime)' : 'var(--gs-loss)';
  const nftColor = 'var(--gs-purple)';
  const gunColor = 'var(--gs-lime)';

  // Compute shared scale across all active sparklines
  const allValues = useMemo(() => {
    if (!hasSparkline) return sparklineValues;
    const combined = [...sparklineValues];
    if (showNftOverlay && nftSparklineValues.length >= 2) combined.push(...nftSparklineValues);
    if (showGunOverlay && gunSparklineValues.length >= 2) combined.push(...gunSparklineValues);
    return combined;
  }, [hasSparkline, sparklineValues, nftSparklineValues, gunSparklineValues, showNftOverlay, showGunOverlay]);

  const globalMin = useMemo(() => Math.min(...(allValues.length > 0 ? allValues : [0])), [allValues]);
  const globalMax = useMemo(() => Math.max(...(allValues.length > 0 ? allValues : [1])), [allValues]);

  // Total portfolio sparkline path (smooth curve)
  const main = useMemo(
    () => computeSparklinePath(sparklineValues, SVG_W, SVG_H, globalMin, globalMax),
    [sparklineValues, globalMin, globalMax],
  );

  // NFT overlay sparkline path
  const nft = useMemo(() => {
    if (!showNftOverlay || nftSparklineValues.length < 2)
      return { path: '', fillPath: '', points: [] as { x: number; y: number }[] };
    return computeSparklinePath(nftSparklineValues, SVG_W, SVG_H, globalMin, globalMax);
  }, [nftSparklineValues, showNftOverlay, globalMin, globalMax]);

  // GUN overlay sparkline path
  const gun = useMemo(() => {
    if (!showGunOverlay || gunSparklineValues.length < 2)
      return { path: '', fillPath: '', points: [] as { x: number; y: number }[] };
    return computeSparklinePath(gunSparklineValues, SVG_W, SVG_H, globalMin, globalMax);
  }, [gunSparklineValues, showGunOverlay, globalMin, globalMax]);

  // Hover handlers
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!hasSparkline || topExpanded) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const pct = (e.clientX - rect.left) / rect.width;
      const idx = Math.round(pct * (sparklineValues.length - 1));
      setHoverIndex(Math.max(0, Math.min(sparklineValues.length - 1, idx)));
    },
    [hasSparkline, sparklineValues.length, topExpanded],
  );

  const handleMouseLeave = useCallback(() => setHoverIndex(null), []);

  // Hover-derived values
  const hoverPoint = hoverIndex !== null ? main.points[hoverIndex] ?? null : null;
  const hoverValue = hoverIndex !== null ? sparklineValues[hoverIndex] ?? null : null;
  const hoverNftPoint = hoverIndex !== null && showNftOverlay ? nft.points[hoverIndex] ?? null : null;
  const hoverNftValue = hoverIndex !== null && showNftOverlay ? nftSparklineValues[hoverIndex] ?? null : null;
  const hoverGunPoint = hoverIndex !== null && showGunOverlay ? gun.points[hoverIndex] ?? null : null;
  const hoverGunValue = hoverIndex !== null && showGunOverlay ? gunSparklineValues[hoverIndex] ?? null : null;

  return (
    <div
      className={`relative overflow-hidden ${viewMode === 'detailed' && !isInitializing ? 'cursor-pointer' : ''}`}
      onClick={viewMode === 'detailed' && !isInitializing ? onToggleTop : undefined}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Ambient sparkline backdrop */}
      {hasSparkline && (
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="portfolio-sparkline-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity="0.12" />
              <stop offset="70%" stopColor={color} stopOpacity="0.03" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
            {showNftOverlay && nft.path && (
              <linearGradient id="portfolio-nft-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={nftColor} stopOpacity="0.10" />
                <stop offset="70%" stopColor={nftColor} stopOpacity="0.02" />
                <stop offset="100%" stopColor={nftColor} stopOpacity="0" />
              </linearGradient>
            )}
            {showGunOverlay && gun.path && (
              <linearGradient id="portfolio-gun-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={gunColor} stopOpacity="0.08" />
                <stop offset="70%" stopColor={gunColor} stopOpacity="0.02" />
                <stop offset="100%" stopColor={gunColor} stopOpacity="0" />
              </linearGradient>
            )}
          </defs>

          {/* Total portfolio fill + line */}
          <path d={main.fillPath} fill="url(#portfolio-sparkline-grad)" />
          <path d={main.path} fill="none" stroke={color} strokeWidth="2" strokeOpacity="0.15" strokeLinecap="round" strokeLinejoin="round" />

          {/* GUN overlay fill + line */}
          {showGunOverlay && gun.path && (
            <>
              <path d={gun.fillPath} fill="url(#portfolio-gun-grad)" />
              <path d={gun.path} fill="none" stroke={gunColor} strokeWidth="1.5" strokeOpacity="0.20" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 3" />
            </>
          )}

          {/* NFT overlay fill + line */}
          {showNftOverlay && nft.path && (
            <>
              <path d={nft.fillPath} fill="url(#portfolio-nft-grad)" />
              <path d={nft.path} fill="none" stroke={nftColor} strokeWidth="1.5" strokeOpacity="0.25" strokeLinecap="round" strokeLinejoin="round" />
            </>
          )}

          {/* Hover dots */}
          {hoverPoint && !topExpanded && (
            <circle cx={hoverPoint.x} cy={hoverPoint.y} r="3" fill="white" opacity="0.7" />
          )}
          {hoverGunPoint && !topExpanded && (
            <circle cx={hoverGunPoint.x} cy={hoverGunPoint.y} r="2.5" fill={gunColor} opacity="0.7" />
          )}
          {hoverNftPoint && !topExpanded && (
            <circle cx={hoverNftPoint.x} cy={hoverNftPoint.y} r="2.5" fill={nftColor} opacity="0.8" />
          )}
        </svg>
      )}

      {/* Hover tooltip: price + date following cursor */}
      {hasSparkline && hoverPoint && hoverValue !== null && hoverIndex !== null && !topExpanded && (
        <div
          className="absolute z-20 pointer-events-none flex flex-col items-center"
          style={{
            left: `${(hoverPoint.x / SVG_W) * 100}%`,
            bottom: '6px',
            transform: 'translateX(-50%)',
          }}
        >
          <span className="font-mono text-micro tabular-nums text-[var(--gs-gray-4)]">
            ${hoverValue.toFixed(2)}
          </span>
          {showGunOverlay && hoverGunValue !== null && (
            <span className="font-mono text-micro tabular-nums text-[var(--gs-lime)]">
              ${hoverGunValue.toFixed(2)}
            </span>
          )}
          {showNftOverlay && hoverNftValue !== null && (
            <span className="font-mono text-micro tabular-nums text-[var(--gs-purple)]">
              ${hoverNftValue.toFixed(2)}
            </span>
          )}
          <span className="font-mono text-micro tabular-nums text-[var(--gs-gray-2)]">
            {(() => {
              const span = sparklineSpanDays || 7;
              const daysAgo = Math.round((1 - hoverIndex / (sparklineValues.length - 1)) * span);
              if (daysAgo === 0) return 'Now';
              if (daysAgo >= 30) return `${Math.round(daysAgo / 30)}mo ago`;
              return `${daysAgo}d ago`;
            })()}
          </span>
        </div>
      )}

      {/* Content layer */}
      <div className="relative z-10 p-6 pb-4">
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

              {/* Right column: View toggle + P&L Badge */}
              <div className="flex items-center gap-2">
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
    </div>
  );
}
