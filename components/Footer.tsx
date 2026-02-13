'use client';

import Link from 'next/link';

interface FooterProps {
  variant?: 'full' | 'minimal';
}

export default function Footer({ variant = 'full' }: FooterProps) {
  if (variant === 'minimal') {
    return (
      <footer className="relative z-10 py-8 px-6 text-center border-t border-white/[0.06]">
        <p className="font-mono text-caption tracking-wide text-[var(--gs-gray-4)]">
          Built with <span className="text-[var(--gs-lime)]">&hearts;</span> by CRYPTOHAKI for the Gunzilla community. Not affiliated with Gunzilla Games.
        </p>
      </footer>
    );
  }

  return (
    <footer className="relative z-10 border-t border-white/[0.06]">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-6 flex flex-col sm:flex-row items-center sm:justify-between gap-3 sm:gap-6">
        {/* Copyright */}
        <p className="font-mono text-caption tracking-wider uppercase text-[var(--gs-gray-3)]">
          &copy; {new Date().getFullYear()} GUNZscope
          <span className="text-[var(--gs-gray-2)] mx-2">&middot;</span>
          <Link href="/terms" className="text-[var(--gs-gray-3)] hover:text-[var(--gs-white)] transition-colors">Terms</Link>
          <span className="text-[var(--gs-gray-2)] mx-2">&middot;</span>
          <Link href="/privacy" className="text-[var(--gs-gray-3)] hover:text-[var(--gs-white)] transition-colors">Privacy</Link>
          <span className="text-[var(--gs-gray-2)] mx-2">&middot;</span>
          <Link href="/credits" className="text-[var(--gs-gray-3)] hover:text-[var(--gs-white)] transition-colors">Credits</Link>
          <span className="text-[var(--gs-gray-2)] mx-2">&middot;</span>
          <a href="https://x.com/gunzscope" target="_blank" rel="noopener noreferrer" className="text-[var(--gs-gray-3)] hover:text-[var(--gs-white)] transition-colors">X</a>
        </p>

        {/* Credit */}
        <p className="font-mono text-caption tracking-wider uppercase text-[var(--gs-gray-3)]">
          Built with <span className="text-[var(--gs-lime)]">&hearts;</span> by CRYPTOHAKI for the Gunzilla community.
        </p>
      </div>
    </footer>
  );
}
