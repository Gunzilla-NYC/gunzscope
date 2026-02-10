'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import Logo from './Logo';

const GLITCH_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&!';

function truncateAddress(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}\u2026${address.slice(-4)}`;
}

// =============================================================================
// GlitchLink — nav link with text scramble on hover
// =============================================================================

function GlitchLink({ href, label, isActive }: { href: string; label: string; isActive: boolean }) {
  const [display, setDisplay] = useState(label);
  const [hovered, setHovered] = useState(false);
  const frameRef = useRef<number>(0);
  const iterRef = useRef(0);
  const lastTickRef = useRef(0);

  const scramble = useCallback(() => {
    setHovered(true);
    iterRef.current = 0;
    lastTickRef.current = 0;
    const target = label.toUpperCase();
    const totalSteps = target.length * 3;

    const tick = (timestamp: number) => {
      if (timestamp - lastTickRef.current < 50) {
        frameRef.current = requestAnimationFrame(tick);
        return;
      }
      lastTickRef.current = timestamp;
      iterRef.current++;
      const resolved = Math.floor(iterRef.current / 3);

      setDisplay(
        target
          .split('')
          .map((char, i) => {
            if (char === ' ') return ' ';
            if (i < resolved) return char;
            return GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
          })
          .join('')
      );

      if (iterRef.current < totalSteps) {
        frameRef.current = requestAnimationFrame(tick);
      }
    };

    cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(tick);
  }, [label]);

  const reset = useCallback(() => {
    setHovered(false);
    cancelAnimationFrame(frameRef.current);
    setDisplay(label);
  }, [label]);

  useEffect(() => () => cancelAnimationFrame(frameRef.current), []);

  const showBrackets = hovered || isActive;

  return (
    <Link
      href={href}
      onMouseEnter={scramble}
      onMouseLeave={reset}
      className={`relative font-mono text-body-sm tracking-wider uppercase transition-colors duration-150 inline-block py-1 ${
        isActive
          ? 'text-[var(--gs-lime)]'
          : 'text-[var(--gs-gray-3)] hover:text-[var(--gs-white)]'
      }`}
    >
      <span className={`inline-block transition-opacity duration-150 ${showBrackets ? 'opacity-100' : 'opacity-0'}`} style={{ color: 'var(--gs-lime)' }}>[&nbsp;</span>
      {display}
      <span className={`inline-block transition-opacity duration-150 ${showBrackets ? 'opacity-100' : 'opacity-0'}`} style={{ color: 'var(--gs-lime)' }}>&nbsp;]</span>
    </Link>
  );
}

// =============================================================================
// WalletDropdown — wallet address trigger + rich account popover
// =============================================================================

function WalletDropdown({
  walletAddress,
  connectorName,
  isActive,
  pathname,
  onDisconnect,
}: {
  walletAddress: string;
  connectorName: string;
  isActive: boolean;
  pathname: string;
  onDisconnect: () => void;
}) {
  const [open, setOpen] = useState(false);
  const displayLabel = truncateAddress(walletAddress).toUpperCase();
  const [display, setDisplay] = useState(displayLabel);
  const [hovered, setHovered] = useState(false);
  const [copied, setCopied] = useState(false);
  const frameRef = useRef<number>(0);
  const iterRef = useRef(0);
  const lastTickRef = useRef(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Glitch scramble — skips the ellipsis character
  const scramble = useCallback(() => {
    setHovered(true);
    iterRef.current = 0;
    lastTickRef.current = 0;
    const target = displayLabel;
    const totalSteps = target.length * 3;

    const tick = (timestamp: number) => {
      if (timestamp - lastTickRef.current < 50) {
        frameRef.current = requestAnimationFrame(tick);
        return;
      }
      lastTickRef.current = timestamp;
      iterRef.current++;
      const resolved = Math.floor(iterRef.current / 3);
      setDisplay(
        target
          .split('')
          .map((char, i) => {
            if (char === '\u2026') return char;
            if (i < resolved) return char;
            return GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
          })
          .join('')
      );
      if (iterRef.current < totalSteps) {
        frameRef.current = requestAnimationFrame(tick);
      }
    };

    cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(tick);
  }, [displayLabel]);

  const reset = useCallback(() => {
    setHovered(false);
    cancelAnimationFrame(frameRef.current);
    setDisplay(displayLabel);
  }, [displayLabel]);

  useEffect(() => () => cancelAnimationFrame(frameRef.current), []);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // Close on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [walletAddress]);

  const navItems = [
    { href: '/account', label: 'Wallets', active: pathname === '/account' },
    { href: '/feature-requests', label: 'Feature Requests', active: pathname === '/feature-requests' },
  ];

  const showBrackets = hovered || isActive || open;

  return (
    <div ref={dropdownRef} className="relative">
      {/* Trigger — truncated wallet address with glitch effect */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        onMouseEnter={scramble}
        onMouseLeave={reset}
        className={`relative font-mono text-body-sm tracking-wider uppercase transition-colors duration-150 inline-flex items-center gap-1 py-1 cursor-pointer ${
          isActive
            ? 'text-[var(--gs-lime)]'
            : 'text-[var(--gs-gray-3)] hover:text-[var(--gs-white)]'
        }`}
      >
        <span className={`inline-block transition-opacity duration-150 ${showBrackets ? 'opacity-100' : 'opacity-0'}`} style={{ color: 'var(--gs-lime)' }}>[&nbsp;</span>
        {display}
        <svg
          className={`w-3 h-3 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
        <span className={`inline-block transition-opacity duration-150 ${showBrackets ? 'opacity-100' : 'opacity-0'}`} style={{ color: 'var(--gs-lime)' }}>&nbsp;]</span>
      </button>

      {/* Rich popover panel */}
      {open && (
        <div className="absolute top-full right-0 mt-2 w-[280px] bg-[var(--gs-dark-2)] border border-white/[0.08] shadow-xl shadow-black/40 z-50 overflow-hidden">
          {/* Accent gradient line */}
          <div className="h-[2px] bg-gradient-to-r from-[var(--gs-lime)] to-[var(--gs-purple)]" />

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

          {/* Navigation links */}
          <div className="py-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-4 py-2.5 font-mono text-data tracking-wider uppercase transition-colors ${
                  item.active
                    ? 'text-[var(--gs-lime)] bg-[var(--gs-lime)]/[0.05]'
                    : 'text-[var(--gs-gray-3)] hover:text-[var(--gs-white)] hover:bg-white/[0.03]'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Disconnect */}
          <div className="border-t border-white/[0.06] px-4 py-2.5">
            <button
              onClick={() => { setOpen(false); onDisconnect(); }}
              className="w-full font-mono text-data tracking-wider uppercase text-[var(--gs-gray-3)] hover:text-[#FF4444] transition-colors text-left cursor-pointer"
            >
              Disconnect
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// TerminalStatusBar — persistent bottom bar showing connection state
// =============================================================================

function TerminalStatusBar({
  walletAddress,
  onDisconnect,
}: {
  walletAddress: string;
  onDisconnect: () => void;
}) {
  const truncated = truncateAddress(walletAddress);

  // Reserve space at bottom of page so content isn't hidden behind the bar
  useEffect(() => {
    document.body.style.paddingBottom = '2rem';
    return () => { document.body.style.paddingBottom = ''; };
  }, []);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--gs-dark-1)]/95 backdrop-blur-sm border-t border-white/[0.06]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-8 flex items-center justify-between font-mono text-[10px] tracking-widest uppercase">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--gs-lime)] shadow-[0_0_6px_var(--gs-lime)]" />
            <span className="text-[var(--gs-lime)]">Connected</span>
          </div>
          <span className="text-[var(--gs-gray-3)]">{truncated}</span>
          <span className="text-[var(--gs-gray-2)] hidden sm:inline">&middot; GunzChain</span>
        </div>
        <button
          onClick={onDisconnect}
          className="text-[var(--gs-gray-3)] hover:text-[#FF4444] transition-colors cursor-pointer"
        >
          [ Disconnect ]
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// Fallback ProfileDropdown — used when authenticated but no wallet address
// =============================================================================

function ProfileDropdown({ isActive, pathname }: { isActive: boolean; pathname: string }) {
  const [open, setOpen] = useState(false);
  const [display, setDisplay] = useState('Profile');
  const [hovered, setHovered] = useState(false);
  const frameRef = useRef<number>(0);
  const iterRef = useRef(0);
  const lastTickRef = useRef(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const scramble = useCallback(() => {
    setHovered(true);
    iterRef.current = 0;
    lastTickRef.current = 0;
    const target = 'PROFILE';
    const totalSteps = target.length * 3;

    const tick = (timestamp: number) => {
      if (timestamp - lastTickRef.current < 50) {
        frameRef.current = requestAnimationFrame(tick);
        return;
      }
      lastTickRef.current = timestamp;
      iterRef.current++;
      const resolved = Math.floor(iterRef.current / 3);
      setDisplay(
        target
          .split('')
          .map((char, i) => {
            if (i < resolved) return char;
            return GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
          })
          .join('')
      );
      if (iterRef.current < totalSteps) {
        frameRef.current = requestAnimationFrame(tick);
      }
    };

    cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(tick);
  }, []);

  const reset = useCallback(() => {
    setHovered(false);
    cancelAnimationFrame(frameRef.current);
    setDisplay('Profile');
  }, []);

  useEffect(() => () => cancelAnimationFrame(frameRef.current), []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  useEffect(() => { setOpen(false); }, [pathname]);

  const items = [
    { href: '/account', label: 'Wallets', active: pathname === '/account' },
    { href: '/feature-requests', label: 'Feature Requests', active: pathname === '/feature-requests' },
  ];

  const showBrackets = hovered || isActive || open;

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        onMouseEnter={scramble}
        onMouseLeave={reset}
        className={`relative font-mono text-body-sm tracking-wider uppercase transition-colors duration-150 inline-flex items-center gap-1 py-1 cursor-pointer ${
          isActive
            ? 'text-[var(--gs-lime)]'
            : 'text-[var(--gs-gray-3)] hover:text-[var(--gs-white)]'
        }`}
      >
        <span className={`inline-block transition-opacity duration-150 ${showBrackets ? 'opacity-100' : 'opacity-0'}`} style={{ color: 'var(--gs-lime)' }}>[&nbsp;</span>
        {display}
        <svg
          className={`w-3 h-3 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
        <span className={`inline-block transition-opacity duration-150 ${showBrackets ? 'opacity-100' : 'opacity-0'}`} style={{ color: 'var(--gs-lime)' }}>&nbsp;]</span>
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 min-w-[160px] bg-[var(--gs-dark-2)] border border-white/[0.08] shadow-xl shadow-black/40 z-50 overflow-hidden">
          <div className="h-[2px] bg-gradient-to-r from-[var(--gs-lime)] to-[var(--gs-purple)]" />
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-4 py-2.5 font-mono text-data tracking-wider uppercase transition-colors ${
                item.active
                  ? 'text-[var(--gs-lime)] bg-[var(--gs-lime)]/[0.05]'
                  : 'text-[var(--gs-gray-3)] hover:text-[var(--gs-white)] hover:bg-white/[0.03]'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Navbar — main navigation bar
// =============================================================================

export default function Navbar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, primaryWallet, setShowAuthFlow, handleLogOut } = useDynamicContext();
  const activeAddress = searchParams.get('address');
  const isInApp = pathname === '/portfolio' || pathname === '/leaderboard' || pathname === '/scarcity' || pathname === '/account' || pathname === '/feature-requests';
  const isProfileActive = pathname === '/account' || pathname === '/feature-requests';
  const isAnonymous = !user;
  const isConnected = !!primaryWallet?.address;
  const walletAddress = primaryWallet?.address || '';
  const connectorName = primaryWallet?.connector?.name || '';
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleDisconnect = useCallback(async () => {
    setMobileMenuOpen(false);
    await handleLogOut();
  }, [handleLogOut]);

  // Forward wallet address to leaderboard link so it can highlight the active wallet
  const leaderboardHref = activeAddress
    ? `/leaderboard?address=${activeAddress}`
    : '/leaderboard';

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-black/90 backdrop-blur-xl shadow-lg shadow-black/20'
            : 'bg-black/50 backdrop-blur-sm'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo — connected users stay on current page, anonymous users go home */}
            <Link href={isAnonymous ? '/' : pathname + (activeAddress ? `?address=${activeAddress}` : '')} className="flex items-center gap-2 group">
              <div className="relative transition-transform duration-300 group-hover:scale-105">
                <Logo size="md" variant="full" />
                <div className="absolute inset-0 bg-[var(--gs-lime)]/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
              <span className="font-mono text-label tracking-wider uppercase px-1.5 py-0.5 text-[var(--gs-gray-3)] border border-[var(--gs-gray-1)] transition-colors">
                Alpha
              </span>
            </Link>

            {/* Navigation Links + Auth */}
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-5">
                {isInApp && (
                  <>
                    <GlitchLink href="/portfolio" label="Portfolio" isActive={pathname === '/portfolio'} />
                    <GlitchLink href={leaderboardHref} label="Leaderboard" isActive={pathname === '/leaderboard'} />
                    <GlitchLink href="/scarcity" label="Scarcity" isActive={pathname === '/scarcity'} />
                  </>
                )}
                {isAnonymous ? (
                  <button
                    onClick={() => setShowAuthFlow(true)}
                    className="font-display font-semibold text-data uppercase tracking-wider px-4 py-1.5 bg-[var(--gs-lime)] text-[var(--gs-black)] hover:bg-[var(--gs-lime-hover)] transition-colors clip-corner-sm cursor-pointer"
                  >
                    Login
                  </button>
                ) : isConnected ? (
                  <WalletDropdown
                    walletAddress={walletAddress}
                    connectorName={connectorName}
                    isActive={isProfileActive}
                    pathname={pathname}
                    onDisconnect={handleDisconnect}
                  />
                ) : (
                  <ProfileDropdown isActive={isProfileActive} pathname={pathname} />
                )}
              </div>

              {/* Mobile: hamburger when in-app or authenticated, Login button otherwise */}
              {isInApp || !isAnonymous ? (
                <button
                  onClick={() => setMobileMenuOpen(prev => !prev)}
                  className="md:hidden p-1.5 text-[var(--gs-gray-3)] hover:text-[var(--gs-white)] transition-colors cursor-pointer"
                  aria-label="Toggle menu"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    {mobileMenuOpen ? (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                    )}
                  </svg>
                </button>
              ) : (
                <button
                  onClick={() => setShowAuthFlow(true)}
                  className="md:hidden font-display font-semibold text-data uppercase tracking-wider px-3 py-1.5 bg-[var(--gs-lime)] text-[var(--gs-black)] hover:bg-[var(--gs-lime-hover)] transition-colors clip-corner-sm cursor-pointer"
                >
                  Login
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile menu panel */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/[0.06] bg-black/95 backdrop-blur-xl">
            <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col gap-1">
              {isInApp && [
                { href: '/portfolio', label: 'Portfolio', active: pathname === '/portfolio' },
                { href: leaderboardHref, label: 'Leaderboard', active: pathname === '/leaderboard' },
                { href: '/scarcity', label: 'Scarcity', active: pathname === '/scarcity' },
              ].map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`font-mono text-body-sm tracking-wider uppercase px-3 py-2.5 transition-colors ${
                    item.active
                      ? 'text-[var(--gs-lime)] bg-[var(--gs-lime)]/[0.05]'
                      : 'text-[var(--gs-gray-3)] hover:text-[var(--gs-white)] hover:bg-white/[0.03]'
                  }`}
                >
                  {item.label}
                </Link>
              ))}

              {/* Profile / wallet section */}
              <div className={isInApp ? 'mt-1 pt-1 border-t border-white/[0.06]' : ''}>
                {isAnonymous ? (
                  <button
                    onClick={() => { setShowAuthFlow(true); setMobileMenuOpen(false); }}
                    className="w-full font-display font-semibold text-body-sm uppercase tracking-wider px-3 py-3 bg-[var(--gs-lime)] text-[var(--gs-black)] hover:bg-[var(--gs-lime-hover)] transition-colors clip-corner-sm cursor-pointer mt-1"
                  >
                    Login
                  </button>
                ) : (
                  <>
                    {/* Wallet identity on mobile */}
                    {isConnected && (
                      <div className="px-3 py-2 mb-1">
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--gs-lime)] shadow-[0_0_6px_var(--gs-lime)]" />
                          <span className="font-mono text-data tracking-wider text-[var(--gs-white)]">
                            {walletAddress.slice(0, 6)}&hellip;{walletAddress.slice(-4)}
                          </span>
                          <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--gs-lime)] border border-[var(--gs-lime)]/30 px-1.5 py-0.5 ml-auto">
                            GunzChain
                          </span>
                        </div>
                      </div>
                    )}
                    <p className="font-mono text-label tracking-[1.5px] uppercase text-[var(--gs-gray-2)] px-3 py-1.5">
                      Account
                    </p>
                    {[
                      { href: '/account', label: 'Wallets', active: pathname === '/account' },
                      { href: '/feature-requests', label: 'Feature Requests', active: pathname === '/feature-requests' },
                    ].map(item => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`font-mono text-body-sm tracking-wider uppercase px-3 pl-5 py-2.5 transition-colors ${
                          item.active
                            ? 'text-[var(--gs-lime)] bg-[var(--gs-lime)]/[0.05]'
                            : 'text-[var(--gs-gray-3)] hover:text-[var(--gs-white)] hover:bg-white/[0.03]'
                        }`}
                      >
                        {item.label}
                      </Link>
                    ))}
                    {/* Mobile disconnect */}
                    <button
                      onClick={handleDisconnect}
                      className="w-full font-mono text-body-sm tracking-wider uppercase px-3 pl-5 py-2.5 text-[var(--gs-gray-3)] hover:text-[#FF4444] transition-colors text-left cursor-pointer mt-1 border-t border-white/[0.06] pt-2.5"
                    >
                      Disconnect
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Spacer to prevent content from going under fixed navbar */}
      <div className="h-16" />

      {/* Terminal status bar — persistent bottom bar when wallet is connected */}
      {!isAnonymous && isConnected && (
        <TerminalStatusBar
          walletAddress={walletAddress}
          onDisconnect={handleDisconnect}
        />
      )}
    </>
  );
}
