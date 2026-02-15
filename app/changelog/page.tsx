import { Suspense } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

// =============================================================================
// Version History Data
// =============================================================================

interface VersionEntry {
  version: string;
  date: string;
  tag?: string;
  items: string[];
}

const VERSIONS: VersionEntry[] = [
  {
    version: 'v0.1.6',
    date: 'Feb 14, 2026',
    tag: 'current',
    items: [
      'Valuation waterfall upgrade \u2014 per\u2011item listing > comparable sales median > rarity\u2011tier floor > cost basis',
      'Dedicated comparableSalesMedian and rarityFloor fields on NFT type for clean separation',
      'applyValuationTables pure function replaces inline floor\u2011price overloading',
    ],
  },
  {
    version: 'v0.1.5',
    date: 'Feb 14, 2026',
    items: [
      'NFT valuation waterfall: per\u2011item listings, rarity\u2011tier floors, comparable sales medians',
      'Dual\u2011value display \u2014 cost basis vs market value side by side',
      'Per\u2011item P&L with visx interactive charts',
      'Feature request system with community voting, bug reports, and screenshot attachments',
      'Collapsible request cards with lightbox image viewer',
      'UXR welcome popup for new testers with onboarding guidance',
      'Crosshair cursor performance: removed backdrop\u2011blur from overlays, cached DOM walks, targeted cursor rules',
      'Display name support for wallet profiles',
      'Portfolio history bootstrap with sparkline seeding',
      'Hybrid portfolio: aggregated summary + per\u2011wallet gallery with SWITCH',
      'Read\u2011only portfolio access via ?address= param \u2014 browse any wallet without logging in',
      'Migrate from SQLite to Neon PostgreSQL \u2014 full read/write in production',
    ],
  },
  {
    version: 'v0.1.4',
    date: 'Feb 13, 2026',
    items: [
      'Scramble\u2011decode loading text matching home hero animation',
      '10pm Easter egg \u2014 because someone had to',
      'NFT Holdings sparkline toggle on first wallet search',
      'Server\u2011side RPC proxy for reliable production wallet loading',
      'View transitions with framer\u2011motion page animations',
      'Wallet address help panel for new users',
      'Auto\u2011populate credits from completed feature requests',
    ],
  },
  {
    version: 'v0.1.3',
    date: 'Feb 12, 2026',
    items: [
      'NFT sparkline toggle with historical hover counts',
      'Dynamic Labs SDK upgrade (4.59.1 \u2192 4.61.2)',
      'Crosshair cursor performance fix',
      'UX polish: onboarding flow, nav, login gate, multi\u2011admin',
      'Grouped NFT visual overhaul: dynamic rarity accents, mergeIntoGroups',
      'Decode cost extraction fix for relayer\u2011submitted transactions',
    ],
  },
  {
    version: 'v0.1.2',
    date: 'Feb 11, 2026',
    items: [
      'GunzScan API migration with infinite scroll',
      'Ambient backdrop sparkline with smooth curves and overlay toggles',
      'Auto\u2011load portfolio on wallet connect',
      'Component decomposition: Navbar, PortfolioSummaryBar, scarcity, feature\u2011requests',
      'Wallet dropdown enhancements + identity bar refactor',
      'SEO metadata for all pages',
      'Standardized API response types',
    ],
  },
  {
    version: 'v0.1.1',
    date: 'Feb 10, 2026',
    items: [
      'Confidence indicator overhaul with enrichment reliability fixes',
      'Insanity Mode toggle + clip\u2011corner card design',
      'Sticky accent lines and container transparency polish',
      'Email auth flow + adaptive onboarding',
      'Scarcity page UX improvements',
      'Disconnect UX and network switch visibility fixes',
    ],
  },
  {
    version: 'v0.1.0',
    date: 'Feb 9, 2026',
    items: [
      'Public feature request and management system',
      'Dynamic wallet onboarding with styled connect flow',
      'Redesigned footer with social links',
      'Leaderboard page with access gate and active wallet display',
      'Nav glitch effect + gallery refactor',
    ],
  },
  {
    version: 'v0.0.3',
    date: 'Feb 5\u20138, 2026',
    items: [
      'NFTDetailModal decomposition (3,163 \u2192 1,069 lines via 4 extracted hooks)',
      'Portfolio context + hooks architecture refactor',
      'useWalletDataFetcher, useNFTEnrichmentOrchestrator, useWalletAggregation hooks',
      'WaffleChart composition visualization with stagger animation',
      'Marketplace price enrichment pipeline',
      'Portfolio three\u2011section layout with Simple/Detailed toggle',
    ],
  },
  {
    version: 'v0.0.2',
    date: 'Jan 31 \u2013 Feb 1, 2026',
    items: [
      'NFT P&L pipeline with historical prices, rarity floors, and comparable sales',
      'Interactive rarity filter pills in NFT gallery',
      'YOUR POSITION section in NFT detail modal',
      'Floor price enrichment + metadata caching',
      'Security vulnerability fixes (31 \u2192 9)',
      'Functional tier support from raw metadata',
      'Native GUN balance fetch fix',
    ],
  },
  {
    version: 'v0.0.1',
    date: 'Jan 19\u201322, 2026',
    tag: 'initial',
    items: [
      'Initial release \u2014 GUNZscope is born',
      'Multi\u2011chain portfolio tracker for Off The Grid',
      'NFT Armory/Lab feature with weapon compatibility',
      'Acquisition truth layer using RPC\u2011only fingerprints',
      'Progressive accounts implementation',
      'OpenSea + in\u2011game marketplace data integration',
    ],
  },
];

// =============================================================================
// Components
// =============================================================================

function VersionBlock({ entry, isFirst }: { entry: VersionEntry; isFirst: boolean }) {
  const isInitial = entry.tag === 'initial';
  const isCurrent = entry.tag === 'current';

  return (
    <section className="relative">
      {/* Version header */}
      <div className="flex items-center gap-3 mb-3">
        <h2 className="font-display font-bold text-lg uppercase text-[var(--gs-white)]">
          {entry.version}
        </h2>
        {isCurrent && (
          <span className="font-mono text-[9px] uppercase tracking-widest px-1.5 py-0.5 text-[var(--gs-lime)] border border-[var(--gs-lime)]/30 bg-[var(--gs-lime)]/[0.06]">
            Current
          </span>
        )}
        {isInitial && (
          <span className="font-mono text-[9px] uppercase tracking-widest px-1.5 py-0.5 text-[var(--gs-purple)] border border-[var(--gs-purple)]/30 bg-[var(--gs-purple)]/[0.06]">
            Genesis
          </span>
        )}
      </div>
      <p className="font-mono text-caption tracking-wider uppercase text-[var(--gs-gray-3)] mb-4">
        {entry.date}
      </p>

      {/* Items */}
      <ul className="space-y-2">
        {entry.items.map((item, i) => (
          <li key={i} className="flex gap-2.5 text-sm text-[var(--gs-gray-4)] leading-relaxed font-body">
            <span
              className={`mt-[7px] w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                isFirst ? 'bg-[var(--gs-lime)]' : 'bg-[var(--gs-gray-1)]'
              }`}
            />
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

function ChangelogContent() {
  return (
    <div className="min-h-dvh bg-[var(--gs-black)] text-[var(--gs-white)]">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header */}
        <h1 className="font-display font-bold text-3xl uppercase mb-2">Version History</h1>
        <p className="font-mono text-caption tracking-wider uppercase text-[var(--gs-gray-3)] mb-2">
          Early Access &middot; Public Development Log
        </p>
        <p className="font-body text-sm text-[var(--gs-gray-4)] leading-relaxed mb-12">
          GUNZscope is under active development. This page tracks every meaningful release
          since the first commit. Features ship fast &mdash; if something&rsquo;s missing,{' '}
          <a href="/feature-requests" className="text-[var(--gs-purple)] hover:text-[var(--gs-lime)] transition-colors underline underline-offset-2">
            request it
          </a>.
        </p>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical timeline line */}
          <div
            className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-[var(--gs-lime)]/40 via-[var(--gs-purple)]/20 to-transparent"
            aria-hidden="true"
          />

          <div className="space-y-10 pl-6">
            {VERSIONS.map((entry, i) => (
              <VersionBlock key={entry.version} entry={entry} isFirst={i === 0} />
            ))}
          </div>
        </div>

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

export default function ChangelogPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-[var(--gs-black)]" />}>
      <ChangelogContent />
    </Suspense>
  );
}
