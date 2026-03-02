import { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { usePortfolioWallet } from '@/lib/contexts/PortfolioContext';
import { useSlidePanelContext } from '@/lib/contexts/SlidePanelContext';
import { useUserProfile } from '@/lib/hooks/useUserProfile';
import { isAdminWallet } from '@/lib/auth/dynamicAuth';
import { useGlitchScramble } from './hooks/useGlitchScramble';
import { truncateAddress } from './utils';

interface WalletDropdownProps {
  walletAddress: string;
  connectorName: string;
  isActive: boolean;
  pathname: string;
  onDisconnect: () => void;
  onSwitchWallet?: (address: string) => void;
}

const SPRING = { stiffness: 300, damping: 30, mass: 0.8 };

export function WalletDropdown({
  walletAddress,
  connectorName,
  isActive,
  pathname,
  onDisconnect,
  onSwitchWallet,
}: WalletDropdownProps) {
  const [copied, setCopied] = useState(false);
  const triggerBtnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, right: 0 });

  // Wallet details — only available on portfolio page (inside PortfolioProvider)
  const { walletData, networkInfo, walletType } = usePortfolioWallet();
  const { profile } = useUserProfile();
  const portfolioAddresses = profile?.portfolioAddresses ?? [];

  // Panel state — use context if available (portfolio page), else local state
  const panelCtx = useSlidePanelContext();
  const [localOpen, setLocalOpen] = useState(false);
  const isOpen = panelCtx ? panelCtx.activePanel === 'wallet' : localOpen;
  // Extract stable function refs — avoids re-triggering the route-change effect
  const ctxToggle = panelCtx?.togglePanel;
  const ctxClose = panelCtx?.closePanel;
  const toggle = useCallback(() => {
    if (ctxToggle) ctxToggle('wallet');
    else setLocalOpen((prev) => !prev);
  }, [ctxToggle]);
  const close = useCallback(() => {
    if (ctxClose) ctxClose();
    else setLocalOpen(false);
  }, [ctxClose]);

  const displayLabel = profile?.displayName || truncateAddress(walletAddress).toUpperCase();

  const { display, hovered, scramble, reset } = useGlitchScramble({
    label: displayLabel,
    target: displayLabel,
    skipChars: ['\u2026'],
  });

  const chainId = networkInfo?.chainId ?? null;
  const networkLabel = networkInfo?.environment === 'testnet' ? 'GunzChain Testnet' : 'GunzChain Mainnet';
  const walletTypeLabel = walletType === 'in-game' ? 'In\u2011Game' : walletType === 'external' ? 'External (Self\u2011Custody)' : null;
  const lastUpdated = walletData?.lastUpdated ? new Date(walletData.lastUpdated) : null;
  const viewedAddress = walletData?.address ?? null;

  // Close on route change
  useEffect(() => { close(); }, [pathname, close]);

  // Position dropdown below trigger
  useEffect(() => {
    if (!isOpen || !triggerBtnRef.current) return;
    const update = () => {
      const rect = triggerBtnRef.current!.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [isOpen]);

  // ESC key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, close]);

  // Click outside — excludes trigger to prevent toggle race
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (triggerBtnRef.current?.contains(target)) return;
      close();
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [isOpen, close]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [walletAddress]);

  // Admin notification badge — count of open feature requests
  const isAdmin = isAdminWallet(walletAddress);
  const [openRequestCount, setOpenRequestCount] = useState(0);

  useEffect(() => {
    if (!isAdmin) return;
    fetch('/api/feature-requests')
      .then(r => r.ok ? r.json() : [])
      .then((data: { status?: string }[]) => {
        const open = Array.isArray(data) ? data.filter(r => r.status === 'open').length : 0;
        setOpenRequestCount(open);
      })
      .catch(() => {});
  }, [isAdmin, pathname]);

  const navItems = [
    { href: '/account', label: 'Profile', active: pathname === '/account' },
    { href: '/feature-requests', label: 'Feature Requests', active: pathname === '/feature-requests' },
  ];

  const showBrackets = hovered || isActive || isOpen;

  return (
    <>
      {/* Trigger — truncated wallet address with glitch effect */}
      <button
        ref={triggerBtnRef}
        onClick={toggle}
        onMouseEnter={scramble}
        onMouseLeave={reset}
        className={`relative font-mono text-body-sm tracking-wider uppercase transition-colors duration-150 inline-flex items-center gap-1 py-1 cursor-pointer ${
          isActive
            ? 'text-[var(--gs-lime)]'
            : 'text-[var(--gs-gray-3)] hover:text-[var(--gs-white)]'
        }`}
      >
        <span className={`inline-block transition-opacity duration-150 ${showBrackets ? 'opacity-100' : 'opacity-0'}`} style={{ color: 'var(--gs-lime)' }}>[&nbsp;</span>
        <span className="relative">
          {display}
          {isAdmin && openRequestCount > 0 && (
            <span className="absolute -top-2.5 -right-3.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-[#FF4444] text-white text-[9px] font-mono font-bold leading-none px-1">
              {openRequestCount}
            </span>
          )}
        </span>
        <svg
          className={`w-3 h-3 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
        <span className={`inline-block transition-opacity duration-150 ${showBrackets ? 'opacity-100' : 'opacity-0'}`} style={{ color: 'var(--gs-lime)' }}>&nbsp;]</span>
      </button>

      {/* Dropdown — portaled below trigger */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isOpen && (
            <motion.div
              ref={panelRef}
              className="fixed w-72 max-w-[calc(100vw-48px)] z-[60] flex flex-col bg-[#0C0C0C] border border-white/[0.10] shadow-2xl shadow-black/80 ring-1 ring-black/60 overflow-hidden"
              style={{
                top: pos.top,
                right: pos.right,
                maxHeight: `calc(100dvh - ${pos.top}px - 24px)`,
                clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))',
              }}
              role="dialog"
              aria-modal="true"
              aria-label="Wallet"
              tabIndex={-1}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ type: 'spring', ...SPRING }}
            >
              {/* Accent line */}
              <div className="h-[2px] shrink-0 bg-gradient-to-r from-[var(--gs-lime)] to-[var(--gs-purple)]" />

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto">
                {/* Identity section */}
                <div className="px-4 py-3 border-b border-white/[0.06]">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--gs-gray-3)]">Connected Wallet</span>
                    <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--gs-lime)] border border-[var(--gs-lime)]/30 px-1.5 py-0.5">
                      GunzChain
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-data text-[var(--gs-white)] tracking-wider">
                      {walletAddress.slice(0, 6)}&hellip;{walletAddress.slice(-4)}
                    </span>
                    <button
                      onClick={handleCopy}
                      className="p-1 text-[var(--gs-gray-3)] hover:text-[var(--gs-lime)] transition-colors cursor-pointer"
                      title={copied ? 'Copied!' : 'Copy address'}
                    >
                      {copied ? (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                        </svg>
                      )}
                    </button>
                  </div>
                  {connectorName && (
                    <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--gs-gray-2)] mt-1 block">
                      via {connectorName}
                    </span>
                  )}
                </div>

                {/* Wallet details — only on portfolio page when wallet data is loaded */}
                {walletData && (
                  <div className="px-4 py-2.5 border-b border-white/[0.06] space-y-1.5">
                    {chainId && (
                      <div className="flex items-center justify-between gap-4 whitespace-nowrap">
                        <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--gs-gray-3)]">Chain ID</span>
                        <span className="font-mono text-data text-[var(--gs-white)] tabular-nums">{chainId}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-4 whitespace-nowrap">
                      <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--gs-gray-3)]">Network</span>
                      <span className="font-mono text-data text-[var(--gs-white)] flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--gs-lime)] flex-shrink-0" />
                        {networkLabel}
                      </span>
                    </div>
                    {walletTypeLabel && (
                      <div className="flex items-center justify-between gap-4 whitespace-nowrap">
                        <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--gs-gray-3)]">Wallet Type</span>
                        <span className="font-mono text-data font-semibold text-[var(--gs-white)]">{walletTypeLabel}</span>
                      </div>
                    )}
                    {lastUpdated && (
                      <div className="flex items-center justify-between gap-4 whitespace-nowrap">
                        <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--gs-gray-3)]">Last Updated</span>
                        <span className="font-mono text-data text-[var(--gs-white)] tabular-nums">
                          {lastUpdated.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric', year: 'numeric' })},{' '}
                          {lastUpdated.toLocaleTimeString()}
                        </span>
                      </div>
                    )}
                    <span className="font-mono text-[9px] text-[var(--gs-gray-2)] block pt-0.5">Data from GunzChain RPC</span>
                  </div>
                )}

                {/* Navigation links */}
                <div className="py-1">
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={close}
                      className={`flex items-center justify-between px-4 py-2.5 font-mono text-data tracking-wider uppercase transition-colors ${
                        item.active
                          ? 'text-[var(--gs-lime)] bg-[var(--gs-lime)]/[0.05]'
                          : 'text-[var(--gs-gray-3)] hover:text-[var(--gs-white)] hover:bg-white/[0.03]'
                      }`}
                    >
                      {item.label}
                      {item.href === '/feature-requests' && isAdmin && openRequestCount > 0 && (
                        <span className="min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-[#FF4444] text-white text-[9px] font-mono font-bold leading-none px-1.5">
                          {openRequestCount}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>

                {/* Portfolio wallets — shown when user has portfolio addresses */}
                {portfolioAddresses.length > 0 && (
                  <div className="border-t border-white/[0.06]">
                    <div className="flex items-center justify-between px-4 pt-2.5 pb-1">
                      <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--gs-gray-3)]">Portfolio Wallets</span>
                      <span className="font-mono text-[9px] text-[var(--gs-gray-2)] tabular-nums">{portfolioAddresses.length}/5</span>
                    </div>
                    {portfolioAddresses.map((pa) => {
                      const isViewed = viewedAddress?.toLowerCase() === pa.address.toLowerCase();
                      return (
                        <button
                          key={pa.id}
                          onClick={() => {
                            close();
                            if (onSwitchWallet) {
                              onSwitchWallet(pa.address);
                            } else {
                              window.location.href = `/portfolio?address=${pa.address}`;
                            }
                          }}
                          className={`w-full flex items-center gap-2 px-4 py-2 text-left transition-colors cursor-pointer ${
                            isViewed
                              ? 'bg-[var(--gs-lime)]/[0.05] border-l-2 border-l-[var(--gs-lime)]'
                              : 'hover:bg-white/[0.03] border-l-2 border-l-transparent'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isViewed ? 'bg-[var(--gs-lime)]' : 'bg-[var(--gs-gray-2)]'}`} />
                          <span className="font-mono text-data text-[var(--gs-white)] tracking-wider">
                            {pa.address.slice(0, 6)}&hellip;{pa.address.slice(-4)}
                          </span>
                          {pa.label && (
                            <span className="font-mono text-[9px] text-[var(--gs-gray-3)] ml-auto truncate max-w-[80px]">{pa.label}</span>
                          )}
                        </button>
                      );
                    })}
                    <Link
                      href="/account"
                      onClick={close}
                      className="flex items-center gap-1.5 px-4 py-2 font-mono text-[9px] uppercase tracking-widest text-[var(--gs-gray-3)] hover:text-[var(--gs-purple)] transition-colors"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Manage Wallets
                    </Link>
                  </div>
                )}

                {/* Disconnect */}
                <div className="border-t border-white/[0.06] px-4 py-2.5">
                  <button
                    onClick={() => { close(); onDisconnect(); }}
                    className="w-full font-mono text-data tracking-wider uppercase text-[var(--gs-gray-3)] hover:text-[#FF4444] transition-colors text-left cursor-pointer"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}
