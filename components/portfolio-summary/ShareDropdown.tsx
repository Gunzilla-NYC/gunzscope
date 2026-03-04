'use client';

import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';
import { getAuthToken } from '@dynamic-labs/sdk-react-core';
import { clipHex } from '@/lib/utils/styles';
import { useSlidePanelContext } from '@/lib/contexts/SlidePanelContext';
import DropPanel from '@/components/ui/DropPanel';
import type { NFT } from '@/lib/types';
import { usePortfolioAttestation, type AttestationStatus } from '@/lib/hooks/usePortfolioAttestation';

interface ShareDropdownProps {
  walletAddress: string;
  referralSlug?: string | null;
  totalUsd?: string;
  gunBalance?: string;
  nftCount?: number;
  nftPnlPct?: number | null;
  totalGunSpent?: string;
  /** NFTs for on-chain attestation */
  nfts?: NFT[];
  /** Whether the viewer is the wallet owner (only owners can attest) */
  isOwnWallet?: boolean;
  /** Dynamic Labs wallet provider for signing */
  walletProvider?: unknown;
}

const ATTEST_LABELS: Record<AttestationStatus, string> = {
  idle: 'Attest On\u2011Chain',
  building: 'Building proof\u2026',
  uploading: 'Uploading metadata\u2026',
  'switching-chain': 'Switch to Avalanche\u2026',
  signing: 'Sign in wallet\u2026',
  confirming: 'Confirming\u2026',
  success: 'Attested!',
  error: 'Retry Attestation',
};

/** Fallback: build a long share URL if the API call fails */
function buildFallbackUrl(
  walletAddress: string,
  totalUsd?: string,
  gunBalance?: string,
  nftCount?: number,
  nftPnlPct?: number | null,
  totalGunSpent?: string,
): string {
  const url = new URL(`${window.location.origin}/portfolio`);
  url.searchParams.set('address', walletAddress);
  if (totalUsd) url.searchParams.set('v', totalUsd);
  if (gunBalance) url.searchParams.set('g', gunBalance);
  if (nftCount !== undefined) url.searchParams.set('n', String(nftCount));
  if (nftPnlPct !== undefined && nftPnlPct !== null) {
    url.searchParams.set('pnl', nftPnlPct.toFixed(1));
  }
  if (totalGunSpent) url.searchParams.set('gs', totalGunSpent);
  return url.toString();
}

export function ShareDropdown({
  walletAddress,
  referralSlug,
  totalUsd,
  gunBalance,
  nftCount,
  nftPnlPct,
  totalGunSpent,
  nfts,
  isOwnWallet,
  walletProvider,
}: ShareDropdownProps) {
  const [copied, setCopied] = useState(false);
  const triggerBtnRef = useRef<HTMLButtonElement>(null);

  // On-chain attestation
  const {
    attest,
    status: attestStatus,
    txHash,
    error: attestError,
    latestAttestation,
  } = usePortfolioAttestation(
    isOwnWallet ? walletAddress : undefined,
    nfts ?? [],
    walletProvider,
  );
  const isAttesting = attestStatus !== 'idle' && attestStatus !== 'success' && attestStatus !== 'error';

  // Panel state — use context if available (portfolio page), else local state
  const panelCtx = useSlidePanelContext();
  const [localOpen, setLocalOpen] = useState(false);
  const isOpen = panelCtx ? panelCtx.activePanel === 'share' : localOpen;
  // Extract stable function refs — avoids re-triggering effects when context value changes
  const ctxToggle = panelCtx?.togglePanel;
  const ctxClose = panelCtx?.closePanel;
  const toggle = useCallback(() => {
    if (ctxToggle) ctxToggle('share');
    else setLocalOpen(prev => !prev);
  }, [ctxToggle]);
  const close = useCallback(() => {
    if (ctxClose) ctxClose();
    else setLocalOpen(false);
  }, [ctxClose]);

  /** Append ?ref=slug to a URL when the user has a referral slug */
  const appendReferral = useCallback((url: string): string => {
    if (!referralSlug) return url;
    try {
      const urlObj = new URL(url);
      urlObj.searchParams.set('ref', referralSlug);
      return urlObj.toString();
    } catch {
      return url;
    }
  }, [referralSlug]);

  /** Create a short URL via the API, falling back to the long URL on failure */
  const getShareUrl = useCallback(async (platform: 'x' | 'discord' | 'copy'): Promise<string> => {
    let url: string;
    try {
      const token = getAuthToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/shares', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          address: walletAddress,
          platform,
        }),
      });
      const data = await res.json();
      if (data.success && data.code) {
        url = `${window.location.origin}/s/${data.code}`;
        return appendReferral(url);
      }
    } catch {
      // Fall through to fallback
    }
    url = buildFallbackUrl(walletAddress, totalUsd, gunBalance, nftCount, nftPnlPct, totalGunSpent);
    return appendReferral(url);
  }, [walletAddress, totalUsd, gunBalance, nftCount, nftPnlPct, totalGunSpent, appendReferral]);
  // Note: snapshot params are still used in buildFallbackUrl for when the API fails,
  // but they are NOT sent to the API (which uses PortfolioCache for live OG data).

  const handleCopyLink = useCallback(async () => {
    const url = await getShareUrl('copy');
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Portfolio link copied!', {
        description: 'Share this link for a rich preview card.',
        duration: 3000,
      });
      setTimeout(() => setCopied(false), 2000);
      close();
    } catch {
      toast.error('Failed to copy link');
    }
  }, [getShareUrl, close]);

  const handleDownload = useCallback(async () => {
    const ogParams = new URLSearchParams();
    if (totalUsd) ogParams.set('v', totalUsd);
    if (gunBalance) ogParams.set('g', gunBalance);
    if (nftCount !== undefined) ogParams.set('n', String(nftCount));
    if (nftPnlPct !== undefined && nftPnlPct !== null) ogParams.set('pnl', nftPnlPct.toFixed(1));
    if (totalGunSpent) ogParams.set('gs', totalGunSpent);
    const ogUrl = `/api/og/portfolio/${walletAddress}?${ogParams.toString()}`;
    try {
      const res = await fetch(ogUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'gunzscope-portfolio.png';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Image downloaded!');
      close();
    } catch {
      toast.error('Failed to download image');
    }
  }, [walletAddress, totalUsd, gunBalance, nftCount, nftPnlPct, totalGunSpent, close]);

  const handleShareX = useCallback(async () => {
    const url = await getShareUrl('x');
    const text = 'Track my @OffTheGrid bags on @GUNZscope';
    const intentUrl = `https://x.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
    window.open(intentUrl, '_blank', 'noopener,noreferrer');
    close();
  }, [getShareUrl, close]);

  const handleShareDiscord = useCallback(async () => {
    const url = await getShareUrl('discord');
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied \u2014 paste in Discord!', {
        description: 'Discord will auto\u2011generate a rich preview card.',
        duration: 4000,
      });
      close();
    } catch {
      toast.error('Failed to copy link');
    }
  }, [getShareUrl, close]);

  return (
    <>
      {/* Trigger button — icon-only */}
      <button
        ref={triggerBtnRef}
        onClick={toggle}
        className={`p-1.5 transition-colors cursor-pointer ${isOpen ? 'text-[var(--gs-lime)]' : 'text-[var(--gs-gray-3)] hover:text-[var(--gs-lime)]'}`}
        aria-label="Share portfolio"
        title="Share portfolio"
      >
        {copied ? (
          <svg className="w-3.5 h-3.5 text-[var(--gs-profit)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
        )}
      </button>

      {/* Drop-down share panel */}
      <DropPanel isOpen={isOpen} onClose={close} title="Share Portfolio" portalTarget={panelCtx?.panelSlotNode ?? null} triggerRef={triggerBtnRef}>
        {/* Portfolio preview */}
        <div className="px-4 py-3 border-b border-white/[0.06]">
          <div className="space-y-1.5">
            {totalUsd && (
              <div className="flex items-center justify-between">
                <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--gs-gray-3)]">Portfolio Value</span>
                <span className="font-mono text-data font-semibold text-[var(--gs-white)] tabular-nums">${totalUsd}</span>
              </div>
            )}
            {gunBalance && (
              <div className="flex items-center justify-between">
                <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--gs-gray-3)]">GUN Balance</span>
                <span className="font-mono text-data text-[var(--gs-white)] tabular-nums">{gunBalance} GUN</span>
              </div>
            )}
            {nftCount !== undefined && (
              <div className="flex items-center justify-between">
                <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--gs-gray-3)]">NFTs</span>
                <span className="font-mono text-data text-[var(--gs-white)] tabular-nums">{nftCount}</span>
              </div>
            )}
            {nftPnlPct !== undefined && nftPnlPct !== null && (
              <div className="flex items-center justify-between">
                <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--gs-gray-3)]">NFT P&amp;L</span>
                <span className={`font-mono text-data font-semibold tabular-nums ${nftPnlPct >= 0 ? 'text-[var(--gs-profit)]' : 'text-[var(--gs-loss)]'}`}>
                  {nftPnlPct >= 0 ? '+' : ''}{nftPnlPct.toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Share actions */}
        <div className="p-4 space-y-2">
          <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--gs-gray-3)] block mb-1">
            Choose platform
          </span>
          {referralSlug && (
            <span className="font-mono text-[9px] text-[var(--gs-lime)] block mb-2">
              Sharing with your referral link
            </span>
          )}
          {!referralSlug && <div className="mb-2" />}

          {/* Copy Link */}
          <button
            onClick={handleCopyLink}
            className="w-full flex items-center gap-3 px-4 py-3 border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] hover:border-[var(--gs-lime)]/20 transition-all cursor-pointer text-left"
            style={{ clipPath: clipHex(5) }}
          >
            <svg className="w-5 h-5 text-[var(--gs-gray-4)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <div>
              <span className="font-mono text-data text-[var(--gs-white)] block">Copy Link</span>
              <span className="font-mono text-[9px] text-[var(--gs-gray-3)]">Shareable link with rich preview card</span>
            </div>
          </button>

          {/* Download Image */}
          <button
            onClick={handleDownload}
            className="w-full flex items-center gap-3 px-4 py-3 border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] hover:border-[var(--gs-lime)]/20 transition-all cursor-pointer text-left"
            style={{ clipPath: clipHex(5) }}
          >
            <svg className="w-5 h-5 text-[var(--gs-gray-4)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <div>
              <span className="font-mono text-data text-[var(--gs-white)] block">Download Image</span>
              <span className="font-mono text-[9px] text-[var(--gs-gray-3)]">Save portfolio card as PNG</span>
            </div>
          </button>

          {/* Share on X */}
          <button
            onClick={handleShareX}
            className="w-full flex items-center gap-3 px-4 py-3 border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] hover:border-[var(--gs-lime)]/20 transition-all cursor-pointer text-left"
            style={{ clipPath: clipHex(5) }}
          >
            <svg className="w-5 h-5 text-[var(--gs-gray-4)] shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            <div>
              <span className="font-mono text-data text-[var(--gs-white)] block">Share on X</span>
              <span className="font-mono text-[9px] text-[var(--gs-gray-3)]">Post to X with your portfolio stats</span>
            </div>
          </button>

          {/* Share on Discord */}
          <button
            onClick={handleShareDiscord}
            className="w-full flex items-center gap-3 px-4 py-3 border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] hover:border-[var(--gs-lime)]/20 transition-all cursor-pointer text-left"
            style={{ clipPath: clipHex(5) }}
          >
            <svg className="w-5 h-5 text-[var(--gs-gray-4)] shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.947 2.418-2.157 2.418z" />
            </svg>
            <div>
              <span className="font-mono text-data text-[var(--gs-white)] block">Share on Discord</span>
              <span className="font-mono text-[9px] text-[var(--gs-gray-3)]">Copy link optimized for Discord embed</span>
            </div>
          </button>

          {/* On-Chain Attestation — only for wallet owner */}
          {!!(isOwnWallet && walletProvider && nfts && nfts.length > 0) && (
            <>
              <div className="border-t border-white/[0.06] mt-3 pt-3">
                <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--gs-gray-3)] block mb-2">
                  On&#8209;Chain
                </span>
              </div>

              {/* Existing attestation indicator */}
              {latestAttestation && attestStatus === 'idle' && (
                <div className="flex items-center gap-2 px-4 py-2 bg-[var(--gs-lime)]/[0.05] border border-[var(--gs-lime)]/10">
                  <svg className="w-3.5 h-3.5 text-[var(--gs-lime)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="font-mono text-[9px] text-[var(--gs-lime)]">
                    Attested {new Date(latestAttestation.timestamp).toLocaleDateString()}
                  </span>
                </div>
              )}

              {/* Attest button */}
              <button
                onClick={attest}
                disabled={isAttesting}
                className={`w-full flex items-center gap-3 px-4 py-3 border transition-all cursor-pointer text-left ${
                  attestStatus === 'success'
                    ? 'border-[var(--gs-lime)]/30 bg-[var(--gs-lime)]/[0.08]'
                    : attestStatus === 'error'
                      ? 'border-[var(--gs-loss)]/30 bg-[var(--gs-loss)]/[0.05] hover:bg-[var(--gs-loss)]/[0.08]'
                      : 'border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] hover:border-[var(--gs-purple)]/30'
                } ${isAttesting ? 'opacity-60 cursor-wait' : ''}`}
                style={{ clipPath: clipHex(5) }}
              >
                {/* Avalanche icon / spinner */}
                <div className="w-5 h-5 shrink-0 flex items-center justify-center">
                  {isAttesting ? (
                    <span className="animate-spin inline-block w-4 h-4"><svg className="w-4 h-4 text-[var(--gs-purple)]" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg></span>
                  ) : attestStatus === 'success' ? (
                    <svg className="w-5 h-5 text-[var(--gs-lime)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-[var(--gs-purple)]" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2L2 19.5h20L12 2zm0 4l6.5 11.5h-13L12 6z" />
                    </svg>
                  )}
                </div>
                <div className="min-w-0">
                  <span className={`font-mono text-data block ${
                    attestStatus === 'success' ? 'text-[var(--gs-lime)]' : 'text-[var(--gs-white)]'
                  }`}>
                    {ATTEST_LABELS[attestStatus]}
                  </span>
                  <span className="font-mono text-[9px] text-[var(--gs-gray-3)]">
                    {attestStatus === 'success' && txHash
                      ? 'View on Snowtrace'
                      : attestStatus === 'error' && attestError
                        ? attestError.slice(0, 60)
                        : latestAttestation
                          ? 'Update your on\u2011chain proof'
                          : 'Merkle proof on Avalanche C\u2011Chain'}
                  </span>
                </div>
              </button>

              {/* Snowtrace link on success */}
              {attestStatus === 'success' && txHash && (
                <a
                  href={`https://snowtrace.io/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center font-mono text-[9px] text-[var(--gs-purple)] hover:text-[var(--gs-lime)] transition-colors mt-1"
                >
                  snowtrace.io/tx/{txHash.slice(0, 10)}&hellip;
                </a>
              )}
            </>
          )}
        </div>
      </DropPanel>
    </>
  );
}
