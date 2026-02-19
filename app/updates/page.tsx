import { Suspense } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

// =============================================================================
// Public-facing update log — user-friendly language, no implementation details.
// Internal dev changelog lives at /changelog.
// =============================================================================

interface UpdateEntry {
  version: string;
  date: string;
  tag?: string;
  title?: string;
  items: string[];
}

const UPDATES: UpdateEntry[] = [
  {
    version: 'v0.2.8',
    date: 'Feb 19, 2026',
    tag: 'current',
    title: 'USD prices, wider charts & empty wallet UX',
    items: [
      'USD cost basis now shows on all items \u2014 previously many items only showed GUN price because the USD lookup was silently failing',
      'Acquisition card redesign \u2014 USD is now the primary display with GUN shown underneath, instead of everything on one line',
      'Portfolio chart now spans 14 days instead of 7, and extends backwards when new data becomes available',
      'Empty wallet state \u2014 wallets with no GUN or items now show a friendly message with a search bar to look up another wallet',
      'Chart tooltip follows the data \u2014 tooltip now positions above or below the point instead of being stuck at the bottom',
      'Smarter price caching \u2014 marketplace purchases that cached with a missing price are now automatically retried',
      'New origin categories \u2014 Pioneer Set, Player Zero, Prankster Set, and more items catalogued',
    ],
  },
  {
    version: 'v0.2.7',
    date: 'Feb 18, 2026',
    title: 'Origin badges & AIRDROP labels',
    items: [
      'Expanded item origins to 35+ releases \u2014 Enforcer, Pink Fury, Mr Fuckles, Mad Biker, Hopper Pilot battle passes, Trick Treat or Die event, Neotokyo, and more now tracked',
      'Items from battle passes, content packs, and events with no real purchase price now show "AIRDROP" instead of "0 GUN"',
      'Halloween items now display "Trick, Treat or Die" as their origin badge instead of generic "Halloween"',
      'Improved matching for Don DeLulu and Mrs Crackhead Santa items that weren\u2019t being recognized',
      'New loading screen quips \u2014 if you know, you know',
    ],
  },
  {
    version: 'v0.2.6',
    date: 'Feb 18, 2026',
    title: 'Smarter search & item origins',
    items: [
      'Search bar now shows whether your address is GunzChain or Solana as you type, and tells you if it\u2019s invalid',
      'Watch and Add to Portfolio buttons moved to the wallet bar \u2014 you\u2019ll see them after loading a wallet, not before',
      'NFT item origin tracking \u2014 we\u2019re building a database of every Battle Pass, Content Pack, and Event release so you can see where your items came from',
      'Wallet dropdown is easier to see against dark backgrounds',
    ],
  },
  {
    version: 'v0.2.5',
    date: 'Feb 18, 2026',
    title: 'Faster loads & smoother animations',
    items: [
      'Portfolio page loads faster \u2014 charts and gallery load on demand instead of all at once',
      'Switching wallets quickly no longer shows stale data from the previous wallet',
      'NFT cards animate in with a stagger effect when the gallery loads',
      'Keyboard navigation improvements for chart tabs',
    ],
  },
  {
    version: 'v0.2.4',
    date: 'Feb 17, 2026',
    title: 'Cost basis line & chart animations',
    items: [
      'New dashed line on the portfolio chart shows your cost basis alongside market value',
      'Chart dots now fade in like stars as your NFTs load \u2014 feels alive instead of appearing all at once',
    ],
  },
  {
    version: 'v0.2.3',
    date: 'Feb 17, 2026',
    title: 'Share cards & gallery speed',
    items: [
      'Redesigned share image \u2014 tactical HUD card showing your GUN balance, NFT count, and cost basis',
      'Download your portfolio card as a PNG image',
      'Cost basis now shows up in shared portfolio links',
      'Chart zoom works properly \u2014 no more dots flying off screen',
      'Shift+scroll zooms toward your mouse cursor',
      'Gallery scrolls faster with large collections',
      'NFT prices load faster during enrichment',
    ],
  },
  {
    version: 'v0.2.2',
    date: 'Feb 17, 2026',
    title: 'Multi-wallet fixes & chart polish',
    items: [
      'Smooth crossfade when switching between chart views',
      'Multi-wallet NFT count now adds up correctly across all your wallets',
      'Gallery count includes duplicate items (e.g. 3x of the same skin)',
      'Holdings breakdown cleaned up with a simpler layout',
      'Wallet dropdown redesign with spring animations',
    ],
  },
  {
    version: 'v0.2.1',
    date: 'Feb 17, 2026',
    title: 'Spring animations everywhere',
    items: [
      'Every panel, modal, and drawer now has smooth spring-physics animations',
      'Custom green arrow cursor across the entire site',
      'Wallet switcher and share icons stay highlighted while their panels are open',
    ],
  },
  {
    version: 'v0.2.0',
    date: 'Feb 16, 2026',
    title: 'OpenSea offer detection',
    items: [
      'NFTs bought via OpenSea offers now correctly show their purchase price',
      'Offer fills display "OpenSea (Offer)" as the acquisition source',
    ],
  },
  {
    version: 'v0.1.9',
    date: 'Feb 16, 2026',
    title: 'Performance overhaul',
    items: [
      'Site loads significantly faster \u2014 removed 15 unused libraries and slimmed the bundle',
      'Charts, modals, and heavy components only load when you need them',
      'Smaller images with AVIF format on supported browsers',
    ],
  },
  {
    version: 'v0.1.8',
    date: 'Feb 16, 2026',
    title: 'Market page & scarcity upgrades',
    items: [
      'New Market page \u2014 browse all active OpenSea listings with search and buy links',
      'Scarcity page now shows quality badges, Best Deal sorting, and price range filters',
      'Listing coverage tripled \u2014 up to 3,000 items from OpenSea',
      'P&L chart redesign with gradient effects and smarter axis labels',
    ],
  },
  {
    version: 'v0.1.7',
    date: 'Feb 15, 2026',
    title: 'Timeline chart & sparkline stability',
    items: [
      'Acquisition Timeline chart with better dot distribution on the Y-axis',
      'Dots appear on the chart as enrichment discovers them \u2014 no more waiting for everything to finish',
      'Portfolio sparkline no longer jumps around on page reloads',
    ],
  },
  {
    version: 'v0.1.6',
    date: 'Feb 14, 2026',
    title: 'Social sharing & valuation upgrade',
    items: [
      'Share your portfolio on X or Discord with a rich preview card',
      'Better NFT valuations \u2014 uses per-item listings, comparable sales, and rarity-tier floors',
      'New insights: unrealized P&L, most valuable item, biggest loss',
      'Acquisition Timeline and P&L Scatter Plot added to the main portfolio view',
    ],
  },
  {
    version: 'v0.1.5',
    date: 'Feb 14, 2026',
    title: 'P&L charts & feature requests',
    items: [
      'NFT valuation waterfall: per-item listings, rarity floors, comparable sales',
      'Cost basis vs market value shown side by side',
      'Per-item P&L with interactive charts',
      'Feature request system \u2014 submit ideas, vote on others, attach screenshots',
      'Browse any wallet without logging in via ?address= links',
      'Multi-wallet portfolio \u2014 see a combined summary across all your wallets',
    ],
  },
  {
    version: 'v0.1.4',
    date: 'Feb 13, 2026',
    title: 'Loading animations & help panels',
    items: [
      'New scramble-decode loading animation matching the home page style',
      'NFT Holdings sparkline toggle',
      'Wallet address help panel for new users',
    ],
  },
  {
    version: 'v0.1.3',
    date: 'Feb 12, 2026',
    title: 'Gallery polish & rarity accents',
    items: [
      'NFT sparkline with historical hover counts',
      'Grouped NFTs now show dynamic rarity accent colors',
      'Fixed decode cost extraction for relayer transactions',
    ],
  },
  {
    version: 'v0.1.2',
    date: 'Feb 11, 2026',
    title: 'Backdrop sparkline & auto-load',
    items: [
      'Ambient portfolio sparkline in the background',
      'Portfolio auto-loads when you connect your wallet',
      'Wallet identity bar redesign',
      'SEO metadata for all pages',
    ],
  },
  {
    version: 'v0.1.1',
    date: 'Feb 10, 2026',
    title: 'Insanity Mode & email auth',
    items: [
      'Insanity Mode toggle with angular card designs',
      'Email authentication flow',
      'Scarcity page improvements',
    ],
  },
  {
    version: 'v0.1.0',
    date: 'Feb 9, 2026',
    title: 'Feature requests & leaderboard',
    items: [
      'Public feature request system',
      'Leaderboard page with active wallet display',
      'Styled wallet connect flow',
    ],
  },
  {
    version: 'v0.0.3',
    date: 'Feb 5\u20138, 2026',
    title: 'Portfolio architecture',
    items: [
      'Portfolio context and hooks architecture for multi-wallet support',
      'Marketplace price enrichment pipeline',
      'WaffleChart composition visualization',
    ],
  },
  {
    version: 'v0.0.2',
    date: 'Jan 31 \u2013 Feb 1, 2026',
    title: 'P&L pipeline & rarity filters',
    items: [
      'NFT P&L tracking with historical prices',
      'Rarity filter pills in the gallery',
      'YOUR POSITION section in the NFT detail view',
      'Floor price enrichment and caching',
    ],
  },
  {
    version: 'v0.0.1',
    date: 'Jan 19\u201322, 2026',
    tag: 'initial',
    title: 'GUNZscope is born',
    items: [
      'Multi-chain portfolio tracker for Off The Grid',
      'NFT Armory with weapon compatibility checking',
      'Acquisition tracking from blockchain data',
      'OpenSea and in-game marketplace integration',
    ],
  },
];

// =============================================================================
// Components
// =============================================================================

function UpdateBlock({ entry, isFirst }: { entry: UpdateEntry; isFirst: boolean }) {
  const isInitial = entry.tag === 'initial';
  const isCurrent = entry.tag === 'current';

  return (
    <section className="relative">
      {/* Version header */}
      <div className="flex items-center gap-3 mb-1">
        <h2 className="font-display font-bold text-lg uppercase text-[var(--gs-white)]">
          {entry.version}
        </h2>
        {isCurrent && (
          <span className="font-mono text-[9px] uppercase tracking-widest px-1.5 py-0.5 text-[var(--gs-lime)] border border-[var(--gs-lime)]/30 bg-[var(--gs-lime)]/[0.06]">
            Latest
          </span>
        )}
        {isInitial && (
          <span className="font-mono text-[9px] uppercase tracking-widest px-1.5 py-0.5 text-[var(--gs-purple)] border border-[var(--gs-purple)]/30 bg-[var(--gs-purple)]/[0.06]">
            Genesis
          </span>
        )}
      </div>
      {entry.title && (
        <p className="font-body text-sm text-[var(--gs-white)]/80 mb-2">{entry.title}</p>
      )}
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

        {/* Timeline */}
        <div className="relative">
          {/* Vertical timeline line */}
          <div
            className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-[var(--gs-lime)]/40 via-[var(--gs-purple)]/20 to-transparent"
            aria-hidden="true"
          />

          <div className="space-y-10 pl-6">
            {UPDATES.map((entry, i) => (
              <UpdateBlock key={entry.version} entry={entry} isFirst={i === 0} />
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

export default function UpdatesPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-[var(--gs-black)]" />}>
      <UpdatesContent />
    </Suspense>
  );
}
