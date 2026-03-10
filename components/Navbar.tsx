'use client';

import { useState, useEffect, useCallback, useRef, startTransition } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import Logo from './Logo';
import { GlitchLink } from './navbar/GlitchLink';
import { ExperimentsDropdown } from './navbar/ExperimentsDropdown';
import { WalletDropdown } from './navbar/WalletDropdown';
import { ProfileDropdown } from './navbar/ProfileDropdown';
import { TerminalStatusBar } from './navbar/TerminalStatusBar';
import { useAutoLogin } from './navbar/hooks/useAutoLogin';
import VersionBadge from './ui/VersionBadge';

export default function Navbar({ onSwitchWallet }: { onSwitchWallet?: (address: string) => void } = {}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const isStaticPage = ['/terms', '/privacy', '/credits'].includes(pathname);
  const { user, primaryWallet, setShowAuthFlow, handleLogOut, sdkHasLoaded } = useDynamicContext();

  // Global auto-login: create profile as soon as wallet connects on ANY page
  useAutoLogin(!!user, primaryWallet?.address, handleLogOut);

  // Validate wallet against whitelist when a new wallet is linked (e.g., email user connects wallet)
  const validatedWalletRef = useRef<string | null>(null);
  useEffect(() => {
    if (!primaryWallet?.address || !user) return;
    const addr = primaryWallet.address.toLowerCase();
    if (validatedWalletRef.current === addr) return; // already validated
    validatedWalletRef.current = addr;

    fetch('/api/access/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: primaryWallet.address }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.success) {
          handleLogOut();
        }
      })
      .catch(() => {
        // Network error — fail closed
        handleLogOut();
      });
  }, [primaryWallet?.address, user?.userId, handleLogOut]);

  const activeAddress = searchParams.get('address');
  const isInApp = pathname === '/portfolio' || pathname === '/leaderboard' || pathname === '/scarcity' || pathname === '/market' || pathname === '/account' || pathname === '/feature-requests' || pathname === '/explore';
  const isProfileActive = pathname === '/account' || pathname === '/feature-requests';
  const isAnonymous = !user && sdkHasLoaded; // don't show Login until SDK confirms no session
  const showNavLinks = pathname !== '/';
  const isConnected = !!primaryWallet?.address;
  const hasWallet = isConnected; // email-only users: false → gates leaderboard/scarcity/feature-requests
  const walletAddress = primaryWallet?.address || '';
  const connectorName = primaryWallet?.connector?.name || '';
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleDisconnect = useCallback(async () => {
    setMobileMenuOpen(false);
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
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
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          startTransition(() => setIsScrolled(window.scrollY > 10));
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
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
          <div className="flex items-center h-16">
            {/* Logo — connected users stay on current page, anonymous users go home */}
            <div className="flex items-center gap-4 shrink-0">
              <Link href={(isAnonymous || !isInApp) ? '/' : pathname + (activeAddress ? `?address=${activeAddress}` : '')} className="flex items-center group">
                <div className="relative w-[10rem] sm:w-[15rem] overflow-hidden">
                  <Logo size="md" variant="full" glitchOnHover />
                </div>
              </Link>
              <VersionBadge className="hidden sm:inline shrink-0" />
            </div>

            {/* Navigation links — left-anchored so wallet width changes can't shift them */}
            <nav className="hidden md:flex items-center gap-5 ml-6 shrink-0">
              {showNavLinks && (
                <>
                  {isAnonymous && <GlitchLink href="/" label="Home" isActive={false} />}
                  <GlitchLink href="/portfolio" label="Portfolio" isActive={pathname === '/portfolio'} />
                  <GlitchLink href="/explore" label="Onchain Explorer" isActive={pathname === '/explore'} />
                  {hasWallet && (
                    <ExperimentsDropdown pathname={pathname} leaderboardHref={leaderboardHref} />
                  )}
                </>
              )}
            </nav>

            {/* Wallet / Auth — ml-auto pushes to right edge, width changes absorbed by auto margin */}
            <div className="hidden md:flex items-center ml-auto shrink-0">
              {isAnonymous ? (
                isStaticPage ? (
                  <button
                    onClick={() => router.back()}
                    className="font-display font-semibold text-data uppercase tracking-wider px-4 py-1.5 border border-white/[0.12] text-[var(--gs-gray-3)] hover:text-[var(--gs-white)] hover:border-white/[0.25] transition-colors clip-corner-sm cursor-pointer"
                  >
                    Back
                  </button>
                ) : (
                  <button
                    onClick={() => setShowAuthFlow(true)}
                    className="font-display font-semibold text-data uppercase tracking-wider px-4 py-1.5 bg-[var(--gs-lime)] text-[var(--gs-black)] hover:bg-[var(--gs-lime-hover)] transition-colors clip-corner-sm cursor-pointer"
                  >
                    Login
                  </button>
                )
              ) : isConnected ? (
                <WalletDropdown
                  walletAddress={walletAddress}
                  connectorName={connectorName}
                  isActive={isProfileActive}
                  pathname={pathname}
                  onDisconnect={handleDisconnect}
                  onSwitchWallet={onSwitchWallet}
                />
              ) : (
                <ProfileDropdown isActive={isProfileActive} pathname={pathname} />
              )}
            </div>

            {/* Mobile: hamburger when authenticated, Login when anonymous + not in app */}
            {!isAnonymous ? (
              <button
                onClick={() => setMobileMenuOpen(prev => !prev)}
                className="md:hidden ml-auto p-1.5 text-[var(--gs-gray-3)] hover:text-[var(--gs-white)] transition-colors cursor-pointer"
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
            ) : isStaticPage ? (
              <button
                onClick={() => router.back()}
                className="md:hidden ml-auto font-display font-semibold text-data uppercase tracking-wider px-3 py-1.5 border border-white/[0.12] text-[var(--gs-gray-3)] hover:text-[var(--gs-white)] hover:border-white/[0.25] transition-colors clip-corner-sm cursor-pointer"
              >
                Back
              </button>
            ) : (
              <button
                onClick={() => setShowAuthFlow(true)}
                className="md:hidden ml-auto font-display font-semibold text-data uppercase tracking-wider px-3 py-1.5 bg-[var(--gs-lime)] text-[var(--gs-black)] hover:bg-[var(--gs-lime-hover)] transition-colors clip-corner-sm cursor-pointer"
              >
                Login
              </button>
            )}
          </div>
        </div>

        {/* Mobile menu panel */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/[0.06] bg-black/95 backdrop-blur-xl">
            <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col gap-1">
              {showNavLinks && (
                <>
                  <Link
                    href="/portfolio"
                    className={`font-mono text-body-sm tracking-wider uppercase px-3 py-2.5 transition-colors ${
                      pathname === '/portfolio'
                        ? 'text-[var(--gs-lime)] bg-[var(--gs-lime)]/[0.05]'
                        : 'text-[var(--gs-gray-3)] hover:text-[var(--gs-white)] hover:bg-white/[0.03]'
                    }`}
                  >
                    Portfolio
                  </Link>
                  <Link
                    href="/explore"
                    className={`font-mono text-body-sm tracking-wider uppercase px-3 py-2.5 transition-colors ${
                      pathname === '/explore'
                        ? 'text-[var(--gs-lime)] bg-[var(--gs-lime)]/[0.05]'
                        : 'text-[var(--gs-gray-3)] hover:text-[var(--gs-white)] hover:bg-white/[0.03]'
                    }`}
                  >
                    Onchain Explorer
                  </Link>
                  {hasWallet && (
                    <>
                      <p className="font-mono text-label tracking-[1.5px] uppercase text-[var(--gs-gray-2)] px-3 py-1.5 mt-1">
                        Experiments
                      </p>
                      {[
                        { href: leaderboardHref, label: 'Leaderboard', active: pathname === '/leaderboard' },
                        { href: '/scarcity', label: 'Scarcity', active: pathname === '/scarcity' },
                        { href: '/market', label: 'Market', active: pathname === '/market' },
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
                    </>
                  )}
                </>
              )}

              {/* Profile / wallet section */}
              <div className={showNavLinks ? 'mt-1 pt-1 border-t border-white/[0.06]' : ''}>
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
                      { href: '/account', label: 'Profile', active: pathname === '/account' },
                      ...(hasWallet ? [{ href: '/feature-requests', label: 'Feature Requests', active: pathname === '/feature-requests' }] : []),
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
