import { Suspense } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

function PrivacyContent() {
  return (
    <div className="min-h-dvh bg-[var(--gs-black)] text-[var(--gs-white)]">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="font-display font-bold text-3xl uppercase mb-2">Privacy Policy</h1>
        <p className="font-mono text-caption tracking-wider uppercase text-[var(--gs-gray-3)] mb-10">
          Last updated: February 2026
        </p>

        <div className="space-y-8 font-body text-sm text-[var(--gs-gray-4)] leading-relaxed">
          <section>
            <h2 className="font-display font-semibold text-base uppercase text-[var(--gs-white)] mb-3">1. Information We Collect</h2>
            <p>
              GUNZscope collects minimal data to operate the Service:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 ml-2">
              <li>Wallet addresses you search or connect (publicly available on-chain)</li>
              <li>Basic usage analytics (page views, feature usage)</li>
              <li>Email address if you choose to create an account via Dynamic Labs</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display font-semibold text-base uppercase text-[var(--gs-white)] mb-3">2. How We Use Information</h2>
            <p>
              We use collected information solely to operate and improve GUNZscope. We do not sell personal data to third parties. Wallet addresses are used to query public blockchain data and display portfolio information.
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-base uppercase text-[var(--gs-white)] mb-3">3. Data Storage</h2>
            <p>
              Portfolio preferences and cached data are stored locally in your browser (localStorage). Account data, if applicable, is stored securely on our servers. We do not store private keys or seed phrases.
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-base uppercase text-[var(--gs-white)] mb-3">4. Third-Party Services</h2>
            <p>
              GUNZscope uses third-party services that may collect data independently:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 ml-2">
              <li>Dynamic Labs (wallet connection and authentication)</li>
              <li>Vercel (hosting and analytics)</li>
              <li>OpenSea API (NFT data)</li>
              <li>CoinGecko API (price data)</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display font-semibold text-base uppercase text-[var(--gs-white)] mb-3">5. Blockchain Data</h2>
            <p>
              Wallet addresses and transaction data displayed on GUNZscope are publicly available on the blockchain. We do not have the ability to modify, delete, or restrict access to on-chain data.
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-base uppercase text-[var(--gs-white)] mb-3">6. Your Rights</h2>
            <p>
              You may clear locally stored data at any time by clearing your browser storage. If you have an account, you may request deletion by contacting us.
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-base uppercase text-[var(--gs-white)] mb-3">7. Changes</h2>
            <p>
              We may update this Privacy Policy periodically. Changes will be reflected on this page with an updated date.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function PrivacyPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-[var(--gs-black)]" />}>
      <PrivacyContent />
    </Suspense>
  );
}
