'use client';

import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useClickOutside } from '@/components/navbar/hooks/useClickOutside';

interface ShareDropdownProps {
  walletAddress: string;
  totalUsd?: string;
  gunBalance?: string;
  nftCount?: number;
  nftPnlPct?: number | null;
}

function buildShareUrl(
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

  const shareUrl = useCallback(
    () => buildShareUrl(walletAddress, totalUsd, gunBalance, nftCount, nftPnlPct),
    [walletAddress, totalUsd, gunBalance, nftCount, nftPnlPct],
  );

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(shareUrl()).then(() => {
      setCopied(true);
      toast.success('Portfolio link copied!', {
        description: 'Share this link for a rich preview card.',
        duration: 3000,
      });
      setTimeout(() => setCopied(false), 2000);
      setOpen(false);
    }).catch(() => {
      toast.error('Failed to copy link');
    });
  }, [shareUrl]);

  const handleShareX = useCallback(() => {
    const url = shareUrl();
    const nftLabel = nftCount !== undefined ? `${nftCount} NFTs` : 'NFTs';
    const text = totalUsd
      ? `My @OffTheGrid portfolio on GUNZscope\n\n$${totalUsd} \u2022 ${nftLabel}\n\nTrack yours:`
      : `Check out my @OffTheGrid portfolio on GUNZscope\n\nTrack yours:`;
    const intentUrl = `https://x.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
    window.open(intentUrl, '_blank', 'noopener,noreferrer');
    setOpen(false);
  }, [shareUrl, totalUsd, nftCount]);

  const handleShareDiscord = useCallback(() => {
    navigator.clipboard.writeText(shareUrl()).then(() => {
      toast.success('Link copied \u2014 paste in Discord!', {
        description: 'Discord will auto\u2011generate a rich preview card.',
        duration: 4000,
      });
      setOpen(false);
    }).catch(() => {
      toast.error('Failed to copy link');
    });
  }, [shareUrl]);

  return (
    <div ref={dropdownRef} className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="group flex items-center gap-1.5 px-2.5 py-1.5 border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] hover:border-[var(--gs-lime)]/20 transition-all duration-200 cursor-pointer"
        style={{ clipPath: 'polygon(0 0, calc(100% - 5px) 0, 100% 5px, 100% 100%, 5px 100%, 0 calc(100% - 5px))' }}
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
        {/* Chevron */}
        <svg
          className={`w-2.5 h-2.5 text-[var(--gs-gray-4)] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown menu */}
      {open && (
        <div
          className="absolute right-0 top-full mt-1.5 z-50 min-w-[180px] border border-white/[0.08] bg-[var(--gs-dark-2)] shadow-xl shadow-black/40"
          style={{ clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))' }}
        >
          {/* Copy Link */}
          <button
            onClick={handleCopyLink}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-white/[0.04] transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 text-[var(--gs-gray-4)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <span className="font-mono text-[11px] tracking-wider uppercase text-[var(--gs-gray-3)]">
              Copy Link
            </span>
          </button>

          {/* Divider */}
          <div className="mx-3 h-px bg-white/[0.06]" />

          {/* Share on X */}
          <button
            onClick={handleShareX}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-white/[0.04] transition-colors cursor-pointer"
          >
            {/* X logo */}
            <svg className="w-3.5 h-3.5 text-[var(--gs-gray-4)] shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            <span className="font-mono text-[11px] tracking-wider uppercase text-[var(--gs-gray-3)]">
              Share on X
            </span>
          </button>

          {/* Divider */}
          <div className="mx-3 h-px bg-white/[0.06]" />

          {/* Share on Discord */}
          <button
            onClick={handleShareDiscord}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-white/[0.04] transition-colors cursor-pointer"
          >
            {/* Discord logo */}
            <svg className="w-3.5 h-3.5 text-[var(--gs-gray-4)] shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.947 2.418-2.157 2.418z" />
            </svg>
            <span className="font-mono text-[11px] tracking-wider uppercase text-[var(--gs-gray-3)]">
              Share on Discord
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
