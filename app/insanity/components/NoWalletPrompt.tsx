'use client';

import { useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';

export function NoWalletPrompt() {
  const [input, setInput] = useState('');
  const isValid = /^0x[a-fA-F0-9]{40}$/.test(input.trim());

  return (
    <div className="min-h-screen bg-gunzscope">
      <Navbar />
      <div className="max-w-lg mx-auto py-20 px-4">
        <div
          className="relative bg-[var(--gs-dark-2)] border border-white/[0.06] p-6 overflow-hidden"
          style={{ clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))' }}
        >
          <div className="absolute top-0 left-0 right-0 h-[2px] gradient-accent-line opacity-40" aria-hidden="true" />
          <h2 className="font-display text-xl font-bold text-[var(--gs-lime)] mb-1 tracking-wide">
            INSANITY MODE
          </h2>
          <p className="font-mono text-caption text-[var(--gs-gray-3)] mb-5">
            Enter a wallet address to view the full analysis dashboard.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (isValid) window.location.href = `/insanity?wallet=${input.trim()}`;
            }}
            className="flex gap-2 mb-4"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="0x..."
              className="flex-1 bg-[var(--gs-dark-1)] border border-white/[0.08] px-3 py-2.5 font-mono text-sm text-[var(--gs-white)] placeholder:text-[var(--gs-gray-2)] focus:outline-none focus:border-[var(--gs-lime)]/30 transition-colors"
              style={{ clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))' }}
            />
            <button
              type="submit"
              disabled={!isValid}
              className="px-4 py-2.5 bg-[var(--gs-lime)] text-black font-mono text-sm font-semibold uppercase tracking-wider disabled:opacity-30 disabled:cursor-not-allowed hover:brightness-110 transition-all cursor-pointer"
              style={{ clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))' }}
            >
              Analyze
            </button>
          </form>
          <Link
            href="/portfolio"
            className="font-mono text-sm text-[var(--gs-gray-3)] hover:text-[var(--gs-lime)] transition-colors"
          >
            &larr; Back to Portfolio
          </Link>
        </div>
      </div>
    </div>
  );
}
