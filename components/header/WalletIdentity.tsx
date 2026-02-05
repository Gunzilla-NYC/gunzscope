'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  usePortfolioWallet,
} from '@/lib/contexts/PortfolioContext';

interface WalletIdentityProps {
  className?: string;
}

interface PopoverPosition {
  top: number;
  left: number;
}

/**
 * WalletIdentity - Displays wallet address, network, and type information.
 * Now uses PortfolioContext instead of props for data access.
 */
export default function WalletIdentity({ className = '' }: WalletIdentityProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState<PopoverPosition>({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const popoverId = 'wallet-details-popover';

  // Get data from context
  const { walletData, address, networkInfo, walletType } = usePortfolioWallet();

  const lastUpdated = walletData?.lastUpdated;

  // Format address for display (handle null safely)
  const shortAddress = address && address.length > 12
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : address || '';

  // Network info
  const isMainnet = networkInfo?.environment === 'mainnet' || networkInfo?.environment === undefined;
  const networkLabel = isMainnet ? 'Mainnet' : 'Testnet';
  const networkColor = isMainnet ? '#beffd2' : '#fbbf24';

  // Wallet type info
  const walletTypeLabel = walletType === 'in-game' ? 'In-Game' : walletType === 'external' ? 'External' : null;
  const walletTypeFullLabel = walletType === 'in-game' ? 'In-Game (Custodial)' : walletType === 'external' ? 'External (Self-Custody)' : 'Unknown';
  const walletTypeColor = walletType === 'in-game' ? '#96aaff' : walletType === 'external' ? '#64ffff' : '#6b7280';

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

  // Mount check for portal (must be called unconditionally)
  useEffect(() => {
    setMounted(true);
  }, []);

  // Calculate popover position
  const updatePopoverPosition = useCallback(() => {
    if (!triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const popoverWidth = 320;
    const popoverHeight = 380;

    let top = rect.bottom + 8;
    let left = rect.left;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (left + popoverWidth > viewportWidth - 16) {
      left = viewportWidth - popoverWidth - 16;
    }
    if (left < 16) {
      left = 16;
    }

    if (top + popoverHeight > viewportHeight - 16) {
      const spaceAbove = rect.top - 8;
      if (spaceAbove > popoverHeight) {
        top = rect.top - popoverHeight - 8;
      } else {
        top = viewportHeight - popoverHeight - 16;
      }
    }

    setPopoverPosition({ top, left });
  }, []);

  // Update position on open, resize, scroll
  useEffect(() => {
    if (!showDetails) return;

    updatePopoverPosition();

    const handleUpdate = () => {
      requestAnimationFrame(updatePopoverPosition);
    };

    window.addEventListener('resize', handleUpdate);
    window.addEventListener('scroll', handleUpdate, true);

    return () => {
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('scroll', handleUpdate, true);
    };
  }, [showDetails, updatePopoverPosition]);

  // Close on click outside
  useEffect(() => {
    if (!showDetails) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        popoverRef.current &&
        !popoverRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        setShowDetails(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDetails]);

  // Close on escape
  useEffect(() => {
    if (!showDetails) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowDetails(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showDetails]);

  // Focus management
  useEffect(() => {
    if (showDetails && popoverRef.current) {
      popoverRef.current.focus();
    }
  }, [showDetails]);

  // Early return if no wallet data (after all hooks to satisfy React rules)
  if (!walletData || !address) return null;

  const handleCopyAddress = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleDetails = () => {
    setShowDetails(prev => !prev);
  };

  // Popover content - contains all technical metadata
  const popoverContent = (
    <div
      ref={popoverRef}
      className="fixed w-[320px] bg-[#0a0a0a] border border-white/[0.06] shadow-2xl shadow-black/80 overflow-hidden relative"
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
      {/* Top accent gradient line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] gradient-accent-line opacity-50" aria-hidden="true" />

      {/* Header */}
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

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Full address */}
        <div>
          <span className="text-[11px] tracking-[0.12em] uppercase text-[var(--gs-gray-3)] font-medium block mb-1.5">
            Full Address
          </span>
          <div className="flex items-start gap-2">
            <code className="flex-1 text-[12px] font-mono text-white/85 bg-white/[0.03] px-3 py-2 rounded-lg border border-white/[0.06] break-all leading-relaxed">
              {address}
            </code>
            <button
              onClick={handleCopyAddress}
              className={`p-2 rounded-lg transition-all duration-200 flex-shrink-0 ${
                copied
                  ? 'bg-[var(--gs-profit)]/20 text-[var(--gs-profit)]'
                  : 'text-[var(--gs-gray-2)] hover:text-[#64ffff] hover:bg-white/5'
              }`}
              aria-label={copied ? 'Copied!' : 'Copy wallet address'}
            >
              {copied ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Chain ID */}
        {networkInfo?.chainId && (
          <div>
            <span className="text-[11px] tracking-[0.12em] uppercase text-[var(--gs-gray-3)] font-medium block mb-1">
              Chain ID
            </span>
            <span className="text-[13px] font-medium text-white/85 font-mono">
              {networkInfo.chainId}
            </span>
          </div>
        )}

        {/* Network */}
        <div>
          <span className="text-[11px] tracking-[0.12em] uppercase text-[var(--gs-gray-3)] font-medium block mb-1">
            Network
          </span>
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: networkColor }}
            />
            <span className="text-[13px] font-medium text-white/85">
              GunzChain {networkLabel}
            </span>
          </div>
        </div>

        {/* Wallet Type */}
        <div>
          <span className="text-[11px] tracking-[0.12em] uppercase text-[var(--gs-gray-3)] font-medium block mb-1">
            Wallet Type
          </span>
          <span className="text-[13px] font-medium text-white/85">
            {walletTypeFullLabel}
          </span>
        </div>

        {/* Exact timestamp */}
        {lastUpdated && (
          <div>
            <span className="text-[11px] tracking-[0.12em] uppercase text-[var(--gs-gray-3)] font-medium block mb-1">
              Last Updated
            </span>
            <span className="text-[13px] font-medium text-white/85">
              {lastUpdated.toLocaleString()}
            </span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 bg-white/[0.02] border-t border-white/[0.06]">
        <p className="text-[11px] text-[var(--gs-gray-2)]">
          Data from GunzChain RPC
        </p>
      </div>
    </div>
  );

  return (
    <div className={`w-full ${className}`}>
      {/* Row 1: Header with eyebrow + status */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] tracking-[0.12em] uppercase text-[var(--gs-gray-3)] font-medium">
          Wallet
        </span>
        <div className="flex items-center gap-1.5">
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: status.color }}
          />
          <span className="text-[11px] text-[var(--gs-gray-3)]">{status.label}</span>
        </div>
      </div>

      {/* Row 2: Primary address */}
      <div className="mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[20px] font-semibold text-white font-mono tracking-tight">
            {shortAddress}
          </span>
          <button
            onClick={handleCopyAddress}
            className={`p-1.5 rounded transition-all duration-200 ${
              copied
                ? 'bg-[var(--gs-profit)]/20 text-[var(--gs-profit)]'
                : 'text-[var(--gs-gray-2)] hover:text-[#64ffff] hover:bg-white/5'
            }`}
            aria-label={copied ? 'Copied!' : 'Copy wallet address'}
          >
            {copied ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Row 3: Context chips - network + wallet type */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {/* Network chip (single source of network display) */}
        <span
          className="px-2 py-0.5 text-[11px] font-medium rounded"
          style={{
            backgroundColor: `${networkColor}12`,
            color: networkColor,
            border: `1px solid ${networkColor}25`,
          }}
        >
          {networkLabel}
        </span>

        {/* Wallet type chip */}
        {walletTypeLabel && (
          <span
            className="px-2 py-0.5 text-[11px] font-medium rounded"
            style={{
              backgroundColor: `${walletTypeColor}12`,
              color: walletTypeColor,
              border: `1px solid ${walletTypeColor}25`,
            }}
          >
            {walletTypeLabel}
          </span>
        )}

        {/* Last updated as subtle inline text */}
        {lastUpdated && (
          <span className="text-[11px] text-[var(--gs-gray-2)]">
            · {formatLastUpdated(lastUpdated)}
          </span>
        )}
      </div>

      {/* Row 4: Details affordance */}
      <button
        ref={triggerRef}
        onClick={toggleDetails}
        className="flex items-center gap-1.5 text-[12px] text-[var(--gs-gray-3)] hover:text-white/80 hover:bg-white/5 px-2 py-1.5 -ml-2 rounded transition"
        aria-expanded={showDetails}
        aria-controls={popoverId}
        aria-haspopup="dialog"
      >
        <span>Details</span>
        <svg
          className={`w-3.5 h-3.5 transition-transform ${showDetails ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Portal-based popover */}
      {mounted && showDetails && createPortal(popoverContent, document.body)}
    </div>
  );
}
