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

export default function BrandPage() {
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
          <a href="#components" className="font-mono text-[11px] tracking-wider uppercase text-[var(--gs-gray-3)] hover:text-[var(--gs-lime)] transition-colors">
            Components
          </a>
          <Link
            href="/"
            className="font-mono text-[11px] tracking-wider uppercase text-[var(--gs-gray-3)] hover:text-[var(--gs-lime)] transition-colors"
          >
            Back to Home
          </Link>
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

      {/* Page Header */}
      <section className="relative pt-32 pb-16 px-6 lg:px-10">
        <div className="max-w-[900px]">
          <h1 className="font-display font-bold text-4xl sm:text-5xl md:text-6xl leading-[0.95] tracking-tight uppercase mb-4">
            <span className="text-[var(--gs-white)]">Brand</span>{' '}
            <span className="text-[var(--gs-purple-bright)]">System</span>
          </h1>
          <p className="font-body text-lg font-light leading-relaxed text-[var(--gs-gray-4)] max-w-[560px]">
            GUNZscope design tokens, color palette, typography, and component library.
            Internal reference for maintaining visual consistency.
          </p>
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

      {/* Components Section */}
      <section className="relative z-10 py-24 px-6 lg:px-10 border-t border-white/[0.06]" id="components">
        <div className="flex items-baseline gap-4 mb-10 observe">
          <span className="section-number">02</span>
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

      {/* NFT Detail Cards Section */}
      <section className="relative z-10 py-24 px-6 lg:px-10 border-t border-white/[0.06]" id="nft-detail-cards">
        <div className="flex items-baseline gap-4 mb-10 observe">
          <span className="section-number">03</span>
          <h2 className="font-display font-bold text-3xl uppercase tracking-wide">NFT Detail Cards</h2>
          <div className="section-line" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

          {/* ============================================================ */}
          {/* QUICK STATS — All States */}
          {/* ============================================================ */}
          <div className="bg-[var(--gs-dark-2)] border border-white/[0.06] p-10 observe">
            <div className="flex items-center gap-2 mb-8 component-label">
              <span className="font-mono text-[10px] tracking-wider uppercase text-[var(--gs-gray-3)]">Quick Stats</span>
            </div>
            <div className="space-y-6">
              {/* Profit */}
              <div>
                <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--gs-gray-4)] block mb-2">Profit</span>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-[var(--gs-dark-3)] border border-white/[0.06] border-l-2 p-3" style={{ borderLeftColor: 'var(--gs-gray-1)' }}>
                    <div className="font-mono text-[9px] uppercase tracking-[1.5px] text-[var(--gs-gray-3)] mb-1">Cost Basis</div>
                    <div className="font-display text-sm font-semibold text-[var(--gs-white)] tabular-nums">$1.56</div>
                    <div className="font-mono text-[10px] text-[var(--gs-gray-4)] tabular-nums mt-0.5">450.00 GUN</div>
                  </div>
                  <div className="bg-[var(--gs-dark-3)] border border-white/[0.06] border-l-2 p-3" style={{ borderLeftColor: 'var(--gs-purple)' }}>
                    <div className="font-mono text-[9px] uppercase tracking-[1.5px] text-[var(--gs-gray-3)] mb-1">Market Value</div>
                    <div className="font-display text-sm font-semibold text-[var(--gs-white)] tabular-nums">$2.40</div>
                    <div className="font-mono text-[10px] text-[var(--gs-gray-4)] tabular-nums mt-0.5">692.00 GUN</div>
                  </div>
                  <div className="bg-[var(--gs-dark-3)] border border-white/[0.06] border-l-2 p-3" style={{ borderLeftColor: 'var(--gs-profit)' }}>
                    <div className="font-mono text-[9px] uppercase tracking-[1.5px] text-[var(--gs-gray-3)] mb-1">Unrealized</div>
                    <div className="font-display text-sm font-semibold tabular-nums text-[var(--gs-profit)]">+$0.84</div>
                    <div className="font-mono text-[10px] tabular-nums mt-0.5 text-[var(--gs-profit)]">+53.8%</div>
                  </div>
                </div>
              </div>
              {/* Loss */}
              <div>
                <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--gs-gray-4)] block mb-2">Loss</span>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-[var(--gs-dark-3)] border border-white/[0.06] border-l-2 p-3" style={{ borderLeftColor: 'var(--gs-gray-1)' }}>
                    <div className="font-mono text-[9px] uppercase tracking-[1.5px] text-[var(--gs-gray-3)] mb-1">Cost Basis</div>
                    <div className="font-display text-sm font-semibold text-[var(--gs-white)] tabular-nums">$3.20</div>
                    <div className="font-mono text-[10px] text-[var(--gs-gray-4)] tabular-nums mt-0.5">920.00 GUN</div>
                  </div>
                  <div className="bg-[var(--gs-dark-3)] border border-white/[0.06] border-l-2 p-3" style={{ borderLeftColor: 'var(--gs-purple)' }}>
                    <div className="font-mono text-[9px] uppercase tracking-[1.5px] text-[var(--gs-gray-3)] mb-1">Market Value</div>
                    <div className="font-display text-sm font-semibold text-[var(--gs-white)] tabular-nums">$1.80</div>
                    <div className="font-mono text-[10px] text-[var(--gs-gray-4)] tabular-nums mt-0.5">518.00 GUN</div>
                  </div>
                  <div className="bg-[var(--gs-dark-3)] border border-white/[0.06] border-l-2 p-3" style={{ borderLeftColor: 'var(--gs-loss)' }}>
                    <div className="font-mono text-[9px] uppercase tracking-[1.5px] text-[var(--gs-gray-3)] mb-1">Unrealized</div>
                    <div className="font-display text-sm font-semibold tabular-nums text-[var(--gs-loss)]">-$1.40</div>
                    <div className="font-mono text-[10px] tabular-nums mt-0.5 text-[var(--gs-loss)]">-43.8%</div>
                  </div>
                </div>
              </div>
              {/* No Data */}
              <div>
                <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--gs-gray-4)] block mb-2">No Data</span>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-[var(--gs-dark-3)] border border-white/[0.06] border-l-2 p-3" style={{ borderLeftColor: 'var(--gs-gray-1)' }}>
                    <div className="font-mono text-[9px] uppercase tracking-[1.5px] text-[var(--gs-gray-3)] mb-1">Cost Basis</div>
                    <div className="font-display text-sm font-semibold text-[var(--gs-white)] tabular-nums">{'\u2014'}</div>
                  </div>
                  <div className="bg-[var(--gs-dark-3)] border border-white/[0.06] border-l-2 p-3" style={{ borderLeftColor: 'var(--gs-purple)' }}>
                    <div className="font-mono text-[9px] uppercase tracking-[1.5px] text-[var(--gs-gray-3)] mb-1">Market Value</div>
                    <div className="font-display text-sm font-semibold text-[var(--gs-white)] tabular-nums">{'\u2014'}</div>
                  </div>
                  <div className="bg-[var(--gs-dark-3)] border border-white/[0.06] border-l-2 p-3" style={{ borderLeftColor: 'var(--gs-gray-1)' }}>
                    <div className="font-mono text-[9px] uppercase tracking-[1.5px] text-[var(--gs-gray-3)] mb-1">Unrealized</div>
                    <div className="font-display text-sm font-semibold tabular-nums text-white/60">{'\u2014'}</div>
                  </div>
                </div>
              </div>
              {/* Loading */}
              <div>
                <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--gs-gray-4)] block mb-2">Loading</span>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-[var(--gs-dark-3)] border border-white/[0.06] p-3 animate-pulse">
                      <div className="h-2 w-12 bg-white/10 rounded mb-2" />
                      <div className="h-5 w-16 bg-white/10 rounded" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* YOUR POSITION — All States */}
          {/* ============================================================ */}
          <div className="bg-[var(--gs-dark-2)] border border-white/[0.06] p-10 observe">
            <div className="flex items-center gap-2 mb-8 component-label">
              <span className="font-mono text-[10px] tracking-wider uppercase text-[var(--gs-gray-3)]">Your Position</span>
            </div>
            <div className="space-y-6">
              {/* Decoded (Profit) */}
              <div>
                <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--gs-gray-4)] block mb-2">Decoded (Profit)</span>
                <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(166, 247, 0, 0.06)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-mono text-[10px] font-normal uppercase tracking-[1.5px] text-[var(--gs-gray-3)]">Your Position</p>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--gs-lime)]/20 text-[var(--gs-lime)]">Decoded</span>
                  </div>
                  <div className="space-y-1">
                    <p className="font-display text-[26px] font-bold text-white tabular-nums">$1.56</p>
                    <p className="text-[13px] text-white/70">Cost basis: 450.00 GUN</p>
                    <p className="text-[13px] text-white/60">At acquisition: $1.56</p>
                    <p className="text-[13px] text-[var(--gs-lime)]">+$0.84 (+53.8%)</p>
                    <p className="text-[11px] text-white/60 mt-2 leading-relaxed">Based on your acquisition cost (GUN) valued at today&apos;s GUN price.</p>
                    <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] uppercase tracking-wider text-white/60">Source</span>
                        <span className="text-[13px] font-medium text-[var(--gs-lime)]">HEX Decoder</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] uppercase tracking-wider text-white/60">Acquired</span>
                        <span className="text-[13px] font-medium text-white/90 tabular-nums">Jan 15, 2025</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] uppercase tracking-wider text-white/60">Transaction</span>
                        <span className="text-[13px] font-medium text-[var(--gs-lime)] inline-flex items-center gap-1">
                          View
                          <svg className="w-3 h-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Acquired (Loss) */}
              <div>
                <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--gs-gray-4)] block mb-2">Acquired (Loss)</span>
                <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(166, 247, 0, 0.06)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-mono text-[10px] font-normal uppercase tracking-[1.5px] text-[var(--gs-gray-3)]">Your Position</p>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--gs-lime)]/20 text-[var(--gs-lime)]">Acquired</span>
                  </div>
                  <div className="space-y-1">
                    <p className="font-display text-[26px] font-bold text-white tabular-nums">$1.80</p>
                    <p className="text-[13px] text-white/70">Cost basis: 920.00 GUN</p>
                    <p className="text-[13px] text-white/60">At acquisition: $3.20</p>
                    <p className="text-[13px] text-[var(--gs-loss)]">-$1.40 (-43.8%)</p>
                    <p className="text-[11px] text-white/60 mt-2 leading-relaxed">Based on your acquisition cost (GUN) valued at today&apos;s GUN price.</p>
                    <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] uppercase tracking-wider text-white/60">Source</span>
                        <span className="text-[13px] font-medium text-blue-400">OpenSea</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] uppercase tracking-wider text-white/60">Acquired</span>
                        <span className="text-[13px] font-medium text-white/90 tabular-nums">Dec 22, 2024</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Transferred */}
              <div>
                <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--gs-gray-4)] block mb-2">Transferred</span>
                <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(166, 247, 0, 0.06)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-mono text-[10px] font-normal uppercase tracking-[1.5px] text-[var(--gs-gray-3)]">Your Position</p>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/10 text-white/60">Transferred</span>
                  </div>
                  <div className="space-y-1">
                    <p className="font-display text-[26px] font-bold text-white tabular-nums">{'\u2014'}</p>
                    <p className="text-[13px] text-white/70">Cost basis: 0.00 GUN</p>
                    <p className="text-[11px] text-white/60 mt-2 leading-relaxed">Based on your acquisition cost (GUN) valued at today&apos;s GUN price.</p>
                  </div>
                </div>
              </div>
              {/* Loading */}
              <div>
                <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--gs-gray-4)] block mb-2">Loading</span>
                <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(166, 247, 0, 0.06)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-mono text-[10px] font-normal uppercase tracking-[1.5px] text-[var(--gs-gray-3)]">Your Position</p>
                  </div>
                  <div className="space-y-2">
                    <div className="h-8 w-28 bg-gradient-to-r from-white/5 via-white/10 to-white/5 bg-[length:200%_100%] rounded animate-shimmer" />
                    <div className="h-4 w-36 bg-gradient-to-r from-white/5 via-white/10 to-white/5 bg-[length:200%_100%] rounded animate-shimmer [animation-delay:0.1s]" />
                    <div className="h-4 w-32 bg-gradient-to-r from-white/5 via-white/10 to-white/5 bg-[length:200%_100%] rounded animate-shimmer [animation-delay:0.2s]" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* MARKET REFERENCE — All States */}
          {/* ============================================================ */}
          <div className="bg-[var(--gs-dark-2)] border border-white/[0.06] p-10 observe">
            <div className="flex items-center gap-2 mb-8 component-label">
              <span className="font-mono text-[10px] tracking-wider uppercase text-[var(--gs-gray-3)]">Market Reference</span>
            </div>
            <div className="space-y-6">
              {/* Up */}
              <div>
                <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--gs-gray-4)] block mb-2">Up</span>
                <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(166, 247, 0, 0.06)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-mono text-[10px] font-normal uppercase tracking-[1.5px] text-[var(--gs-gray-3)]">Market Reference</p>
                    <div className="h-6 px-2.5 rounded-full text-xs font-semibold inline-flex items-center gap-1 bg-[var(--gs-lime)]/10 text-[var(--gs-lime)] border border-[var(--gs-lime)]/20">
                      <span className="text-[10px]">{'\u2197'}</span> Up
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="font-display text-[22px] font-semibold text-white tabular-nums">{'\u2248'} $2.40 USD</p>
                    <p className="text-[13px] font-medium text-white/85">{'\u2248'} 692.00 GUN</p>
                    <p className="text-xs text-[var(--gs-lime)]">Unrealized: +53.8%</p>
                    <p className="text-[11px] text-white/60 mt-2 inline-flex items-center gap-1">
                      Data Quality: <span className="capitalize">Strong</span>
                      <svg className="w-3 h-3 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </p>
                  </div>
                </div>
              </div>
              {/* Down */}
              <div>
                <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--gs-gray-4)] block mb-2">Down</span>
                <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(166, 247, 0, 0.06)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-mono text-[10px] font-normal uppercase tracking-[1.5px] text-[var(--gs-gray-3)]">Market Reference</p>
                    <div className="h-6 px-2.5 rounded-full text-xs font-semibold inline-flex items-center gap-1 bg-[var(--gs-loss)]/10 text-[var(--gs-loss)] border border-[var(--gs-loss)]/20">
                      <span className="text-[10px]">{'\u2198'}</span> Down
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="font-display text-[22px] font-semibold text-white tabular-nums">{'\u2248'} $1.80 USD</p>
                    <p className="text-[13px] font-medium text-white/85">{'\u2248'} 518.00 GUN</p>
                    <p className="text-xs text-[var(--gs-loss)]">Unrealized: -43.7%</p>
                    <p className="text-[11px] text-white/60 mt-2 inline-flex items-center gap-1">
                      Data Quality: <span className="capitalize">Fair</span>
                      <svg className="w-3 h-3 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </p>
                  </div>
                </div>
              </div>
              {/* Flat */}
              <div>
                <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--gs-gray-4)] block mb-2">Flat</span>
                <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(166, 247, 0, 0.06)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-mono text-[10px] font-normal uppercase tracking-[1.5px] text-[var(--gs-gray-3)]">Market Reference</p>
                    <div className="h-6 px-2.5 rounded-full text-xs font-semibold inline-flex items-center gap-1 bg-white/5 text-white/70 border border-white/10">
                      <span className="text-[10px]">{'\u2013'}</span> Flat
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="font-display text-[22px] font-semibold text-white tabular-nums">{'\u2248'} $1.58 USD</p>
                    <p className="text-[13px] font-medium text-white/85">{'\u2248'} 455.00 GUN</p>
                    <p className="text-xs text-white/70">Unrealized: +1.3%</p>
                  </div>
                </div>
              </div>
              {/* No Cost Basis */}
              <div>
                <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--gs-gray-4)] block mb-2">No Cost Basis</span>
                <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(166, 247, 0, 0.06)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-mono text-[10px] font-normal uppercase tracking-[1.5px] text-[var(--gs-gray-3)]">Market Reference</p>
                    <div className="h-6 px-2.5 rounded-full text-xs font-semibold inline-flex items-center gap-1 bg-transparent text-white/60 border border-white/10">
                      <span className="text-[10px]">{'\u2022'}</span> No cost basis
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="font-display text-[22px] font-semibold text-white tabular-nums">{'\u2248'} $2.40 USD</p>
                    <p className="text-[13px] font-medium text-white/85">{'\u2248'} 692.00 GUN</p>
                  </div>
                </div>
              </div>
              {/* No Market Ref */}
              <div>
                <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--gs-gray-4)] block mb-2">No Market Reference</span>
                <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(166, 247, 0, 0.06)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-mono text-[10px] font-normal uppercase tracking-[1.5px] text-[var(--gs-gray-3)]">Market Reference</p>
                    <div className="h-6 px-2.5 rounded-full text-xs font-semibold inline-flex items-center gap-1 bg-transparent text-white/60 border border-white/10">
                      <span className="text-[10px]">{'\u2022'}</span> No market reference
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-base font-medium text-white/85">No active listings found</p>
                    <p className="text-xs text-white/60">This is an illiquid market; reference values may be unavailable.</p>
                  </div>
                </div>
              </div>
              {/* Loading */}
              <div>
                <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--gs-gray-4)] block mb-2">Loading</span>
                <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(166, 247, 0, 0.06)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-mono text-[10px] font-normal uppercase tracking-[1.5px] text-[var(--gs-gray-3)]">Market Reference</p>
                  </div>
                  <div className="space-y-2">
                    <div className="h-7 w-32 bg-white/10 rounded animate-pulse" />
                    <div className="h-4 w-24 bg-white/10 rounded animate-pulse" />
                    <div className="h-3 w-40 bg-white/10 rounded animate-pulse" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* STATUS PILLS — All Variants */}
          {/* ============================================================ */}
          <div className="bg-[var(--gs-dark-2)] border border-white/[0.06] p-10 observe">
            <div className="flex items-center gap-2 mb-8 component-label">
              <span className="font-mono text-[10px] tracking-wider uppercase text-[var(--gs-gray-3)]">Status &amp; Position Pills</span>
            </div>
            <div className="space-y-6">
              <div>
                <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--gs-gray-4)] block mb-2">Acquisition Status</span>
                <div className="flex flex-wrap gap-2">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--gs-lime)]/20 text-[var(--gs-lime)]">Decoded</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--gs-lime)]/20 text-[var(--gs-lime)]">Acquired</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/10 text-white/60">Transferred</span>
                </div>
              </div>
              <div>
                <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--gs-gray-4)] block mb-2">Position State</span>
                <div className="flex flex-wrap gap-2">
                  <div className="h-6 px-2.5 rounded-full text-xs font-semibold inline-flex items-center gap-1 bg-[var(--gs-lime)]/10 text-[var(--gs-lime)] border border-[var(--gs-lime)]/20">
                    <span className="text-[10px]">{'\u2197'}</span> Up
                  </div>
                  <div className="h-6 px-2.5 rounded-full text-xs font-semibold inline-flex items-center gap-1 bg-[var(--gs-loss)]/10 text-[var(--gs-loss)] border border-[var(--gs-loss)]/20">
                    <span className="text-[10px]">{'\u2198'}</span> Down
                  </div>
                  <div className="h-6 px-2.5 rounded-full text-xs font-semibold inline-flex items-center gap-1 bg-white/5 text-white/70 border border-white/10">
                    <span className="text-[10px]">{'\u2013'}</span> Flat
                  </div>
                  <div className="h-6 px-2.5 rounded-full text-xs font-semibold inline-flex items-center gap-1 bg-transparent text-white/60 border border-white/10">
                    <span className="text-[10px]">{'\u2022'}</span> No cost basis
                  </div>
                  <div className="h-6 px-2.5 rounded-full text-xs font-semibold inline-flex items-center gap-1 bg-transparent text-white/60 border border-white/10">
                    <span className="text-[10px]">{'\u2022'}</span> No market reference
                  </div>
                </div>
              </div>
              <div>
                <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--gs-gray-4)] block mb-2">Venue Colors</span>
                <div className="flex flex-wrap gap-3">
                  <span className="text-[13px] font-medium text-[var(--gs-lime)]">HEX Decoder</span>
                  <span className="text-[13px] font-medium text-blue-400">OpenSea</span>
                  <span className="text-[13px] font-medium text-[var(--gs-purple)]">OTG Marketplace</span>
                  <span className="text-[13px] font-medium text-white/90">Unknown</span>
                </div>
              </div>
              <div>
                <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--gs-gray-4)] block mb-2">Left Border Accents</span>
                <div className="flex gap-2">
                  <div className="w-1 h-10 rounded-full" style={{ backgroundColor: 'var(--gs-gray-1)' }} title="Cost Basis / Neutral" />
                  <div className="w-1 h-10 rounded-full" style={{ backgroundColor: 'var(--gs-purple)' }} title="Market Value" />
                  <div className="w-1 h-10 rounded-full" style={{ backgroundColor: 'var(--gs-profit)' }} title="Profit" />
                  <div className="w-1 h-10 rounded-full" style={{ backgroundColor: 'var(--gs-loss)' }} title="Loss" />
                </div>
                <div className="flex gap-2 mt-1">
                  <span className="font-mono text-[9px] text-[var(--gs-gray-3)] w-1 text-center">N</span>
                  <span className="font-mono text-[9px] text-[var(--gs-gray-3)] w-1 text-center">M</span>
                  <span className="font-mono text-[9px] text-[var(--gs-gray-3)] w-1 text-center">P</span>
                  <span className="font-mono text-[9px] text-[var(--gs-gray-3)] w-1 text-center">L</span>
                </div>
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
