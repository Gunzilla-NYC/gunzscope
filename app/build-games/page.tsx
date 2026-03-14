'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Logo from '@/components/Logo';
import Footer from '@/components/Footer';
import BuildVelocityChart from '@/components/charts/BuildVelocityChart';
import VersionBadge from '@/components/ui/VersionBadge';
import { GlitchLink } from '@/components/navbar/GlitchLink';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CLIP_SM = 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))';
const CLIP_LG = 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))';

const LIVE_APP_URL = 'https://gunzscope.xyz';

// ---------------------------------------------------------------------------
// Scroll animation hook
// ---------------------------------------------------------------------------

function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      (entries, obs) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('revealed'); obs.unobserve(e.target); } }),
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' },
    );
    const els = ref.current.querySelectorAll('.reveal');
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return ref;
}

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

interface SiteStats {
  nftsTracked: number;
  walletsTracked: number;
}

interface AttestationStats {
  totalAttestations: number;
}

function useLiveStats() {
  const [site, setSite] = useState<SiteStats>({ nftsTracked: 11000, walletsTracked: 280 });
  const [attestation, setAttestation] = useState<AttestationStats>({ totalAttestations: 150 });
  const [gunPrice, setGunPrice] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/stats/site').then((r) => r.ok ? r.json() : null).then((d) => {
      if (d) setSite({ nftsTracked: d.nftsTracked ?? 11000, walletsTracked: d.walletsTracked ?? 280 });
    }).catch(() => {});

    fetch('/api/attestation/status').then((r) => r.ok ? r.json() : null).then((d) => {
      if (d) setAttestation({ totalAttestations: d.totalAttestations ?? 150 });
    }).catch(() => {});

    fetch('/api/price/gun').then((r) => r.ok ? r.json() : null).then((d) => {
      if (d?.gunTokenPrice) setGunPrice(d.gunTokenPrice);
    }).catch(() => {});
  }, []);

  return { site, attestation, gunPrice };
}

// ---------------------------------------------------------------------------
// Feature data
// ---------------------------------------------------------------------------

const FEATURES = [
  {
    icon: '\u{1F4CA}', title: 'Dual\u2011Track P&L', tag: 'live',
    desc: 'Two independent performance metrics \u2014 GUN token appreciation (Track A) and market\u2011based valuation via comparable sales (Track B). See the full picture.',
  },
  {
    icon: '\u{1F310}', title: 'Cross\u2011Chain', tag: 'live',
    desc: 'Unified portfolio across GunzChain (Avalanche L1) and Solana. 300+ wallets supported via Dynamic Labs. One dashboard, complete visibility.',
  },
  {
    icon: '\u{1F50D}', title: 'Acquisition Intel', tag: 'live',
    desc: 'Automatic detection of how each NFT was acquired \u2014 HEX decode, marketplace purchase, or transfer \u2014 with original GUN cost basis.',
  },
  {
    icon: '\u{1F4B0}', title: 'Tiered Valuation', tag: 'live',
    desc: '6\u2011tier valuation waterfall from exact item sales to collection floor. Each tier carries a confidence indicator so you know what you\u2019re looking at.',
  },
  {
    icon: '\u2B1B', title: 'On\u2011Chain Attestations', tag: 'live',
    desc: 'Portfolio snapshots written to AVAX C\u2011Chain with metadata on Autonomys DSN. Provable valuations and verifiable portfolio history.',
  },
  {
    icon: '\u{1F396}\uFE0F', title: 'Reputation System', tag: 'next',
    desc: 'Soulbound badges earned through milestones \u2014 collection size, trade volume, certifications. Non\u2011transferable, chain\u2011verified credibility.',
  },
  {
    icon: '\u{1F52B}', title: 'Weapon Intelligence', tag: 'live',
    desc: 'Compatibility detection via model codes extracted from asset URLs. Identifies locked special editions vs modifiable weapons. Real data, not name matching.',
  },
  {
    icon: '\u{1F3F7}\uFE0F', title: 'Rarity Intelligence', tag: 'live',
    desc: 'Dual rarity system \u2014 display rarity and functional tier. 7\u2011tier hierarchy from Common to Classified, with locked special edition detection.',
  },
  {
    icon: '\u26A1', title: 'Live Pricing', tag: 'live',
    desc: 'GUN token price via CoinGecko with historical tracking for accurate cost basis. Real\u2011time portfolio updates as market prices move.',
  },
] as const;

// ---------------------------------------------------------------------------
// Valuation tiers
// ---------------------------------------------------------------------------

const TIERS = [
  { num: 'T1', name: 'Exact Item', desc: 'This specific tokenId has sold before', confidence: 'Exact', level: 'high' },
  { num: 'T2', name: 'Same Variant', desc: 'Same skin + weapon + rarity', confidence: 'High', level: 'high' },
  { num: 'T3', name: 'Same Skin', desc: 'Same skin design at same rarity', confidence: 'Good', level: 'good' },
  { num: 'T4', name: 'Same Weapon', desc: 'Same weapon + rarity, any skin', confidence: 'Moderate', level: 'moderate' },
  { num: 'T5', name: 'Similar Items', desc: 'Same type + rarity class', confidence: 'Estimate', level: 'moderate' },
  { num: 'T6', name: 'Collection Floor', desc: 'Fallback to collection\u2011wide floor', confidence: 'Floor', level: 'low' },
] as const;

// ---------------------------------------------------------------------------
// Section header — matches homepage pattern (section-number + section-line)
// ---------------------------------------------------------------------------

function SectionHeader({ num, title }: { num: string; title: string }) {
  return (
    <div className="flex items-baseline gap-4 mb-10 reveal">
      <span className="section-number">{num}</span>
      <h2 className="font-display font-bold text-3xl uppercase tracking-wide">{title}</h2>
      <div className="section-line" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function BuildGamesPage() {
  const containerRef = useScrollReveal();
  const { site, attestation, gunPrice } = useLiveStats();

  return (
    <div ref={containerRef} className="min-h-dvh flex flex-col bg-[var(--gs-black)] text-[var(--gs-white)]">
      <div className="page-bg" />

      {/* ─── NAV ─── matches homepage Navbar.tsx structure */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-16 glass-effect border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 h-full flex items-center">
          <div className="flex items-center h-16 w-full">
            <div className="flex items-center gap-2 shrink-0">
              <Link href="/build-games" className="flex items-center gap-2">
                <Logo size="md" variant="icon" />
                <span className="font-display font-bold text-lg tracking-wider uppercase">
                  GUNZ<span className="text-[var(--gs-purple)]">scope</span>
                </span>
              </Link>
              <VersionBadge />
            </div>
            <nav className="hidden md:flex items-center gap-5 ml-6 shrink-0">
              <GlitchLink href="#architecture" label="Architecture" isActive={false} />
              <GlitchLink href="#features" label="Features" isActive={false} />
              <GlitchLink href="#preview" label="Dashboard" isActive={false} />
              <GlitchLink href="#builder" label="Builder" isActive={false} />
              <GlitchLink href="/build-games/roadmap" label="Roadmap" isActive={false} />
            </nav>
            <div className="ml-auto shrink-0">
              <a
                href={LIVE_APP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-display font-semibold text-data uppercase tracking-wider px-4 py-1.5 bg-[var(--gs-lime)] text-[var(--gs-black)] hover:bg-[var(--gs-lime-hover)] transition-colors clip-corner-sm"
              >
                Launch App &rarr;
              </a>
            </div>
          </div>
        </div>
      </nav>
      <div className="h-16" />

      {/* ─── HERO ─── matches homepage hero structure */}
      <section className="relative min-h-screen flex flex-col justify-center pt-32 pb-24 overflow-hidden">
        {/* Background glows */}
        <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[900px] h-[900px] bg-[radial-gradient(circle,rgba(166,247,0,0.06)_0%,transparent_60%)] pointer-events-none" />
        <div className="absolute bottom-[-100px] right-[-200px] w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(109,91,255,0.05)_0%,transparent_60%)] pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 w-full">
        <div className="max-w-[900px]">
          {/* Badges */}
          <div className="flex flex-wrap gap-3 mb-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 border border-[var(--gs-lime)]/30 bg-[var(--gs-lime)]/5 clip-corner-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--gs-lime)] animate-pulse-dot" />
              <span className="font-mono text-data tracking-wider uppercase text-[var(--gs-lime)]">
                Powered by GUNZ Protocol
              </span>
            </div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 border border-[#E84142]/30 bg-[#E84142]/5 clip-corner-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E84142] animate-pulse-dot" />
              <span className="font-mono text-data tracking-wider uppercase text-[#E84142]">
                Avalanche Build Games 2026
              </span>
            </div>
          </div>

          {/* Title */}
          <h1 className="font-display font-bold text-5xl sm:text-6xl md:text-7xl lg:text-[88px] leading-[0.95] tracking-wide uppercase mb-6">
            <span className="block text-[var(--gs-white)]">Your OTG</span>
            <span className="block text-[var(--gs-purple-bright)]" style={{ textShadow: '0 0 40px rgba(109, 91, 255, 0.3)' }}>
              Arsenal
            </span>
            <span className="block text-[var(--gs-lime)] relative hero-underline">
              Intelligence
            </span>
          </h1>

          {/* Subtitle */}
          <p className="font-body text-lg font-light leading-relaxed text-[var(--gs-gray-4)] max-w-none mb-10">
            Track, analyze, and value your <strong className="text-[var(--gs-white)] font-medium">Off The Grid</strong> NFT
            arsenal with dual&#8209;track P&L, tiered valuations, and weapon intelligence.
            On&#8209;chain player identity via <strong className="text-[var(--gs-white)] font-medium">Avalanche</strong> attestations.
            Multi&#8209;chain across <strong className="text-[var(--gs-white)] font-medium">GunzChain</strong> and{' '}
            <strong className="text-[var(--gs-white)] font-medium">Solana</strong>.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap gap-4">
            <a
              href={LIVE_APP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative px-8 py-3.5 bg-[rgba(166,247,0,0.85)] backdrop-blur-md text-[var(--gs-black)] hover:bg-[rgba(166,247,0,0.95)] hover:shadow-[0_0_30px_rgba(166,247,0,0.3)] transition-all clip-corner flex items-center gap-3"
            >
              <div className="flex flex-col items-start">
                <span className="font-display font-bold text-base uppercase tracking-wider">Launch App</span>
                <span className="font-mono text-[9px] uppercase tracking-widest opacity-70">Live prototype</span>
              </div>
              <svg className="hidden sm:block w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </a>
            <Link
              href="/build-games/roadmap"
              className="font-display font-semibold text-data uppercase tracking-wider px-4 py-1.5 border border-white/[0.12] text-[var(--gs-gray-3)] hover:text-[var(--gs-white)] hover:border-white/[0.25] transition-colors clip-corner-sm flex items-center h-[52px]"
            >
              View Roadmap
            </Link>
            <a
              href="https://github.com/Gunzilla-NYC/gunzscope"
              target="_blank"
              rel="noopener noreferrer"
              className="font-display font-semibold text-data uppercase tracking-wider px-4 py-1.5 border border-white/[0.12] text-[var(--gs-gray-3)] hover:text-[var(--gs-white)] hover:border-white/[0.25] transition-colors clip-corner-sm flex items-center h-[52px] gap-2"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
              GitHub
            </a>
          </div>
        </div>
        </div>

        {/* Hero Stats Bar — matches homepage exactly */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-white/[0.06] glass-effect z-10">
          <div className="max-w-7xl mx-auto flex flex-wrap">
            <div className="flex-1 min-w-[50%] md:min-w-0 px-6 lg:px-10 py-6 border-r border-white/[0.06] bg-[var(--gs-lime)]/[0.03]">
              <span className="font-mono text-caption tracking-wider uppercase text-[var(--gs-lime)] block mb-1">GUN Price</span>
              <span className="font-display text-3xl font-bold text-[var(--gs-white)]">$<span className="text-[var(--gs-lime)]">{gunPrice ? gunPrice.toFixed(4) : '0.0264'}</span></span>
            </div>
            <div className="flex-1 min-w-[50%] md:min-w-0 px-6 lg:px-10 py-6 border-r border-white/[0.06]">
              <span className="font-mono text-caption tracking-wider uppercase text-[var(--gs-gray-3)] block mb-1">NFTs Tracked</span>
              <span className="font-display text-3xl font-bold text-[var(--gs-white)]">{site.nftsTracked.toLocaleString()}</span>
            </div>
            <div className="flex-1 min-w-[50%] md:min-w-0 px-6 lg:px-10 py-6 border-r border-white/[0.06]">
              <span className="font-mono text-caption tracking-wider uppercase text-[var(--gs-gray-3)] block mb-1">Blocks Scanned</span>
              <span className="font-display text-3xl font-bold text-[var(--gs-white)]">15M+</span>
            </div>
            <div className="flex-1 min-w-[50%] md:min-w-0 px-6 lg:px-10 py-6">
              <span className="font-mono text-caption tracking-wider uppercase text-[var(--gs-gray-3)] block mb-1">Tracking</span>
              <span className="font-display text-3xl font-bold text-[var(--gs-profit)]">24/7</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── BUILD VELOCITY ─── */}
      <section className="relative z-10 py-24 border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <SectionHeader num="00" title="Build Velocity" />
          <div className="reveal">
            <BuildVelocityChart />
          </div>
        </div>
      </section>

      {/* ─── THE MARKET ─── */}
      <section className="relative z-10 py-24 border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <SectionHeader num="01" title="The Market" />

          <div className="grid md:grid-cols-2 gap-10 md:gap-16">
            {/* ── Body copy ── */}
            <div className="flex flex-col justify-center gap-5 reveal">
              <p className="text-base font-light leading-relaxed text-[var(--gs-gray-4)]">
                Blockchain gaming is a <strong className="text-[var(--gs-white)] font-medium">$21.6B market with 102 million players</strong> &mdash;
                and not a single tool exists that gives players portfolio&#8209;level intelligence about what they own.
                Existing analytics (DappRadar, Nansen, NFTGo, Zapper) operate at the marketplace and collection layer:
                floor prices, whale tracking, trading volume. None of them understand game&#8209;specific context &mdash;
                acquisition method, cost basis per item, weapon compatibility, rarity tier logic, or cross&#8209;marketplace
                price discrepancies. There are <strong className="text-[var(--gs-white)] font-medium">47+ NFT analytics tools.
                Zero are built for the player.</strong>
              </p>
              <p className="text-base font-light leading-relaxed text-[var(--gs-gray-4)]">
                <strong className="text-[var(--gs-white)] font-medium">Off The Grid</strong> is one of the largest
                blockchain&#8209;integrated games ever shipped. <strong className="text-[var(--gs-white)] font-medium">14 million
                unique players</strong> across Xbox, PlayStation, Epic Games Store, and Steam. Items are acquired by
                collecting HEXs in&#8209;game and decoding them to mint new items on&#8209;chain. Those items are then bought
                and sold through various marketplaces. Due to completely decoupled markets, massive price gaps and a large,{' '}
                <strong className="text-[var(--gs-white)] font-medium">completely untrusted OTC trading culture</strong> has
                emerged &mdash; creating a highly inefficient, inaccurate, and unsafe market.{' '}
                <strong className="text-[var(--gs-white)] font-medium">No single source of truth exists</strong> for these
                players who have asked for a way to quantify and understand what they own. Instead they resort to untrusted
                Discord price checks, unsafe solicitations, and personal spreadsheets that do not stay current.
              </p>
              <p className="text-base font-light leading-relaxed text-[var(--gs-gray-4)]">
                <strong className="text-[var(--gs-white)] font-medium">GUNZscope solves for this gap.</strong>
              </p>
              <p className="text-base font-light leading-relaxed text-[var(--gs-gray-4)]">
                This is a <strong className="text-[var(--gs-white)] font-medium">category&#8209;level absence</strong> &mdash;
                true across all of blockchain gaming. OTG and GUNZscope Phase I is a sequenced strategic entry point, not the ceiling.
              </p>
            </div>

            {/* ── Stat cards ── */}
            <div className="flex flex-col gap-4 reveal">
              {/* Top row: 3 cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-5 border border-[var(--gs-lime)]/20 bg-[var(--gs-lime)]/[0.03]" style={{ clipPath: CLIP_SM }}>
                  <div className="font-mono text-[9px] tracking-wider uppercase text-[var(--gs-gray-3)] mb-2">Blockchain Gaming Market</div>
                  <div className="font-display text-3xl font-bold text-[var(--gs-lime)]">$21.6B</div>
                  <div className="font-mono text-[10px] text-[var(--gs-gray-4)] mt-1">2025, projected $1.27T by 2033</div>
                </div>
                <div className="p-5 border border-white/[0.06] bg-[var(--gs-dark-2)]" style={{ clipPath: CLIP_SM }}>
                  <div className="font-mono text-[9px] tracking-wider uppercase text-[var(--gs-gray-3)] mb-2">Blockchain Gamers</div>
                  <div className="font-display text-3xl font-bold text-[var(--gs-white)]">102M</div>
                  <div className="font-mono text-[10px] text-[var(--gs-gray-4)] mt-1">Of 3.48B total gamers globally</div>
                </div>
                <div className="p-5 border border-[var(--gs-lime)]/30 bg-[var(--gs-lime)]/[0.05]" style={{ clipPath: CLIP_SM }}>
                  <div className="font-mono text-[9px] tracking-wider uppercase text-[var(--gs-lime)]/60 mb-2">NFT Analytics Tools</div>
                  <div className="font-display text-3xl font-bold text-[var(--gs-lime)]">47+</div>
                  <div className="font-mono text-[10px] text-[var(--gs-white)]/70 mt-1">All market&#8209;level. <strong className="text-[var(--gs-white)]">Zero player&#8209;level.</strong></div>
                </div>
              </div>
              {/* Bottom row: 2 cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 border border-white/[0.06] bg-[var(--gs-dark-2)]" style={{ clipPath: CLIP_SM }}>
                  <div className="font-mono text-[9px] tracking-wider uppercase text-[var(--gs-gray-3)] mb-2">OTG Players</div>
                  <div className="font-display text-3xl font-bold text-[var(--gs-white)]">14M+</div>
                  <div className="font-mono text-[10px] text-[var(--gs-gray-4)] mt-1">Across 4 platforms + GeForce Now</div>
                </div>
                <div className="p-5 border border-[var(--gs-purple)]/20 bg-[var(--gs-purple)]/[0.03]" style={{ clipPath: CLIP_SM }}>
                  <div className="font-mono text-[9px] tracking-wider uppercase text-[var(--gs-gray-3)] mb-2">Portfolio Trackers for Gamers</div>
                  <div className="font-display text-3xl font-bold text-[var(--gs-purple-bright)]">0</div>
                  <div className="font-mono text-[10px] text-[var(--gs-gray-4)] mt-1">Before GUNZscope</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── ARCHITECTURE ─── */}
      <section id="architecture" className="relative z-10 py-24 border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <SectionHeader num="02" title="Multi-Chain Architecture" />

          <div className="grid md:grid-cols-2 gap-10 md:gap-16">
            {/* Narrative */}
            <div className="flex flex-col justify-center gap-5 reveal">
              <p className="text-base font-light leading-relaxed text-[var(--gs-gray-4)]">
                GUNZscope operates a <strong className="text-[var(--gs-white)] font-medium">hybrid multi&#8209;chain architecture</strong> &mdash;
                reading game state from <em className="text-[var(--gs-lime)] not-italic font-medium">GunzChain</em> (an Avalanche L1)
                and <em className="text-[var(--gs-lime)] not-italic font-medium">Solana</em>,
                while writing platform&#8209;native data to <em className="text-[var(--gs-lime)] not-italic font-medium">AVAX C&#8209;Chain</em> and <em className="text-[var(--gs-lime)] not-italic font-medium">Autonomys DSN</em>.
              </p>
              <p className="text-base font-light leading-relaxed text-[var(--gs-gray-4)]">
                The data layer solves a problem no one else has touched. GUNZscope resolves <strong className="text-[var(--gs-white)] font-medium">exact
                mint&#8209;item acquisition costs</strong> across every marketplace &mdash; data that not even Gunzilla
                provides &mdash; and computes <strong className="text-[var(--gs-white)] font-medium">aggregate portfolio
                value</strong> for gaming NFTs. This dataset doesn&rsquo;t exist anywhere else in the ecosystem.
              </p>
              <p className="text-base font-light leading-relaxed text-[var(--gs-gray-4)]">
                Attestations write a Merkle proof to C&#8209;Chain with full metadata stored permanently
                on <em className="text-[var(--gs-white)] not-italic font-medium">Autonomys DSN</em> &mdash;
                creating an <strong className="text-[var(--gs-white)] font-medium">on&#8209;chain player record</strong> that
                is immutable, verifiable, and persists even if GUNZscope goes offline.
                The data intelligence brings players in. Permissionless ownership of their aggregate
                data creates a <strong className="text-[var(--gs-white)] font-medium">recurring feedback loop</strong>.
                And the utility all of that unlocks reinforces and amplifies value for
                the end user and builds the GUNZscope IP.
              </p>
            </div>

            {/* Diagram */}
            <div className="bg-[var(--gs-dark-2)] border border-white/[0.06] p-6 relative overflow-hidden reveal">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-[#E84142] via-[var(--gs-purple)] to-transparent opacity-50" />
              <div className="font-mono text-[10px] tracking-wider uppercase text-[var(--gs-gray-3)] mb-5 flex items-center gap-2">
                <span className="w-2 h-px bg-[#E84142]" />
                Hybrid Architecture
              </div>

              {/* ── MVP WRAPPER: LAYERS 1+2 ── */}
              <div className="relative border border-[var(--gs-lime)]/10 p-3 pb-2.5 mb-2">
                <div className="absolute -top-2.5 right-3 font-mono text-[8px] tracking-wider uppercase text-[var(--gs-lime)] bg-[var(--gs-dark-2)] px-2">MVP &mdash; Live Today</div>

                {/* Layer 1: Data Sources */}
                <div className="font-mono text-[8px] tracking-wider uppercase text-[var(--gs-gray-3)] mb-1.5 ml-0.5">Layer 1 &middot; Data Sources</div>
                <div className="flex gap-3 mb-1">
                  <div className="flex-1 p-3 border border-white/[0.06] bg-[var(--gs-dark-3)]">
                    <div className="font-display text-[12px] font-semibold uppercase tracking-wider text-[var(--gs-lime)] mb-0.5">GunzChain</div>
                    <div className="font-mono text-[9px] tracking-wider uppercase text-[var(--gs-gray-3)] mb-2">Avalanche L1</div>
                    <div className="flex flex-wrap gap-1">
                      {['NFTs', 'GUN', 'TXs'].map((op) => (
                        <span key={op} className="font-mono text-[8px] tracking-wider uppercase px-1.5 py-0.5 bg-[var(--gs-lime)]/10 text-[var(--gs-lime)] border border-[var(--gs-lime)]/20">{op}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex-1 p-3 border border-white/[0.06] bg-[var(--gs-dark-3)]">
                    <div className="font-display text-[12px] font-semibold uppercase tracking-wider text-[#9945FF] mb-0.5">Solana</div>
                    <div className="font-mono text-[9px] tracking-wider uppercase text-[var(--gs-gray-3)] mb-2">Layer 1</div>
                    <div className="flex flex-wrap gap-1">
                      {['GUN', 'SPL'].map((op) => (
                        <span key={op} className="font-mono text-[8px] tracking-wider uppercase px-1.5 py-0.5 bg-[var(--gs-lime)]/10 text-[var(--gs-lime)] border border-[var(--gs-lime)]/20">{op}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex-1 p-3 border border-white/[0.06] bg-[var(--gs-dark-3)]">
                    <div className="font-display text-[12px] font-semibold uppercase tracking-wider text-[var(--gs-gray-4)] mb-0.5">Markets</div>
                    <div className="font-mono text-[9px] tracking-wider uppercase text-[var(--gs-gray-3)] mb-2">OpenSea &middot; OTG</div>
                    <div className="flex flex-wrap gap-1">
                      {['Sales', 'Listings', 'Floors'].map((op) => (
                        <span key={op} className="font-mono text-[8px] tracking-wider uppercase px-1.5 py-0.5 bg-[var(--gs-lime)]/10 text-[var(--gs-lime)] border border-[var(--gs-lime)]/20">{op}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="font-mono text-[8px] text-[var(--gs-gray-3)] mb-2 ml-0.5">No tool consolidates these sources &mdash; players guess values across fragmented platforms</div>

                {/* Down arrow */}
                <div className="flex justify-center py-1">
                  <div className="w-px h-4 bg-gradient-to-b from-[var(--gs-lime)]/40 to-[var(--gs-lime)]/20" />
                </div>

                {/* Layer 2: Item Intelligence */}
                <div className="font-mono text-[8px] tracking-wider uppercase text-[var(--gs-gray-3)] mb-1.5 ml-0.5">Layer 2 &middot; Item &amp; Portfolio Intelligence</div>
                <div className="p-2.5 border border-[var(--gs-lime)]/15 bg-[var(--gs-lime)]/[0.03]">
                  <div className="flex items-baseline justify-between mb-1.5">
                    <div className="font-display text-[11px] font-semibold uppercase tracking-wider text-[var(--gs-lime)]">Granular Per&#8209;Item Record</div>
                    <div className="font-mono text-[8px] tracking-wider uppercase text-[var(--gs-gray-3)]">Bound to player ID forever</div>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-1.5">
                    {['Acquisition Cost', 'Ownership History', 'Portfolio Value', 'P&L'].map((op) => (
                      <span key={op} className="font-mono text-[8px] tracking-wider uppercase px-1.5 py-0.5 bg-[var(--gs-lime)]/10 text-[var(--gs-lime)] border border-[var(--gs-lime)]/20">{op}</span>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {['Usage History', 'Weapon Loadouts', 'Match Performance'].map((op) => (
                      <span key={op} className="font-mono text-[8px] tracking-wider uppercase px-1.5 py-0.5 bg-[var(--gs-lime)]/5 text-[var(--gs-lime)]/50 border border-[var(--gs-lime)]/10 border-dashed">{op}</span>
                    ))}
                  </div>
                  <div className="font-mono text-[8px] text-[var(--gs-gray-3)] mt-1.5">Cross&#8209;marketplace resolution &middot; What you held, what you paid, how you used it</div>
                </div>
              </div>

              {/* Flow arrow: intelligence feeds identity */}
              <div className="flex items-center py-1">
                <div className="flex-1 h-px bg-gradient-to-r from-[var(--gs-lime)]/30 via-[var(--gs-purple)]/40 to-[var(--gs-purple)]/30 relative">
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 font-mono text-[8px] tracking-wider uppercase text-[var(--gs-gray-3)] bg-[var(--gs-dark-2)] px-2 whitespace-nowrap">
                    Items &#8594; Identity &#8594; Attestation
                  </span>
                </div>
              </div>

              {/* ── LAYER 3: PLAYER IDENTITY ── */}
              <div className="font-mono text-[8px] tracking-wider uppercase text-[var(--gs-gray-3)] mb-1.5 ml-0.5 mt-1">Layer 3 &middot; Player Identity</div>
              <div className="p-2.5 border border-[var(--gs-purple)]/15 bg-[var(--gs-purple)]/[0.03] mb-2">
                <div className="flex items-baseline justify-between mb-1.5">
                  <div className="font-display text-[11px] font-semibold uppercase tracking-wider text-[var(--gs-purple-bright)]">On&#8209;Chain Player Record</div>
                  <div className="font-mono text-[8px] tracking-wider uppercase text-[var(--gs-gray-3)]">Verifiable &middot; Portable</div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {['Handle', 'Multi-Wallet Registry', 'Holdings Proof', 'Valuations'].map((op) => (
                    <span key={op} className="font-mono text-[8px] tracking-wider uppercase px-1.5 py-0.5 bg-[var(--gs-purple)]/10 text-[var(--gs-purple)] border border-[var(--gs-purple)]/20">{op}</span>
                  ))}
                </div>
                <div className="font-mono text-[8px] text-[var(--gs-gray-3)] mt-1.5">One player, many wallets across platforms &mdash; consolidated and verified into a single on&#8209;chain identity</div>
              </div>

              {/* Down arrow */}
              <div className="flex justify-center py-1">
                <div className="w-px h-4 bg-gradient-to-b from-[var(--gs-purple)]/40 to-[#E84142]/40" />
              </div>

              {/* ── LAYER 4: FOUNDATION (WRITE) ── */}
              <div className="font-mono text-[8px] tracking-wider uppercase text-[var(--gs-gray-3)] mb-1.5 ml-0.5">Layer 4 &middot; Permanent Storage</div>
              <div className="flex gap-3 mb-2">
                <div className="flex-1 p-2.5 border border-[#E84142]/20 bg-[var(--gs-dark-3)]">
                  <div className="flex items-baseline justify-between mb-0.5">
                    <div className="font-display text-[12px] font-semibold uppercase tracking-wider text-[#E84142]">AVAX C&#8209;Chain</div>
                    <div className="font-mono text-[8px] tracking-wider uppercase text-[var(--gs-gray-3)]">Proof</div>
                  </div>
                  <div className="font-mono text-[9px] tracking-wider uppercase text-[var(--gs-gray-3)] mb-1.5">Merkle Root &middot; CID Pointer</div>
                  <div className="flex flex-wrap gap-1">
                    {['Attestation', 'Identity', 'Wallets'].map((op) => (
                      <span key={op} className="font-mono text-[8px] tracking-wider uppercase px-1.5 py-0.5 bg-[#E84142]/10 text-[#E84142] border border-[#E84142]/20">{op}</span>
                    ))}
                  </div>
                </div>
                <div className="flex-1 p-2.5 border border-[#4A7AFF]/20 bg-[#4A7AFF]/[0.03]">
                  <div className="flex items-baseline justify-between mb-0.5">
                    <div className="font-display text-[12px] font-semibold uppercase tracking-wider text-[#4A7AFF]">Autonomys DSN</div>
                    <div className="font-mono text-[8px] tracking-wider uppercase text-[var(--gs-gray-3)]">Data</div>
                  </div>
                  <div className="font-mono text-[9px] tracking-wider uppercase text-[var(--gs-gray-3)] mb-1.5">Permanent &middot; Immutable</div>
                  <div className="flex flex-wrap gap-1">
                    {['Holdings', 'Valuations', 'History'].map((op) => (
                      <span key={op} className="font-mono text-[8px] tracking-wider uppercase px-1.5 py-0.5 bg-[#4A7AFF]/10 text-[#4A7AFF] border border-[#4A7AFF]/20">{op}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Foundation bar */}
              <div className="mt-3 p-2 border border-white/[0.08] bg-white/[0.02] text-center">
                <div className="font-mono text-[8px] tracking-wider uppercase text-[var(--gs-gray-3)]">
                  Unique dataset &middot; Data moat &middot; Establishes foundation for utility flywheel
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── PROPRIETARY IP ─── */}
      <section className="relative z-10 py-24 border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <SectionHeader num="03" title="Proprietary Intelligence" />

          <div className="grid md:grid-cols-2 gap-10 md:gap-16">
            <div className="flex flex-col justify-center gap-5 reveal">
              <p className="text-base font-light leading-relaxed text-[var(--gs-gray-4)]">
                The real moat isn&rsquo;t the tech stack &mdash; it&rsquo;s the <strong className="text-[var(--gs-white)] font-medium">accumulated
                intelligence</strong> that no one else has built. Anyone can read a blockchain. No one else has built the enrichment
                pipeline that turns raw on&#8209;chain events into per&#8209;item cost basis with cross&#8209;marketplace validation
                and provable portfolio value.
              </p>
              <p className="text-base font-light leading-relaxed text-[var(--gs-gray-4)]">
                Every wallet that connects adds data that makes the system more valuable. The dataset <strong className="text-[var(--gs-white)] font-medium">compounds</strong> &mdash;
                and once attested on&#8209;chain with permanent storage, it becomes an asset that belongs to the player
                and the platform simultaneously.
              </p>
            </div>

            <div className="space-y-3 reveal">
              {/* Proprietary pipeline */}
              <div className="p-4 border border-[var(--gs-lime)]/15 bg-[var(--gs-lime)]/[0.03]" style={{ clipPath: CLIP_SM }}>
                <div className="font-display text-[12px] font-semibold uppercase tracking-wider text-[var(--gs-lime)] mb-2">Acquisition Cost Resolution</div>
                <p className="text-[11px] leading-relaxed text-[var(--gs-gray-4)]">
                  Traces each item through HEX loot box decodes, Seaport v1.5/v1.6 marketplace events, OTG direct purchases,
                  and transfers to determine exact cost in GUN. Handles batch price splitting, ABI version fallbacks,
                  and edge cases no generic tool accounts for.
                </p>
              </div>

              <div className="p-4 border border-[var(--gs-lime)]/15 bg-[var(--gs-lime)]/[0.03]" style={{ clipPath: CLIP_SM }}>
                <div className="font-display text-[12px] font-semibold uppercase tracking-wider text-[var(--gs-lime)] mb-2">6&#8209;Tier Valuation Waterfall</div>
                <p className="text-[11px] leading-relaxed text-[var(--gs-gray-4)]">
                  Proprietary pricing model: exact item sale &#8594; variant &#8594; skin &#8594; weapon type &#8594; similar items &#8594; collection floor.
                  Each tier with distinct confidence indicators. Dual&#8209;track P&L (Purchase Power + Market Exit) because
                  thin markets require both lenses.
                </p>
              </div>

              <div className="p-4 border border-[var(--gs-purple)]/15 bg-[var(--gs-purple)]/[0.03]" style={{ clipPath: CLIP_SM }}>
                <div className="font-display text-[12px] font-semibold uppercase tracking-wider text-[var(--gs-purple-bright)] mb-2">Cross&#8209;Marketplace Item Resolution</div>
                <p className="text-[11px] leading-relaxed text-[var(--gs-gray-4)]">
                  Reconciles the same item across OpenSea, OTG Marketplace, and direct on&#8209;chain transfers into
                  a single enriched record. Resolves exact mint&#8209;item data that not even Gunzilla provides.
                </p>
              </div>

              <div className="p-4 border border-[var(--gs-purple)]/15 bg-[var(--gs-purple)]/[0.03]" style={{ clipPath: CLIP_SM }}>
                <div className="font-display text-[12px] font-semibold uppercase tracking-wider text-[var(--gs-purple-bright)] mb-2">Weapon Compatibility Intelligence</div>
                <p className="text-[11px] leading-relaxed text-[var(--gs-gray-4)]">
                  Extracts model codes from asset metadata to determine weapon lab eligibility, related items,
                  and loadout compatibility &mdash; turning raw NFT data into actionable game intelligence.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section id="features" className="relative z-10 py-24 border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <SectionHeader num="04" title="Core Features" />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[1px] bg-white/[0.04] border border-white/[0.06] reveal">
            {FEATURES.map((f) => (
              <div key={f.title} className="relative p-10 bg-[var(--gs-dark-1)] hover:bg-[var(--gs-dark-2)] group overflow-hidden">
                <div className="w-10 h-10 border border-[var(--gs-gray-1)] flex items-center justify-center text-[var(--gs-gray-3)] mb-6 group-hover:text-[var(--gs-lime)] group-hover:border-[var(--gs-lime)] clip-corner-sm transition-all">
                  {f.icon}
                </div>
                <h3 className="font-display font-semibold text-base uppercase tracking-wide text-[var(--gs-white)] mb-2">{f.title}</h3>
                <p className="font-body text-sm font-light leading-relaxed text-[var(--gs-gray-3)] mb-3">{f.desc}</p>
                <span className={`inline-block font-mono text-[8px] tracking-wider uppercase px-1.5 py-0.5 ${
                  f.tag === 'live'
                    ? 'bg-[var(--gs-profit)]/10 text-[var(--gs-profit)] border border-[var(--gs-profit)]/15'
                    : 'bg-[var(--gs-purple)]/10 text-[var(--gs-purple)] border border-[var(--gs-purple)]/15'
                }`}>
                  {f.tag === 'live' ? 'Live' : 'Phase 2'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── ON-CHAIN PROOF ─── */}
      <section className="relative z-10 py-24 border-t border-white/[0.06] bg-[var(--gs-dark-1)]">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <SectionHeader num="05" title="On-Chain Proof" />

          <div className="grid md:grid-cols-3 gap-6 reveal">
            <div className="p-6 border border-[var(--gs-lime)]/20 bg-[var(--gs-lime)]/[0.03]" style={{ clipPath: CLIP_SM }}>
              <div className="font-mono text-[9px] tracking-wider uppercase text-[var(--gs-gray-3)] mb-2">Portfolio Attestations</div>
              <div className="font-display text-3xl font-bold text-[var(--gs-lime)] mb-1">{attestation.totalAttestations}+</div>
              <div className="font-mono text-[10px] text-[var(--gs-gray-4)]">Written to AVAX C&#8209;Chain</div>
            </div>
            <div className="p-6 border border-white/[0.06] bg-[var(--gs-dark-2)]" style={{ clipPath: CLIP_SM }}>
              <div className="font-mono text-[9px] tracking-wider uppercase text-[var(--gs-gray-3)] mb-2">Contract</div>
              <a
                href="https://snowtrace.io/address/0xEBE8FD7d40724Eb84d9C888ce88840577Cc79c16"
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[11px] text-[var(--gs-purple)] hover:text-[var(--gs-purple-bright)] transition-colors break-all"
              >
                0xEBE8...c16
              </a>
              <div className="font-mono text-[10px] text-[var(--gs-gray-4)] mt-1">Verify on Snowtrace &rarr;</div>
            </div>
            <div className="p-6 border border-white/[0.06] bg-[var(--gs-dark-2)]" style={{ clipPath: CLIP_SM }}>
              <div className="font-mono text-[9px] tracking-wider uppercase text-[var(--gs-gray-3)] mb-2">Metadata Storage</div>
              <div className="font-display text-base font-semibold text-[#4A7AFF] mb-1">Autonomys DSN</div>
              <div className="font-mono text-[10px] text-[var(--gs-gray-4)]">Decentralized, permanent, verifiable</div>
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-4 reveal">
            <p className="text-sm font-light text-[var(--gs-gray-3)] max-w-[700px]">
              Not a roadmap promise &mdash; on&#8209;chain attestations are <strong className="text-[var(--gs-white)] font-medium">live today</strong>.
              Users connect a wallet, select which portfolio to attest, and GUNZscope writes a Merkle root to AVAX C&#8209;Chain
              with full metadata stored on Autonomys&rsquo; distributed storage network.
            </p>
            <a
              href="https://snowtrace.io/address/0xEBE8FD7d40724Eb84d9C888ce88840577Cc79c16"
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 font-mono text-[10px] tracking-wider uppercase px-3 py-1.5 border border-[var(--gs-lime)]/20 text-[var(--gs-lime)] hover:bg-[var(--gs-lime)]/10 transition-colors clip-corner-sm"
            >
              View on Snowtrace &rarr;
            </a>
          </div>
        </div>
      </section>

      {/* ─── VALUATION WATERFALL ─── */}
      <section id="valuation" className="relative z-10 py-24 border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <SectionHeader num="06" title="Valuation Waterfall" />

          <div className="grid md:grid-cols-2 gap-10 md:gap-16">
            <div className="flex flex-col justify-center gap-5 reveal">
              <p className="text-base font-light leading-relaxed text-[var(--gs-gray-4)]">
                Not all valuations are created equal. GUNZscope distinguishes between{' '}
                <strong className="text-[var(--gs-white)] font-medium">market reality</strong> (actual sales data) and{' '}
                <strong className="text-[var(--gs-white)] font-medium">statistical proxies</strong> (estimates based on similar items).
              </p>
              <p className="text-base font-light leading-relaxed text-[var(--gs-gray-4)]">
                Each NFT&rsquo;s value flows through a 6&#8209;tier waterfall &mdash; starting with the most specific data
                and widening only when needed. Every valuation carries a <strong className="text-[var(--gs-white)] font-medium">confidence indicator</strong>.
              </p>
              <p className="text-base font-light leading-relaxed text-[var(--gs-gray-4)]">
                The dual&#8209;track P&L system then applies two independent lenses:{' '}
                <strong className="text-[var(--gs-white)] font-medium">GUN appreciation</strong> and{' '}
                <strong className="text-[var(--gs-white)] font-medium">market reference</strong>.
              </p>
              <p className="text-base font-light leading-relaxed text-[var(--gs-gray-4)]">
                The result is a <strong className="text-[var(--gs-white)] font-medium">dynamic, failproof</strong> way
                to value every item in a player&rsquo;s portfolio &mdash; enhancing decision&#8209;making whether
                they&rsquo;re holding, trading, or building a loadout. It also sets the stage
                for <strong className="text-[var(--gs-white)] font-medium">proprietary AI&#8209;driven assistance</strong> in the future,
                powered by a dataset no one else has.
              </p>
            </div>

            <div className="flex flex-col gap-1.5 reveal">
              {TIERS.map((t) => (
                <div key={t.num} className="grid grid-cols-[44px_1fr_auto] gap-4 items-center p-3 bg-[var(--gs-dark-2)] border border-white/[0.06] hover:border-[var(--gs-lime)]/20 hover:bg-[var(--gs-dark-3)] transition-all">
                  <div className="font-mono text-[10px] text-[var(--gs-gray-3)] tracking-wider text-center">{t.num}</div>
                  <div>
                    <div className="font-display text-[13px] font-semibold uppercase tracking-wider text-[var(--gs-white)]">{t.name}</div>
                    <div className="font-mono text-[10px] text-[var(--gs-gray-3)]">{t.desc}</div>
                  </div>
                  <span className={`font-mono text-[9px] tracking-wider uppercase px-2 py-0.5 ${
                    t.level === 'high'
                      ? 'bg-[var(--gs-profit)]/10 text-[var(--gs-profit)] border border-[var(--gs-profit)]/15'
                      : t.level === 'good'
                        ? 'bg-[var(--gs-lime)]/10 text-[var(--gs-lime)] border border-[var(--gs-lime)]/15'
                        : t.level === 'moderate'
                          ? 'bg-[var(--gs-warning)]/10 text-[var(--gs-warning)] border border-[var(--gs-warning)]/15'
                          : 'bg-[var(--gs-loss)]/8 text-[var(--gs-loss)] border border-[var(--gs-loss)]/10'
                  }`}>
                    {t.confidence}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── DASHBOARD PREVIEW ─── */}
      <section id="preview" className="relative z-10 py-24 border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <SectionHeader num="07" title="Dashboard Preview" />

          <div className="bg-[var(--gs-dark-2)] border border-white/[0.06] rounded-lg overflow-hidden reveal">
            {/* Browser toolbar */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06] bg-black/30">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
              </div>
              <div className="font-mono text-[11px] text-[var(--gs-gray-3)] bg-[var(--gs-dark-3)] px-4 py-1 rounded border border-white/[0.06]">
                gunzscope.xyz/portfolio
              </div>
              <div />
            </div>

            {/* Dashboard content */}
            <div className="p-6 md:p-8">
              {/* Header */}
              <div className="flex justify-between items-start mb-8">
                <div>
                  <div className="font-display text-sm font-semibold uppercase tracking-wider text-[var(--gs-gray-3)] mb-1">Total Portfolio Value</div>
                  <div className="font-display text-4xl font-bold text-[var(--gs-white)]">$2,847<span className="text-xl text-[var(--gs-gray-4)]">.32</span></div>
                </div>
                <div className="font-mono text-[13px] text-[var(--gs-profit)] px-2.5 py-1 bg-[var(--gs-profit)]/8 border border-[var(--gs-profit)]/15 rounded">
                  &uarr; +14.5%
                </div>
              </div>

              {/* Dual-track P&L */}
              <div className="grid md:grid-cols-2 gap-4 mb-8">
                <div className="p-4 bg-[var(--gs-dark-3)] border border-white/[0.06]">
                  <div className="font-mono text-[9px] tracking-wider uppercase text-[var(--gs-gray-3)] mb-1.5 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--gs-lime)]" />
                    Track A &middot; GUN Appreciation
                  </div>
                  <div className="font-display text-xl font-bold text-[var(--gs-profit)]">+$412.50</div>
                  <div className="font-mono text-[10px] text-[var(--gs-gray-3)] mt-0.5">GUN price movement since acquisition</div>
                </div>
                <div className="p-4 bg-[var(--gs-dark-3)] border border-white/[0.06]">
                  <div className="font-mono text-[9px] tracking-wider uppercase text-[var(--gs-gray-3)] mb-1.5 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--gs-purple)]" />
                    Track B &middot; Market Reference
                  </div>
                  <div className="font-display text-xl font-bold text-[var(--gs-loss)]">&minus;$186.20</div>
                  <div className="font-mono text-[10px] text-[var(--gs-gray-3)] mt-0.5">Based on comparable sales data</div>
                </div>
              </div>

              {/* NFT cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { name: 'Vulture', type: 'Assault Rifle', rarity: 'Epic', rarityColor: 'bg-[#B44AFF]/15 text-[#B44AFF] border-[#B44AFF]/20', price: '1,200 GUN', source: 'Via Sales \u00B7 T2', pnl: '+23.4%', profit: true },
                  { name: 'Kestrel', type: 'Sniper Rifle', rarity: 'Epic', rarityColor: 'bg-[#B44AFF]/15 text-[#B44AFF] border-[#B44AFF]/20', price: '3,400 GUN', source: 'Exact \u00B7 T1', pnl: '+8.7%', profit: true },
                  { name: 'Vulture Solana', type: 'Special Edition', rarity: 'Classified', rarityColor: 'bg-[#E74C3C]/15 text-[#E74C3C] border-[#E74C3C]/20', price: '\u2014 GUN', source: 'No Mods Available', pnl: 'Locked', profit: false },
                  { name: 'Reflex Sight', type: 'Attachment', rarity: 'Rare', rarityColor: 'bg-[#4A7AFF]/15 text-[#4A7AFF] border-[#4A7AFF]/20', price: '400 GUN', source: 'Via Floor \u00B7 T6', pnl: '\u22125.2%', profit: false },
                ].map((nft) => (
                  <div key={nft.name} className="bg-[var(--gs-dark-3)] border border-white/[0.06] p-3 hover:border-[var(--gs-lime)]/30 transition-all">
                    <div className="w-full aspect-square bg-[var(--gs-dark-4)] mb-2 relative flex items-center justify-center opacity-70">
                      <span className={`absolute top-1.5 left-1.5 font-mono text-[8px] tracking-wider uppercase px-1.5 py-0.5 border ${nft.rarityColor}`}>
                        {nft.rarity}
                      </span>
                      <span className="font-display text-2xl font-bold text-[var(--gs-gray-1)]">{nft.name[0]}</span>
                    </div>
                    <div className="font-display text-[12px] font-semibold uppercase tracking-wider text-[var(--gs-white)] truncate mb-0.5">{nft.name}</div>
                    <div className="font-mono text-[9px] uppercase tracking-wider text-[var(--gs-gray-3)] mb-2">{nft.type}</div>
                    <div className="flex justify-between items-baseline pt-2 border-t border-white/[0.06]">
                      <div>
                        <div className="font-mono text-[11px] text-[var(--gs-white)]">{nft.price}</div>
                        <div className="font-mono text-[7px] tracking-wider uppercase text-[var(--gs-gray-2)]">{nft.source}</div>
                      </div>
                      <span className={`font-mono text-[10px] ${nft.profit ? 'text-[var(--gs-profit)]' : nft.pnl === 'Locked' ? 'text-[var(--gs-gray-3)]' : 'text-[var(--gs-loss)]'}`}>
                        {nft.pnl}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── BUILT BY ─── */}
      <section id="builder" className="relative z-10 py-24 border-t border-white/[0.06] bg-[var(--gs-dark-1)]">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <SectionHeader num="08" title="Built By" />

          <div className="grid md:grid-cols-[1fr_auto] gap-10 md:gap-16 reveal">
            <div className="flex flex-col gap-5">
              <h3 className="font-display font-bold text-2xl uppercase tracking-wide text-[var(--gs-white)]">
                Amik Ahmad
              </h3>
              <p className="text-base font-light leading-relaxed text-[var(--gs-gray-4)]">
                <strong className="text-[var(--gs-white)] font-medium">13 years in product</strong>. Co&#8209;founded
                Amazon&rsquo;s Blockchain Group, worked on foundational models for Alexa AI, ML for the Department of Defense,
                and launched multiple crypto and blockchain products.
                At <strong className="text-[var(--gs-white)] font-medium">Kresus</strong>, launched InstaWallet technology
                with Sotheby&rsquo;s and built the Kresus MPC wallet with advanced biometric security.
                At <strong className="text-[var(--gs-white)] font-medium">Blockchains</strong>, worked on
                blockchain&#8209;based identity consolidating PII into a single wallet, and led the development
                of a Unity&#8209;driven 3D gaming environment to onboard Web2 users into Web3.
              </p>
              <p className="text-base font-light leading-relaxed text-[var(--gs-gray-4)]">
                Led Product through two testnets and mainnet + TGE at <strong className="text-[var(--gs-white)] font-medium">Autonomys</strong>,
                a sovereign base&#8209;layer L1 with its own novel consensus mechanism &mdash; helped
                establish <strong className="text-[var(--gs-white)] font-medium">AutoID</strong> to enable trusted, fully
                on&#8209;chain autonomous agents. Autonomys DSN is currently used by GUNZscope for attestation metadata.
                With a strong background in DeFi and RWA, in Q2 of 2026 I am launching the world&rsquo;s first
                fully regulated and compliant RIA on Plume
                with <strong className="text-[var(--gs-white)] font-medium">Anchorage</strong> and <strong className="text-[var(--gs-white)] font-medium">OpenTrade</strong> &mdash;
                RWA is the first tokenized HFT strategy in existence available to retail investors.
              </p>
              <p className="text-base font-light leading-relaxed text-[var(--gs-gray-4)]">
                I&rsquo;m also an OTG player &mdash; <strong className="text-[var(--gs-white)] font-medium">3,300+ matches,
                650+ hours</strong>, top 8 contributor in the Gunzilla Discord. I&rsquo;ve spent two years deep in this
                community &mdash; playing the game, studying gamer behavior, and conducting user research.
                Every feature in GUNZscope is <strong className="text-[var(--gs-white)] font-medium">evidence&#8209;based</strong> &mdash;
                built as solutions to real pain points observed qualitatively and validated quantitatively.
                GUNZscope exists because of my journey and support from the community.
              </p>

              <div className="flex flex-wrap gap-2 mt-2">
                {[
                  'Amazon Blockchain Group',
                  'Alexa AI / DoD ML',
                  'Kresus (MPC Wallet · Sotheby\u2019s)',
                  'Blockchains (Identity · Gaming)',
                  'Autonomys (L1 · AutoID · TGE)',
                  'Plume RWA (Anchorage + OpenTrade)',
                  '3,300+ OTG Matches',
                  '650+ Hours Played',
                  'Top 8 Discord Contributor',
                  'Solo Builder',
                ].map((tag) => (
                  <span
                    key={tag}
                    className="inline-block font-mono text-[10px] px-2.5 py-1 border border-[var(--gs-lime)]/20 bg-[var(--gs-lime)]/[0.04] text-[var(--gs-gray-4)]"
                    style={{ clipPath: CLIP_SM }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3 md:min-w-[220px] md:mt-14">
              <div className="p-4 border border-white/[0.06] bg-[var(--gs-dark-2)]" style={{ clipPath: CLIP_SM }}>
                <div className="font-mono text-[9px] tracking-wider uppercase text-[var(--gs-gray-3)] mb-1">Experience</div>
                <div className="font-display text-2xl font-bold text-[var(--gs-white)]">13 years</div>
                <div className="font-mono text-[10px] text-[var(--gs-gray-4)]">Product, Design, Engineering, Web3 &amp; AI</div>
              </div>
              <div className="p-4 border border-white/[0.06] bg-[var(--gs-dark-2)]" style={{ clipPath: CLIP_SM }}>
                <div className="font-mono text-[9px] tracking-wider uppercase text-[var(--gs-gray-3)] mb-1">OTG Rank</div>
                <div className="font-display text-2xl font-bold text-[var(--gs-lime)]">Top 8</div>
                <div className="font-mono text-[10px] text-[var(--gs-gray-4)]">Discord engagement</div>
              </div>
              <div className="p-4 border border-white/[0.06] bg-[var(--gs-dark-2)]" style={{ clipPath: CLIP_SM }}>
                <div className="font-mono text-[9px] tracking-wider uppercase text-[var(--gs-gray-3)] mb-1">GUNZscope Build Time</div>
                <div className="font-display text-2xl font-bold text-[var(--gs-purple-bright)]">51 days</div>
                <div className="font-mono text-[10px] text-[var(--gs-gray-4)]">Jan 22 &rarr; Mar 13, 2026</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── BUILD GAMES CTA ─── */}
      <section className="relative z-10 py-24 border-t border-white/[0.06] bg-gradient-to-br from-[#E84142]/[0.04] to-[var(--gs-purple)]/[0.04] text-center">
        <div className="max-w-[700px] mx-auto px-6 reveal">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 mb-6 border border-[#E84142]/30 bg-[#E84142]/5 clip-corner-sm">
            <span className="font-mono text-data tracking-wider uppercase text-[#E84142]">
              &#9670; Avalanche Build Games 2026 MVP
            </span>
          </div>

          <h2 className="font-display font-bold text-[clamp(24px,4vw,42px)] uppercase tracking-wider mb-4">
            <span className="text-[var(--gs-white)]">Cross&#8209;L1 </span>
            <span className="text-[#E84142]">Composability</span>
            <span className="text-[var(--gs-white)]"> in Action</span>
          </h2>

          <p className="text-base font-light text-[var(--gs-gray-4)] leading-relaxed mb-8">
            GUNZscope demonstrates the <strong className="text-[var(--gs-white)] font-medium">Avalanche multi&#8209;chain thesis</strong> &mdash;
            reading game state from GunzChain (an Avalanche L1), writing proofs to C&#8209;Chain, and storing
            complete player records permanently on <strong className="text-[var(--gs-white)] font-medium">Autonomys DSN</strong>.
            A unique data layer that doesn&rsquo;t exist anywhere else in gaming.
          </p>

          <div className="flex justify-center gap-4 flex-wrap">
            <a
              href={LIVE_APP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-display font-semibold text-data uppercase tracking-wider px-6 py-2.5 bg-[var(--gs-lime)] text-[var(--gs-black)] hover:bg-[var(--gs-lime-hover)] transition-colors clip-corner-sm"
            >
              Launch App &rarr;
            </a>
            <Link
              href="/build-games/roadmap"
              className="font-display font-semibold text-data uppercase tracking-wider px-6 py-2.5 border border-white/[0.12] text-[var(--gs-gray-3)] hover:text-[var(--gs-white)] hover:border-white/[0.25] transition-colors clip-corner-sm"
            >
              Full Roadmap
            </Link>
            <a
              href="https://github.com/Gunzilla-NYC/gunzscope"
              target="_blank"
              rel="noopener noreferrer"
              className="font-display font-semibold text-data uppercase tracking-wider px-6 py-2.5 border border-white/[0.12] text-[var(--gs-gray-3)] hover:text-[var(--gs-white)] hover:border-white/[0.25] transition-colors clip-corner-sm flex items-center gap-2"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
              GitHub
            </a>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <Footer variant="minimal" />

      {/* Scroll reveal CSS */}
      <style>{`
        .reveal {
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .revealed {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>
    </div>
  );
}
