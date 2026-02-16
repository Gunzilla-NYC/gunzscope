'use client';

import { Suspense, useState, useEffect } from 'react';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const ADMIN_WALLET = '0xf9434e3057432032bb621aa5144329861869c72f';

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

type TabMode = 'views' | 'shares' | 'portfolios';

function truncateAddress(addr: string): string {
  return `${addr.slice(0, 6)}\u2026${addr.slice(-4)}`;
}

function AdminSharesContent() {
  const { primaryWallet } = useDynamicContext();
  const isAdmin = primaryWallet?.address?.toLowerCase() === ADMIN_WALLET;

  const [byViews, setByViews] = useState<LeaderboardEntry[]>([]);
  const [byShares, setByShares] = useState<LeaderboardEntry[]>([]);
  const [topPortfolios, setTopPortfolios] = useState<TopPortfolioEntry[]>([]);
  const [tab, setTab] = useState<TabMode>('views');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) {
      setIsLoading(false);
      return;
    }

    async function fetchLeaderboard() {
      try {
        const res = await fetch('/api/admin/shares', {
          headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_ADMIN_SECRET ?? ''}`,
          },
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
  }, [isAdmin]);

  const tabConfig: { key: TabMode; label: string; color: string }[] = [
    { key: 'views', label: 'By Views', color: 'var(--gs-lime)' },
    { key: 'shares', label: 'By Shares', color: 'var(--gs-purple)' },
    { key: 'portfolios', label: 'Top Portfolios', color: 'var(--gs-warning)' },
  ];

  return (
    <>
      <Navbar />
      <main className="min-h-dvh bg-[var(--gs-black)] pt-24 pb-16 px-4">
        <div className="max-w-2xl mx-auto">
          {!isAdmin ? (
            <div className="text-center py-20">
              <p className="font-mono text-[var(--gs-gray-3)]">Admin access required</p>
            </div>
          ) : (
            <section className="bg-[var(--gs-dark-2)] border border-white/[0.06] overflow-hidden">
              <div className="h-[2px] bg-gradient-to-r from-[var(--gs-lime)] via-[var(--gs-purple)] to-transparent" />
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <p className="font-mono text-label uppercase tracking-[1.5px] text-[var(--gs-gray-3)]">
                    Share Leaderboard
                  </p>
                  <div className="flex gap-1">
                    {tabConfig.map(({ key, label, color }) => (
                      <button
                        key={key}
                        onClick={() => setTab(key)}
                        className={`font-mono text-caption uppercase tracking-wider px-2.5 py-1 border transition-colors cursor-pointer ${
                          tab === key
                            ? `border-[${color}]/30 text-[${color}] bg-[${color}]/10`
                            : 'border-white/[0.08] text-[var(--gs-gray-3)] hover:bg-white/[0.04]'
                        }`}
                        style={tab === key ? {
                          borderColor: `color-mix(in srgb, ${color} 30%, transparent)`,
                          color: color,
                          backgroundColor: `color-mix(in srgb, ${color} 10%, transparent)`,
                        } : undefined}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {isLoading ? (
                  <p className="font-mono text-caption text-[var(--gs-gray-3)] py-8 text-center">Loading&hellip;</p>
                ) : tab === 'portfolios' ? (
                  /* ── Top Portfolios ── */
                  topPortfolios.length === 0 ? (
                    <p className="font-mono text-caption text-[var(--gs-gray-3)] py-8 text-center">
                      No shares yet
                    </p>
                  ) : (
                    <div className="space-y-0">
                      {topPortfolios.map((entry, i) => (
                        <div
                          key={entry.address}
                          className="flex items-center justify-between py-3 border-b border-white/[0.06] last:border-b-0"
                        >
                          <div className="flex items-center gap-4 min-w-0">
                            <span className={`font-mono text-sm font-bold tabular-nums w-6 text-right shrink-0 ${
                              i === 0 ? 'text-[var(--gs-lime)]' : i === 1 ? 'text-[var(--gs-purple)]' : i === 2 ? 'text-[var(--gs-warning)]' : 'text-[var(--gs-gray-3)]'
                            }`}>
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
                          <div className="flex items-center gap-4 shrink-0">
                            <span className="font-mono text-data tabular-nums text-[var(--gs-purple)]">
                              {entry.totalViews} views
                            </span>
                            <span className="font-mono text-data tabular-nums text-[var(--gs-lime)]">
                              {entry.shareCount} shares
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  /* ── User Leaderboard (views / shares) ── */
                  (() => {
                    const entries = tab === 'views' ? byViews : byShares;
                    return entries.length === 0 ? (
                      <p className="font-mono text-caption text-[var(--gs-gray-3)] py-8 text-center">
                        No shares yet
                      </p>
                    ) : (
                      <div className="space-y-0">
                        {entries.map((entry, i) => (
                          <div
                            key={entry.userProfileId}
                            className="flex items-center justify-between py-3 border-b border-white/[0.06] last:border-b-0"
                          >
                            <div className="flex items-center gap-4 min-w-0">
                              <span className={`font-mono text-sm font-bold tabular-nums w-6 text-right shrink-0 ${
                                i === 0 ? 'text-[var(--gs-lime)]' : i === 1 ? 'text-[var(--gs-purple)]' : i === 2 ? 'text-[var(--gs-warning)]' : 'text-[var(--gs-gray-3)]'
                              }`}>
                                #{i + 1}
                              </span>
                              <span className="font-body text-sm text-[var(--gs-white)] truncate">
                                {entry.displayName || entry.userProfileId.slice(0, 12) + '\u2026'}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 shrink-0">
                              <span className="font-mono text-data tabular-nums text-[var(--gs-purple)]">
                                {entry.totalViews} views
                              </span>
                              <span className="font-mono text-data tabular-nums text-[var(--gs-lime)]">
                                {entry.shareCount} shares
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()
                )}
              </div>
            </section>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function AdminSharesPage() {
  return (
    <Suspense fallback={
      <p className="font-mono text-caption text-[var(--gs-gray-3)] py-20 text-center">Loading&hellip;</p>
    }>
      <AdminSharesContent />
    </Suspense>
  );
}
