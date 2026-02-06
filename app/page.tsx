'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Logo from '@/components/Logo';
import Footer from '@/components/Footer';
import { useCountUp } from '@/hooks/useCountUp';
import { FeatureIcon } from '@/components/ui/FeatureIcon';
import { useTextScramble } from '@/hooks/useTextScramble';

// Features data
const features: { icon: 'analytics' | 'chain' | 'intel' | 'weapon' | 'rarity' | 'pricing'; title: string; desc: string }[] = [
  {
    icon: 'analytics',
    title: 'Portfolio Analytics',
    desc: 'Real-time portfolio valuation with GUN token price tracking, unrealized P&L calculations, and cost basis analysis across all your OTG assets.',
  },
  {
    icon: 'chain',
    title: 'Cross-Chain',
    desc: 'Unified view of your NFT holdings across GunzChain (Avalanche L1) and Solana. One wallet, one dashboard, complete visibility.',
  },
  {
    icon: 'intel',
    title: 'Acquisition Intel',
    desc: 'Automatic detection of how each NFT was acquired — HEX decode, marketplace purchase, or transfer — with original GUN cost basis.',
  },
  {
    icon: 'weapon',
    title: 'Weapon Lab',
    desc: 'Smart matching of compatible weapon modifications, skins, and attachments based on model codes, not just name matching.',
  },
  {
    icon: 'rarity',
    title: 'Rarity Tiers',
    desc: 'Dual rarity system showing both display rarity and functional tier. Classified items flagged as locked special editions.',
  },
  {
    icon: 'pricing',
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

interface SiteStats {
  nftsTracked: number;
  walletsTracked: number;
  portfolioValueUsd: number;
  unrealizedPnlUsd: number;
}

export default function HomePage() {
  const router = useRouter();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const heroRef = useRef<HTMLElement>(null);
  const [gunPrice, setGunPrice] = useState<number | null>(null);
  const [siteStats, setSiteStats] = useState<SiteStats | null>(null);

  // Access gate state
  const [accessUnlocked, setAccessUnlocked] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [accessError, setAccessError] = useState<string | null>(null);
  const [accessLoading, setAccessLoading] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [walletChain, setWalletChain] = useState<'gunzchain' | 'solana' | null>(null);

  // Text scramble effect for hero text (LayerZero style)
  const heroScramble = useTextScramble({
    words: ['Intelligence', 'Dominance', 'Advantage', 'Edge'],
    scrambleDuration: 600,
    pauseDuration: 2000,
  });

  // Count-up animations for stats
  const gunPriceCountUp = useCountUp({
    end: gunPrice ?? 0,
    duration: 1500,
    decimals: 4,
    startOnMount: false
  });
  const portfolioValueCountUp = useCountUp({
    end: siteStats?.portfolioValueUsd ?? 0,
    duration: 2000,
    decimals: 2,
    startOnMount: false
  });
  const pnlCountUp = useCountUp({
    end: Math.abs(siteStats?.unrealizedPnlUsd ?? 0),
    duration: 2000,
    decimals: 2,
    startOnMount: false
  });
  const nftsCountUp = useCountUp({
    end: siteStats?.nftsTracked ?? 0,
    duration: 1800,
    decimals: 0,
    startOnMount: false
  });

  // Social proof count-ups
  const walletsCountUp = useCountUp({
    end: siteStats?.walletsTracked ?? 0,
    duration: 1500,
    decimals: 0,
    startOnMount: false
  });
  const socialNftsCountUp = useCountUp({
    end: siteStats?.nftsTracked ?? 0,
    duration: 1500,
    decimals: 0,
    startOnMount: false
  });

  // Detect wallet address chain type
  const detectChain = (addr: string): 'gunzchain' | 'solana' | null => {
    const trimmed = addr.trim();
    if (/^0x[a-fA-F0-9]{40}$/.test(trimmed)) return 'gunzchain';
    if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(trimmed)) return 'solana';
    return null;
  };

  const handleWalletAddressChange = (value: string) => {
    setWalletAddress(value);
    setWalletChain(detectChain(value));
  };

  const handleAccessCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessCode.trim()) return;

    setAccessLoading(true);
    setAccessError(null);

    try {
      const res = await fetch('/api/access/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: accessCode.trim() }),
      });
      const data = await res.json();

      if (data.success) {
        setAccessUnlocked(true);
      } else {
        setAccessError(data.error || 'Invalid access code');
      }
    } catch {
      setAccessError('Failed to validate. Please try again.');
    } finally {
      setAccessLoading(false);
    }
  };

  const handleWalletSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = walletAddress.trim();
    if (!trimmed) return;
    const chain = detectChain(trimmed);
    if (!chain) return;
    router.push(`/portfolio?address=${encodeURIComponent(trimmed)}`);
  };

  // Social proof visibility state
  const socialProofRef = useRef<HTMLDivElement>(null);
  const [socialProofVisible, setSocialProofVisible] = useState(false);

  // Observe social proof section for count-up trigger
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !socialProofVisible) {
          setSocialProofVisible(true);
          // Stagger the social proof animations
          walletsCountUp.startAnimation();
          setTimeout(() => socialNftsCountUp.startAnimation(), 100);
        }
      },
      { threshold: 0.3 }
    );

    if (socialProofRef.current) {
      observer.observe(socialProofRef.current);
    }

    return () => observer.disconnect();
  }, [socialProofVisible, siteStats]);

  // Trigger animations when data loads
  useEffect(() => {
    if (gunPrice !== null) gunPriceCountUp.startAnimation();
  }, [gunPrice]);

  useEffect(() => {
    if (siteStats) {
      // Stagger the stats: 200ms, 400ms, 600ms after siteStats loads
      setTimeout(() => portfolioValueCountUp.startAnimation(), 200);
      setTimeout(() => pnlCountUp.startAnimation(), 400);
      setTimeout(() => nftsCountUp.startAnimation(), 600);
    }
  }, [siteStats]);

  // Fetch GUN price and site stats on mount
  useEffect(() => {
    async function fetchPrice() {
      try {
        const res = await fetch('/api/price/gun');
        if (res.ok) {
          const data = await res.json();
          setGunPrice(data.gunTokenPrice);
        }
      } catch (err) {
        console.error('Failed to fetch GUN price:', err);
      }
    }

    async function fetchSiteStats() {
      try {
        const res = await fetch('/api/stats/site');
        if (res.ok) {
          const data = await res.json();
          setSiteStats({
            nftsTracked: data.nftsTracked,
            walletsTracked: data.walletsTracked,
            portfolioValueUsd: data.portfolioValueUsd,
            unrealizedPnlUsd: data.unrealizedPnlUsd,
          });
        }
      } catch (err) {
        console.error('Failed to fetch site stats:', err);
      }
    }

    fetchPrice();
    fetchSiteStats();
  }, []);

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
          <span className="font-mono text-[9px] tracking-wider uppercase px-1.5 py-0.5 rounded-sm bg-[var(--gs-purple)]/20 text-[var(--gs-purple)] border border-[var(--gs-purple)]/30">
            Alpha
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          <a href="#features" className="font-mono text-[11px] tracking-wider uppercase text-[var(--gs-lime)] relative after:absolute after:bottom-[-4px] after:left-0 after:right-0 after:h-[1px] after:bg-[var(--gs-lime)]">
            Features
          </a>
          <a href="#preview" className="font-mono text-[11px] tracking-wider uppercase text-[var(--gs-gray-3)] hover:text-[var(--gs-lime)] transition-colors">
            Dashboard
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <section ref={heroRef} className="relative min-h-screen flex flex-col justify-center pt-32 pb-24 px-6 lg:px-10 overflow-hidden">
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
          <h1 className="font-display font-bold text-5xl sm:text-6xl md:text-7xl lg:text-[88px] leading-[0.95] tracking-wide uppercase mb-6 animate-fade-in-up delay-100">
            <span className="block text-[var(--gs-white)]">Your OTG</span>
            <span className="block text-[var(--gs-purple-bright)]">Arsenal</span>
            <span className="block text-[var(--gs-lime)] relative hero-underline min-w-[280px]">
              {heroScramble.displayText}
            </span>
          </h1>

          {/* Subtitle */}
          <p className="font-body text-lg font-light leading-relaxed text-[var(--gs-gray-4)] max-w-[560px] mb-10 animate-fade-in-up delay-200">
            Track, analyze, and dominate your <strong className="text-[var(--gs-white)] font-medium">Off The Grid</strong> NFT portfolio.
            Real-time P&L, acquisition tracking, and weapon intelligence across{' '}
            <strong className="text-[var(--gs-white)] font-medium">GunzChain</strong> and{' '}
            <strong className="text-[var(--gs-white)] font-medium">Solana</strong>.
          </p>

          {/* Access Gate */}
          <div className="animate-fade-in-up delay-300 max-w-[480px]">
            {!accessUnlocked ? (
              /* Phase 1: Access Code */
              <div>
                <span className="font-mono text-[9px] uppercase tracking-[1.5px] text-[var(--gs-gray-3)] block mb-2">
                  Early Access
                </span>
                <form onSubmit={handleAccessCodeSubmit} className="flex gap-2">
                  <input
                    type="text"
                    value={accessCode}
                    onChange={(e) => { setAccessCode(e.target.value); setAccessError(null); }}
                    placeholder="Enter access code"
                    className="flex-1 px-4 py-3 bg-[var(--gs-dark-2)] border border-white/[0.06] text-[var(--gs-white)] font-mono text-sm placeholder:text-[var(--gs-gray-3)] focus:outline-none focus:border-[var(--gs-lime)]/40 transition-colors clip-corner-sm"
                    disabled={accessLoading}
                  />
                  <button
                    type="submit"
                    disabled={accessLoading || !accessCode.trim()}
                    className="font-display font-semibold text-sm tracking-wider uppercase px-6 py-3 bg-[var(--gs-lime)] text-[var(--gs-black)] hover:bg-[#B8FF33] hover:shadow-[0_8px_30px_rgba(166,247,0,0.2)] transition-all clip-corner disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {accessLoading ? (
                      <span className="inline-block w-4 h-4 border-2 border-[var(--gs-black)]/30 border-t-[var(--gs-black)] rounded-full animate-spin" />
                    ) : 'Unlock'}
                  </button>
                </form>
                {accessError && (
                  <p className="font-mono text-[11px] text-[var(--gs-loss)] mt-2">{accessError}</p>
                )}
              </div>
            ) : (
              /* Phase 2: Wallet Address */
              <div className="animate-fade-in-up">
                <span className="font-mono text-[9px] uppercase tracking-[1.5px] text-[var(--gs-gray-3)] block mb-2">
                  Enter Wallet Address
                </span>
                <form onSubmit={handleWalletSubmit} className="flex gap-2">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={walletAddress}
                      onChange={(e) => handleWalletAddressChange(e.target.value)}
                      placeholder="0x... or Solana address"
                      className={`w-full py-3 pl-4 bg-[var(--gs-dark-2)] border border-white/[0.06] text-[var(--gs-white)] font-mono text-sm placeholder:text-[var(--gs-gray-3)] focus:outline-none focus:border-[var(--gs-lime)]/40 transition-colors clip-corner-sm ${walletChain ? 'pr-24' : 'pr-4'}`}
                    />
                    {walletAddress.trim() && walletChain && (
                      <span className={`absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-sm ${
                        walletChain === 'gunzchain'
                          ? 'bg-[var(--gs-profit)]/15 text-[var(--gs-profit)]'
                          : 'bg-[var(--gs-purple)]/15 text-[var(--gs-purple-bright)]'
                      }`}>
                        {walletChain === 'gunzchain' ? 'GunzChain' : 'Solana'}
                      </span>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={!walletAddress.trim() || !walletChain}
                    className="font-display font-semibold text-sm tracking-wider uppercase px-6 py-3 bg-[var(--gs-lime)] text-[var(--gs-black)] hover:bg-[#B8FF33] hover:shadow-[0_8px_30px_rgba(166,247,0,0.2)] transition-all clip-corner disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    View
                  </button>
                </form>
                {walletAddress.trim() && !walletChain && (
                  <p className="font-mono text-[11px] text-[var(--gs-gray-4)] mt-2">
                    Enter a valid GunzChain (0x...) or Solana address
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Hero Stats Bar */}
        <div className="absolute bottom-0 left-0 right-0 flex flex-wrap border-t border-white/[0.06] glass-effect z-10">
          <div className="flex-1 min-w-[50%] md:min-w-0 px-6 lg:px-10 py-6 border-r border-white/[0.06] last:border-r-0 bg-[var(--gs-lime)]/[0.03]">
            <span className="font-mono text-[10px] tracking-wider uppercase text-[var(--gs-lime)] block mb-1">GUN Price</span>
            <span className="font-display text-3xl font-bold text-[var(--gs-white)]">
              {gunPrice !== null ? (
                <>$<span className="text-[var(--gs-lime)]">{gunPriceCountUp.displayValue}</span></>
              ) : (
                <span className="skeleton-stat inline-block w-24 h-8" />
              )}
            </span>
          </div>
          <div className="flex-1 min-w-[50%] md:min-w-0 px-6 lg:px-10 py-6 border-r border-white/[0.06] last:border-r-0">
            <span className="font-mono text-[10px] tracking-wider uppercase text-[var(--gs-gray-3)] block mb-1">Total Tracked Value</span>
            <span className="font-display text-2xl font-bold text-[var(--gs-white)]">
              {siteStats?.portfolioValueUsd != null ? (
                `$${portfolioValueCountUp.displayValue}`
              ) : (
                <span className="skeleton-stat inline-block w-28 h-7" />
              )}
            </span>
          </div>
          <div className="flex-1 min-w-[50%] md:min-w-0 px-6 lg:px-10 py-6 border-r border-white/[0.06] last:border-r-0">
            <span className="font-mono text-[10px] tracking-wider uppercase text-[var(--gs-gray-3)] block mb-1">Total Tracked P&L</span>
            <span className={`font-display text-2xl font-bold ${
              siteStats?.unrealizedPnlUsd != null
                ? siteStats.unrealizedPnlUsd >= 0
                  ? 'text-[var(--gs-profit)]'
                  : 'text-[var(--gs-loss)]'
                : ''
            }`}>
              {siteStats?.unrealizedPnlUsd != null ? (
                `${siteStats.unrealizedPnlUsd >= 0 ? '+' : '-'}$${pnlCountUp.displayValue}`
              ) : (
                <span className="skeleton-stat inline-block w-24 h-7" />
              )}
            </span>
          </div>
          <div className="flex-1 min-w-[50%] md:min-w-0 px-6 lg:px-10 py-6">
            <span className="font-mono text-[10px] tracking-wider uppercase text-[var(--gs-gray-3)] block mb-1">Total NFTs Tracked</span>
            <span className="font-display text-2xl font-bold text-[var(--gs-white)]">
              {siteStats?.nftsTracked != null ? nftsCountUp.displayValue : (
                <span className="skeleton-stat inline-block w-16 h-7" />
              )}
            </span>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 py-24 px-6 lg:px-10 border-t border-white/[0.06]" id="features">
        <div className="flex items-baseline gap-4 mb-10 observe">
          <span className="section-number">01</span>
          <h2 className="font-display font-bold text-3xl uppercase tracking-wide">Core Features</h2>
          <div className="section-line" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[1px] bg-white/[0.04] border border-white/[0.06] observe">
          {features.map((feature, index) => (
            <div
              key={index}
              className="feature-card relative p-10 bg-[var(--gs-dark-1)] hover:bg-[var(--gs-dark-2)] group overflow-hidden"
              style={{
                transitionDelay: `${index * 100}ms`,
              }}
            >
              <div className="icon-container w-10 h-10 border border-[var(--gs-gray-1)] flex items-center justify-center text-[var(--gs-gray-3)] mb-6 group-hover:text-[var(--gs-lime)] group-hover:border-[var(--gs-lime)] clip-corner-sm">
                <FeatureIcon name={feature.icon} />
              </div>
              <h3 className="font-display font-semibold text-base uppercase tracking-wide text-[var(--gs-white)] mb-2">{feature.title}</h3>
              <p className="font-body text-sm font-light leading-relaxed text-[var(--gs-gray-3)]">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="relative z-10 py-16 px-6 lg:px-10 border-t border-white/[0.06]">
        <div className="max-w-6xl mx-auto">
          <div ref={socialProofRef} className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center observe">
            <div className="group" style={{ transitionDelay: '0ms' }}>
              <div className="font-display text-4xl md:text-5xl font-bold text-[var(--gs-lime)] mb-2 transition-transform group-hover:scale-105">
                {socialProofVisible && siteStats?.walletsTracked != null ? walletsCountUp.displayValue : (siteStats?.walletsTracked ?? '—')}
              </div>
              <div className="font-mono text-[10px] tracking-wider uppercase text-[var(--gs-gray-3)]">
                Wallets Connected
              </div>
            </div>
            <div className="group" style={{ transitionDelay: '100ms' }}>
              <div className="font-display text-4xl md:text-5xl font-bold text-[var(--gs-purple-bright)] mb-2 transition-transform group-hover:scale-105">
                {socialProofVisible && siteStats?.nftsTracked != null ? socialNftsCountUp.displayValue : (siteStats?.nftsTracked ?? '—')}
              </div>
              <div className="font-mono text-[10px] tracking-wider uppercase text-[var(--gs-gray-3)]">
                NFTs Analyzed
              </div>
            </div>
            <div className="group" style={{ transitionDelay: '200ms' }}>
              <div className="font-display text-4xl md:text-5xl font-bold text-[var(--gs-white)] mb-2 transition-transform group-hover:scale-105">
                2
              </div>
              <div className="font-mono text-[10px] tracking-wider uppercase text-[var(--gs-gray-3)]">
                Chains Supported
              </div>
            </div>
            <div className="group" style={{ transitionDelay: '300ms' }}>
              <div className="font-display text-4xl md:text-5xl font-bold text-[var(--gs-profit)] mb-2 transition-transform group-hover:scale-105">
                24/7
              </div>
              <div className="font-mono text-[10px] tracking-wider uppercase text-[var(--gs-gray-3)]">
                Live Tracking
              </div>
            </div>
          </div>

          {/* Community quote */}
          <div className="mt-12 text-center observe" style={{ transitionDelay: '400ms' }}>
            <blockquote className="font-body text-lg italic text-[var(--gs-gray-4)] max-w-2xl mx-auto">
              "Waiting for someone cool from the OTG Discord to put a testimonial here."
            </blockquote>
            <cite className="block mt-4 font-mono text-[11px] tracking-wider uppercase text-[var(--gs-gray-3)]">
              — OTG Discord Cool Person
            </cite>
          </div>
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

      {/* Footer */}
      <Footer />
    </div>
  );
}
