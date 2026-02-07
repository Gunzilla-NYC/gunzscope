'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import Logo from './Logo';

const GLITCH_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&!';

function GlitchLink({ href, label, isActive }: { href: string; label: string; isActive: boolean }) {
  const [display, setDisplay] = useState(label);
  const [hovered, setHovered] = useState(false);
  const frameRef = useRef<number>(0);
  const iterRef = useRef(0);

  const scramble = useCallback(() => {
    setHovered(true);
    iterRef.current = 0;
    const target = label.toUpperCase();
    const totalSteps = target.length * 2;

    const tick = () => {
      iterRef.current++;
      const resolved = Math.floor(iterRef.current / 2);

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

  return (
    <Link
      href={href}
      onMouseEnter={scramble}
      onMouseLeave={reset}
      className={`relative font-mono text-[12px] tracking-wider uppercase transition-colors duration-150 inline-block py-1 ${
        isActive
          ? 'text-[var(--gs-lime)]'
          : 'text-[var(--gs-gray-3)] hover:text-[var(--gs-white)]'
      }`}
    >
      {display}
      <span
        className="absolute bottom-0 left-0 h-px bg-[var(--gs-lime)] transition-transform duration-150 origin-left"
        style={{
          width: '100%',
          transform: hovered || isActive ? 'scaleX(1)' : 'scaleX(0)',
        }}
      />
    </Link>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeAddress = searchParams.get('address');
  const isInApp = pathname === '/portfolio' || pathname === '/leaderboard' || pathname === '/account';
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
              <span className="font-mono text-[9px] tracking-wider uppercase px-1.5 py-0.5 text-[var(--gs-gray-3)] border border-[var(--gs-gray-1)] transition-colors">
                Alpha
              </span>
            </Link>

            {/* Navigation Links + Wallet */}
            <div className="flex items-center gap-4">
              {isInApp && (
                <div className="hidden md:flex items-center gap-5">
                  <GlitchLink href="/portfolio" label="Portfolio" isActive={pathname === '/portfolio'} />
                  <GlitchLink href={leaderboardHref} label="Leaderboard" isActive={pathname === '/leaderboard'} />
                  <GlitchLink href="/account" label="Wallets" isActive={pathname === '/account'} />
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
                { href: '/account', label: 'Wallets', active: pathname === '/account' },
              ].map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`font-mono text-[12px] tracking-wider uppercase px-3 py-2.5 transition-colors ${
                    item.active
                      ? 'text-[var(--gs-lime)] bg-[var(--gs-lime)]/[0.05]'
                      : 'text-[var(--gs-gray-3)] hover:text-[var(--gs-white)] hover:bg-white/[0.03]'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Spacer to prevent content from going under fixed navbar */}
      <div className="h-16" />
    </>
  );
}
