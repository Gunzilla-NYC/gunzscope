'use client';

import { useState } from 'react';
import { TokenBalance as TokenBalanceType } from '@/lib/types';
import Image from 'next/image';

interface HoldingsSectionProps {
  gunzBalance: TokenBalanceType | null;
  solanaBalance: TokenBalanceType | null;
  gunPrice?: number;
  nftCount: number;
  nftValue?: number;
}

export default function HoldingsSection({
  gunzBalance,
  solanaBalance,
  gunPrice,
  nftCount,
  nftValue,
}: HoldingsSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showEmptyChains, setShowEmptyChains] = useState(false);

  // Calculate values
  const gunzValue = gunzBalance && gunPrice ? gunzBalance.balance * gunPrice : 0;
  const solanaValue = solanaBalance && gunPrice ? solanaBalance.balance * gunPrice : 0;
  const hasGunzHoldings = gunzBalance && gunzBalance.balance > 0;
  const hasSolanaHoldings = solanaBalance && solanaBalance.balance > 0;

  // Format currency
  const formatUsd = (value: number) => {
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Format balance
  const formatBalance = (balance: number) => {
    return balance.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    });
  };

  return (
    <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
      {/* Collapsed Header / Summary Row */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#64ffff]/50 focus-visible:ring-inset"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-3">
          {/* Holdings icon */}
          <div className="w-8 h-8 rounded-lg bg-[#64ffff]/10 border border-[#64ffff]/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-[#64ffff]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-left">
            <span className="text-[11px] tracking-[0.12em] uppercase text-white/50 font-medium block">
              Holdings
            </span>
            {/* Compact summary */}
            <div className="flex items-center gap-3 text-[13px]">
              {hasGunzHoldings && (
                <span className="text-white/85">
                  <span className="text-[#beffd2] font-medium">GUNZ:</span>{' '}
                  {formatBalance(gunzBalance.balance)} GUN
                  {gunzValue > 0 && (
                    <span className="text-white/50 ml-1">• ${formatUsd(gunzValue)}</span>
                  )}
                </span>
              )}
              {!hasGunzHoldings && !hasSolanaHoldings && (
                <span className="text-white/40 italic">No token holdings</span>
              )}
            </div>
          </div>
        </div>

        {/* Expand/Collapse chevron */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-white/40">
            {isExpanded ? 'Hide' : 'View'} details
          </span>
          <svg
            className={`w-4 h-4 text-white/40 transition-transform duration-200 ${
              isExpanded ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-white/5">
          {/* Chains Section */}
          <div className="p-4 space-y-4">
            {/* GUNZ Chain */}
            {hasGunzHoldings && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] tracking-[0.15em] uppercase text-white/40 font-medium">
                    GUNZ Chain
                  </span>
                  <div className="flex-1 h-px bg-white/5" />
                </div>
                {/* Token Row */}
                <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                  <div className="flex items-center gap-3">
                    <Image
                      src="/gun-logo.svg"
                      alt="GUN"
                      width={20}
                      height={20}
                      className="opacity-80"
                    />
                    <div>
                      <span className="text-[13px] font-medium text-white/90">GUN</span>
                      <span className="text-[11px] text-white/40 ml-2">GUN Token</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[13px] font-medium text-white/90">
                      {formatBalance(gunzBalance!.balance)}
                    </p>
                    {gunzValue > 0 && (
                      <p className="text-[11px] text-[#beffd2]">
                        ${formatUsd(gunzValue)}
                      </p>
                    )}
                  </div>
                </div>
                {/* Price info */}
                {gunPrice && (
                  <p className="text-[10px] text-white/30 pl-3">
                    Price: ${gunPrice.toFixed(6)} per GUN
                  </p>
                )}
              </div>
            )}

            {/* Solana Chain - only if has holdings OR showEmptyChains is enabled */}
            {(hasSolanaHoldings || showEmptyChains) && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] tracking-[0.15em] uppercase text-white/40 font-medium">
                    Solana
                  </span>
                  <div className="flex-1 h-px bg-white/5" />
                </div>
                {hasSolanaHoldings ? (
                  <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#9945FF] to-[#14F195] flex items-center justify-center">
                        <span className="text-[8px] font-bold text-white">S</span>
                      </div>
                      <div>
                        <span className="text-[13px] font-medium text-white/90">GUN</span>
                        <span className="text-[11px] text-white/40 ml-2">on Solana</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[13px] font-medium text-white/90">
                        {formatBalance(solanaBalance!.balance)}
                      </p>
                      {solanaValue > 0 && (
                        <p className="text-[11px] text-[#beffd2]">
                          ${formatUsd(solanaValue)}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-white/30 italic pl-3 py-2">
                    No holdings on Solana
                  </p>
                )}
              </div>
            )}

            {/* Empty chains toggle */}
            <div className="flex items-center justify-end pt-2 border-t border-white/5">
              <label className="flex items-center gap-2 cursor-pointer group">
                <span className="text-[10px] text-white/40 group-hover:text-white/50 transition-colors">
                  Show empty chains
                </span>
                <button
                  role="switch"
                  aria-checked={showEmptyChains}
                  onClick={() => setShowEmptyChains(!showEmptyChains)}
                  className={`relative w-8 h-4 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#64ffff]/50 ${
                    showEmptyChains ? 'bg-[#64ffff]/30' : 'bg-white/10'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-3 h-3 rounded-full transition-all ${
                      showEmptyChains
                        ? 'left-4.5 bg-[#64ffff]'
                        : 'left-0.5 bg-white/40'
                    }`}
                    style={{
                      left: showEmptyChains ? '17px' : '2px',
                    }}
                  />
                </button>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
