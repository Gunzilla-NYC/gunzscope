'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useLeaderboard, type SortField } from '@/lib/hooks/useLeaderboard';
import { formatUsd } from '@/lib/portfolio/calcPortfolio';

function truncateAddress(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function getPnlColor(value: number | null): string {
  if (value === null) return 'text-white/40';
  if (value > 0.01) return 'text-[var(--gs-profit)]';
  if (value < -0.01) return 'text-[var(--gs-loss)]';
  return 'text-white/40';
}

function formatPnl(value: number | null): string {
  if (value === null) return '\u2014';
  const sign = value >= 0 ? '+' : '';
  return `${sign}$${formatUsd(Math.abs(value))}`;
}

function formatPct(value: number | null): string {
  if (value === null) return '\u2014';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

function SortArrow({ active, order }: { active: boolean; order: 'asc' | 'desc' }) {
  if (!active) return <span className="text-white/20 ml-1">&uarr;</span>;
  return (
    <span className="text-[var(--gs-lime)] ml-1">
      {order === 'desc' ? '\u2193' : '\u2191'}
    </span>
  );
}

const SORT_COLUMNS: { field: SortField; label: string; shortLabel: string }[] = [
  { field: 'totalPortfolioUsd', label: 'Portfolio Value', shortLabel: 'Value' },
  { field: 'gunBalance', label: 'GUN Balance', shortLabel: 'GUN' },
  { field: 'nftCount', label: 'NFTs', shortLabel: 'NFTs' },
  { field: 'unrealizedPnlUsd', label: 'Unrealized P&L', shortLabel: 'P&L' },
  { field: 'pnlPercentage', label: 'P&L %', shortLabel: 'P&L %' },
];

function LeaderboardContent() {
  const searchParams = useSearchParams();
  const activeAddress = searchParams.get('address');

  const {
    sortedEntries,
    gunPriceUsd,
    totalWallets,
    isLoading,
    error,
    sortField,
    sortOrder,
    handleSort,
  } = useLeaderboard();

  return (
    <div className="min-h-dvh bg-[var(--gs-black)] text-[var(--gs-white)]">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-balance font-display font-bold text-3xl sm:text-4xl uppercase">
                  Leaderboard
                </h1>
                <span className="font-mono text-[9px] tracking-wider uppercase px-1.5 py-0.5 rounded-sm bg-[var(--gs-purple)]/20 text-[var(--gs-purple)] border border-[var(--gs-purple)]/30">
                  Alpha
                </span>
              </div>
              <p className="text-pretty font-body text-sm text-[var(--gs-gray-4)]">
                Top GunzChain wallets ranked by portfolio value
              </p>
            </div>

            {/* Active wallet badge */}
            {activeAddress && (
              <Link
                href={`/portfolio?address=${activeAddress}`}
                className="flex items-center gap-2 px-3 py-2 bg-[var(--gs-dark-2)] border border-white/[0.06] hover:border-[var(--gs-lime)]/30 transition-colors"
              >
                <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--gs-gray-3)]">
                  Viewing
                </span>
                <span className="font-mono text-xs text-[var(--gs-lime)] tabular-nums">
                  {truncateAddress(activeAddress)}
                </span>
              </Link>
            )}
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-px bg-white/[0.06] border border-white/[0.06] mb-8">
          <div className="bg-[var(--gs-dark-2)] px-5 py-4">
            <span className="font-mono text-[9px] uppercase tracking-[1.5px] text-[var(--gs-gray-3)] block mb-1">
              Wallets Ranked
            </span>
            <span className="font-display text-2xl font-bold text-[var(--gs-white)] tabular-nums">
              {isLoading ? '\u2014' : sortedEntries.length}
            </span>
          </div>
          <div className="bg-[var(--gs-dark-2)] px-5 py-4">
            <span className="font-mono text-[9px] uppercase tracking-[1.5px] text-[var(--gs-gray-3)] block mb-1">
              GUN Price
            </span>
            <span className="font-display text-2xl font-bold text-[var(--gs-lime)] tabular-nums">
              {gunPriceUsd !== null ? `$${gunPriceUsd.toFixed(4)}` : '\u2014'}
            </span>
          </div>
          <div className="bg-[var(--gs-dark-2)] px-5 py-4 col-span-2 md:col-span-1">
            <span className="font-mono text-[9px] uppercase tracking-[1.5px] text-[var(--gs-gray-3)] block mb-1">
              Total Tracked
            </span>
            <span className="font-display text-2xl font-bold text-[var(--gs-white)] tabular-nums">
              {isLoading ? '\u2014' : totalWallets}
            </span>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-[var(--gs-loss)]/10 border border-[var(--gs-loss)]/20 p-4 mb-8">
            <p className="font-mono text-sm text-[var(--gs-loss)]">{error}</p>
          </div>
        )}

        {/* Loading Skeleton */}
        {isLoading && (
          <div className="bg-[var(--gs-dark-2)] border border-white/[0.06]">
            <div className="bg-[var(--gs-dark-1)] px-5 py-3 border-b border-white/[0.06]">
              <div className="h-3 w-48 bg-white/10 rounded animate-pulse" />
            </div>
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 px-5 py-4 border-b border-white/[0.06]"
              >
                <div className="h-4 w-6 bg-white/10 rounded animate-pulse" />
                <div className="h-4 w-28 bg-white/10 rounded animate-pulse" />
                <div className="flex-1" />
                <div className="h-4 w-20 bg-white/10 rounded animate-pulse" />
                <div className="h-4 w-16 bg-white/10 rounded animate-pulse hidden md:block" />
                <div className="h-4 w-12 bg-white/10 rounded animate-pulse hidden md:block" />
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && sortedEntries.length === 0 && (
          <div className="text-center py-24">
            <div className="size-16 mx-auto mb-6 rounded-full bg-[var(--gs-dark-2)] border border-white/[0.06] flex items-center justify-center">
              <span className="text-2xl opacity-30">&#x1F3C6;</span>
            </div>
            <h2 className="text-balance font-display text-2xl font-bold text-[var(--gs-white)] mb-3">
              No Rankings Yet
            </h2>
            <p className="text-pretty text-[var(--gs-gray-4)] mb-8 max-w-md mx-auto font-body">
              The leaderboard populates as wallets are tracked. Search a wallet to get started.
            </p>
            <Link
              href="/portfolio"
              className="inline-block font-display font-semibold text-sm uppercase px-6 py-3 bg-[var(--gs-lime)] text-[var(--gs-black)] hover:bg-[var(--gs-lime-hover)] transition-colors clip-corner"
            >
              Track a Wallet
            </Link>
          </div>
        )}

        {/* Desktop Table */}
        {!isLoading && sortedEntries.length > 0 && (
          <>
            <div className="hidden md:block bg-[var(--gs-dark-2)] border border-white/[0.06] overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-[var(--gs-dark-1)] border-b border-white/[0.06]">
                    <th className="text-left px-5 py-3 font-mono text-[9px] uppercase tracking-[1.5px] text-[var(--gs-gray-3)] w-12">
                      #
                    </th>
                    <th className="text-left px-5 py-3 font-mono text-[9px] uppercase tracking-[1.5px] text-[var(--gs-gray-3)]">
                      Wallet
                    </th>
                    {SORT_COLUMNS.map((col) => (
                      <th
                        key={col.field}
                        className="text-right px-5 py-3 font-mono text-[9px] uppercase tracking-[1.5px] text-[var(--gs-gray-3)] cursor-pointer hover:text-[var(--gs-lime)] transition-colors select-none"
                        onClick={() => handleSort(col.field)}
                      >
                        <span className="inline-flex items-center">
                          {col.label}
                          <SortArrow
                            active={sortField === col.field}
                            order={sortOrder}
                          />
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedEntries.map((entry) => {
                    const isActiveWallet = activeAddress?.toLowerCase() === entry.address.toLowerCase();
                    return (
                      <tr
                        key={entry.address}
                        className={`border-b border-white/[0.06] hover:bg-[var(--gs-lime)]/[0.03] transition-colors ${
                          isActiveWallet
                            ? 'bg-[var(--gs-lime)]/[0.05] border-l-2 border-l-[var(--gs-purple)]'
                            : entry.rank <= 3
                              ? 'border-l-2 border-l-[var(--gs-lime)]'
                              : ''
                        }`}
                      >
                        <td className="px-5 py-3.5">
                          <span
                            className={`font-mono text-sm tabular-nums ${
                              entry.rank <= 3
                                ? 'text-[var(--gs-lime)] font-bold'
                                : 'text-[var(--gs-gray-3)]'
                            }`}
                          >
                            {entry.rank}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <Link
                            href={`/portfolio?address=${entry.address}`}
                            className="font-mono text-sm text-[var(--gs-lime)] hover:text-[var(--gs-lime-hover)] transition-colors"
                          >
                            {truncateAddress(entry.address)}
                            {isActiveWallet && (
                              <span className="ml-2 font-mono text-[9px] uppercase tracking-wider text-[var(--gs-purple)]">
                                You
                              </span>
                            )}
                          </Link>
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono text-sm text-[var(--gs-white)] tabular-nums">
                          ${formatUsd(entry.totalPortfolioUsd)}
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono text-sm text-[var(--gs-white)] tabular-nums">
                          {entry.gunBalance.toLocaleString(undefined, {
                            maximumFractionDigits: 0,
                          })}
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono text-sm text-[var(--gs-white)] tabular-nums">
                          {entry.nftCount}
                        </td>
                        <td
                          className={`px-5 py-3.5 text-right font-mono text-sm tabular-nums ${getPnlColor(
                            entry.unrealizedPnlUsd
                          )}`}
                        >
                          {formatPnl(entry.unrealizedPnlUsd)}
                        </td>
                        <td
                          className={`px-5 py-3.5 text-right font-mono text-sm tabular-nums ${getPnlColor(
                            entry.pnlPercentage
                          )}`}
                        >
                          {formatPct(entry.pnlPercentage)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {/* Sort Selector */}
              <div className="flex items-center gap-2 mb-4">
                <span className="font-mono text-[9px] uppercase tracking-[1.5px] text-[var(--gs-gray-3)]">
                  Sort by
                </span>
                <select
                  value={sortField}
                  onChange={(e) => handleSort(e.target.value as SortField)}
                  className="bg-[var(--gs-dark-2)] border border-white/[0.06] text-[var(--gs-white)] font-mono text-xs px-3 py-1.5 focus:outline-none focus:border-[var(--gs-lime)]/40"
                >
                  {SORT_COLUMNS.map((col) => (
                    <option key={col.field} value={col.field}>
                      {col.shortLabel}
                    </option>
                  ))}
                </select>
              </div>

              {sortedEntries.map((entry) => {
                const isActiveWallet = activeAddress?.toLowerCase() === entry.address.toLowerCase();
                return (
                  <Link
                    key={entry.address}
                    href={`/portfolio?address=${entry.address}`}
                    className={`block bg-[var(--gs-dark-2)] border border-white/[0.06] p-4 hover:bg-[var(--gs-lime)]/[0.03] transition-colors ${
                      isActiveWallet
                        ? 'border-l-2 border-l-[var(--gs-purple)] bg-[var(--gs-lime)]/[0.05]'
                        : entry.rank <= 3
                          ? 'border-l-2 border-l-[var(--gs-lime)]'
                          : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span
                          className={`font-mono text-lg tabular-nums font-bold ${
                            entry.rank <= 3
                              ? 'text-[var(--gs-lime)]'
                              : 'text-[var(--gs-gray-3)]'
                          }`}
                        >
                          #{entry.rank}
                        </span>
                        <span className="font-mono text-sm text-[var(--gs-lime)]">
                          {truncateAddress(entry.address)}
                        </span>
                        {isActiveWallet && (
                          <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--gs-purple)]">
                            You
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="font-mono text-[9px] uppercase tracking-[1.5px] text-[var(--gs-gray-3)] block mb-0.5">
                          Portfolio
                        </span>
                        <span className="font-mono text-sm text-[var(--gs-white)] tabular-nums">
                          ${formatUsd(entry.totalPortfolioUsd)}
                        </span>
                      </div>
                      <div>
                        <span className="font-mono text-[9px] uppercase tracking-[1.5px] text-[var(--gs-gray-3)] block mb-0.5">
                          GUN Balance
                        </span>
                        <span className="font-mono text-sm text-[var(--gs-white)] tabular-nums">
                          {entry.gunBalance.toLocaleString(undefined, {
                            maximumFractionDigits: 0,
                          })}
                        </span>
                      </div>
                      <div>
                        <span className="font-mono text-[9px] uppercase tracking-[1.5px] text-[var(--gs-gray-3)] block mb-0.5">
                          NFTs
                        </span>
                        <span className="font-mono text-sm text-[var(--gs-white)] tabular-nums">
                          {entry.nftCount}
                        </span>
                      </div>
                      <div>
                        <span className="font-mono text-[9px] uppercase tracking-[1.5px] text-[var(--gs-gray-3)] block mb-0.5">
                          P&L
                        </span>
                        <span
                          className={`font-mono text-sm tabular-nums ${getPnlColor(
                            entry.unrealizedPnlUsd
                          )}`}
                        >
                          {formatPnl(entry.unrealizedPnlUsd)}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default function LeaderboardPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-[var(--gs-black)]" />}>
      <LeaderboardContent />
    </Suspense>
  );
}
