'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { isAdminWallet } from '@/lib/auth/dynamicAuth';
import Logo from '@/components/Logo';
import Footer from '@/components/Footer';
import SparklineConcepts from './SparklineConcepts';
import TransitionDemo from './TransitionDemo';
import { BrandSystem } from './sections/BrandSystem';
import { ComponentLibrary } from './sections/ComponentLibrary';
import { NFTDetailCards } from './sections/NFTDetailCards';
import { HoldingsCardStates } from './sections/HoldingsCardStates';
import { WaitlistFlow } from './sections/WaitlistFlow';
import UXRWelcomePopup from '@/components/UXRWelcomePopup';

// Color swatches data
const colorSwatches = [
  { name: 'GS Lime', hex: '#A6F700', color: '#A6F700' },
  { name: 'GS Indigo', hex: '#6D5BFF', color: '#6D5BFF' },
  { name: 'GS Black', hex: '#0A0A0A', color: '#0A0A0A', border: true },
  { name: 'GS White', hex: '#F0F0F0', color: '#F0F0F0' },
  { name: 'Profit', hex: '#00FF88', color: '#00FF88' },
  { name: 'Loss', hex: '#FF4444', color: '#FF4444' },
  { name: 'Dark Surface', hex: '#161616', color: '#161616', border: true },
  { name: 'Card Surface', hex: '#242424', color: '#242424', border: true },
];

export default function BrandPage() {
  const router = useRouter();
  const { primaryWallet, sdkHasLoaded } = useDynamicContext();
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Admin gate — redirect non-admin users to home
  const isAdmin = isAdminWallet(primaryWallet?.address);
  useEffect(() => {
    if (sdkHasLoaded && !isAdmin) {
      router.replace('/');
    }
  }, [sdkHasLoaded, isAdmin, router]);

  // Setup intersection observer for scroll animations
  useEffect(() => {
    if (!sdkHasLoaded || !isAdmin) return;
    observerRef.current = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            obs.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px',
      }
    );

    document.querySelectorAll('.observe').forEach((el) => {
      observerRef.current?.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, [sdkHasLoaded, isAdmin]);

  // Show spinner while SDK is loading or if not admin (redirecting)
  if (!sdkHasLoaded || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--gs-black)]">
        <div className="w-6 h-6 border-2 border-[var(--gs-lime)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--gs-black)] text-[var(--gs-white)] overflow-x-hidden">
      <UXRWelcomePopup />
      {/* Background Effects */}
      <div className="page-bg" />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 lg:px-10 h-16 flex items-center justify-between glass-effect border-b border-white/[0.06]">
        <Link href="/" className="flex items-center gap-2">
          <Logo size="md" variant="icon" />
          <span className="font-display font-bold text-lg tracking-wider uppercase">
            GUNZ<span className="text-[var(--gs-purple)]">scope</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          <a href="#brand" className="font-mono text-data tracking-wider uppercase text-[var(--gs-lime)] relative after:absolute after:bottom-[-4px] after:left-0 after:right-0 after:h-[1px] after:bg-[var(--gs-lime)]">
            Brand
          </a>
          <a href="#components" className="font-mono text-data tracking-wider uppercase text-[var(--gs-gray-3)] hover:text-[var(--gs-lime)] transition-colors">
            Components
          </a>
          <Link
            href="/"
            className="font-mono text-data tracking-wider uppercase text-[var(--gs-gray-3)] hover:text-[var(--gs-lime)] transition-colors"
          >
            Back to Home
          </Link>
          <Link
            href="/portfolio"
            className="font-display font-semibold text-xs tracking-wider uppercase px-5 py-2 border border-[var(--gs-lime)] text-[var(--gs-lime)] hover:bg-[var(--gs-lime)] hover:text-[var(--gs-black)] transition-all clip-corner-sm"
          >
            Launch App
          </Link>
        </div>

        {/* Mobile menu button */}
        <Link
          href="/portfolio"
          className="md:hidden font-display font-semibold text-xs tracking-wider uppercase px-4 py-2 border border-[var(--gs-lime)] text-[var(--gs-lime)] clip-corner-sm"
        >
          Launch App
        </Link>
      </nav>

      {/* Page Header */}
      <section className="relative pt-32 pb-16 px-6 lg:px-10">
        <div className="max-w-[900px]">
          <h1 className="font-display font-bold text-4xl sm:text-5xl md:text-6xl leading-[0.95] tracking-tight uppercase mb-4">
            <span className="text-[var(--gs-white)]">Brand</span>{' '}
            <span className="text-[var(--gs-purple-bright)]">System</span>
          </h1>
          <p className="font-body text-lg font-light leading-relaxed text-[var(--gs-gray-4)] max-w-[560px]">
            GUNZscope design tokens, color palette, typography, and component library.
            Internal reference for maintaining visual consistency.
          </p>
        </div>
      </section>

      {/* Working Links */}
      <section className="relative z-10 py-12 px-6 lg:px-10 border-t border-white/[0.06]" id="links">
        <div className="flex items-baseline gap-4 mb-6 observe">
          <span className="section-number">00</span>
          <h2 className="font-display font-bold text-3xl uppercase tracking-wide">Working Links</h2>
          <div className="section-line" />
        </div>
        <div className="flex flex-wrap gap-3">
          <a
            href="/preview-buildgames.html"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--gs-dark-2)] border border-white/[0.06] hover:border-[var(--gs-avax-red)]/30 transition-colors group"
          >
            <span className="w-2 h-2 rounded-full bg-[var(--gs-avax-red)] group-hover:shadow-[0_0_6px_rgba(232,65,66,0.4)] transition-shadow" />
            <span className="font-display font-semibold text-sm uppercase tracking-wide text-[var(--gs-white)]">
              Build Games Landing
            </span>
            <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--gs-gray-3)]">
              Static HTML
            </span>
          </a>
        </div>
      </section>

      {/* Brand System Section */}
      <BrandSystem colorSwatches={colorSwatches} />

      {/* Components Section */}
      <ComponentLibrary />

      {/* NFT Detail Cards Section */}
      <NFTDetailCards />

      {/* Sparkline Concepts Section */}
      <section className="relative z-10 py-24 px-6 lg:px-10 border-t border-white/[0.06]" id="sparkline-concepts">
        <div className="flex items-baseline gap-4 mb-10 observe">
          <span className="section-number">04</span>
          <h2 className="font-display font-bold text-3xl uppercase tracking-wide">Sparkline Concepts</h2>
          <div className="section-line" />
        </div>

        <SparklineConcepts />
      </section>

      {/* Holdings Card States Section */}
      <HoldingsCardStates />

      {/* ── Section 06: Waitlist Flow Test ───────────────────────────── */}
      <WaitlistFlow />

      {/* Chart Transition Demos */}
      <TransitionDemo />

      {/* Footer */}
      <Footer />
    </div>
  );
}
