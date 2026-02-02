'use client';

import Link from 'next/link';
import Logo from '@/components/Logo';
import Footer from '@/components/Footer';

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-[var(--gs-black)] text-[var(--gs-white)]">
      {/* Background Effects */}
      <div className="grid-bg" />
      <div className="scanlines" />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 lg:px-10 h-16 flex items-center justify-between glass-effect border-b border-white/[0.06]">
        <Link href="/" className="flex items-center gap-2">
          <Logo size="md" variant="icon" />
          <span className="font-display font-bold text-lg tracking-wider uppercase">
            GUNZ<span className="text-[var(--gs-purple)]">scope</span>
          </span>
        </Link>

        <Link
          href="/portfolio"
          className="font-display font-semibold text-xs tracking-wider uppercase px-5 py-2.5 bg-[var(--gs-lime)] text-[var(--gs-black)] hover:bg-[#B8FF33] transition-all clip-corner"
        >
          Launch App
        </Link>
      </nav>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6">
        <div className="text-center max-w-lg">
          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-sm bg-[var(--gs-purple)]/10 border border-[var(--gs-purple)]/20 mb-8">
            <span className="w-2 h-2 rounded-full bg-[var(--gs-purple)] animate-pulse" />
            <span className="font-mono text-[10px] text-[var(--gs-purple)] tracking-wider uppercase">
              Coming Soon
            </span>
          </div>

          {/* Title */}
          <h1 className="font-display text-4xl sm:text-5xl font-bold uppercase tracking-wide mb-4">
            <span className="text-[var(--gs-white)]">Documentation</span>
          </h1>

          {/* Subtitle */}
          <p className="font-mono text-sm text-[var(--gs-gray-4)] mb-8 leading-relaxed">
            Feature request service coming soon.
          </p>

          {/* Decorative Line */}
          <div className="w-24 h-[2px] mx-auto mb-8 bg-gradient-to-r from-[var(--gs-lime)] to-[var(--gs-purple)]" />

          {/* Back Link */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-mono text-xs text-[var(--gs-gray-4)] hover:text-[var(--gs-lime)] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0">
        <Footer />
      </div>
    </div>
  );
}
