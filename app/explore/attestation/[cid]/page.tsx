'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import PublicNav from '@/components/PublicNav';
import Footer from '@/components/Footer';
import {
  getGsHandle,
  getPortfolioWalletsOnChain,
  getCChainProvider,
  OnChainWalletStatus,
  type OnChainPortfolioWallet,
} from '@/lib/attestation/contract';

const SNOWTRACE_BASE = 'https://snowtrace.io';
const AUTONOMYS_GATEWAY = 'https://gateway.autonomys.xyz/file';
const INITIAL_DISPLAY = 100;

interface Holding {
  contract: string;
  tokenId: string;
  valueWei: string;
}

interface MetadataWallet {
  address: string;
  status: string;
}

interface AttestationData {
  wallet: string;
  gsHandle?: string;
  merkleRoot: string;
  totalValueWei: string;
  itemCount: number;
  blockNumber: number;
  timestamp: number;
  holdings: Holding[];
  wallets?: MetadataWallet[];
}

function weiToGun(wei: string): number {
  const num = parseFloat(wei);
  if (isNaN(num) || num === 0) return 0;
  return num / 1e18;
}

function formatGun(value: number): string {
  if (value === 0) return '0';
  if (value < 0.01) return '<0.01';
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function truncateAddress(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}\u2026${addr.slice(-4)}`;
}

function truncateHash(hash: string, chars = 16): string {
  if (hash.length <= chars + 4) return hash;
  return `${hash.slice(0, chars)}\u2026${hash.slice(-4)}`;
}

function walletStatusLabel(status: string | OnChainWalletStatus): { text: string; color: string } {
  const s = typeof status === 'string' ? status : OnChainWalletStatus[status];
  switch (s) {
    case 'PRIMARY':
    case '1':
      return { text: 'PRIMARY', color: 'text-[var(--gs-lime)] border-[var(--gs-lime)]/30' };
    case 'VERIFIED':
    case '2':
      return { text: 'VERIFIED', color: 'text-[#6D5BFF] border-[#6D5BFF]/30' };
    case 'SELF_REPORTED':
    case '3':
      return { text: 'SELF\u2011REPORTED', color: 'text-[var(--gs-gray-3)] border-white/10' };
    default:
      return { text: 'UNKNOWN', color: 'text-[var(--gs-gray-3)] border-white/10' };
  }
}

/* ─── Skeleton ─── */
function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/[0.06] border border-white/[0.06]">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-[var(--gs-dark-2)] px-5 py-4">
            <div className="h-3 w-16 bg-white/[0.06] rounded mb-2" />
            <div className="h-7 w-24 bg-white/[0.06] rounded" />
          </div>
        ))}
      </div>
      <div className="bg-[var(--gs-dark-2)] border border-white/[0.06] p-4">
        <div className="h-3 w-20 bg-white/[0.06] rounded mb-2" />
        <div className="h-5 w-full max-w-md bg-white/[0.06] rounded" />
      </div>
      <div className="border border-white/[0.06]">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex gap-4 px-4 py-3 border-b border-white/[0.04]">
            <div className="h-4 w-8 bg-white/[0.06] rounded" />
            <div className="h-4 w-20 bg-white/[0.06] rounded" />
            <div className="h-4 w-32 bg-white/[0.06] rounded" />
            <div className="h-4 w-16 bg-white/[0.06] rounded ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Copy button ─── */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className="font-mono text-[9px] uppercase tracking-widest px-2 py-1 border border-white/[0.08] text-[var(--gs-gray-3)] hover:text-[var(--gs-white)] hover:border-white/[0.2] transition-colors cursor-pointer"
      title="Copy to clipboard"
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

/* ─── Main viewer ─── */
export default function AttestationViewerPage() {
  const params = useParams<{ cid: string }>();
  const cid = params.cid;

  const [data, setData] = useState<AttestationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [handle, setHandle] = useState<string | null>(null);
  const [portfolioWallets, setPortfolioWallets] = useState<{ address: string; status: string; source: 'metadata' | 'onchain' }[]>([]);

  const fetchData = useCallback(async () => {
    if (!cid) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/attestation/metadata/${cid}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load attestation');
    } finally {
      setIsLoading(false);
    }
  }, [cid]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Resolve handle and portfolio wallets after data loads
  useEffect(() => {
    if (!data?.wallet) return;
    let cancelled = false;
    const provider = getCChainProvider();

    // Resolve handle: prefer metadata gsHandle, else query on-chain
    if (data.gsHandle) {
      setHandle(data.gsHandle);
    } else {
      getGsHandle(provider, data.wallet)
        .then((h) => { if (!cancelled) setHandle(h); })
        .catch(() => { /* no handle */ });
    }

    // Resolve portfolio wallets: prefer metadata, fall back to on-chain
    if (data.wallets && data.wallets.length > 0) {
      setPortfolioWallets(data.wallets.map((w) => ({ address: w.address, status: w.status, source: 'metadata' as const })));
    } else {
      getPortfolioWalletsOnChain(provider, data.wallet)
        .then((onChain) => {
          if (cancelled) return;
          const wallets = [
            { address: data.wallet, status: 'PRIMARY', source: 'onchain' as const },
            ...onChain.map((w) => ({
              address: w.addr,
              status: OnChainWalletStatus[w.status] || 'UNKNOWN',
              source: 'onchain' as const,
            })),
          ];
          setPortfolioWallets(wallets);
        })
        .catch(() => {
          // No on-chain wallets — show primary only
          if (!cancelled) {
            setPortfolioWallets([{ address: data.wallet, status: 'PRIMARY', source: 'onchain' as const }]);
          }
        });
    }

    return () => { cancelled = true; };
  }, [data?.wallet, data?.gsHandle, data?.wallets]);

  const totalGun = data ? weiToGun(data.totalValueWei) : 0;
  const holdings = data?.holdings ?? [];
  const displayedHoldings = showAll ? holdings : holdings.slice(0, INITIAL_DISPLAY);
  const hasMore = holdings.length > INITIAL_DISPLAY && !showAll;

  return (
    <div className="min-h-dvh bg-[var(--gs-black)] text-[var(--gs-white)]">
      <PublicNav activeHref="/explore" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/explore"
            className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-widest text-[var(--gs-gray-3)] hover:text-[var(--gs-lime)] transition-colors mb-4"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Explorer
          </Link>
          <h1 className="text-balance font-display font-bold text-3xl sm:text-4xl uppercase mb-2">
            {handle ? `${handle}\u2019s Portfolio Attestation` : 'Portfolio Attestation'}
          </h1>
          <p className="text-pretty font-body text-sm text-[var(--gs-gray-4)]">
            On&#8209;chain proof of wallet holdings &mdash; immutable, verifiable, permanent
          </p>
        </div>

        {/* Loading */}
        {isLoading && <LoadingSkeleton />}

        {/* Error */}
        {error && (
          <div className="bg-[var(--gs-loss)]/10 border border-[var(--gs-loss)]/20 p-6 flex items-center justify-between gap-4">
            <div>
              <p className="font-mono text-sm text-[var(--gs-loss)] mb-1">{error}</p>
              <p className="font-mono text-[9px] uppercase tracking-widest text-[var(--gs-gray-3)]">CID: {cid}</p>
            </div>
            <button
              onClick={fetchData}
              className="font-mono text-label uppercase tracking-widest border border-[var(--gs-loss)]/30 text-[var(--gs-loss)] hover:bg-[var(--gs-loss)]/10 px-3 py-1.5 transition-colors shrink-0 cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Data */}
        {!isLoading && !error && data && (
          <div className="space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/[0.06] border border-white/[0.06]">
              <div className="bg-[var(--gs-dark-2)] px-5 py-4">
                <span className="font-mono text-label uppercase tracking-[1.5px] text-[var(--gs-gray-3)] block mb-1">Wallet</span>
                <a
                  href={`${SNOWTRACE_BASE}/address/${data.wallet}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-lg text-[var(--gs-lime)] hover:underline"
                >
                  {handle ?? truncateAddress(data.wallet)}
                </a>
                {handle && (
                  <span className="block font-mono text-[9px] text-[var(--gs-gray-3)] mt-0.5">{truncateAddress(data.wallet)}</span>
                )}
              </div>
              <div className="bg-[var(--gs-dark-2)] px-5 py-4">
                <span className="font-mono text-label uppercase tracking-[1.5px] text-[var(--gs-gray-3)] block mb-1">Total Value</span>
                <span className="font-display text-lg font-bold text-[var(--gs-white)] tabular-nums">
                  {formatGun(totalGun)} <span className="text-sm font-normal text-[var(--gs-gray-3)]">GUN</span>
                </span>
              </div>
              <div className="bg-[var(--gs-dark-2)] px-5 py-4">
                <span className="font-mono text-label uppercase tracking-[1.5px] text-[var(--gs-gray-3)] block mb-1">Items</span>
                <span className="font-display text-lg font-bold text-[var(--gs-white)] tabular-nums">{data.itemCount.toLocaleString()}</span>
              </div>
              <div className="bg-[var(--gs-dark-2)] px-5 py-4">
                <span className="font-mono text-label uppercase tracking-[1.5px] text-[var(--gs-gray-3)] block mb-1">Block</span>
                <a
                  href={`${SNOWTRACE_BASE}/block/${data.blockNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-lg text-[var(--gs-white)] hover:text-[var(--gs-lime)] transition-colors tabular-nums"
                >
                  {data.blockNumber.toLocaleString()}
                </a>
              </div>
            </div>

            {/* Merkle root + CID + Timestamp */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-white/[0.06] border border-white/[0.06]">
              <div className="bg-[var(--gs-dark-2)] px-5 py-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-label uppercase tracking-[1.5px] text-[var(--gs-gray-3)]">Merkle Root</span>
                  <CopyButton text={data.merkleRoot} />
                </div>
                <span className="font-mono text-data text-[var(--gs-white)] break-all">{truncateHash(data.merkleRoot, 24)}</span>
              </div>
              <div className="bg-[var(--gs-dark-2)] px-5 py-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-label uppercase tracking-[1.5px] text-[var(--gs-gray-3)]">Timestamp</span>
                </div>
                <span className="font-mono text-data text-[var(--gs-white)]">
                  {new Date(data.timestamp * 1000).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Storage info bar */}
            <div className="flex items-center flex-wrap gap-3 px-1">
              <a
                href={`${AUTONOMYS_GATEWAY}/${cid}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-widest text-[#4A7AFF] hover:text-[var(--gs-white)] transition-colors"
              >
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" opacity="0.3"/><circle cx="12" cy="12" r="5"/></svg>
                Autonomys DSN
              </a>
              <span className="text-white/10">|</span>
              <span className="font-mono text-[9px] text-[var(--gs-gray-3)]" title={cid}>
                CID: {truncateHash(cid, 20)}
              </span>
              <CopyButton text={cid} />
            </div>

            {/* Portfolio wallets */}
            {portfolioWallets.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="font-mono text-label uppercase tracking-[1.5px] text-[var(--gs-gray-3)]">
                    Portfolio Wallets ({portfolioWallets.length})
                  </h2>
                  {portfolioWallets[0]?.source === 'onchain' && (
                    <span className="font-mono text-[9px] text-[var(--gs-gray-2)]">(current)</span>
                  )}
                </div>
                {(() => {
                  const trusted = portfolioWallets
                    .filter(w => w.status === 'PRIMARY' || w.status === 'VERIFIED')
                    .sort((a, b) => (a.status === 'PRIMARY' ? -1 : b.status === 'PRIMARY' ? 1 : 0));
                  const selfReported = portfolioWallets.filter(w => w.status === 'SELF_REPORTED');

                  const renderWallet = (w: typeof portfolioWallets[0]) => {
                    const badge = walletStatusLabel(w.status);
                    return (
                      <div key={w.address} className="bg-[var(--gs-dark-2)] px-4 py-3 flex items-center justify-between gap-2">
                        <a
                          href={`${SNOWTRACE_BASE}/address/${w.address}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-data text-[var(--gs-white)] hover:text-[var(--gs-lime)] transition-colors truncate"
                        >
                          {truncateAddress(w.address)}
                        </a>
                        <span className={`font-mono text-[9px] uppercase tracking-widest border px-1.5 py-0.5 shrink-0 ${badge.color}`}>
                          {badge.text}
                        </span>
                      </div>
                    );
                  };

                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Left column: Primary + Verified */}
                      <div className="flex flex-col gap-px bg-white/[0.06] border border-white/[0.06]">
                        {trusted.map(renderWallet)}
                      </div>
                      {/* Right column: Self-Reported */}
                      {selfReported.length > 0 && (
                        <div className="flex flex-col gap-px bg-white/[0.06] border border-white/[0.06]">
                          {selfReported.map(renderWallet)}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Holdings table — desktop */}
            {holdings.length > 0 && (
              <>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-mono text-label uppercase tracking-[1.5px] text-[var(--gs-gray-3)]">
                    Holdings ({holdings.length.toLocaleString()} items)
                  </h2>
                </div>

                {/* Desktop table */}
                <div className="hidden md:block border border-white/[0.06] overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-[var(--gs-dark-2)] border-b border-white/[0.06]">
                        <th className="px-4 py-3 text-left font-mono text-[9px] uppercase tracking-widest text-[var(--gs-gray-3)] w-16">#</th>
                        <th className="px-4 py-3 text-left font-mono text-[9px] uppercase tracking-widest text-[var(--gs-gray-3)]">Token ID</th>
                        <th className="px-4 py-3 text-left font-mono text-[9px] uppercase tracking-widest text-[var(--gs-gray-3)]">Contract</th>
                        <th className="px-4 py-3 text-right font-mono text-[9px] uppercase tracking-widest text-[var(--gs-gray-3)]">Value (GUN)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedHoldings.map((h, i) => (
                        <tr key={`${h.contract}-${h.tokenId}`} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                          <td className="px-4 py-2.5 font-mono text-data text-[var(--gs-gray-3)] tabular-nums">{i + 1}</td>
                          <td className="px-4 py-2.5 font-mono text-data text-[var(--gs-white)] tabular-nums">{h.tokenId}</td>
                          <td className="px-4 py-2.5">
                            <a
                              href={`${SNOWTRACE_BASE}/address/${h.contract}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono text-data text-[var(--gs-gray-3)] hover:text-[var(--gs-lime)] transition-colors"
                            >
                              {truncateAddress(h.contract)}
                            </a>
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-data text-[var(--gs-white)] tabular-nums">
                            {formatGun(weiToGun(h.valueWei))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden space-y-1.5">
                  {displayedHoldings.map((h, i) => (
                    <div key={`m-${h.contract}-${h.tokenId}`} className="bg-[var(--gs-dark-2)] border border-white/[0.06] px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[9px] text-[var(--gs-gray-3)] w-8 tabular-nums">{i + 1}</span>
                        <span className="font-mono text-data text-[var(--gs-white)] tabular-nums">#{h.tokenId}</span>
                      </div>
                      <span className="font-mono text-data text-[var(--gs-white)] tabular-nums">
                        {formatGun(weiToGun(h.valueWei))} <span className="text-[var(--gs-gray-3)]">GUN</span>
                      </span>
                    </div>
                  ))}
                </div>

                {/* Show more */}
                {hasMore && (
                  <button
                    onClick={() => setShowAll(true)}
                    className="w-full py-3 border border-white/[0.06] bg-[var(--gs-dark-2)] hover:border-[var(--gs-lime)]/30 transition-colors font-mono text-body-sm uppercase tracking-wider text-[var(--gs-gray-3)] hover:text-[var(--gs-white)] cursor-pointer"
                  >
                    Show all {holdings.length.toLocaleString()} items
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
