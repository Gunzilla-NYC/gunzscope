import type { Metadata } from 'next';
import { Suspense } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Cookie Policy',
  description: 'How GUNZscope uses cookies and similar technologies.',
};

function CookieContent() {
  return (
    <div className="min-h-dvh bg-[var(--gs-black)] text-[var(--gs-white)]">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="font-display font-bold text-3xl uppercase mb-2">Cookie Policy</h1>
        <p className="font-mono text-caption tracking-wider uppercase text-[var(--gs-gray-3)] mb-10">
          Last updated: February 2026
        </p>

        <div className="space-y-8 font-body text-sm text-[var(--gs-gray-4)] leading-relaxed">
          <section>
            <h2 className="font-display font-semibold text-base uppercase text-[var(--gs-white)] mb-3">1. What Are Cookies</h2>
            <p>
              Cookies are small text files stored on your device when you visit a website. They help the site remember your preferences and improve your experience.
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-base uppercase text-[var(--gs-white)] mb-3">2. Cookies We Use</h2>
            <p className="mb-3">GUNZscope uses minimal cookies and local storage:</p>
            <div className="border border-white/[0.06] overflow-hidden">
              <div className="grid grid-cols-3 bg-[var(--gs-dark-2)] font-mono text-label tracking-wider uppercase text-[var(--gs-gray-3)]">
                <div className="px-3 py-2 border-r border-white/[0.06]">Type</div>
                <div className="px-3 py-2 border-r border-white/[0.06]">Purpose</div>
                <div className="px-3 py-2">Duration</div>
              </div>
              <div className="grid grid-cols-3 border-t border-white/[0.06] text-xs">
                <div className="px-3 py-2 border-r border-white/[0.06]">Essential</div>
                <div className="px-3 py-2 border-r border-white/[0.06]">Wallet auth session</div>
                <div className="px-3 py-2">Session</div>
              </div>
              <div className="grid grid-cols-3 border-t border-white/[0.06] text-xs">
                <div className="px-3 py-2 border-r border-white/[0.06]">Functional</div>
                <div className="px-3 py-2 border-r border-white/[0.06]">NFT data cache, preferences</div>
                <div className="px-3 py-2">Persistent</div>
              </div>
              <div className="grid grid-cols-3 border-t border-white/[0.06] text-xs">
                <div className="px-3 py-2 border-r border-white/[0.06]">Analytics</div>
                <div className="px-3 py-2 border-r border-white/[0.06]">Basic usage metrics</div>
                <div className="px-3 py-2">30 days</div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-display font-semibold text-base uppercase text-[var(--gs-white)] mb-3">3. Local Storage</h2>
            <p>
              GUNZscope primarily uses browser localStorage (not cookies) to cache NFT data, acquisition details, and user preferences. This data never leaves your device and can be cleared at any time via your browser settings.
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-base uppercase text-[var(--gs-white)] mb-3">4. Third-Party Cookies</h2>
            <p>
              Third-party services integrated into GUNZscope (Dynamic Labs for wallet connection, Vercel for hosting) may set their own cookies. These are governed by their respective cookie policies.
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-base uppercase text-[var(--gs-white)] mb-3">5. Managing Cookies</h2>
            <p>
              You can control cookies through your browser settings. Disabling essential cookies may prevent wallet connection and authentication features from working properly. Clearing localStorage will reset all cached portfolio data.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function CookiePolicyPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-[var(--gs-black)]" />}>
      <CookieContent />
    </Suspense>
  );
}
