'use client';

import { useState } from 'react';

interface UnlockBannerProps {
  onConnect: () => void;
  searchCount?: number;
}

const FEATURES = [
  'Save tracked wallets permanently',
  'Combine up to 5 wallets in one view',
  'Get your leaderboard ranking',
  'Access full P&L enrichment history',
];

export default function UnlockBanner({ onConnect, searchCount }: UnlockBannerProps) {
  const [showTrust, setShowTrust] = useState(false);

  return (
    <div className="bg-[var(--gs-dark-2)] border border-white/[0.06] border-l-2 border-l-[var(--gs-lime)] overflow-hidden clip-corner">
      <div className="p-5 sm:p-6">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <svg
            className="size-4 text-[var(--gs-lime)]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
            />
          </svg>
          <span className="font-display text-sm uppercase tracking-widest text-[var(--gs-lime)]">
            Unlock Full Access
          </span>
        </div>

        {/* Contextual message */}
        {searchCount !== undefined && searchCount > 0 && (
          <p className="font-body text-sm text-[var(--gs-gray-4)] mb-3">
            You&apos;ve explored {searchCount} portfolio{searchCount !== 1 ? 's' : ''} this session.
            Connect your wallet to keep going.
          </p>
        )}

        {/* Feature list + CTA */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <ul className="flex flex-wrap gap-x-5 gap-y-1.5">
            {FEATURES.map((feature) => (
              <li
                key={feature}
                className="flex items-center gap-1.5 font-mono text-xs text-[var(--gs-gray-4)]"
              >
                <span className="text-[var(--gs-lime)] text-caption" aria-hidden="true">
                  &#9670;
                </span>
                {feature}
              </li>
            ))}
          </ul>

          <button
            onClick={onConnect}
            className="font-display font-semibold text-sm uppercase px-6 py-2.5 bg-[var(--gs-lime)] text-[var(--gs-black)] hover:bg-[var(--gs-lime-hover)] transition-colors shrink-0 clip-corner-sm"
          >
            Connect Wallet
          </button>
        </div>

        {/* Trust / reassurance toggle */}
        <div className="mt-3 pt-3 border-t border-white/[0.04]">
          <button
            onClick={() => setShowTrust(prev => !prev)}
            className="flex items-center gap-1.5 font-mono text-caption text-[var(--gs-gray-3)] hover:text-[var(--gs-white)] transition-colors cursor-pointer"
          >
            <svg
              className={`w-3 h-3 transition-transform ${showTrust ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            What happens when I connect?
          </button>
          {showTrust && (
            <p className="font-body text-xs text-[var(--gs-gray-3)] mt-2 ml-4.5 max-w-lg leading-relaxed">
              We use Dynamic to connect your wallet read&#8209;only. We never request transaction signing or access to your funds. Your wallet address is only used to look up public blockchain data.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
