import type { Metadata } from 'next';
import { Suspense } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { UPDATES } from '@/lib/data/updates';
import UpdateTimeline from '@/components/updates/UpdateTimeline';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "What's New",
  description: 'The latest updates to GUNZscope. New features, improvements, and what we shipped this week.',
};

// =============================================================================
// Public-facing update log — user-friendly language, no implementation details.
// Internal dev changelog lives at /changelog.
// =============================================================================

function UpdatesContent() {
  return (
    <div className="min-h-dvh bg-[var(--gs-black)] text-[var(--gs-white)]">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header */}
        <h1 className="font-display font-bold text-3xl uppercase mb-2">What&rsquo;s New</h1>
        <p className="font-mono text-caption tracking-wider uppercase text-[var(--gs-gray-3)] mb-2">
          Early Access &middot; Updated regularly
        </p>
        <p className="font-body text-sm text-[var(--gs-gray-4)] leading-relaxed mb-12">
          GUNZscope ships updates frequently. Here&rsquo;s what&rsquo;s changed.
          Got an idea?{' '}
          <a href="/feature-requests" className="text-[var(--gs-purple)] hover:text-[var(--gs-lime)] transition-colors underline underline-offset-2">
            Request a feature
          </a>.
        </p>

        {/* Accordion timeline */}
        <UpdateTimeline updates={UPDATES} />

        {/* Footer note */}
        <div className="mt-16 pt-8 border-t border-white/[0.06]">
          <p className="font-mono text-[10px] tracking-wider uppercase text-[var(--gs-gray-2)]">
            Built for the Off The Grid community &middot; Not affiliated with GUNZILLA Games
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function UpdatesPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-[var(--gs-black)]" />}>
      <UpdatesContent />
    </Suspense>
  );
}
