'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import Logo from '@/components/Logo';
import Footer from '@/components/Footer';

// Color swatches data
const colorSwatches = [
  { name: 'GS Lime', hex: '#A6F700', color: '#A6F700' },
  { name: 'GS Indigo', hex: '#6D5BFF', color: '#6D5BFF' },
  { name: 'GS Black', hex: '#0A0A0A', color: '#0A0A0A', border: true },
  { name: 'GS White', hex: '#F0F0F0', color: '#F0F0F0' },
  { name: 'Profit', hex: '#00FF88', color: '#00FF88' },
  { name: 'Loss', hex: '#FF4444', color: '#FF4444' },
  { name: 'Dark Surface', hex: '#161616', color: '#161616', border: true },
  { name: 'Card Surface', hex: '#242424', color: '#242424', border: true },
];

// Features data
const features = [
  {
    icon: '📊',
    title: 'Portfolio Analytics',
    desc: 'Real-time portfolio valuation with GUN token price tracking, unrealized P&L calculations, and cost basis analysis across all your OTG assets.',
  },
  {
    icon: '🔗',
    title: 'Cross-Chain',
    desc: 'Unified view of your NFT holdings across GunzChain (Avalanche L1) and Solana. One wallet, one dashboard, complete visibility.',
  },
  {
    icon: '🔍',
    title: 'Acquisition Intel',
    desc: 'Automatic detection of how each NFT was acquired — HEX decode, marketplace purchase, or transfer — with original GUN cost basis.',
  },
  {
    icon: '🔫',
    title: 'Weapon Lab',
    desc: 'Smart matching of compatible weapon modifications, skins, and attachments based on model codes, not just name matching.',
  },
  {
    icon: '🏷️',
    title: 'Rarity Tiers',
    desc: 'Dual rarity system showing both display rarity and functional tier. Classified items flagged as locked special editions.',
  },
  {
    icon: '⚡',
    title: 'Live Pricing',
    desc: 'GUN token price via CoinGecko, with historical price tracking for accurate cost basis calculations at time of acquisition.',
  },
];

// Mock NFT data for dashboard preview
const mockNFTs = [
  { name: 'Vulture', type: 'Assault Rifle', rarity: 'Epic', price: '1,200 GUN', pnl: '+23.4%', profit: true },
  { name: 'Kestrel', type: 'Sniper Rifle', rarity: 'Legendary', price: '3,400 GUN', pnl: '+8.7%', profit: true },
  { name: 'Vulture Solana', type: 'Special Edition', rarity: 'Classified', price: '— GUN', pnl: 'Locked', locked: true },
  { name: 'Reflex Sight', type: 'Weapon Attachment', rarity: 'Rare', price: '400 GUN', pnl: '-5.2%', profit: false },
];

export default function HomePage() {
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Setup intersection observer for scroll animations
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px',
      }
    );

    document.querySelectorAll('.observe').forEach((el) => {
      observerRef.current?.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-[var(--gs-black)] text-[var(--gs-white)] overflow-x-hidden">
      {/* Background Effects */}
      <div className="grid-bg" />
      <div className="scanlines" />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 lg:px-10 h-16 flex items-center justify-between glass-effect border-b border-white/[0.06]">
        <Link href="/" className="flex items-center gap-2">
          <Logo size="md" variant="icon" />
          <span className="font-display font-bold text-lg tracking-wider uppercase">
            GUNZ<span className="text-[var(--gs-purple)]">scope</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          <a href="#brand" className="font-mono text-[11px] tracking-wider uppercase text-[var(--gs-lime)] relative after:absolute after:bottom-[-4px] after:left-0 after:right-0 after:h-[1px] after:bg-[var(--gs-lime)]">
            Brand
          </a>
          <a href="#features" className="font-mono text-[11px] tracking-wider uppercase text-[var(--gs-gray-3)] hover:text-[var(--gs-lime)] transition-colors">
            Features
          </a>
          <a href="#preview" className="font-mono text-[11px] tracking-wider uppercase text-[var(--gs-gray-3)] hover:text-[var(--gs-lime)] transition-colors">
            Dashboard
          </a>
          <a href="#components" className="font-mono text-[11px] tracking-wider uppercase text-[var(--gs-gray-3)] hover:text-[var(--gs-lime)] transition-colors">
            Components
          </a>
          <Link
            href="/portfolio"
            className="font-display font-semibold text-xs tracking-wider uppercase px-5 py-2 border border-[var(--gs-lime)] text-[var(--gs-lime)] hover:bg-[var(--gs-lime)] hover:text-[var(--gs-black)] transition-all clip-corner-sm"
          >
            Launch App
          </Link>
        </div>

        {/* Mobile menu button */}
        <Link
          href="/portfolio"
          className="md:hidden font-display font-semibold text-xs tracking-wider uppercase px-4 py-2 border border-[var(--gs-lime)] text-[var(--gs-lime)] clip-corner-sm"
        >
          Launch App
        </Link>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col justify-center pt-32 pb-24 px-6 lg:px-10 overflow-hidden">
        {/* Background glows */}
        <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[900px] h-[900px] bg-[radial-gradient(circle,rgba(166,247,0,0.06)_0%,transparent_60%)] pointer-events-none" />
        <div className="absolute bottom-[-100px] right-[-200px] w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(109,91,255,0.05)_0%,transparent_60%)] pointer-events-none" />

        {/* Crosshairs */}
        <div className="crosshair absolute top-[20%] right-[15%]" />
        <div className="crosshair absolute bottom-[25%] right-[30%]" />
        <div className="crosshair crosshair-purple absolute top-[35%] right-[8%]" />

        <div className="relative z-10 max-w-[900px]">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 border border-[var(--gs-lime)]/30 bg-[var(--gs-lime)]/5 mb-10 clip-corner-sm animate-fade-in-up">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--gs-lime)] animate-pulse-dot" />
            <span className="font-mono text-[11px] tracking-wider uppercase text-[var(--gs-lime)]">
              Powered by GUNZ Protocol
            </span>
          </div>

          {/* Title */}
          <h1 className="font-display font-bold text-5xl sm:text-6xl md:text-7xl lg:text-[88px] leading-[0.95] tracking-tight uppercase mb-6 animate-fade-in-up delay-100">
            <span className="block text-[var(--gs-white)]">Your NFT</span>
            <span className="block text-[var(--gs-purple-bright)]">Arsenal</span>
            <span className="block text-[var(--gs-lime)] relative hero-underline">Intelligence</span>
          </h1>

          {/* Subtitle */}
          <p className="font-body text-lg font-light leading-relaxed text-[var(--gs-gray-4)] max-w-[560px] mb-10 animate-fade-in-up delay-200">
            Track, analyze, and dominate your <strong className="text-[var(--gs-white)] font-medium">Off The Grid</strong> NFT portfolio.
            Real-time P&L, acquisition tracking, and weapon intelligence across{' '}
            <strong className="text-[var(--gs-white)] font-medium">GunzChain</strong> and{' '}
            <strong className="text-[var(--gs-white)] font-medium">Solana</strong>.
          </p>

          {/* CTA Buttons */}
          <div className="flex gap-4 animate-fade-in-up delay-300">
            <Link
              href="/portfolio"
              className="font-display font-semibold text-sm tracking-wider uppercase px-8 py-3.5 bg-[var(--gs-lime)] text-[var(--gs-black)] hover:bg-[#B8FF33] hover:shadow-[0_8px_30px_rgba(166,247,0,0.2)] hover:-translate-y-0.5 transition-all clip-corner"
            >
              Connect Wallet
            </Link>
            <a
              href="#preview"
              className="font-display font-semibold text-sm tracking-wider uppercase px-8 py-3.5 bg-transparent text-[var(--gs-white-dim)] border border-[var(--gs-gray-1)] hover:border-[var(--gs-lime)] hover:text-[var(--gs-lime)] transition-all clip-corner"
            >
              View Demo
            </a>
          </div>
        </div>

        {/* Hero Stats Bar */}
        <div className="absolute bottom-0 left-0 right-0 flex flex-wrap border-t border-white/[0.06] glass-effect z-10">
          <div className="flex-1 min-w-[50%] md:min-w-0 px-6 lg:px-10 py-6 border-r border-white/[0.06] last:border-r-0">
            <span className="font-mono text-[10px] tracking-wider uppercase text-[var(--gs-gray-3)] block mb-1">GUN Price</span>
            <span className="font-display text-2xl font-bold text-[var(--gs-white)]">$<span className="text-[var(--gs-purple-bright)]">0.0847</span></span>
          </div>
          <div className="flex-1 min-w-[50%] md:min-w-0 px-6 lg:px-10 py-6 border-r border-white/[0.06] last:border-r-0">
            <span className="font-mono text-[10px] tracking-wider uppercase text-[var(--gs-gray-3)] block mb-1">Portfolio Value</span>
            <span className="font-display text-2xl font-bold text-[var(--gs-white)]">$2,847.32</span>
          </div>
          <div className="flex-1 min-w-[50%] md:min-w-0 px-6 lg:px-10 py-6 border-r border-white/[0.06] last:border-r-0">
            <span className="font-mono text-[10px] tracking-wider uppercase text-[var(--gs-gray-3)] block mb-1">Unrealized P&L</span>
            <span className="font-display text-2xl font-bold text-[var(--gs-profit)]">+$412.50</span>
          </div>
          <div className="flex-1 min-w-[50%] md:min-w-0 px-6 lg:px-10 py-6">
            <span className="font-mono text-[10px] tracking-wider uppercase text-[var(--gs-gray-3)] block mb-1">NFTs Tracked</span>
            <span className="font-display text-2xl font-bold text-[var(--gs-white)]">154</span>
          </div>
        </div>
      </section>

      {/* Brand System Section */}
      <section className="relative z-10 py-24 px-6 lg:px-10 border-t border-white/[0.06]" id="brand">
        <div className="flex items-baseline gap-4 mb-10 observe">
          <span className="section-number">01</span>
          <h2 className="font-display font-bold text-3xl uppercase tracking-wide">Brand System</h2>
          <div className="section-line" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-16">
          {/* Color Palette */}
          <div className="relative p-10 bg-[var(--gs-dark-2)] border border-white/[0.06] overflow-hidden observe brand-card">
            <div className="flex items-center gap-2 mb-6">
              <span className="w-2 h-[1px] bg-[var(--gs-purple)]" />
              <span className="font-mono text-[10px] tracking-wider uppercase text-[var(--gs-gray-3)]">Color Palette</span>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {colorSwatches.map((swatch) => (
                <div key={swatch.hex} className="flex flex-col gap-2">
                  <div
                    className="w-full h-16 rounded transition-transform hover:scale-105"
                    style={{
                      backgroundColor: swatch.color,
                      border: swatch.border ? '1px solid rgba(255,255,255,0.1)' : undefined,
                    }}
                  />
                  <span className="font-mono text-[10px] text-[var(--gs-gray-4)]">{swatch.name}</span>
                  <span className="font-mono text-[10px] text-[var(--gs-gray-2)]">{swatch.hex}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Typography */}
          <div className="relative p-10 bg-[var(--gs-dark-2)] border border-white/[0.06] overflow-hidden observe brand-card">
            <div className="flex items-center gap-2 mb-6">
              <span className="w-2 h-[1px] bg-[var(--gs-purple)]" />
              <span className="font-mono text-[10px] tracking-wider uppercase text-[var(--gs-gray-3)]">Typography Stack</span>
            </div>

            <div className="mb-6">
              <span className="font-mono text-[10px] tracking-wide uppercase text-[var(--gs-gray-3)] block mb-2">Display — Chakra Petch</span>
              <span className="font-display font-bold text-4xl uppercase tracking-wide gradient-text-brand">GUNZscope</span>
            </div>

            <div className="mb-6">
              <span className="font-mono text-[10px] tracking-wide uppercase text-[var(--gs-gray-3)] block mb-2">Body — Outfit</span>
              <p className="font-body text-base font-light leading-relaxed text-[var(--gs-gray-4)] max-w-[500px]">
                Track your Off The Grid NFT portfolio with real-time profit & loss calculations, acquisition intelligence, and cross-chain analytics.
              </p>
            </div>

            <div>
              <span className="font-mono text-[10px] tracking-wide uppercase text-[var(--gs-gray-3)] block mb-2">Mono — JetBrains Mono</span>
              <div className="font-mono text-sm text-[var(--gs-lime)] p-4 bg-[var(--gs-dark-3)] border border-white/[0.06] rounded">
                0xe4839c...ba4ae · 154 NFTs · +$412.50 (14.5%)
              </div>
            </div>
          </div>

          {/* Rarity Badges */}
          <div className="relative p-10 bg-[var(--gs-dark-2)] border border-white/[0.06] overflow-hidden observe brand-card">
            <div className="flex items-center gap-2 mb-6">
              <span className="w-2 h-[1px] bg-[var(--gs-purple)]" />
              <span className="font-mono text-[10px] tracking-wider uppercase text-[var(--gs-gray-3)]">Rarity Badges</span>
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="font-mono text-[9px] tracking-wide uppercase px-2.5 py-1 rounded-sm bg-[rgba(138,138,138,0.15)] text-[var(--gs-rarity-common)] border border-[rgba(138,138,138,0.2)]">Common</span>
              <span className="font-mono text-[9px] tracking-wide uppercase px-2.5 py-1 rounded-sm bg-[rgba(74,158,173,0.15)] text-[var(--gs-rarity-uncommon)] border border-[rgba(74,158,173,0.2)]">Uncommon</span>
              <span className="font-mono text-[9px] tracking-wide uppercase px-2.5 py-1 rounded-sm bg-[rgba(74,122,255,0.15)] text-[var(--gs-rarity-rare)] border border-[rgba(74,122,255,0.2)]">Rare</span>
              <span className="font-mono text-[9px] tracking-wide uppercase px-2.5 py-1 rounded-sm bg-[rgba(180,74,255,0.15)] text-[var(--gs-rarity-epic)] border border-[rgba(180,74,255,0.2)]">Epic</span>
              <span className="font-mono text-[9px] tracking-wide uppercase px-2.5 py-1 rounded-sm bg-[rgba(255,140,0,0.15)] text-[var(--gs-rarity-legendary)] border border-[rgba(255,140,0,0.2)]">Legendary</span>
              <span className="font-mono text-[9px] tracking-wide uppercase px-2.5 py-1 rounded-sm bg-[rgba(255,68,102,0.15)] text-[var(--gs-rarity-mythic)] border border-[rgba(255,68,102,0.2)]">Mythic</span>
              <span className="font-mono text-[9px] tracking-wide uppercase px-2.5 py-1 rounded-sm bg-[rgba(231,76,60,0.15)] text-[var(--gs-rarity-classified)] border border-[rgba(231,76,60,0.2)]">🔒 Classified</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="font-mono text-[9px] tracking-wide uppercase px-2.5 py-1 rounded-sm bg-[rgba(0,255,136,0.1)] text-[var(--gs-profit)] border border-[rgba(0,255,136,0.2)] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--gs-profit)]" />
                Profit
              </span>
              <span className="font-mono text-[9px] tracking-wide uppercase px-2.5 py-1 rounded-sm bg-[rgba(255,68,68,0.1)] text-[var(--gs-loss)] border border-[rgba(255,68,68,0.2)] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--gs-loss)]" />
                Loss
              </span>
              <span className="font-mono text-[9px] tracking-wide uppercase px-2.5 py-1 rounded-sm bg-[rgba(255,170,0,0.1)] text-[var(--gs-warning)] border border-[rgba(255,170,0,0.2)] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--gs-warning)]" />
                Pending
              </span>
            </div>
          </div>

          {/* Corner Cut System */}
          <div className="relative p-10 bg-[var(--gs-dark-2)] border border-white/[0.06] overflow-hidden observe brand-card">
            <div className="flex items-center gap-2 mb-6">
              <span className="w-2 h-[1px] bg-[var(--gs-purple)]" />
              <span className="font-mono text-[10px] tracking-wider uppercase text-[var(--gs-gray-3)]">Design Signature — Corner Cut</span>
            </div>
            <p className="text-sm text-[var(--gs-gray-4)] leading-relaxed mb-6">
              The angled corner cut (clip-path) is GUNZscope&apos;s signature shape language,
              inspired by the game&apos;s HEX loot boxes and cyberpunk aesthetics. Applied to
              buttons, cards, badges, and containers at 6–10px cuts.
            </p>
            <div className="flex gap-4 items-center">
              <div className="w-20 h-20 bg-[var(--gs-lime-glow)] border border-[var(--gs-lime)]/30 clip-corner-lg flex items-center justify-center">
                <span className="font-mono text-[9px] text-[var(--gs-lime)]">12px</span>
              </div>
              <div className="w-[60px] h-[60px] bg-[var(--gs-lime-glow)] border border-[var(--gs-lime)]/30 clip-corner flex items-center justify-center">
                <span className="font-mono text-[9px] text-[var(--gs-lime)]">8px</span>
              </div>
              <div className="w-10 h-10 bg-[var(--gs-lime-glow)] border border-[var(--gs-lime)]/30 clip-corner-sm flex items-center justify-center">
                <span className="font-mono text-[8px] text-[var(--gs-lime)]">6px</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 py-24 px-6 lg:px-10 border-t border-white/[0.06]" id="features">
        <div className="flex items-baseline gap-4 mb-10 observe">
          <span className="section-number">02</span>
          <h2 className="font-display font-bold text-3xl uppercase tracking-wide">Core Features</h2>
          <div className="section-line" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[1px] bg-white/[0.04] border border-white/[0.06] observe">
          {features.map((feature, index) => (
            <div
              key={index}
              className="feature-card relative p-10 bg-[var(--gs-dark-1)] transition-all hover:bg-[var(--gs-dark-2)] group overflow-hidden"
            >
              <div className="w-10 h-10 border border-[var(--gs-gray-1)] flex items-center justify-center font-mono text-base text-[var(--gs-gray-3)] mb-6 transition-all group-hover:text-[var(--gs-lime)] group-hover:border-[var(--gs-lime)] clip-corner-sm">
                {feature.icon}
              </div>
              <h3 className="font-display font-semibold text-base uppercase tracking-wide text-[var(--gs-white)] mb-2">{feature.title}</h3>
              <p className="font-body text-sm font-light leading-relaxed text-[var(--gs-gray-3)]">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Dashboard Preview Section */}
      <section className="relative z-10 py-24 px-6 lg:px-10 border-t border-white/[0.06]" id="preview">
        <div className="flex items-baseline gap-4 mb-10 observe">
          <span className="section-number">03</span>
          <h2 className="font-display font-bold text-3xl uppercase tracking-wide">Dashboard Preview</h2>
          <div className="section-line" />
        </div>

        <div className="relative bg-[var(--gs-dark-2)] border border-white/[0.06] rounded-lg overflow-hidden observe preview-frame">
          {/* Browser toolbar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-black/30">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
            </div>
            <div className="font-mono text-[11px] text-[var(--gs-gray-3)] px-4 py-1 bg-[var(--gs-dark-3)] rounded border border-white/[0.06]">
              gunzscope.xyz/portfolio
            </div>
            <div />
          </div>

          {/* Dashboard content */}
          <div className="p-10">
            {/* Header */}
            <div className="flex justify-between items-start mb-10">
              <div>
                <div className="font-display text-sm font-semibold uppercase tracking-wider text-[var(--gs-gray-3)] mb-1">Total Portfolio Value</div>
                <div className="font-display text-4xl font-bold text-[var(--gs-white)]">$2,847<span className="text-xl text-[var(--gs-gray-4)]">.32</span></div>
              </div>
              <div className="font-mono text-sm text-[var(--gs-profit)] px-2.5 py-1 bg-[rgba(0,255,136,0.08)] border border-[rgba(0,255,136,0.15)] rounded">
                ▲ +14.5%
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-[1px] bg-white/[0.04] border border-white/[0.06] mb-10">
              <div className="px-6 py-4 bg-[var(--gs-dark-1)]">
                <div className="font-mono text-[9px] tracking-wider uppercase text-[var(--gs-gray-2)] mb-1">GUN Holdings</div>
                <div className="font-display text-lg font-bold text-[var(--gs-lime)]">12,450</div>
              </div>
              <div className="px-6 py-4 bg-[var(--gs-dark-1)]">
                <div className="font-mono text-[9px] tracking-wider uppercase text-[var(--gs-gray-2)] mb-1">GUN Value</div>
                <div className="font-display text-lg font-bold text-[var(--gs-white)]">$1,054.50</div>
              </div>
              <div className="px-6 py-4 bg-[var(--gs-dark-1)]">
                <div className="font-mono text-[9px] tracking-wider uppercase text-[var(--gs-gray-2)] mb-1">NFT Value</div>
                <div className="font-display text-lg font-bold text-[var(--gs-purple)]">$1,792.82</div>
              </div>
              <div className="px-6 py-4 bg-[var(--gs-dark-1)]">
                <div className="font-mono text-[9px] tracking-wider uppercase text-[var(--gs-gray-2)] mb-1">Unrealized P&L</div>
                <div className="font-display text-lg font-bold text-[var(--gs-profit)]">+$412.50</div>
              </div>
            </div>

            {/* NFT Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {mockNFTs.map((nft, index) => (
                <div
                  key={index}
                  className="bg-[var(--gs-dark-3)] border border-white/[0.06] p-4 transition-all hover:border-[var(--gs-lime)]/30 hover:-translate-y-0.5 group"
                >
                  <div className="w-full aspect-square bg-[var(--gs-dark-4)] mb-3 relative flex items-center justify-center opacity-70 group-hover:opacity-90 transition-opacity overflow-hidden">
                    <span
                      className={`absolute top-1.5 left-1.5 font-mono text-[8px] tracking-wide uppercase px-1.5 py-0.5 rounded-sm ${
                        nft.rarity === 'Epic' ? 'bg-[rgba(180,74,255,0.15)] text-[var(--gs-rarity-epic)] border border-[rgba(180,74,255,0.2)]' :
                        nft.rarity === 'Legendary' ? 'bg-[rgba(255,140,0,0.15)] text-[var(--gs-rarity-legendary)] border border-[rgba(255,140,0,0.2)]' :
                        nft.rarity === 'Classified' ? 'bg-[rgba(231,76,60,0.15)] text-[var(--gs-rarity-classified)] border border-[rgba(231,76,60,0.2)]' :
                        'bg-[rgba(74,122,255,0.15)] text-[var(--gs-rarity-rare)] border border-[rgba(74,122,255,0.2)]'
                      }`}
                    >
                      {nft.rarity === 'Classified' ? '🔒 Classified' : nft.rarity}
                    </span>
                    <span className="font-display text-3xl font-bold text-[var(--gs-gray-1)]">
                      {nft.name.split(' ').map(w => w[0]).join('')}
                    </span>
                  </div>
                  <div className="font-display text-xs font-semibold uppercase tracking-wide text-[var(--gs-white)] mb-0.5 truncate">{nft.name}</div>
                  <div className="font-mono text-[9px] uppercase tracking-wide text-[var(--gs-gray-3)] mb-3">{nft.type}</div>
                  <div className="flex justify-between items-baseline pt-3 border-t border-white/[0.06]">
                    <span className="font-mono text-[11px] text-[var(--gs-white)]">{nft.price}</span>
                    <span className={`font-mono text-[10px] ${nft.locked ? 'text-[var(--gs-gray-3)]' : nft.profit ? 'text-[var(--gs-profit)]' : 'text-[var(--gs-loss)]'}`}>
                      {nft.pnl}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Components Section */}
      <section className="relative z-10 py-24 px-6 lg:px-10 border-t border-white/[0.06]" id="components">
        <div className="flex items-baseline gap-4 mb-10 observe">
          <span className="section-number">04</span>
          <h2 className="font-display font-bold text-3xl uppercase tracking-wide">Component Library</h2>
          <div className="section-line" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Buttons */}
          <div className="bg-[var(--gs-dark-2)] border border-white/[0.06] p-10 observe">
            <div className="flex items-center gap-2 mb-6 component-label">
              <span className="font-mono text-[10px] tracking-wider uppercase text-[var(--gs-gray-3)]">Button Variants</span>
            </div>
            <div className="flex flex-wrap gap-4 items-center">
              <button className="font-display font-semibold text-sm tracking-wider uppercase px-6 py-3 bg-[var(--gs-lime)] text-[var(--gs-black)] hover:bg-[#B8FF33] transition-all clip-corner">
                Primary
              </button>
              <button className="font-display font-semibold text-sm tracking-wider uppercase px-6 py-3 bg-transparent text-[var(--gs-white-dim)] border border-[var(--gs-gray-1)] hover:border-[var(--gs-lime)] hover:text-[var(--gs-lime)] transition-all clip-corner">
                Secondary
              </button>
              <button className="font-mono text-[11px] tracking-wide uppercase px-4 py-2 bg-transparent text-[var(--gs-gray-3)] border border-[var(--gs-gray-1)] hover:border-[var(--gs-gray-3)] hover:text-[var(--gs-white)] transition-all">
                Ghost
              </button>
              <button className="font-display font-semibold text-xs tracking-wide uppercase px-5 py-2.5 bg-[rgba(255,68,68,0.1)] text-[var(--gs-loss)] border border-[rgba(255,68,68,0.3)] hover:bg-[rgba(255,68,68,0.2)] transition-all clip-corner">
                Danger
              </button>
            </div>
          </div>

          {/* Status Badges */}
          <div className="bg-[var(--gs-dark-2)] border border-white/[0.06] p-10 observe">
            <div className="flex items-center gap-2 mb-6 component-label">
              <span className="font-mono text-[10px] tracking-wider uppercase text-[var(--gs-gray-3)]">Status Badges</span>
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="font-mono text-[9px] tracking-wide uppercase px-2.5 py-1 rounded-sm bg-[rgba(0,255,136,0.1)] text-[var(--gs-profit)] border border-[rgba(0,255,136,0.2)] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--gs-profit)]" />
                +14.5%
              </span>
              <span className="font-mono text-[9px] tracking-wide uppercase px-2.5 py-1 rounded-sm bg-[rgba(255,68,68,0.1)] text-[var(--gs-loss)] border border-[rgba(255,68,68,0.2)] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--gs-loss)]" />
                -3.2%
              </span>
              <span className="font-mono text-[9px] tracking-wide uppercase px-2.5 py-1 rounded-sm bg-[rgba(255,170,0,0.1)] text-[var(--gs-warning)] border border-[rgba(255,170,0,0.2)] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--gs-warning)]" />
                Syncing
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="font-mono text-[9px] tracking-wide uppercase px-2.5 py-1 rounded-sm bg-[rgba(166,247,0,0.1)] text-[var(--gs-lime)] border border-[rgba(166,247,0,0.2)]">GunzChain</span>
              <span className="font-mono text-[9px] tracking-wide uppercase px-2.5 py-1 rounded-sm bg-[rgba(153,69,255,0.1)] text-[#9945FF] border border-[rgba(153,69,255,0.2)]">Solana</span>
              <span className="font-mono text-[9px] tracking-wide uppercase px-2.5 py-1 rounded-sm bg-[rgba(109,91,255,0.1)] text-[var(--gs-purple)] border border-[rgba(109,91,255,0.2)]">Weapon</span>
              <span className="font-mono text-[9px] tracking-wide uppercase px-2.5 py-1 rounded-sm bg-[rgba(255,140,0,0.1)] text-[#FF8C00] border border-[rgba(255,140,0,0.2)]">Skin</span>
            </div>
          </div>

          {/* Stat Cards */}
          <div className="bg-[var(--gs-dark-2)] border border-white/[0.06] p-10 observe">
            <div className="flex items-center gap-2 mb-6 component-label">
              <span className="font-mono text-[10px] tracking-wider uppercase text-[var(--gs-gray-3)]">Stat Cards</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-[var(--gs-dark-3)] border border-white/[0.06] border-l-2 border-l-[var(--gs-gray-1)] hover:border-l-[var(--gs-lime)] transition-all">
                <div className="font-mono text-[9px] tracking-wider uppercase text-[var(--gs-gray-3)] mb-1">GUN Price</div>
                <div className="font-display text-xl font-bold text-[var(--gs-lime)]">$0.0847</div>
              </div>
              <div className="p-4 bg-[var(--gs-dark-3)] border border-white/[0.06] border-l-2 border-l-[var(--gs-gray-1)] hover:border-l-[var(--gs-lime)] transition-all">
                <div className="font-mono text-[9px] tracking-wider uppercase text-[var(--gs-gray-3)] mb-1">24h Volume</div>
                <div className="font-display text-xl font-bold text-[var(--gs-purple)]">$1.2M</div>
              </div>
              <div className="p-4 bg-[var(--gs-dark-3)] border border-white/[0.06] border-l-2 border-l-[var(--gs-gray-1)] hover:border-l-[var(--gs-lime)] transition-all">
                <div className="font-mono text-[9px] tracking-wider uppercase text-[var(--gs-gray-3)] mb-1">Total NFTs</div>
                <div className="font-display text-xl font-bold text-[var(--gs-white)]">154</div>
              </div>
              <div className="p-4 bg-[var(--gs-dark-3)] border border-white/[0.06] border-l-2 border-l-[var(--gs-gray-1)] hover:border-l-[var(--gs-lime)] transition-all">
                <div className="font-mono text-[9px] tracking-wider uppercase text-[var(--gs-gray-3)] mb-1">Unrealized</div>
                <div className="font-display text-xl font-bold text-[var(--gs-profit)]">+$412</div>
              </div>
            </div>
          </div>

          {/* Loading States */}
          <div className="bg-[var(--gs-dark-2)] border border-white/[0.06] p-10 observe">
            <div className="flex items-center gap-2 mb-6 component-label">
              <span className="font-mono text-[10px] tracking-wider uppercase text-[var(--gs-gray-3)]">Loading States</span>
            </div>
            <div className="flex gap-10 items-center">
              {/* Progress bar */}
              <div className="w-[200px] h-[3px] bg-[var(--gs-dark-4)] rounded-sm overflow-hidden">
                <div className="h-full gradient-action rounded-sm animate-loader-pulse" />
              </div>

              {/* Spinner */}
              <div className="w-8 h-8 border-2 border-[var(--gs-gray-1)] border-t-[var(--gs-lime)] rounded-full animate-spin" />

              {/* Dots */}
              <div className="flex gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--gs-lime)] animate-dot-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--gs-lime)] animate-dot-bounce" style={{ animationDelay: '0.2s' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--gs-lime)] animate-dot-bounce" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
