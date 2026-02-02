'use client';

import Link from 'next/link';

interface FooterProps {
  variant?: 'full' | 'minimal';
}

export default function Footer({ variant = 'full' }: FooterProps) {
  if (variant === 'minimal') {
    return (
      <footer className="relative z-10 py-8 px-6 text-center border-t border-white/[0.06]">
        <p className="font-mono text-[10px] tracking-wide text-[var(--gs-gray-4)]">
          Built for the GUNZ ecosystem with <span className="text-[var(--gs-lime)]">♥</span> by CRYPTOHAKI · Not affiliated with Gunzilla Games
        </p>
      </footer>
    );
  }

  return (
    <footer className="relative z-10 py-16 px-6 lg:px-10 border-t border-white/[0.06] flex flex-col md:flex-row justify-between items-center gap-6">
      <div className="flex flex-col md:flex-row items-center gap-6">
        <div className="font-display font-bold text-sm tracking-wider uppercase text-[var(--gs-gray-4)]">
          GUNZ<span className="text-[var(--gs-purple)]">scope</span>
        </div>
        <div className="flex gap-4">
          <Link href="/docs" className="font-mono text-[10px] tracking-wide uppercase text-[var(--gs-gray-4)] hover:text-[var(--gs-lime)] transition-colors">
            Docs
          </Link>
        </div>
      </div>
      <div className="font-mono text-[10px] tracking-wide text-[var(--gs-gray-4)]">
        Built for the GUNZ ecosystem with <span className="text-[var(--gs-lime)]">♥</span> by CRYPTOHAKI · Not affiliated with Gunzilla Games
      </div>
    </footer>
  );
}
