'use client';

import { useState } from 'react';
import Link from 'next/link';
import Logo from './Logo';
import { GlitchLink } from './navbar/GlitchLink';
import VersionBadge from './ui/VersionBadge';

interface PublicNavProps {
  activeHref?: string;
  /** When set, shows a "Back to Portfolio" link pointing to /portfolio?address=<value> */
  backToPortfolio?: string;
}

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/explore', label: 'Onchain Explorer' },
];

export default function PublicNav({ activeHref, backToPortfolio }: PublicNavProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 h-16 glass-effect border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 h-full flex items-center justify-between">
          {/* Logo — matches home page */}
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2">
              <Logo size="md" variant="icon" />
              <span className="font-display font-bold text-lg tracking-wider uppercase">
                GUNZ<span className="text-[var(--gs-purple)]">scope</span>
              </span>
            </Link>
            <VersionBadge />
          </div>

          {/* Navigation links — right side */}
          <div className="hidden md:flex items-center gap-5">
            {backToPortfolio ? (
              <>
                <GlitchLink href="/explore" label="Onchain Explorer" isActive={true} />
                <Link
                  href={`/portfolio?address=${encodeURIComponent(backToPortfolio)}`}
                  className="font-mono text-data tracking-wider uppercase text-[var(--gs-lime)] hover:text-[var(--gs-lime-hover)] transition-colors"
                >
                  &larr; Back to Portfolio
                </Link>
              </>
            ) : (
              NAV_LINKS.filter(link => link.href !== activeHref).map(link => (
                <GlitchLink
                  key={link.href}
                  href={link.href}
                  label={link.label}
                  isActive={false}
                />
              ))
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            className="flex md:hidden flex-col gap-[5px] bg-transparent border-none p-2 cursor-pointer"
            onClick={() => setMobileMenuOpen(prev => !prev)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <svg className="w-5 h-5 text-[var(--gs-gray-3)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <>
                <span className="block w-5 h-[2px] bg-[var(--gs-gray-3)] transition-all" />
                <span className="block w-5 h-[2px] bg-[var(--gs-gray-3)] transition-all" />
                <span className="block w-3.5 h-[2px] bg-[var(--gs-gray-3)] transition-all" />
              </>
            )}
          </button>
        </div>
      </nav>

      {/* Mobile menu panel */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed top-16 left-0 right-0 z-50 flex flex-col items-start gap-5 px-4 py-6 bg-[rgba(10,10,10,0.97)] backdrop-blur-lg border-b border-white/[0.06]">
          {backToPortfolio ? (
            <>
              <span className="font-mono text-body-sm tracking-wider uppercase text-[var(--gs-lime)]">
                Onchain Explorer
              </span>
              <Link
                href={`/portfolio?address=${encodeURIComponent(backToPortfolio)}`}
                onClick={() => setMobileMenuOpen(false)}
                className="font-mono text-body-sm tracking-wider uppercase text-[var(--gs-lime)] hover:text-[var(--gs-lime-hover)] transition-colors"
              >
                &larr; Back to Portfolio
              </Link>
            </>
          ) : (
            NAV_LINKS.filter(link => link.href !== activeHref).map(link => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="font-mono text-body-sm tracking-wider uppercase text-[var(--gs-gray-3)] hover:text-[var(--gs-white)] transition-colors"
              >
                {link.label}
              </Link>
            ))
          )}
        </div>
      )}

      {/* Spacer to prevent content from going under fixed navbar */}
      <div className="h-16" />
    </>
  );
}
