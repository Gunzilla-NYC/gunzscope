'use client';

import { useState, useEffect, startTransition } from 'react';
import Link from 'next/link';
import Logo from './Logo';
import { GlitchLink } from './navbar/GlitchLink';
import VersionBadge from './ui/VersionBadge';

interface PublicNavProps {
  activeHref?: string;
}

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/explore', label: 'Onchain Explorer' },
];

export default function PublicNav({ activeHref }: PublicNavProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
            {/* Logo */}
            <div className="flex items-center gap-4 shrink-0">
              <Link href="/" className="flex items-center group">
                <div className="relative w-[9rem] sm:w-[14rem] overflow-hidden">
                  <Logo size="md" variant="full" glitchOnHover />
                </div>
              </Link>
              <VersionBadge className="hidden sm:inline shrink-0" />
            </div>

            {/* Navigation links */}
            <nav className="hidden md:flex items-center gap-5 ml-6 shrink-0">
              {NAV_LINKS.map(link => (
                <GlitchLink
                  key={link.href}
                  href={link.href}
                  label={link.label}
                  isActive={activeHref === link.href}
                />
              ))}
            </nav>

            {/* Login CTA — right side */}
            <div className="hidden md:flex items-center ml-auto shrink-0">
              <Link
                href="/"
                className="font-display font-semibold text-data uppercase tracking-wider px-4 py-1.5 bg-[var(--gs-lime)] text-[var(--gs-black)] hover:bg-[var(--gs-lime-hover)] transition-colors clip-corner-sm"
              >
                Login
              </Link>
            </div>

            {/* Mobile hamburger */}
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
          </div>
        </div>

        {/* Mobile menu panel */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/[0.06] bg-black/95 backdrop-blur-xl">
            <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col gap-1">
              {NAV_LINKS.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`font-mono text-body-sm tracking-wider uppercase px-3 py-2.5 transition-colors ${
                    activeHref === link.href
                      ? 'text-[var(--gs-lime)] bg-[var(--gs-lime)]/[0.05]'
                      : 'text-[var(--gs-gray-3)] hover:text-[var(--gs-white)] hover:bg-white/[0.03]'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <div className="mt-1 pt-1 border-t border-white/[0.06]">
                <Link
                  href="/"
                  className="block w-full font-display font-semibold text-body-sm uppercase tracking-wider px-3 py-3 bg-[var(--gs-lime)] text-[var(--gs-black)] hover:bg-[var(--gs-lime-hover)] transition-colors clip-corner-sm mt-1 text-center"
                >
                  Login
                </Link>
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
