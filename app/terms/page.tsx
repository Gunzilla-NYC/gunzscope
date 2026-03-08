import type { Metadata } from 'next';
import { Suspense } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms and conditions for using GUNZscope.',
};

function TermsContent() {
  return (
    <div className="min-h-dvh bg-[var(--gs-black)] text-[var(--gs-white)]">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="font-display font-bold text-3xl uppercase mb-2">Terms of Use</h1>
        <p className="font-mono text-caption tracking-wider uppercase text-[var(--gs-gray-3)] mb-10">
          Last updated: February 2026
        </p>

        <div className="space-y-8 font-body text-sm text-[var(--gs-gray-4)] leading-relaxed">
          <section>
            <h2 className="font-display font-semibold text-base uppercase text-[var(--gs-white)] mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing or using GUNZscope (&quot;the Service&quot;), you agree to be bound by these Terms of Use. If you do not agree, do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-base uppercase text-[var(--gs-white)] mb-3">2. Description of Service</h2>
            <p>
              GUNZscope is a portfolio tracking tool for the GUNZILLA gaming ecosystem. It provides read-only blockchain data aggregation including NFT holdings, token balances, and market data. GUNZscope does not custody funds, execute transactions, or provide financial advice.
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-base uppercase text-[var(--gs-white)] mb-3">3. No Financial Advice</h2>
            <p>
              The information displayed on GUNZscope is for informational purposes only and does not constitute financial, investment, or trading advice. Prices, valuations, and profit/loss calculations are estimates based on publicly available data and may not be accurate.
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-base uppercase text-[var(--gs-white)] mb-3">4. Data Accuracy</h2>
            <p>
              While we strive for accuracy, GUNZscope makes no guarantees about the completeness or correctness of displayed data. Blockchain data, floor prices, and market information are sourced from third-party providers and may be delayed or inaccurate.
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-base uppercase text-[var(--gs-white)] mb-3">5. Limitation of Liability</h2>
            <p>
              GUNZscope is provided &quot;as is&quot; without warranties of any kind. We are not liable for any losses or damages arising from use of the Service, including but not limited to trading decisions made based on information displayed.
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-base uppercase text-[var(--gs-white)] mb-3">6. Third-Party Services</h2>
            <p>
              GUNZscope integrates with third-party services including OpenSea, CoinGecko, and Dynamic Labs. Your use of these services is subject to their respective terms and privacy policies.
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-base uppercase text-[var(--gs-white)] mb-3">7. Not Affiliated</h2>
            <p>
              GUNZscope is an independent community tool. It is not affiliated with, endorsed by, or officially connected to Gunzilla Games or the Off The Grid game.
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-base uppercase text-[var(--gs-white)] mb-3">8. Changes to Terms</h2>
            <p>
              We may update these terms at any time. Continued use of the Service after changes constitutes acceptance of the new terms.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function TermsPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-[var(--gs-black)]" />}>
      <TermsContent />
    </Suspense>
  );
}
