'use client';

import { useState, useEffect } from 'react';
import { PortfolioCalcResult, formatUsd, formatPct } from '@/lib/portfolio/calcPortfolio';

interface DebugPanelProps {
  portfolioResult: PortfolioCalcResult | null;
  walletAddress: string | null;
  gunPrice: number | undefined;
  isVisible: boolean;
}

export default function DebugPanel({
  portfolioResult,
  walletAddress,
  gunPrice,
  isVisible,
}: DebugPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Log warning to console if invariants fail
  useEffect(() => {
    if (portfolioResult && !portfolioResult.invariants.ok) {
      console.warn('[Portfolio Debug] Invariants FAILED:', {
        warnings: portfolioResult.invariants.warnings,
        totalUsd: portfolioResult.totalUsd,
        sumSectionsUsd: portfolioResult.invariants.sumSectionsUsd,
        pctSum: portfolioResult.invariants.pctSum,
      });
    }
  }, [portfolioResult]);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono transition-all ${
          portfolioResult?.invariants.ok === false
            ? 'bg-red-500/20 border border-red-500/50 text-red-400'
            : 'bg-amber-500/20 border border-amber-500/50 text-amber-400'
        }`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
        <span>Debug</span>
        {portfolioResult?.invariants.ok === false && (
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        )}
        <svg
          className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded Panel */}
      {isExpanded && (
        <div className="mt-2 w-80 max-h-[60vh] overflow-auto bg-[#0d0d0d] border border-amber-500/30 rounded-lg shadow-xl">
          {/* Header */}
          <div className="sticky top-0 bg-[#0d0d0d] px-3 py-2 border-b border-amber-500/20">
            <div className="flex items-center justify-between">
              <span className="text-amber-400 font-semibold text-xs uppercase tracking-wider">
                Portfolio Debug
              </span>
              <span className={`text-caption px-2 py-0.5 rounded ${
                portfolioResult?.invariants.ok
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-red-500/20 text-red-400'
              }`}>
                {portfolioResult?.invariants.ok ? 'OK' : 'FAIL'}
              </span>
            </div>
          </div>

          <div className="p-3 space-y-3 text-xs font-mono">
            {/* Wallet Info */}
            <div className="space-y-1">
              <div className="text-amber-400/70 text-caption uppercase">Wallet</div>
              <div className="text-white/80 break-all">
                {walletAddress || '(none)'}
              </div>
            </div>

            {/* GUN Price */}
            <div className="space-y-1">
              <div className="text-amber-400/70 text-caption uppercase">GUN Price</div>
              <div className="text-white/80">
                {gunPrice !== undefined ? `$${gunPrice.toFixed(6)}` : '(unavailable)'}
              </div>
            </div>

            {portfolioResult && (
              <>
                {/* Summary */}
                <div className="border-t border-amber-500/20 pt-3 space-y-2">
                  <div className="text-amber-400/70 text-caption uppercase">Summary</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-white/50 text-caption">Total USD</div>
                      <div className="text-white font-semibold">${formatUsd(portfolioResult.totalUsd)}</div>
                    </div>
                    <div>
                      <div className="text-white/50 text-caption">Tokens USD</div>
                      <div className="text-cyan-400">${formatUsd(portfolioResult.tokensUsd)}</div>
                    </div>
                    <div>
                      <div className="text-white/50 text-caption">NFTs USD</div>
                      <div className={portfolioResult.nftUsdReliable ? 'text-purple-400' : 'text-gray-500'}>
                        ${formatUsd(portfolioResult.nftsUsd)}
                        {!portfolioResult.nftUsdReliable && ' (unreliable)'}
                      </div>
                    </div>
                    <div>
                      <div className="text-white/50 text-caption">NFT Reliable</div>
                      <div className={portfolioResult.nftUsdReliable ? 'text-green-400' : 'text-red-400'}>
                        {portfolioResult.nftUsdReliable ? 'true' : 'false'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Balances */}
                <div className="border-t border-amber-500/20 pt-3 space-y-2">
                  <div className="text-amber-400/70 text-caption uppercase">Balances</div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-white/50">Total GUN</span>
                      <span className="text-white">{portfolioResult.totalGunBalance.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/50">GUNZ Chain</span>
                      <span className="text-white/70">{portfolioResult.avalancheGunBalance.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/50">Solana</span>
                      <span className="text-white/70">{portfolioResult.solanaGunBalance.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/50">NFT Count</span>
                      <span className="text-white/70">{portfolioResult.nftCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/50">NFTs w/ Price</span>
                      <span className="text-green-400/70">{portfolioResult.nftsWithPrice}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/50">NFTs w/o Price</span>
                      <span className="text-red-400/70">{portfolioResult.nftsWithoutPrice}</span>
                    </div>
                  </div>
                </div>

                {/* Breakdown Table */}
                {portfolioResult.breakdown.length > 0 && (
                  <div className="border-t border-amber-500/20 pt-3 space-y-2">
                    <div className="text-amber-400/70 text-caption uppercase">Breakdown</div>
                    <table className="w-full text-caption">
                      <thead>
                        <tr className="text-white/40">
                          <th className="text-left pb-1">Section</th>
                          <th className="text-right pb-1">USD</th>
                          <th className="text-right pb-1">%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {portfolioResult.breakdown.map((item) => (
                          <tr key={item.key} className="text-white/80">
                            <td className="py-0.5">{item.label}</td>
                            <td className="text-right">${formatUsd(item.usd)}</td>
                            <td className="text-right">{formatPct(item.pct)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="text-white border-t border-white/10">
                          <td className="pt-1 font-semibold">Total</td>
                          <td className="text-right pt-1">${formatUsd(portfolioResult.invariants.sumSectionsUsd)}</td>
                          <td className="text-right pt-1">{formatPct(portfolioResult.invariants.pctSum)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}

                {/* Invariants */}
                <div className="border-t border-amber-500/20 pt-3 space-y-2">
                  <div className="text-amber-400/70 text-caption uppercase">Invariants</div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-white/50">Status</span>
                      <span className={portfolioResult.invariants.ok ? 'text-green-400' : 'text-red-400'}>
                        {portfolioResult.invariants.ok ? 'PASS' : 'FAIL'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/50">Sum Sections</span>
                      <span className="text-white/70">${formatUsd(portfolioResult.invariants.sumSectionsUsd)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/50">Pct Sum</span>
                      <span className="text-white/70">{formatPct(portfolioResult.invariants.pctSum)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/50">Tolerance</span>
                      <span className="text-white/70">${portfolioResult.invariants.toleranceUsd}</span>
                    </div>
                  </div>
                </div>

                {/* Warnings */}
                {portfolioResult.invariants.warnings.length > 0 && (
                  <div className="border-t border-red-500/20 pt-3 space-y-2">
                    <div className="text-red-400/70 text-caption uppercase">Warnings ({portfolioResult.invariants.warnings.length})</div>
                    <div className="space-y-1">
                      {portfolioResult.invariants.warnings.map((warning, i) => (
                        <div key={i} className="text-red-300/80 text-caption leading-tight">
                          {warning}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {!portfolioResult && (
              <div className="text-white/40 text-center py-4">
                No portfolio data loaded
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
