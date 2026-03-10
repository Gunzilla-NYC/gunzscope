'use client';

import { Suspense } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useExplorer, type AttestationEvent } from '@/lib/hooks/useExplorer';

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_ATTESTATION_CONTRACT ?? '0xEBE8FD7d40724Eb84d9C888ce88840577Cc79c16';
const SNOWTRACE_BASE = 'https://snowtrace.io';
const AUTONOMYS_GATEWAY = 'https://gateway.autonomys.xyz/file';

function truncateAddress(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}\u2026${addr.slice(-4)}`;
}

function truncateHash(hash: string): string {
  return `${hash.slice(0, 10)}\u2026`;
}

function formatGun(value: string): string {
  const num = parseFloat(value);
  if (num === 0) return '0';
  if (num < 0.01) return '<0.01';
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

function isAutonomysURI(uri: string): boolean {
  return uri.startsWith('https://gateway.autonomys.xyz/') ||
    uri.includes('/api/attestation/metadata/');
}

function extractCid(uri: string): string | null {
  // /api/attestation/metadata/{cid}
  const apiMatch = uri.match(/\/api\/attestation\/metadata\/([^/?#]+)/);
  if (apiMatch) return apiMatch[1];
  // https://gateway.autonomys.xyz/file/{cid}
  const gwMatch = uri.match(/gateway\.autonomys\.xyz\/file\/([^/?#]+)/);
  if (gwMatch) return gwMatch[1];
  return null;
}

function getMetadataLink(uri: string): { label: string; href: string | null; isAutonomys: boolean } {
  if (isAutonomysURI(uri)) {
    const cid = extractCid(uri);
    if (cid) {
      return { label: 'View', href: `/explore/attestation/${cid}`, isAutonomys: true };
    }
    return { label: 'View', href: uri, isAutonomys: true };
  }
  if (uri.startsWith('data:')) {
    return { label: 'Inline', href: null, isAutonomys: false };
  }
  return { label: 'Link', href: uri, isAutonomys: false };
}

/* ─── Skeleton row ─── */
function SkeletonRow() {
  return (
    <tr className="border-b border-white/[0.04]">
      {Array.from({ length: 7 }).map((_, i) => (
        <td key={i} className="px-4 py-3.5">
          <div className="h-4 bg-white/[0.06] rounded animate-pulse" style={{ width: i === 0 ? '2rem' : '5rem' }} />
        </td>
      ))}
    </tr>
  );
}

/* ─── Mobile card ─── */
function MobileCard({ event, index, total }: { event: AttestationEvent; index: number; total: number }) {
  const meta = getMetadataLink(event.metadataURI);
  return (
    <div className="bg-[var(--gs-dark-2)] border border-white/[0.06] p-4 space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--gs-gray-3)]">
          #{total - index}
        </span>
        <span className="font-mono text-[9px] text-[var(--gs-gray-3)]" title={new Date(event.timestamp).toLocaleString()}>
          {getRelativeTime(event.timestamp)}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <a
          href={`${SNOWTRACE_BASE}/address/${event.wallet}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-data text-[var(--gs-lime)] hover:underline"
        >
          {truncateAddress(event.wallet)}
        </a>
        <span className="font-mono text-data text-[var(--gs-white)] tabular-nums">
          {formatGun(event.totalValueGun)} GUN
        </span>
      </div>
      <div className="flex items-center justify-between text-[var(--gs-gray-3)]">
        <span className="font-mono text-[9px] uppercase tracking-widest">
          {event.itemCount} item{event.itemCount !== 1 ? 's' : ''}
        </span>
        <div className="flex items-center gap-3">
          {meta.href && (
            <a
              href={meta.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`font-mono text-[9px] uppercase tracking-widest hover:underline ${meta.isAutonomys ? 'text-[#4A7AFF]' : 'text-[var(--gs-gray-3)]'}`}
            >
              {meta.label}
            </a>
          )}
          <a
            href={`${SNOWTRACE_BASE}/tx/${event.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[9px] uppercase tracking-widest text-[var(--gs-gray-3)] hover:text-[var(--gs-lime)] hover:underline"
          >
            Tx
          </a>
        </div>
      </div>
    </div>
  );
}

/* ─── Main content ─── */
function ExploreContent() {
  const { events, stats, isLoading, error, lastUpdated, refetch } = useExplorer();

  const autonomysCount = events.filter(e => isAutonomysURI(e.metadataURI)).length;

  return (
    <div className="min-h-dvh bg-[var(--gs-black)] text-[var(--gs-white)]">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-balance font-display font-bold text-3xl sm:text-4xl uppercase mb-2">
                Onchain Explorer
              </h1>
              <p className="text-pretty font-body text-sm text-[var(--gs-gray-4)]">
                Portfolio attestations on Avalanche C&#8209;Chain &mdash; verified on&#8209;chain, stored on Autonomys
              </p>
            </div>

            {/* Refresh */}
            <button
              onClick={refetch}
              disabled={isLoading}
              className="flex items-center gap-2 px-3 py-2 border border-white/[0.06] bg-[var(--gs-dark-2)] hover:border-[var(--gs-lime)]/30 transition-colors cursor-pointer disabled:opacity-50"
            >
              <span className={`inline-block w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`}><svg className="w-3.5 h-3.5 text-[var(--gs-gray-3)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg></span>
              {lastUpdated && (
                <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--gs-gray-3)]">
                  {getRelativeTime(lastUpdated.getTime())}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Stats Banner */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-px bg-white/[0.06] border border-white/[0.06] mb-6">
          <div className="bg-[var(--gs-dark-2)] px-5 py-4">
            <span className="font-mono text-label uppercase tracking-[1.5px] text-[var(--gs-gray-3)] block mb-1">
              Attestations
            </span>
            <span className="font-display text-2xl font-bold text-[var(--gs-white)] tabular-nums">
              {isLoading ? '\u2014' : (stats?.totalAttestations ?? 0)}
            </span>
          </div>
          <div className="bg-[var(--gs-dark-2)] px-5 py-4">
            <span className="font-mono text-label uppercase tracking-[1.5px] text-[var(--gs-gray-3)] block mb-1">
              Unique Wallets
            </span>
            <span className="font-display text-2xl font-bold text-[var(--gs-lime)] tabular-nums">
              {isLoading ? '\u2014' : (stats?.uniqueWallets ?? 0)}
            </span>
          </div>
          <div className="bg-[var(--gs-dark-2)] px-5 py-4 col-span-2 md:col-span-1">
            <span className="font-mono text-label uppercase tracking-[1.5px] text-[var(--gs-gray-3)] block mb-1">
              Total GUN Attested
            </span>
            <span className="font-display text-2xl font-bold text-[var(--gs-white)] tabular-nums">
              {isLoading ? '\u2014' : formatGun(stats?.totalGunAttested ?? '0')}
            </span>
          </div>
        </div>

        {/* Powered-by bar */}
        <div className="flex items-center flex-wrap gap-3 mb-8 px-1">
          <a
            href={`${SNOWTRACE_BASE}/address/${CONTRACT_ADDRESS}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-widest text-[#E84142] hover:text-[var(--gs-white)] transition-colors"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 19.5h20L12 2zm0 4l6.5 11.5h-13L12 6z" /></svg>
            Avalanche C&#8209;Chain
          </a>
          <span className="text-white/10">|</span>
          <span
            className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-widest text-[#4A7AFF] cursor-default"
            title={`${autonomysCount} attestation${autonomysCount === 1 ? '' : 's'} stored on Autonomys Distributed Storage Network`}
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" opacity="0.3"/><circle cx="12" cy="12" r="5"/></svg>
            Autonomys DSN
          </span>
          <span className="text-white/10">|</span>
          <a
            href={`${SNOWTRACE_BASE}/address/${CONTRACT_ADDRESS}#code`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[9px] uppercase tracking-widest text-[var(--gs-gray-3)] hover:text-[var(--gs-white)] transition-colors"
            title={CONTRACT_ADDRESS}
          >
            Contract: {truncateAddress(CONTRACT_ADDRESS)}
          </a>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-[var(--gs-loss)]/10 border border-[var(--gs-loss)]/20 p-4 mb-8 flex items-center justify-between gap-4">
            <p className="font-mono text-sm text-[var(--gs-loss)]">{error}</p>
            <button
              onClick={refetch}
              className="font-mono text-label uppercase tracking-widest border border-[var(--gs-loss)]/30 text-[var(--gs-loss)] hover:bg-[var(--gs-loss)]/10 px-3 py-1.5 transition-colors shrink-0 cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading skeleton */}
        {isLoading && (
          <div className="border border-white/[0.06] overflow-hidden">
            <table className="w-full">
              <tbody>
                {Array.from({ length: 8 }).map((_, i) => (
                  <SkeletonRow key={i} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && events.length === 0 && (
          <div className="border border-white/[0.06] bg-[var(--gs-dark-2)] p-12 text-center">
            <p className="font-display text-lg text-[var(--gs-gray-4)] mb-2">
              No attestations yet
            </p>
            <p className="font-body text-sm text-[var(--gs-gray-3)] mb-4">
              Be the first to attest your portfolio on&#8209;chain
            </p>
            <a
              href="/portfolio"
              className="inline-block font-mono text-label uppercase tracking-widest px-4 py-2 bg-[var(--gs-lime)] text-[var(--gs-black)] hover:bg-[var(--gs-lime-hover)] transition-colors clip-corner-sm"
            >
              Go to Portfolio
            </a>
          </div>
        )}

        {/* Desktop table */}
        {!isLoading && events.length > 0 && (
          <div className="hidden md:block border border-white/[0.06] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-[var(--gs-dark-2)] border-b border-white/[0.06]">
                  <th className="px-4 py-3 text-left font-mono text-[9px] uppercase tracking-widest text-[var(--gs-gray-3)] w-12">#</th>
                  <th className="px-4 py-3 text-left font-mono text-[9px] uppercase tracking-widest text-[var(--gs-gray-3)]">Wallet</th>
                  <th className="px-4 py-3 text-right font-mono text-[9px] uppercase tracking-widest text-[var(--gs-gray-3)]">Items</th>
                  <th className="px-4 py-3 text-right font-mono text-[9px] uppercase tracking-widest text-[var(--gs-gray-3)]">Value (GUN)</th>
                  <th className="px-4 py-3 text-right font-mono text-[9px] uppercase tracking-widest text-[var(--gs-gray-3)]">Date</th>
                  <th className="px-4 py-3 text-center font-mono text-[9px] uppercase tracking-widest text-[var(--gs-gray-3)]">Metadata</th>
                  <th className="px-4 py-3 text-center font-mono text-[9px] uppercase tracking-widest text-[var(--gs-gray-3)]">Tx</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event, i) => {
                  const meta = getMetadataLink(event.metadataURI);
                  return (
                    <tr key={`${event.txHash}-${event.attestationId}`} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3.5 font-mono text-data text-[var(--gs-gray-3)] tabular-nums">{events.length - i}</td>
                      <td className="px-4 py-3.5">
                        <a
                          href={`${SNOWTRACE_BASE}/address/${event.wallet}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-data text-[var(--gs-lime)] hover:underline"
                        >
                          {truncateAddress(event.wallet)}
                        </a>
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-data text-[var(--gs-white)] tabular-nums">
                        {event.itemCount}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-data text-[var(--gs-white)] tabular-nums">
                        {formatGun(event.totalValueGun)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-data text-[var(--gs-gray-3)]" title={new Date(event.timestamp).toLocaleString()}>
                        {getRelativeTime(event.timestamp)}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {meta.href ? (
                          <a
                            href={meta.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`font-mono text-[9px] uppercase tracking-widest hover:underline ${meta.isAutonomys ? 'text-[#4A7AFF]' : 'text-[var(--gs-gray-3)]'}`}
                          >
                            {meta.label}
                          </a>
                        ) : (
                          <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--gs-gray-3)]">{meta.label}</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <a
                          href={`${SNOWTRACE_BASE}/tx/${event.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-[9px] text-[var(--gs-gray-3)] hover:text-[var(--gs-lime)] hover:underline"
                          title={event.txHash}
                        >
                          {truncateHash(event.txHash)}
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Mobile cards */}
        {!isLoading && events.length > 0 && (
          <div className="md:hidden space-y-2">
            {events.map((event, i) => (
              <MobileCard key={`${event.txHash}-${event.attestationId}`} event={event} index={i} total={events.length} />
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-[var(--gs-black)]" />}>
      <ExploreContent />
    </Suspense>
  );
}
