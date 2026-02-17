'use client';

import { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import {
  usePortfolioWallet,
  usePortfolioResult,
  usePortfolioGunPrice,
  usePortfolioNFTs,
} from '@/lib/contexts/PortfolioContext';
import { PortfolioAddress } from '@/lib/hooks/useUserProfile';
import { useNftPnL } from '@/components/portfolio-summary/hooks/useNftPnL';
import { ShareDropdown } from '@/components/portfolio-summary/ShareDropdown';
import DropPanel from '@/components/ui/DropPanel';
import { useSlidePanelContext } from '@/lib/contexts/SlidePanelContext';

interface WalletIdentityProps {
  className?: string;
  portfolioAddresses?: PortfolioAddress[];
  aggregatedAddresses?: string[];
  primaryWalletAddress?: string | null;
  isAuthenticated?: boolean;
  onSwitchWallet?: (address: string) => void;
  onBackToOwnWallet?: () => void;
}

interface PopoverPosition {
  top: number;
  left: number;
}

function truncateAddr(addr: string): string {
  return addr.length > 12 ? `${addr.slice(0, 6)}\u2026${addr.slice(-4)}` : addr;
}

/**
 * WalletIdentity - Context-aware wallet bar with switcher.
 *
 * Modes:
 *   Hidden   — own wallet, no portfolio addresses (navbar + status bar sufficient)
 *   Switcher — own wallet, 1+ portfolio addresses (dropdown to switch)
 *   Viewing  — foreign searched wallet (shows "Back to My Wallet")
 *   Simple   — unauthenticated search (address + copy + status only)
 */
export default function WalletIdentity({
  className = '',
  portfolioAddresses = [],
  aggregatedAddresses = [],
  primaryWalletAddress,
  isAuthenticated = false,
  onSwitchWallet,
  onBackToOwnWallet,
}: WalletIdentityProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState<PopoverPosition>({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const popoverId = 'wallet-details-popover';
  const switcherBtnRef = useRef<HTMLButtonElement>(null);

  // Switcher panel — use context if available, else local state
  const panelCtx = useSlidePanelContext();
  const [localSwitcherOpen, setLocalSwitcherOpen] = useState(false);
  const isSwitcherOpen = panelCtx ? panelCtx.activePanel === 'wallet-switcher' : localSwitcherOpen;
  // Extract stable function refs — avoids re-triggering effects when context value changes
  const ctxClose = panelCtx?.closePanel;
  const ctxToggle = panelCtx?.togglePanel;
  const closeSwitcher = useCallback(() => {
    if (ctxClose) ctxClose();
    else setLocalSwitcherOpen(false);
  }, [ctxClose]);

  // Get data from context
  const { walletData, address, networkInfo, walletType } = usePortfolioWallet();

  const lastUpdated = walletData?.lastUpdated;
  const shortAddress = address ? truncateAddr(address) : '';

  // Network info
  const isMainnet = networkInfo?.environment === 'mainnet' || networkInfo?.environment === undefined;
  const networkLabel = isMainnet ? 'Mainnet' : 'Testnet';
  const networkColor = isMainnet ? '#beffd2' : '#fbbf24';

  // Wallet type info
  const walletTypeLabel = walletType === 'in-game' ? 'In-Game' : walletType === 'external' ? 'External' : null;
  const walletTypeFullLabel = walletType === 'in-game' ? 'In-Game (Custodial)' : walletType === 'external' ? 'External (Self-Custody)' : 'Unknown';
  const walletTypeColor = walletType === 'in-game' ? '#96aaff' : walletType === 'external' ? '#64ffff' : '#6b7280';

  // Determine display mode
  const isOwnWallet = useMemo(() => {
    if (!primaryWalletAddress || !address) return false;
    const viewedLower = address.toLowerCase();
    const primaryLower = primaryWalletAddress.toLowerCase();
    return viewedLower === primaryLower ||
      aggregatedAddresses.some(a => a.toLowerCase() === primaryLower);
  }, [primaryWalletAddress, address, aggregatedAddresses]);

  const hasPortfolioAddresses = portfolioAddresses.length > 0;

  type DisplayMode = 'hidden' | 'switcher' | 'viewing' | 'simple';
  const mode: DisplayMode = useMemo(() => {
    if (isAuthenticated && isOwnWallet && !hasPortfolioAddresses) return 'hidden';
    if (isAuthenticated && isOwnWallet && hasPortfolioAddresses) return 'switcher';
    // Show "viewing" mode whenever an authenticated user is looking at a non-own address.
    // Previously this required primaryWalletAddress to be non-null, which caused the
    // back button to vanish for email-only users or during Dynamic SDK initialisation.
    if (isAuthenticated && !isOwnWallet) return 'viewing';
    return 'simple';
  }, [isAuthenticated, isOwnWallet, hasPortfolioAddresses]);

  // Format last updated for display
  const formatLastUpdated = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  // Status determination
  const getStatus = () => {
    if (!lastUpdated) return { label: 'Synced', color: '#beffd2' };
    const diffMin = Math.floor((Date.now() - lastUpdated.getTime()) / 60000);
    if (diffMin > 5) return { label: 'Stale', color: '#ff6b6b' };
    return { label: 'Live', color: '#beffd2' };
  };
  const status = getStatus();

  // Share data — read from context so ShareDropdown can live here
  const portfolioResult = usePortfolioResult();
  const { gunPrice } = usePortfolioGunPrice();
  const { allNfts } = usePortfolioNFTs();
  const nftPnL = useNftPnL(allNfts, gunPrice);

  const shareTotal = useMemo(() => {
    if (!portfolioResult) return undefined;
    const v = portfolioResult.totalMarketValueUsd ?? portfolioResult.totalUsd ?? 0;
    return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }, [portfolioResult]);
  const shareGunBalance = useMemo(() => {
    if (!portfolioResult) return undefined;
    return portfolioResult.totalGunBalance.toLocaleString();
  }, [portfolioResult]);

  // Mount check for portal
  useEffect(() => { setMounted(true); }, []);

  // Calculate popover position (shared logic)
  const calcPosition = useCallback((triggerEl: HTMLElement | null, width: number, height: number): PopoverPosition => {
    if (!triggerEl) return { top: 0, left: 0 };
    const rect = triggerEl.getBoundingClientRect();
    let top = rect.bottom + 8;
    let left = rect.left;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (left + width > vw - 16) left = vw - width - 16;
    if (left < 16) left = 16;
    if (top + height > vh - 16) {
      const above = rect.top - 8;
      top = above > height ? rect.top - height - 8 : vh - height - 16;
    }
    return { top, left };
  }, []);

  // Details popover position
  useLayoutEffect(() => {
    if (!showDetails) return;
    setPopoverPosition(calcPosition(triggerRef.current, 320, 380));

    let scrollEnabled = false;
    const enableScrollClose = setTimeout(() => { scrollEnabled = true; }, 150);
    const handleScroll = () => { if (scrollEnabled) setShowDetails(false); };
    const handleResize = () => setPopoverPosition(calcPosition(triggerRef.current, 320, 380));

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      clearTimeout(enableScrollClose);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [showDetails, calcPosition]);

  // Close on click outside (details)
  useEffect(() => {
    if (!showDetails) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (popoverRef.current && !popoverRef.current.contains(t) && triggerRef.current && !triggerRef.current.contains(t)) {
        setShowDetails(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showDetails]);

  // Close on escape (details popover)
  useEffect(() => {
    if (!showDetails) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowDetails(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [showDetails]);

  // Focus management
  useEffect(() => {
    if (showDetails && popoverRef.current) {
      const t = setTimeout(() => popoverRef.current?.focus({ preventScroll: true }), 10);
      return () => clearTimeout(t);
    }
  }, [showDetails]);

  // Early return if no wallet data (after all hooks)
  if (!walletData || !address) return null;
  if (mode === 'hidden') return null;

  const handleCopyAddress = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleDetails = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isSwitcherOpen) closeSwitcher();
    setShowDetails(prev => !prev);
  };

  const toggleSwitcher = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (showDetails) setShowDetails(false);
    if (ctxToggle) ctxToggle('wallet-switcher');
    else setLocalSwitcherOpen(prev => !prev);
  };

  const handleSwitch = (addr: string) => {
    closeSwitcher();
    onSwitchWallet?.(addr);
  };

  // --- Popover: Wallet Details ---
  const detailsPopover = (
    <div
      ref={popoverRef}
      className="fixed w-[320px] bg-[#0a0a0a] border border-white/[0.06] shadow-2xl shadow-black/80 overflow-hidden"
      style={{
        top: popoverPosition.top,
        left: popoverPosition.left,
        zIndex: 9999,
        clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))',
      }}
      role="dialog"
      aria-label="Wallet details"
      aria-modal="true"
      tabIndex={-1}
    >
      <div className="absolute top-0 left-0 right-0 h-[2px] gradient-accent-line opacity-50" aria-hidden="true" />

      <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
        <span className="text-[11px] tracking-[0.12em] uppercase text-[var(--gs-gray-3)] font-medium">
          Wallet Details
        </span>
        <button
          onClick={() => setShowDetails(false)}
          className="p-1 text-[var(--gs-gray-2)] hover:text-white/80 hover:bg-white/5 rounded transition"
          aria-label="Close"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="px-4 pt-3 pb-0 flex flex-wrap items-center gap-2">
        <span
          className="px-2 py-0.5 text-[11px] font-medium rounded"
          style={{ backgroundColor: `${networkColor}12`, color: networkColor, border: `1px solid ${networkColor}25` }}
        >
          {networkLabel}
        </span>
        {walletTypeLabel && (
          <span
            className="px-2 py-0.5 text-[11px] font-medium rounded"
            style={{ backgroundColor: `${walletTypeColor}12`, color: walletTypeColor, border: `1px solid ${walletTypeColor}25` }}
          >
            {walletTypeLabel}
          </span>
        )}
      </div>

      <div className="p-4 space-y-4">
        <div>
          <span className="text-[11px] tracking-[0.12em] uppercase text-[var(--gs-gray-3)] font-medium block mb-1.5">Full Address</span>
          <div className="flex items-start gap-2">
            <code className="flex-1 text-[12px] font-mono text-white/85 bg-white/[0.03] px-3 py-2 rounded-lg border border-white/[0.06] break-all leading-relaxed">
              {address}
            </code>
            <button
              onClick={handleCopyAddress}
              className={`p-2 rounded-lg transition-all duration-200 flex-shrink-0 ${copied ? 'bg-[var(--gs-profit)]/20 text-[var(--gs-profit)]' : 'text-[var(--gs-gray-2)] hover:text-[#64ffff] hover:bg-white/5'}`}
              aria-label={copied ? 'Copied!' : 'Copy wallet address'}
            >
              {copied ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              )}
            </button>
          </div>
        </div>

        {networkInfo?.chainId && (
          <div>
            <span className="text-[11px] tracking-[0.12em] uppercase text-[var(--gs-gray-3)] font-medium block mb-1">Chain ID</span>
            <span className="text-[13px] font-medium text-white/85 font-mono">{networkInfo.chainId}</span>
          </div>
        )}

        <div>
          <span className="text-[11px] tracking-[0.12em] uppercase text-[var(--gs-gray-3)] font-medium block mb-1">Network</span>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: networkColor }} />
            <span className="text-[13px] font-medium text-white/85">GunzChain {networkLabel}</span>
          </div>
        </div>

        <div>
          <span className="text-[11px] tracking-[0.12em] uppercase text-[var(--gs-gray-3)] font-medium block mb-1">Wallet Type</span>
          <span className="text-[13px] font-medium text-white/85">{walletTypeFullLabel}</span>
        </div>

        {lastUpdated && (
          <div>
            <span className="text-[11px] tracking-[0.12em] uppercase text-[var(--gs-gray-3)] font-medium block mb-1">Last Updated</span>
            <span className="text-[13px] font-medium text-white/85">{lastUpdated.toLocaleString()}</span>
          </div>
        )}
      </div>

      <div className="px-4 py-2.5 bg-white/[0.02] border-t border-white/[0.06]">
        <p className="text-[11px] text-[var(--gs-gray-2)]">Data from GunzChain RPC</p>
      </div>
    </div>
  );

  // --- Copy button (shared) ---
  const copyButton = (
    <button
      onClick={handleCopyAddress}
      className={`p-1 rounded transition-all duration-200 ${copied ? 'bg-[var(--gs-profit)]/20 text-[var(--gs-profit)]' : 'text-[var(--gs-gray-2)] hover:text-[#64ffff] hover:bg-white/5'}`}
      aria-label={copied ? 'Copied!' : 'Copy wallet address'}
    >
      {copied ? (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
      ) : (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
      )}
    </button>
  );

  // --- Mode: Viewing foreign wallet ---
  if (mode === 'viewing') {
    return (
      <div className={`w-full ${className}`}>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[9px] tracking-[0.15em] uppercase text-[var(--gs-gray-3)]">Viewing</span>
          <span className="text-[15px] font-semibold text-white font-mono tracking-tight">{shortAddress}</span>
          {copyButton}
          <div className="flex-1" />
          {primaryWalletAddress ? (
            <button
              onClick={() => onBackToOwnWallet?.()}
              className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-[var(--gs-purple)] hover:text-[var(--gs-lime)] transition-colors cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Account Wallet
            </button>
          ) : (
            <Link
              href="/portfolio"
              className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-[var(--gs-purple)] hover:text-[var(--gs-lime)] transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              My Portfolio
            </Link>
          )}

          {/* Share button */}
          {address && portfolioResult && (
            <ShareDropdown
              walletAddress={address}
              totalUsd={shareTotal}
              gunBalance={shareGunBalance}
              nftCount={portfolioResult.nftCount}
              nftPnlPct={nftPnL.pct}
            />
          )}
        </div>
      </div>
    );
  }

  // --- Mode: Simple (unauthenticated) or Switcher ---
  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center gap-3">
        {/* Address + copy + switch */}
        <span className="text-[15px] font-semibold text-white font-mono tracking-tight">{shortAddress}</span>
        {copyButton}

        {/* Switcher button — icon-only, next to address (only in switcher mode) */}
        {mode === 'switcher' && (
          <button
            ref={switcherBtnRef}
            onClick={toggleSwitcher}
            className={`p-1.5 transition-colors cursor-pointer ${isSwitcherOpen ? 'text-[var(--gs-lime)]' : 'text-[var(--gs-gray-3)] hover:text-[var(--gs-lime)]'}`}
            aria-label="Switch wallet"
            title="Switch wallet"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
            </svg>
          </button>
        )}

        <div className="flex-1" />

        {/* Status indicator */}
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: status.color }} />
          <span className="text-[11px] text-[var(--gs-gray-3)]">{status.label}</span>
          {lastUpdated && (
            <span className="text-[11px] text-[var(--gs-gray-2)]">· {formatLastUpdated(lastUpdated)}</span>
          )}
        </div>

        {/* Details button */}
        <button
          ref={triggerRef}
          onClick={toggleDetails}
          className="flex items-center gap-1 text-[11px] text-[var(--gs-gray-3)] hover:text-white/80 hover:bg-white/5 px-2 py-1 rounded transition"
          aria-expanded={showDetails}
          aria-controls={popoverId}
          aria-haspopup="dialog"
        >
          <span>Details</span>
          <svg className={`w-3 h-3 transition-transform ${showDetails ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Share button */}
        {address && portfolioResult && (
          <ShareDropdown
            walletAddress={address}
            totalUsd={shareTotal}
            gunBalance={shareGunBalance}
            nftCount={portfolioResult.nftCount}
            nftPnlPct={nftPnL.pct}
          />
        )}
      </div>

      {/* Details popover portal */}
      {mounted && showDetails && createPortal(detailsPopover, document.body)}

      {/* Wallet switcher drop panel */}
      <DropPanel isOpen={isSwitcherOpen} onClose={closeSwitcher} title="Portfolio Wallets" portalTarget={panelCtx?.panelSlotNode ?? null} triggerRef={switcherBtnRef}>
        <div className="px-4 py-2.5 border-b border-white/[0.06] flex items-center justify-between">
          <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--gs-gray-3)]">
            Wallets
          </span>
          <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--gs-purple)] tabular-nums">
            {portfolioAddresses.length + (primaryWalletAddress && !portfolioAddresses.some(p => p.address.toLowerCase() === primaryWalletAddress.toLowerCase()) ? 1 : 0)}/5
          </span>
        </div>

        <div className="py-1">
          {primaryWalletAddress && (
            <WalletRow
              address={primaryWalletAddress}
              label="Connected Wallet"
              isActive={aggregatedAddresses.some(a => a.toLowerCase() === primaryWalletAddress.toLowerCase())}
              isPrimary
              onClick={() => handleSwitch(primaryWalletAddress)}
            />
          )}

          {portfolioAddresses
            .filter(p => p.address.toLowerCase() !== primaryWalletAddress?.toLowerCase())
            .map(pa => (
              <WalletRow
                key={pa.id}
                address={pa.address}
                label={pa.label}
                isActive={aggregatedAddresses.some(a => a.toLowerCase() === pa.address.toLowerCase())}
                onClick={() => handleSwitch(pa.address)}
              />
            ))}
        </div>

        <div className="px-4 py-2.5 border-t border-white/[0.06]">
          <Link
            href="/account"
            onClick={closeSwitcher}
            className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-widest text-[var(--gs-gray-3)] hover:text-[var(--gs-lime)] transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Manage Wallets
          </Link>
        </div>
      </DropPanel>
    </div>
  );
}

// --- Wallet Row (used in switcher dropdown) ---
function WalletRow({
  address,
  label,
  isActive,
  isPrimary,
  onClick,
}: {
  address: string;
  label: string | null | undefined;
  isActive: boolean;
  isPrimary?: boolean;
  onClick: () => void;
}) {
  const short = truncateAddr(address);

  return (
    <button
      onClick={onClick}
      className={`w-full px-4 py-2.5 flex items-center gap-3 transition-colors cursor-pointer ${
        isActive
          ? 'bg-[var(--gs-lime)]/[0.05] border-l-2 border-l-[var(--gs-lime)]'
          : 'hover:bg-white/[0.03] border-l-2 border-l-transparent'
      }`}
    >
      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
        isActive ? 'bg-[var(--gs-lime)] shadow-[0_0_6px_var(--gs-lime)]' : 'bg-[var(--gs-gray-1)]'
      }`} />
      <div className="flex-1 text-left min-w-0">
        <span className="font-mono text-[12px] text-[var(--gs-white)] tracking-wider block truncate">
          {short}
        </span>
        {label && (
          <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--gs-gray-3)] block truncate">
            {label}
          </span>
        )}
      </div>
      {isPrimary && (
        <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--gs-lime)] border border-[var(--gs-lime)]/30 px-1.5 py-0.5 flex-shrink-0">
          Primary
        </span>
      )}
    </button>
  );
}
