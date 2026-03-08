'use client';

import Link from 'next/link';
import Logo from '@/components/Logo';
import Footer from '@/components/Footer';
import BuildVelocityChart from '@/components/charts/BuildVelocityChart';

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const CLIP_SM = 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))';

interface Phase {
  id: string;
  label: string;
  title: string;
  active: boolean;
  items: string[];
}

const PHASES: Phase[] = [
  {
    id: 'now',
    label: 'Phase 1 \u2014 Now',
    title: 'Portfolio Intelligence',
    active: true,
    items: [
      'Multi\u2011chain portfolio tracker (GunzChain + Solana)',
      'Real\u2011time GUN price + NFT valuation waterfall',
      'NFT acquisition pipeline with P&L analytics',
      'Weapon Lab compatibility engine',
      'Referral + waitlist viral loop',
      'Early\u2011access whitelist gate',
    ],
  },
  {
    id: 'q2',
    label: 'Phase 2 \u2014 Q2 2026',
    title: 'Social & Reputation',
    active: false,
    items: [
      'On\u2011chain portfolio attestations (AVAX C\u2011Chain)',
      'Soulbound reputation badges (ERC\u20115192)',
      'Provable leaderboards from snapshot oracle',
      'Curated loadout publishing system',
      'Weapon Lab certification registry',
      'Season 1 launch with competitive rankings',
    ],
  },
  {
    id: 'q3',
    label: 'Phase 3 \u2014 Q3 2026',
    title: 'Market Layer',
    active: false,
    items: [
      'Trade intent registry (OTC orderbook)',
      'Intent matching engine + discovery',
      'Comparable sales intelligence',
      'Price prediction models from enrichment data',
      'Advanced portfolio analytics dashboards',
      'API access for third\u2011party integrations',
    ],
  },
  {
    id: 'q4',
    label: 'Phase 4 \u2014 Q4 2026',
    title: 'Ecosystem Expansion',
    active: false,
    items: [
      'Cross\u2011game portfolio support (beyond OTG)',
      'Guild management + treasury tracking',
      'Tournament integration layer',
      'Mobile\u2011optimized progressive web app',
      'GunzChain native deployment (partnership)',
      'Governance token for premium features',
    ],
  },
  {
    id: '2027',
    label: 'Phase 5 \u2014 2027',
    title: 'Platform Play',
    active: false,
    items: [
      'Multi\u2011game analytics (any EVM gaming chain)',
      'Institutional\u2011grade portfolio tools',
      'On\u2011chain credit scoring for gaming assets',
      'DeFi composability (collateralized lending)',
      'White\u2011label SDK for game studios',
      'Decentralized oracle network for game data',
    ],
  },
  {
    id: 'endgame',
    label: 'Endgame',
    title: 'The Bloomberg of Gaming',
    active: false,
    items: [
      'Cross\u2011chain gaming asset terminal',
      'Real\u2011time market intelligence feeds',
      'Algorithmic trading for gaming economies',
      'Institutional research reports',
      'Gaming\u2011native financial instruments',
      'The definitive data layer for gaming blockchains',
    ],
  },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function DocBadge() {
  return (
    <div
      className="inline-flex items-center gap-2 px-3.5 py-1.5 border border-[var(--gs-lime)]/30 bg-[var(--gs-lime)]/[0.05] font-mono text-[10px] tracking-[2px] uppercase text-[var(--gs-lime)] mb-6"
      style={{ clipPath: CLIP_SM }}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-[var(--gs-lime)] animate-pulse" />
      Strategic Roadmap &mdash; 2026
    </div>
  );
}

function PhaseNode({ phase, index }: { phase: Phase; index: number }) {
  return (
    <div className="relative grid grid-cols-[40px_1fr] md:grid-cols-[60px_1fr] gap-4 md:gap-6">
      <div className="flex flex-col items-center">
        <div
          className={`w-3 h-3 shrink-0 border-2 ${
            phase.active
              ? 'bg-[var(--gs-lime)] border-[var(--gs-lime)] shadow-[0_0_12px_var(--gs-lime)]'
              : 'bg-transparent border-[var(--gs-gray-2)]'
          }`}
          style={{ clipPath: 'polygon(0 0, calc(100% - 3px) 0, 100% 3px, 100% 100%, 3px 100%, 0 calc(100% - 3px))' }}
        />
        {index < PHASES.length - 1 && (
          <div
            className={`w-px flex-1 mt-2 ${
              phase.active
                ? 'bg-gradient-to-b from-[var(--gs-lime)]/40 to-[var(--gs-gray-1)]'
                : 'bg-[var(--gs-gray-1)]'
            }`}
          />
        )}
      </div>

      <div className={`pb-10 md:pb-14 ${index === PHASES.length - 1 ? 'pb-0 md:pb-0' : ''}`}>
        <div
          className={`font-mono text-[9px] tracking-[2px] uppercase mb-1.5 ${
            phase.active ? 'text-[var(--gs-lime)]' : 'text-[var(--gs-gray-2)]'
          }`}
        >
          {phase.label}
        </div>
        <h3
          className={`font-display font-bold text-lg md:text-xl uppercase tracking-wide mb-4 ${
            phase.active ? 'text-[var(--gs-white)]' : 'text-[var(--gs-gray-4)]'
          }`}
        >
          {phase.title}
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {phase.items.map((item, i) => (
            <span
              key={i}
              className={`inline-block font-mono text-[10px] md:text-[11px] px-2.5 py-1 border ${
                phase.active
                  ? 'border-[var(--gs-lime)]/20 bg-[var(--gs-lime)]/[0.04] text-[var(--gs-gray-4)]'
                  : 'border-white/[0.06] bg-white/[0.02] text-[var(--gs-gray-3)]'
              }`}
              style={{ clipPath: CLIP_SM }}
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function ScopeBar() {
  const scopes = [
    { label: 'OTG', width: '16.66%', active: true },
    { label: 'GUNZ Ecosystem', width: '33.33%', active: false },
    { label: 'Cross\u2011Chain Gaming', width: '33.33%', active: false },
    { label: 'All Gaming', width: '16.66%', active: false },
  ];

  return (
    <div className="mt-14 md:mt-20">
      <div className="font-mono text-[9px] tracking-[2px] uppercase text-[var(--gs-gray-2)] mb-3">
        Market Scope Expansion
      </div>
      <div className="flex h-8 border border-white/[0.06] overflow-hidden">
        {scopes.map((s, i) => (
          <div
            key={i}
            className={`flex items-center justify-center font-mono text-[9px] md:text-[10px] tracking-wider uppercase border-r border-white/[0.06] last:border-r-0 ${
              s.active
                ? 'bg-[var(--gs-lime)]/[0.08] text-[var(--gs-lime)] border-t-2 border-t-[var(--gs-lime)]'
                : 'bg-white/[0.02] text-[var(--gs-gray-3)]'
            }`}
            style={{ width: s.width }}
          >
            <span className="truncate px-1">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page — public version (no admin gate)
// ---------------------------------------------------------------------------

export default function BuildGamesRoadmap() {
  return (
    <div className="min-h-dvh flex flex-col bg-[var(--gs-black)] text-[var(--gs-white)]">
      <div className="page-bg" />

      {/* Minimal nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-[900px] mx-auto px-5 md:px-10 h-14 flex items-center justify-between">
          <Link href="/build-games" className="flex items-center gap-3">
            <div className="relative w-[9rem] sm:w-[10rem] overflow-hidden">
              <Logo size="md" variant="full" glitchOnHover />
            </div>
          </Link>
          <Link
            href="/build-games"
            className="font-mono text-[11px] tracking-wider uppercase text-[var(--gs-gray-3)] hover:text-[var(--gs-lime)] transition-colors"
          >
            &larr; Overview
          </Link>
        </div>
      </nav>
      <div className="h-14" />

      <main className="flex-1 max-w-[900px] mx-auto px-5 md:px-10 py-16 w-full relative z-[1]">

        {/* Header */}
        <header className="pb-14 border-b border-white/[0.06]">
          <DocBadge />
          <h1 className="font-display font-bold text-[clamp(36px,5vw,56px)] uppercase tracking-tight leading-none mb-4">
            <span className="text-[var(--gs-lime)]">GUNZscope</span><br />
            Strategic Roadmap
          </h1>
          <p className="text-lg font-light text-[var(--gs-gray-4)] max-w-[700px]">
            From portfolio tracker to the{' '}
            <strong className="text-[var(--gs-white)] font-medium">Bloomberg of gaming blockchains</strong>.
            Six phases from single&#8209;game intelligence to cross&#8209;chain gaming terminal.
          </p>
        </header>

        {/* Build velocity */}
        <section className="py-10">
          <BuildVelocityChart />
        </section>

        {/* Vision banner */}
        <div className="my-10 px-8 py-6 bg-[var(--gs-purple)]/[0.04] border border-[var(--gs-purple)]/15 border-l-[3px] border-l-[var(--gs-purple)] flex gap-4 items-start">
          <span className="text-xl shrink-0 mt-0.5 text-[var(--gs-purple)]" aria-hidden="true">&#9670;</span>
          <div>
            <div className="font-display text-sm font-semibold uppercase tracking-[1px] text-[var(--gs-purple)] mb-1.5">
              Build Games 2026 &mdash; Strategic Vision
            </div>
            <p className="text-sm text-[var(--gs-gray-4)] leading-relaxed">
              GUNZscope reads from <strong className="text-[var(--gs-white)]">GunzChain</strong> (an Avalanche L1) and
              writes to <strong className="text-[var(--gs-white)]">AVAX C&#8209;Chain</strong> &mdash; demonstrating
              Avalanche&rsquo;s multi&#8209;chain thesis in action. Each phase expands the scope: from OTG game items,
              to the broader GUNZ ecosystem, to all gaming blockchains.
            </p>
          </div>
        </div>

        {/* Timeline */}
        <section className="py-14">
          {PHASES.map((phase, i) => (
            <PhaseNode key={phase.id} phase={phase} index={i} />
          ))}
          <ScopeBar />
        </section>

        {/* Document footer */}
        <div className="pt-10 border-t border-white/[0.06] flex flex-col sm:flex-row justify-between font-mono text-[10px] text-[var(--gs-gray-2)] tracking-[1px]">
          <span>GUNZscope &middot; Build Games 2026 &middot; Strategic Roadmap</span>
          <span className="mt-2 sm:mt-0">gunzscope.xyz</span>
        </div>

      </main>
      <Footer variant="minimal" />
    </div>
  );
}
