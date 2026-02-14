'use client';

import Link from 'next/link';

interface InsanityHeaderProps {
  address: string;
  truncatedAddress: string;
}

export function InsanityHeader({ address, truncatedAddress }: InsanityHeaderProps) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <Link
        href={`/portfolio?address=${address}`}
        className="font-mono text-caption text-[var(--gs-gray-3)] hover:text-[var(--gs-lime)] transition-colors"
      >
        &larr; Portfolio
      </Link>
      <span className="text-white/10">|</span>
      <h1 className="font-display text-lg font-bold text-[var(--gs-lime)] tracking-wide">
        INSANITY MODE
      </h1>
      <span className="font-mono text-caption text-[var(--gs-gray-3)]">{truncatedAddress}</span>
    </div>
  );
}
