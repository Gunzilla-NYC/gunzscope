'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Logo from './Logo';
import WalletButton from './WalletButton';

interface NavbarProps {
  onWalletConnect?: (address: string) => void;
  onWalletDisconnect?: () => void;
  onAccountClick?: () => void;
}

export default function Navbar({ onWalletConnect, onWalletDisconnect, onAccountClick }: NavbarProps) {
  const pathname = usePathname();
  const isHomePage = pathname === '/';
  const [isScrolled, setIsScrolled] = useState(false);

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
              <span className="font-mono text-[9px] tracking-wider uppercase px-1.5 py-0.5 rounded-sm bg-[var(--gs-purple)]/20 text-[var(--gs-purple)] border border-[var(--gs-purple)]/30">
                Alpha
              </span>
            </Link>

            {/* Navigation Links + Wallet */}
            <div className="flex items-center gap-5">
              <div className="hidden md:flex items-center gap-5">
                <Link
                  href="/portfolio"
                  className={`font-mono text-[11px] tracking-wider uppercase transition-colors ${
                    pathname === '/portfolio'
                      ? 'text-[var(--gs-lime)]'
                      : 'text-[var(--gs-gray-3)] hover:text-[var(--gs-lime)]'
                  }`}
                >
                  Portfolio
                </Link>
                <Link
                  href="/leaderboard"
                  className={`font-mono text-[11px] tracking-wider uppercase transition-colors ${
                    pathname === '/leaderboard'
                      ? 'text-[var(--gs-lime)]'
                      : 'text-[var(--gs-gray-3)] hover:text-[var(--gs-lime)]'
                  }`}
                >
                  Leaderboard
                </Link>
              </div>

              {/* Wallet Button - only show on home page */}
              {isHomePage && (
                <WalletButton
                  onWalletConnect={onWalletConnect}
                  onWalletDisconnect={onWalletDisconnect}
                  onAccountClick={onAccountClick}
                />
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Spacer to prevent content from going under fixed navbar */}
      <div className="h-16" />
    </>
  );
}
