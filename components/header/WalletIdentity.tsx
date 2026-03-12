'use client';

import { useState, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import {
  usePortfolioWallet,
  usePortfolioResult,
  usePortfolioGunPrice,
  usePortfolioNFTs,
  useAllPortfolioNFTs,
  usePortfolioIdentity,
  useIsViewOnly,
} from '@/lib/contexts/PortfolioContext';
import { useNftPnL } from '@/components/portfolio-summary/hooks/useNftPnL';
import { ShareDropdown } from '@/components/portfolio-summary/ShareDropdown';
import DropPanel from '@/components/ui/DropPanel';
import { useSlidePanelContext } from '@/lib/contexts/SlidePanelContext';
import { usePortfolioAttestation } from '@/lib/hooks/usePortfolioAttestation';
import { clipHex } from '@/lib/utils/styles';
import { useReferral } from '@/lib/hooks/useReferral';
import { useUserProfile } from '@/lib/hooks/useUserProfile';

interface WalletIdentityProps {
  className?: string;
}

function truncateAddr(addr: string): string {
  return addr.length > 12 ? `${addr.slice(0, 6)}\u2026${addr.slice(-4)}` : addr;
}

/**
 * WalletIdentity - Context-aware wallet bar with switcher.
 * All data and actions consumed from PortfolioContext.
 *
 * Modes:
 *   Hidden   — own wallet, no portfolio addresses (navbar + status bar sufficient)
 *   Switcher — own wallet, 1+ portfolio addresses (dropdown to switch)
 *   Viewing  — foreign searched wallet (shows "Back to My Wallet")
 *   Simple   — unauthenticated search (address + copy + status only)
 */
export default function WalletIdentity({ className = '' }: WalletIdentityProps = {}) {
  const {
    portfolioAddresses,
    activeWalletAddress,
    allWalletAddresses,
    primaryWalletAddress,
    isAuthenticated,
    isInWatchlist,
    isInPortfolio,
    isAtPortfolioLimit,
    isAddingWatchlist,
    isAddingPortfolio,
    onSwitchWallet,
    onBackToOwnWallet,
    onAddToWatchlist,
    onAddToPortfolio,
  } = usePortfolioIdentity();
  const [copied, setCopied] = useState(false);
  const detailsBtnRef = useRef<HTMLButtonElement>(null);
  const switcherBtnRef = useRef<HTMLButtonElement>(null);

  // Panel state — use context if available, else local state
  const panelCtx = useSlidePanelContext();
  const [localSwitcherOpen, setLocalSwitcherOpen] = useState(false);
  const isSwitcherOpen = panelCtx ? panelCtx.activePanel === 'wallet-switcher' : localSwitcherOpen;
  const isDetailsOpen = panelCtx ? panelCtx.activePanel === 'details' : false;
  const isAttestOpen = panelCtx ? panelCtx.activePanel === 'attest' : false;
  // Extract stable function refs — avoids re-triggering effects when context value changes
  const ctxClose = panelCtx?.closePanel;
  const ctxToggle = panelCtx?.togglePanel;
  const closeSwitcher = useCallback(() => {
    if (ctxClose) ctxClose();
    else setLocalSwitcherOpen(false);
  }, [ctxClose]);
  const closeDetails = useCallback(() => {
    if (ctxClose) ctxClose();
  }, [ctxClose]);

  // Get data from context
  const { walletData, address, networkInfo, walletType } = usePortfolioWallet();
  const isViewOnly = useIsViewOnly();

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
      allWalletAddresses.some(a => a.toLowerCase() === viewedLower);
  }, [primaryWalletAddress, address, allWalletAddresses]);

  // Dynamic wallet provider for on-chain attestation signing
  const { primaryWallet } = useDynamicContext();
  // getWalletClient returns synchronously in Dynamic SDK v4
  const walletProviderObj = useMemo(() => {
    if (!primaryWallet?.connector || !isOwnWallet) return null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (primaryWallet.connector as any).getWalletClient?.() ?? null;
    } catch {
      return null;
    }
  }, [primaryWallet, isOwnWallet]);

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

  // Referral slug — only fetches for connected user's wallet (no-op if undefined)
  const { stats: referralStats } = useReferral(primaryWalletAddress ?? undefined);

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
  const shareGunSpent = useMemo(() => {
    if (!portfolioResult || !portfolioResult.totalGunSpent) return undefined;
    return portfolioResult.totalGunSpent.toLocaleString();
  }, [portfolioResult]);

  // On-chain attestation — uses ALL portfolio wallets, not just active
  const { profile } = useUserProfile();
  const { allPortfolioNfts, allPortfolioAddresses } = useAllPortfolioNFTs();
  const {
    attest,
    status: attestStatus,
    txHash,
    error: attestError,
    latestAttestation,
  } = usePortfolioAttestation(
    isOwnWallet ? (address ?? undefined) : undefined,
    allPortfolioNfts.length > 0 ? allPortfolioNfts : (allNfts ?? []),
    walletProviderObj,
    profile?.displayName,
    allPortfolioAddresses,
  );
  const isAttesting = attestStatus !== 'idle' && attestStatus !== 'success' && attestStatus !== 'error';
  const closeAttest = useCallback(() => { if (ctxClose) ctxClose(); }, [ctxClose]);

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
    if (ctxToggle) ctxToggle('details');
  };

  const toggleSwitcher = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (ctxToggle) ctxToggle('wallet-switcher');
    else setLocalSwitcherOpen(prev => !prev);
  };

  const handleSwitch = (addr: string) => {
    closeSwitcher();
    onSwitchWallet(addr);
  };

  // --- Copy button (shared) ---
  const copyButton = (
    <button
      onClick={handleCopyAddress}
      className={`p-1.5 transition-colors cursor-pointer ${copied ? 'text-[var(--gs-profit)]' : 'text-[var(--gs-gray-3)] hover:text-[var(--gs-lime)]'}`}
      aria-label={copied ? 'Copied!' : 'Copy wallet address'}
      title="Copy address"
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

          {/* Watch + Portfolio actions — viewing mode guarantees isAuthenticated */}
          <button
            onClick={() => onAddToWatchlist(address)}
            disabled={isInWatchlist || isAddingWatchlist}
            className={`font-mono text-[10px] uppercase tracking-wider px-2.5 py-1 border transition-colors cursor-pointer disabled:cursor-default flex items-center gap-1 ${
              isInWatchlist
                ? 'text-[var(--gs-lime)] border-[var(--gs-lime)]/40'
                : isAddingWatchlist
                  ? 'text-[var(--gs-gray-3)] border-[var(--gs-gray-1)]'
                  : 'text-[var(--gs-gray-3)] border-white/[0.06] hover:border-[var(--gs-lime)]/40 hover:text-[var(--gs-lime)]'
            }`}
          >
            {isAddingWatchlist ? (
              <span className="w-2.5 h-2.5 border border-current border-t-transparent rounded-full animate-spin" />
            ) : isInWatchlist ? '\u2713 Watching' : '+ Watch'}
          </button>
          {isAtPortfolioLimit && !isInPortfolio ? (
              <span className="font-mono text-[10px] uppercase tracking-wider px-2.5 py-1 text-[var(--gs-gray-2)]">
                5/5
              </span>
            ) : (
              <button
                onClick={() => onAddToPortfolio(address)}
                disabled={isInPortfolio || isAddingPortfolio}
                className={`font-mono text-[10px] uppercase tracking-wider px-2.5 py-1 border transition-colors cursor-pointer disabled:cursor-default flex items-center gap-1 ${
                  isInPortfolio
                    ? 'text-[var(--gs-purple)] border-[var(--gs-purple)]/40'
                    : isAddingPortfolio
                      ? 'text-[var(--gs-gray-3)] border-[var(--gs-gray-1)]'
                      : 'text-[var(--gs-gray-3)] border-white/[0.06] hover:border-[var(--gs-purple)]/40 hover:text-[var(--gs-purple)]'
                }`}
              >
                {isAddingPortfolio ? (
                  <span className="w-2.5 h-2.5 border border-current border-t-transparent rounded-full animate-spin" />
                ) : isInPortfolio ? '\u2713 Portfolio' : '+ Portfolio'}
              </button>
            )
          }

          {primaryWalletAddress ? (
            <button
              onClick={() => onBackToOwnWallet()}
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
              referralSlug={referralStats?.slug}
              totalUsd={shareTotal}
              gunBalance={shareGunBalance}
              nftCount={portfolioResult.nftCount}
              nftPnlPct={nftPnL.pct}
              totalGunSpent={shareGunSpent}
            />
          )}
        </div>
      </div>
    );
  }

  // --- Mode: Simple (unauthenticated) or Switcher ---
  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center gap-2">
        {/* Left: address + copy + status */}
        <span className="text-[15px] font-semibold text-white font-mono tracking-tight">{shortAddress}</span>
        {copyButton}

        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: status.color }} />
          <span className="text-[11px] text-[var(--gs-gray-3)]">{status.label}</span>
          {lastUpdated && (
            <span className="text-[11px] text-[var(--gs-gray-2)]">· {formatLastUpdated(lastUpdated)}</span>
          )}
        </div>

        {isViewOnly && (
          <span className="font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 text-[var(--gs-gray-4)] border border-white/[0.08] bg-white/[0.03]">
            View Only
          </span>
        )}

        <div className="flex-1" />

        {/* Right: info + share + switch */}
        <button
          ref={detailsBtnRef}
          onClick={toggleDetails}
          className={`p-1.5 transition-colors cursor-pointer ${isDetailsOpen ? 'text-[var(--gs-lime)]' : 'text-[var(--gs-gray-3)] hover:text-[var(--gs-lime)]'}`}
          aria-label="Wallet details"
          title="Wallet details"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
          </svg>
        </button>

        {address && portfolioResult && (
          <ShareDropdown
            walletAddress={address}
            referralSlug={referralStats?.slug}
            totalUsd={shareTotal}
            gunBalance={shareGunBalance}
            nftCount={portfolioResult.nftCount}
            nftPnlPct={nftPnL.pct}
            totalGunSpent={shareGunSpent}
          />
        )}

        {isOwnWallet && !isViewOnly && walletProviderObj && allNfts && allNfts.length > 0 && (
          <button
            onClick={() => ctxToggle?.('attest')}
            className={`p-1.5 transition-colors cursor-pointer ${isAttestOpen ? 'text-[var(--gs-lime)]' : 'text-[var(--gs-gray-3)] hover:text-[var(--gs-lime)]'}`}
            aria-label="On-chain verification"
            title="On-chain verification"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </button>
        )}

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
      </div>

      {/* Wallet details drop panel */}
      <DropPanel
        isOpen={isDetailsOpen}
        onClose={closeDetails}
        title="Wallet Details"
        portalTarget={panelCtx?.panelSlotNode ?? null}
        triggerRef={detailsBtnRef}
      >
        {/* Badges row */}
        <div className="px-4 pt-3 pb-0 flex flex-wrap items-center gap-2">
          <span
            className="px-2 py-0.5 text-[11px] font-medium"
            style={{ backgroundColor: `${networkColor}12`, color: networkColor, border: `1px solid ${networkColor}25` }}
          >
            {networkLabel}
          </span>
          {walletTypeLabel && (
            <span
              className="px-2 py-0.5 text-[11px] font-medium"
              style={{ backgroundColor: `${walletTypeColor}12`, color: walletTypeColor, border: `1px solid ${walletTypeColor}25` }}
            >
              {walletTypeLabel}
            </span>
          )}
          {isViewOnly && (
            <span className="px-2 py-0.5 text-[11px] font-medium font-mono uppercase tracking-wider text-[var(--gs-gray-4)] border border-white/[0.08] bg-white/[0.03]">
              View Only
            </span>
          )}
        </div>

        <div className="p-4 space-y-4">
          {/* Full address + copy */}
          <div>
            <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--gs-gray-3)] block mb-1.5">Full Address</span>
            <div className="flex items-start gap-2">
              <code className="flex-1 text-[12px] font-mono text-white/85 bg-white/[0.03] px-3 py-2 border border-white/[0.06] break-all leading-relaxed">
                {address}
              </code>
              <button
                onClick={handleCopyAddress}
                className={`p-2 transition-all duration-200 flex-shrink-0 ${copied ? 'bg-[var(--gs-profit)]/20 text-[var(--gs-profit)]' : 'text-[var(--gs-gray-2)] hover:text-[var(--gs-lime)] hover:bg-white/5'}`}
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

          {/* Key-value info rows */}
          {networkInfo?.chainId && (
            <div>
              <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--gs-gray-3)] block mb-1">Chain ID</span>
              <span className="text-[13px] font-medium text-white/85 font-mono">{networkInfo.chainId}</span>
            </div>
          )}

          <div>
            <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--gs-gray-3)] block mb-1">Network</span>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: networkColor }} />
              <span className="text-[13px] font-medium text-white/85">GunzChain {networkLabel}</span>
            </div>
          </div>

          <div>
            <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--gs-gray-3)] block mb-1">Wallet Type</span>
            <span className="text-[13px] font-medium text-white/85">{walletTypeFullLabel}</span>
          </div>

          {lastUpdated && (
            <div>
              <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--gs-gray-3)] block mb-1">Last Updated</span>
              <span className="text-[13px] font-medium text-white/85">{lastUpdated.toLocaleString()}</span>
            </div>
          )}
        </div>

        <div className="px-4 py-2.5 bg-white/[0.02] border-t border-white/[0.06]">
          <p className="text-[11px] text-[var(--gs-gray-2)]">Data from GunzChain RPC</p>
        </div>
      </DropPanel>

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
              isActive={activeWalletAddress?.toLowerCase() === primaryWalletAddress.toLowerCase()}
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
                isActive={activeWalletAddress?.toLowerCase() === pa.address.toLowerCase()}
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

      {/* On-chain verification panel */}
      <DropPanel isOpen={isAttestOpen} onClose={closeAttest} title="On&#8209;Chain Verification" portalTarget={panelCtx?.panelSlotNode ?? null}>
        <div className="px-3 py-3 space-y-2">
          {/* Existing attestation indicator */}
          {latestAttestation && attestStatus === 'idle' && (
            <div className="flex items-center gap-2 px-4 py-2 bg-[var(--gs-lime)]/[0.05] border border-[var(--gs-lime)]/10">
              <svg className="w-3.5 h-3.5 text-[var(--gs-lime)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span className="font-mono text-[9px] text-[var(--gs-lime)]">
                Verified {new Date(latestAttestation.timestamp).toLocaleDateString()}
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
                {attestStatus === 'idle'
                  ? (latestAttestation ? 'Update Your Verification' : 'Verify Your Account')
                  : attestStatus === 'building' ? 'Building proof\u2026'
                  : attestStatus === 'uploading' ? 'Uploading metadata\u2026'
                  : attestStatus === 'switching-chain' ? 'Switch to Avalanche\u2026'
                  : attestStatus === 'signing' ? 'Sign in wallet\u2026'
                  : attestStatus === 'confirming' ? 'Confirming\u2026'
                  : attestStatus === 'success' ? 'Verified!'
                  : 'Retry Verification'}
              </span>
              <span className="font-mono text-[9px] text-[var(--gs-gray-3)]">
                {attestStatus === 'success' && txHash
                  ? 'View on Snowtrace'
                  : attestStatus === 'error' && attestError
                    ? attestError.slice(0, 60)
                    : latestAttestation
                      ? 'Create a new snapshot of your holdings for tournaments and rankings'
                      : 'Prove your wallet and current holdings on Avalanche C\u2011Chain'}
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

          {/* Why Verify? / Coming Soon — row-aligned grid */}
          <div className="border-t border-white/[0.06] mt-3 pt-3 px-1">
            <div className="grid grid-cols-[1fr_auto_1fr] gap-x-4 gap-y-3 text-[13px] leading-normal">
              {/* Headers */}
              <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--gs-gray-3)]">Why Verify?</span>
              <div />
              <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--gs-purple)]">Coming Soon</span>

              {/* Row 1 */}
              <div className="flex gap-2.5 items-start">
                <span className="text-[var(--gs-lime)] shrink-0 leading-none mt-0.5">&#10003;</span>
                <span className="text-white/80">Prove you own this wallet and its holdings</span>
              </div>
              <div className="w-px bg-white/[0.06] self-stretch" />
              <div className="flex gap-2.5 items-start">
                <span className="text-[var(--gs-purple)] shrink-0 text-[10px] mt-1">&#9670;</span>
                <span className="text-white/70">Verified tournaments</span>
              </div>

              {/* Row 2 */}
              <div className="flex gap-2.5 items-start">
                <span className="text-[var(--gs-lime)] shrink-0 leading-none mt-0.5">&#10003;</span>
                <span className="text-white/80">Tamper&#8209;proof record on Avalanche C&#8209;Chain</span>
              </div>
              <div className="w-px bg-white/[0.06] self-stretch" />
              <div className="flex gap-2.5 items-start">
                <span className="text-[var(--gs-purple)] shrink-0 text-[10px] mt-1">&#9670;</span>
                <span className="text-white/70">Verified player rankings</span>
              </div>

              {/* Row 3 */}
              <div className="flex gap-2.5 items-start">
                <span className="text-[var(--gs-lime)] shrink-0 leading-none mt-0.5">&#10003;</span>
                <span className="text-white/80">Shareable link anyone can verify on&#8209;chain</span>
              </div>
              <div className="w-px bg-white/[0.06] self-stretch" />
              <div className="flex gap-2.5 items-start">
                <span className="text-[var(--gs-purple)] shrink-0 text-[10px] mt-1">&#9670;</span>
                <span className="text-white/70">On&#8209;chain &amp; cross&#8209;platform economics</span>
              </div>

              {/* Row 4 */}
              <div className="flex gap-2.5 items-start">
                <span className="text-[var(--gs-lime)] shrink-0 leading-none mt-0.5">&#10003;</span>
                <span className="text-white/80">Start your player legacy with a permanent full data archive</span>
              </div>
              <div className="w-px bg-white/[0.06] self-stretch" />
              <div className="flex gap-2.5 items-start">
                <span className="text-[var(--gs-gray-4)] shrink-0 text-[10px] mt-1">&#9670;</span>
                <span className="text-[var(--gs-gray-4)]">More&hellip;</span>
              </div>
            </div>
          </div>
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
