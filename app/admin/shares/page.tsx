'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { toast } from 'sonner';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const ADMIN_WALLET = '0xf9434e3057432032bb621aa5144329861869c72f';

interface LeaderboardEntry {
  userProfileId: string;
  displayName: string | null;
  primaryWallet: string | null;
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

function HandleTools() {
  const [wallet, setWallet] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const adminSecret = process.env.NEXT_PUBLIC_ADMIN_SECRET ?? '';

  const handleDelete = useCallback(async () => {
    if (!wallet.trim()) return;
    if (!confirm(`Delete handle for ${wallet}? This removes the referrer and all events.`)) return;
    setIsDeleting(true);
    try {
      const res = await fetch('/api/admin/referrals', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminSecret}`,
        },
        body: JSON.stringify({ wallet: wallet.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Deleted handle for ${data.deleted.slug}`);
        setWallet('');
      } else {
        toast.error(data.error ?? 'Failed');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setIsDeleting(false);
    }
  }, [wallet, adminSecret]);

  const handleResetChanges = useCallback(async () => {
    if (!wallet.trim()) return;
    setIsResetting(true);
    try {
      const res = await fetch('/api/admin/referrals', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminSecret}`,
        },
        body: JSON.stringify({ wallet: wallet.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Reset slug changes for ${data.referrer.slug} (now: ${data.referrer.slugChangesRemaining})`);
      } else {
        toast.error(data.error ?? 'Failed');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setIsResetting(false);
    }
  }, [wallet, adminSecret]);

  return (
    <section className="bg-[var(--gs-dark-2)] border border-white/[0.06] overflow-hidden mt-6">
      <div className="h-[2px] bg-gradient-to-r from-[var(--gs-warning)] to-transparent" />
      <div className="p-6 space-y-4">
        <p className="font-mono text-label uppercase tracking-[1.5px] text-[var(--gs-gray-3)]">
          Handle Tools
        </p>
        <input
          type="text"
          value={wallet}
          onChange={e => setWallet(e.target.value)}
          placeholder="0x... wallet address or slug"
          className="w-full px-3 py-2 font-mono text-data text-[var(--gs-white)] bg-[var(--gs-dark-3)] border border-white/[0.08] outline-none placeholder:text-[var(--gs-gray-4)] focus:border-[var(--gs-lime)]/30"
        />
        <div className="flex gap-2">
          <button
            onClick={handleDelete}
            disabled={!wallet.trim() || isDeleting}
            className="flex-1 font-mono text-[10px] uppercase tracking-wider px-3 py-2 border border-[var(--gs-loss)]/30 text-[var(--gs-loss)] bg-[var(--gs-loss)]/5 hover:bg-[var(--gs-loss)]/10 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-default"
          >
            {isDeleting ? 'Deleting\u2026' : 'Delete Handle'}
          </button>
          <button
            onClick={handleResetChanges}
            disabled={!wallet.trim() || isResetting}
            className="flex-1 font-mono text-[10px] uppercase tracking-wider px-3 py-2 border border-[var(--gs-warning)]/30 text-[var(--gs-warning)] bg-[var(--gs-warning)]/5 hover:bg-[var(--gs-warning)]/10 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-default"
          >
            {isResetting ? 'Resetting\u2026' : 'Reset Slug Changes'}
          </button>
        </div>
        <p className="font-mono text-[9px] text-[var(--gs-gray-3)]">
          Delete: removes referrer + all events (wallet can re&#8209;register).
          Reset: restores slug changes to 1.
        </p>
      </div>
    </section>
  );
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
            <>
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
                                {entry.displayName || (entry.primaryWallet ? truncateAddress(entry.primaryWallet) : entry.userProfileId.slice(0, 12) + '\u2026')}
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
            <HandleTools />
            </>
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
