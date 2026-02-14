'use client';

import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useInsanityData } from '../hooks/useInsanityData';
import { InsanityHeader } from './InsanityHeader';
import { InsanityValueHeader } from './InsanityValueHeader';
import { InsanityBreakdown } from './InsanityBreakdown';
import { InsanityHoldingsPerformance } from './InsanityHoldingsPerformance';
import { InsanityScatterPlot } from './InsanityScatterPlot';
import { InsanityInsights } from './InsanityInsights';

interface InsanityDashboardProps {
  address: string;
}

export function InsanityDashboard({ address }: InsanityDashboardProps) {
  const {
    loading, error, isInitializing,
    gunPrice, portfolioResult, nfts,
    data,
    enrichmentProgress, retryEnrichment,
    animatedTotal, gunSparklineValues, truncatedAddress,
  } = useInsanityData(address);

  // ── Loading state ──
  if (loading) {
    return (
      <div className="min-h-screen bg-gunzscope">
        <Navbar />
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--gs-lime)]" />
          <p className="font-mono text-sm tracking-wide text-[var(--gs-gray-4)]">Loading insanity data&hellip;</p>
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (error) {
    return (
      <div className="min-h-screen bg-gunzscope">
        <Navbar />
        <div className="max-w-2xl mx-auto py-20 px-4">
          <div className="p-4 bg-[var(--gs-dark-2)] border border-[var(--gs-loss)]">
            <p className="text-[var(--gs-loss)] font-mono text-sm">{error}</p>
            <Link
              href="/portfolio"
              className="font-mono text-sm text-[var(--gs-gray-3)] hover:text-[var(--gs-lime)] transition-colors mt-3 inline-block"
            >
              &larr; Back to Portfolio
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Main render ──
  return (
    <div className="min-h-screen bg-gunzscope">
      <Navbar />
      <div className="max-w-7xl mx-auto py-8 px-4">
        <InsanityHeader address={address} truncatedAddress={truncatedAddress} />

        {/* Main card */}
        <div
          className="bg-[var(--gs-dark-2)] border border-white/[0.06] overflow-hidden"
          style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))' }}
        >
          <InsanityValueHeader
            data={data}
            portfolioResult={portfolioResult}
            animatedTotal={animatedTotal}
            isInitializing={isInitializing}
            gunSparklineValues={gunSparklineValues}
          />

          <InsanityBreakdown
            data={data}
            gunPrice={gunPrice}
            enrichmentProgress={enrichmentProgress}
            isInitializing={isInitializing}
          />

          <InsanityHoldingsPerformance
            data={data}
            gunPrice={gunPrice}
            enrichmentProgress={enrichmentProgress}
            isInitializing={isInitializing}
            retryEnrichment={retryEnrichment}
          />

          <InsanityScatterPlot
            nfts={nfts}
            gunPrice={gunPrice}
            nftPnL={data.nftPnL}
            isInitializing={isInitializing}
          />

          <InsanityInsights
            insights={data.insights}
            isInitializing={isInitializing}
          />
        </div>

        <Footer />
      </div>
    </div>
  );
}
