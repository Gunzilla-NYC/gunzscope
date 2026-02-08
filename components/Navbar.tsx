'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import Logo from './Logo';

const GLITCH_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&!';

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
      // Throttle to ~20fps for a slower, more deliberate glitch
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

export default function Navbar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, setShowAuthFlow } = useDynamicContext();
  const activeAddress = searchParams.get('address');
  const isInApp = pathname === '/portfolio' || pathname === '/leaderboard' || pathname === '/scarcity' || pathname === '/account' || pathname === '/feature-requests';
  const isProfileActive = pathname === '/account' || pathname === '/feature-requests';
  const isAnonymous = !user;
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group">
              <div className="relative transition-transform duration-300 group-hover:scale-105">
                <Logo size="md" variant="full" />
                <div className="absolute inset-0 bg-[var(--gs-lime)]/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
              <span className="font-mono text-label tracking-wider uppercase px-1.5 py-0.5 text-[var(--gs-gray-3)] border border-[var(--gs-gray-1)] transition-colors">
                Alpha
              </span>
            </Link>

            {/* Navigation Links + Wallet */}
            <div className="flex items-center gap-4">
              {isInApp && (
                <div className="hidden md:flex items-center gap-5">
                  <GlitchLink href="/portfolio" label="Portfolio" isActive={pathname === '/portfolio'} />
                  <GlitchLink href={leaderboardHref} label="Leaderboard" isActive={pathname === '/leaderboard'} />
                  <GlitchLink href="/scarcity" label="Scarcity" isActive={pathname === '/scarcity'} />
                  {isAnonymous ? (
                    <button
                      onClick={() => setShowAuthFlow(true)}
                      className="font-display font-semibold text-data uppercase tracking-wider px-4 py-1.5 bg-[var(--gs-lime)] text-[var(--gs-black)] hover:bg-[var(--gs-lime-hover)] transition-colors clip-corner-sm cursor-pointer"
                    >
                      Connect
                    </button>
                  ) : (
                    <ProfileDropdown isActive={isProfileActive} pathname={pathname} />
                  )}
                </div>
              )}

              {/* Mobile hamburger */}
              {isInApp && (
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
              )}
            </div>
          </div>
        </div>
        {/* Mobile menu panel */}
        {isInApp && mobileMenuOpen && (
          <div className="md:hidden border-t border-white/[0.06] bg-black/95 backdrop-blur-xl">
            <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col gap-1">
              {[
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
              {/* Profile group or Connect CTA */}
              <div className="mt-1 pt-1 border-t border-white/[0.06]">
                {isAnonymous ? (
                  <button
                    onClick={() => { setShowAuthFlow(true); setMobileMenuOpen(false); }}
                    className="w-full font-display font-semibold text-body-sm uppercase tracking-wider px-3 py-3 bg-[var(--gs-lime)] text-[var(--gs-black)] hover:bg-[var(--gs-lime-hover)] transition-colors clip-corner-sm cursor-pointer mt-1"
                  >
                    Connect Wallet
                  </button>
                ) : (
                  <>
                    <p className="font-mono text-label tracking-[1.5px] uppercase text-[var(--gs-gray-2)] px-3 py-1.5">
                      Profile
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
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Spacer to prevent content from going under fixed navbar */}
      <div className="h-16" />
    </>
  );
}
