'use client';

interface UnlockBannerProps {
  onConnect: () => void;
}

const FEATURES = [
  'Save & track wallets over time',
  'Access the Leaderboard rankings',
  'Track up to 5 wallets in one view',
  'Full P&L enrichment on all NFTs',
];

export default function UnlockBanner({ onConnect }: UnlockBannerProps) {
  return (
    <div className="bg-[var(--gs-dark-2)] border border-white/[0.06] border-l-2 border-l-[var(--gs-lime)] p-5 sm:p-6">
      {/* Search input — styled as button, triggers connect */}
      <div className="relative mb-5">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[var(--gs-gray-3)]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <button
          type="button"
          onClick={onConnect}
          className="w-full text-left pl-9 pr-24 py-2.5 text-sm bg-[var(--gs-dark-1)] border border-white/[0.06] rounded-lg text-[var(--gs-gray-3)] font-mono cursor-pointer hover:border-[var(--gs-lime)]/30 transition"
        >
          Connect wallet to search more...
        </button>
        <span className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1 bg-[var(--gs-lime)]/20 text-[var(--gs-lime)] text-xs font-medium rounded pointer-events-none">
          Connect
        </span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
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

      {/* Feature list + CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <ul className="flex flex-wrap gap-x-5 gap-y-1.5">
          {FEATURES.map((feature) => (
            <li
              key={feature}
              className="flex items-center gap-1.5 font-mono text-xs text-[var(--gs-gray-4)]"
            >
              <span className="text-[var(--gs-lime)] text-[10px]" aria-hidden="true">
                &#9670;
              </span>
              {feature}
            </li>
          ))}
        </ul>

        <button
          onClick={onConnect}
          className="font-display font-semibold text-sm uppercase px-6 py-2.5 bg-[var(--gs-lime)] text-[var(--gs-black)] hover:bg-[var(--gs-lime-hover)] transition-colors shrink-0"
        >
          Connect Wallet
        </button>
      </div>
    </div>
  );
}
