'use client';

import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';
import { getAuthToken } from '@dynamic-labs/sdk-react-core';
import { clipHex } from '@/lib/utils/styles';
import { useClickOutside } from '@/components/navbar/hooks/useClickOutside';

interface ShareDropdownProps {
  walletAddress: string;
  totalUsd?: string;
  gunBalance?: string;
  nftCount?: number;
  nftPnlPct?: number | null;
}

/** Fallback: build a long share URL if the API call fails */
function buildFallbackUrl(
  walletAddress: string,
  totalUsd?: string,
  gunBalance?: string,
  nftCount?: number,
  nftPnlPct?: number | null,
): string {
  const url = new URL(`${window.location.origin}/portfolio`);
  url.searchParams.set('address', walletAddress);
  if (totalUsd) url.searchParams.set('v', totalUsd);
  if (gunBalance) url.searchParams.set('g', gunBalance);
  if (nftCount !== undefined) url.searchParams.set('n', String(nftCount));
  if (nftPnlPct !== undefined && nftPnlPct !== null) {
    url.searchParams.set('pnl', nftPnlPct.toFixed(1));
  }
  return url.toString();
}

export function ShareDropdown({
  walletAddress,
  totalUsd,
  gunBalance,
  nftCount,
  nftPnlPct,
}: ShareDropdownProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useClickOutside(dropdownRef, () => setOpen(false), open);

  /** Create a short URL via the API, falling back to the long URL on failure */
  const getShareUrl = useCallback(async (platform: 'x' | 'discord' | 'copy'): Promise<string> => {
    try {
      const token = getAuthToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/shares', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          address: walletAddress,
          totalUsd,
          gunBalance,
          nftCount,
          nftPnlPct: nftPnlPct !== undefined && nftPnlPct !== null ? nftPnlPct.toFixed(1) : undefined,
          platform,
        }),
      });
      const data = await res.json();
      if (data.success && data.code) {
        return `${window.location.origin}/s/${data.code}`;
      }
    } catch {
      // Fall through to fallback
    }
    return buildFallbackUrl(walletAddress, totalUsd, gunBalance, nftCount, nftPnlPct);
  }, [walletAddress, totalUsd, gunBalance, nftCount, nftPnlPct]);

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
      setOpen(false);
    } catch {
      toast.error('Failed to copy link');
    }
  }, [getShareUrl]);

  const handleShareX = useCallback(async () => {
    const url = await getShareUrl('x');
    const text = 'Track my @OffTheGrid bags on @GUNZscope';
    const intentUrl = `https://x.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
    window.open(intentUrl, '_blank', 'noopener,noreferrer');
    setOpen(false);
  }, [getShareUrl]);

  const handleShareDiscord = useCallback(async () => {
    const url = await getShareUrl('discord');
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied \u2014 paste in Discord!', {
        description: 'Discord will auto\u2011generate a rich preview card.',
        duration: 4000,
      });
      setOpen(false);
    } catch {
      toast.error('Failed to copy link');
    }
  }, [getShareUrl]);

  return (
    <div ref={dropdownRef} className="flex items-center gap-1.5">
      {/* Trigger button */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="group flex items-center gap-1.5 px-3 py-2 border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] hover:border-[var(--gs-lime)]/20 transition-all duration-200 cursor-pointer"
        style={{ clipPath: clipHex(5) }}
        title="Share portfolio"
      >
        {copied ? (
          <svg className="w-3.5 h-3.5 text-[var(--gs-profit)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5 text-[var(--gs-gray-4)] group-hover:text-[var(--gs-lime)] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
        )}
        <span className={`font-mono text-[10px] tracking-wider uppercase ${copied ? 'text-[var(--gs-profit)]' : 'text-[var(--gs-gray-4)] group-hover:text-[var(--gs-lime)]'} transition-colors`}>
          {copied ? 'Copied' : 'Share'}
        </span>
      </button>

      {/* Slide-out action buttons */}
      <div
        className={`flex items-center gap-1 overflow-hidden transition-all duration-250 ease-out ${
          open ? 'max-w-[200px] opacity-100' : 'max-w-0 opacity-0'
        }`}
      >
        {/* Copy Link */}
        <button
          onClick={handleCopyLink}
          className="flex items-center gap-1.5 px-2.5 py-2 border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] hover:border-[var(--gs-lime)]/20 transition-all duration-200 cursor-pointer shrink-0"
          style={{ clipPath: clipHex(4) }}
          title="Copy share link"
        >
          <svg className="w-3.5 h-3.5 text-[var(--gs-gray-4)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </button>

        {/* Share on X */}
        <button
          onClick={handleShareX}
          className="flex items-center gap-1.5 px-2.5 py-2 border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] hover:border-[var(--gs-lime)]/20 transition-all duration-200 cursor-pointer shrink-0"
          style={{ clipPath: clipHex(4) }}
          title="Share on X"
        >
          <svg className="w-3.5 h-3.5 text-[var(--gs-gray-4)] shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </button>

        {/* Share on Discord */}
        <button
          onClick={handleShareDiscord}
          className="flex items-center gap-1.5 px-2.5 py-2 border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] hover:border-[var(--gs-lime)]/20 transition-all duration-200 cursor-pointer shrink-0"
          style={{ clipPath: clipHex(4) }}
          title="Share on Discord"
        >
          <svg className="w-3.5 h-3.5 text-[var(--gs-gray-4)] shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.947 2.418-2.157 2.418z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
