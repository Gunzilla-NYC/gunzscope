'use client';

import { useState, useEffect } from 'react';
import { truncateAddress } from './utils';

interface LeaderboardEntry {
  userProfileId: string;
  displayName: string | null;
  totalViews: number;
  shareCount: number;
}

interface TopPortfolioEntry {
  address: string;
  totalViews: number;
  shareCount: number;
}

type LeaderboardTabMode = 'views' | 'shares' | 'portfolios';

export function ShareLeaderboard({ adminSecret }: { adminSecret: string }) {
  const [byViews, setByViews] = useState<LeaderboardEntry[]>([]);
  const [byShares, setByShares] = useState<LeaderboardEntry[]>([]);
  const [topPortfolios, setTopPortfolios] = useState<TopPortfolioEntry[]>([]);
  const [tab, setTab] = useState<LeaderboardTabMode>('views');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const res = await fetch('/api/admin/shares', {
          headers: { Authorization: `Bearer ${adminSecret}` },
        });
        const data = await res.json();
        if (data.success) {
          setByViews(data.byViews ?? []);
          setByShares(data.byShares ?? []);
          setTopPortfolios(data.topPortfolios ?? []);
        }
      } catch {
        // Silently fail
      } finally {
        setIsLoading(false);
      }
    }
    fetchLeaderboard();
  }, [adminSecret]);

  const tabConfig: { key: LeaderboardTabMode; label: string; color: string }[] = [
    { key: 'views', label: 'Views', color: 'var(--gs-lime)' },
    { key: 'shares', label: 'Shares', color: 'var(--gs-purple)' },
    { key: 'portfolios', label: 'Portfolios', color: 'var(--gs-warning)' },
  ];

  const rankColor = (i: number) =>
    i === 0 ? 'text-[var(--gs-lime)]' : i === 1 ? 'text-[var(--gs-purple)]' : i === 2 ? 'text-[var(--gs-warning)]' : 'text-[var(--gs-gray-3)]';

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* ── Toolbar ── */}
      <div className="shrink-0 pb-3 mb-3 border-b border-white/[0.06]">
        <div className="flex gap-1">
          {tabConfig.map(({ key, label, color }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`font-mono text-caption uppercase tracking-wider px-2.5 py-1.5 border transition-colors cursor-pointer ${
                tab === key ? '' : 'border-white/[0.08] text-[var(--gs-gray-3)] hover:bg-white/[0.04]'
              }`}
              style={tab === key ? {
                borderColor: `color-mix(in srgb, ${color} 30%, transparent)`,
                color,
                backgroundColor: `color-mix(in srgb, ${color} 10%, transparent)`,
              } : undefined}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── List ── */}
      {isLoading ? (
        <p className="font-mono text-caption text-[var(--gs-gray-3)] py-4 text-center">Loading&hellip;</p>
      ) : tab === 'portfolios' ? (
        topPortfolios.length === 0 ? (
          <p className="font-mono text-caption text-[var(--gs-gray-3)] py-4 text-center">No shares yet</p>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {topPortfolios.map((entry, i) => (
              <div key={entry.address} className="flex items-center justify-between py-2 border-b border-white/[0.06] last:border-b-0">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`font-mono text-sm font-bold tabular-nums w-6 text-right shrink-0 ${rankColor(i)}`}>
                    #{i + 1}
                  </span>
                  <a
                    href={`/portfolio?address=${entry.address}`}
                    className="font-mono text-sm text-[var(--gs-white)] hover:text-[var(--gs-lime)] transition-colors truncate"
                    title={entry.address}
                  >
                    {truncateAddress(entry.address)}
                  </a>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-mono text-data tabular-nums text-[var(--gs-purple)]">{entry.totalViews}v</span>
                  <span className="font-mono text-data tabular-nums text-[var(--gs-lime)]">{entry.shareCount}s</span>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (() => {
        const entries = tab === 'views' ? byViews : byShares;
        return entries.length === 0 ? (
          <p className="font-mono text-caption text-[var(--gs-gray-3)] py-4 text-center">No shares yet</p>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {entries.map((entry, i) => (
              <div key={entry.userProfileId} className="flex items-center justify-between py-2 border-b border-white/[0.06] last:border-b-0">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`font-mono text-sm font-bold tabular-nums w-6 text-right shrink-0 ${rankColor(i)}`}>
                    #{i + 1}
                  </span>
                  <span className="font-body text-sm text-[var(--gs-white)] truncate">
                    {entry.displayName || entry.userProfileId.slice(0, 12) + '\u2026'}
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-mono text-data tabular-nums text-[var(--gs-purple)]">{entry.totalViews}v</span>
                  <span className="font-mono text-data tabular-nums text-[var(--gs-lime)]">{entry.shareCount}s</span>
                </div>
              </div>
            ))}
          </div>
        );
      })()}
    </div>
  );
}
