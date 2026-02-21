'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import Logo from '@/components/Logo';
import Footer from '@/components/Footer';
import { useCountUp } from '@/hooks/useCountUp';
import { FeatureIcon } from '@/components/ui/FeatureIcon';
import { useTextScramble } from '@/hooks/useTextScramble';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import VersionBadge from '@/components/ui/VersionBadge';

// Shared animation easings
const revealEase = [0.16, 1, 0.3, 1] as const;

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
  const heroRef = useRef<HTMLElement>(null);
  const [gunPrice, setGunPrice] = useState<number | null>(null);
  const [siteStats, setSiteStats] = useState<SiteStats | null>(null);

  // Access gate state
  const [walletAddress, setWalletAddress] = useState('');
  const [walletChain, setWalletChain] = useState<'gunzchain' | 'solana' | null>(null);
  const [gateLoading, setGateLoading] = useState(false);
  const [gateError, setGateError] = useState<string | null>(null);

  // Wallet modal state
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [modalView, setModalView] = useState<'choose' | 'paste'>('choose');
  const [showWalletHelp, setShowWalletHelp] = useState(false);
  const { primaryWallet, user, setShowAuthFlow, handleLogOut } = useDynamicContext();
  // Track whether user was already authenticated on mount (don't auto-redirect on page load)
  const wasConnectedOnMount = useRef<boolean | null>(null);
  if (wasConnectedOnMount.current === null) {
    wasConnectedOnMount.current = !!primaryWallet || !!user;
  }

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

  const handleWalletSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = walletAddress.trim();
    if (!trimmed) return;
    const chain = detectChain(trimmed);
    if (!chain) return;

    setShowWalletHelp(false);
    setGateLoading(true);
    setGateError(null);

    try {
      const res = await fetch('/api/access/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: trimmed }),
      });
      const data = await res.json();

      if (data.success) {
        setShowWalletModal(false);
        router.push(`/portfolio?address=${encodeURIComponent(trimmed)}`);
      } else {
        setGateError('This address isn\u2019t on the early access list yet.');
      }
    } catch {
      setGateError('Failed to validate. Please try again.');
    } finally {
      setGateLoading(false);
    }
  };

  // Auto-redirect to portfolio when user authenticates (fresh connection only)
  // All paths are gated by the address whitelist — non-whitelisted wallets get disconnected.
  useEffect(() => {
    if (wasConnectedOnMount.current) return;

    if (primaryWallet?.address) {
      // Check whitelist before allowing access
      fetch('/api/access/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: primaryWallet.address }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            router.push(`/portfolio?address=${encodeURIComponent(primaryWallet.address)}`);
          } else {
            // Not whitelisted — disconnect and show error
            handleLogOut();
            setGateError('This wallet isn\u2019t on the early access list yet.');
          }
        })
        .catch(() => {
          // On network error, fail closed — disconnect
          handleLogOut();
          setGateError('Failed to validate access. Please try again.');
        });
    } else if (user) {
      // Email-only user with no wallet — redirect to portfolio browse mode
      router.push('/portfolio');
    }
  }, [primaryWallet?.address, user, router, handleLogOut]);

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
  }, [socialProofVisible, walletsCountUp, socialNftsCountUp]);

  // Deferred auth flow — opened after modal exit animation completes.
  // Uses both AnimatePresence.onExitComplete AND a useEffect fallback
  // because onExitComplete can silently fail if animation is interrupted.
  const pendingAuthFlowRef = useRef(false);
  const handleModalExitComplete = useCallback(() => {
    if (pendingAuthFlowRef.current) {
      pendingAuthFlowRef.current = false;
      setShowAuthFlow(true);
    }
  }, [setShowAuthFlow]);

  // Fallback: if AnimatePresence.onExitComplete doesn't fire (e.g. animation
  // interrupted), open auth flow after the exit animation duration (200ms).
  useEffect(() => {
    if (!showWalletModal && pendingAuthFlowRef.current) {
      const timer = setTimeout(() => {
        if (pendingAuthFlowRef.current) {
          pendingAuthFlowRef.current = false;
          setShowAuthFlow(true);
        }
      }, 250); // slightly longer than exit animation (200ms)
      return () => clearTimeout(timer);
    }
  }, [showWalletModal, setShowAuthFlow]);

  // Close modal helper
  const closeWalletModal = useCallback(() => {
    setShowWalletModal(false);
    setShowWalletHelp(false);
  }, []);

  // Wallet modal: Escape key handler
  useEffect(() => {
    if (!showWalletModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeWalletModal();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showWalletModal, closeWalletModal]);

  // Wallet modal: auto-focus paste input when entering paste view
  const pasteInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (showWalletModal && modalView === 'paste') {
      setTimeout(() => pasteInputRef.current?.focus(), 100);
    }
  }, [showWalletModal, modalView]);

  // Trigger animations when data loads (depend on data, not countUp objects)
  useEffect(() => {
    if (gunPrice !== null) gunPriceCountUp.startAnimation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gunPrice]);

  useEffect(() => {
    if (siteStats) {
      // Stagger the stats: 200ms, 400ms, 600ms after siteStats loads
      const t1 = setTimeout(() => portfolioValueCountUp.startAnimation(), 200);
      const t2 = setTimeout(() => pnlCountUp.startAnimation(), 400);
      const t3 = setTimeout(() => nftsCountUp.startAnimation(), 600);
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    Promise.all([fetchPrice(), fetchSiteStats()]);
  }, []);


  return (
    <div className="min-h-screen bg-[var(--gs-black)] text-[var(--gs-white)] overflow-x-hidden">
      {/* Background Effects */}
      <div className="grid-bg" />
      <div className="scanlines" />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-16 glass-effect border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 h-full flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <Logo size="md" variant="icon" />
            <span className="font-display font-bold text-lg tracking-wider uppercase">
              GUNZ<span className="text-[var(--gs-purple)]">scope</span>
            </span>
          </Link>
          <VersionBadge />
        </div>

        <div className="hidden md:flex items-center gap-6">
          {user && (
            <Link
              href="/portfolio"
              className="font-mono text-data tracking-wider uppercase text-[var(--gs-lime)] hover:text-[var(--gs-lime-hover)] transition-colors"
            >
              Go to Portfolio &rarr;
            </Link>
          )}
        </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section ref={heroRef} className="relative min-h-screen flex flex-col justify-center pt-32 pb-24 overflow-hidden">
        {/* Background glows */}
        <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[900px] h-[900px] bg-[radial-gradient(circle,rgba(166,247,0,0.06)_0%,transparent_60%)] pointer-events-none" />
        <div className="absolute bottom-[-100px] right-[-200px] w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(109,91,255,0.05)_0%,transparent_60%)] pointer-events-none" />

        {/* Crosshairs */}
        <div className="crosshair absolute top-[20%] right-[15%]" />
        <div className="crosshair absolute bottom-[25%] right-[30%]" />
        <div className="crosshair crosshair-purple absolute top-[35%] right-[8%]" />


        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 w-full">
        <div className="max-w-[900px]">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: revealEase }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 border border-[var(--gs-lime)]/30 bg-[var(--gs-lime)]/5 mb-10 clip-corner-sm"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--gs-lime)] animate-pulse-dot" />
            <span className="font-mono text-data tracking-wider uppercase text-[var(--gs-lime)]">
              Powered by GUNZ Protocol
            </span>
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: revealEase }}
            className="font-display font-bold text-5xl sm:text-6xl md:text-7xl lg:text-[88px] leading-[0.95] tracking-wide uppercase mb-6"
          >
            <span className="block text-[var(--gs-white)]">Your OTG</span>
            <span className="block text-[var(--gs-purple-bright)]">Arsenal</span>
            <span className="block text-[var(--gs-lime)] relative hero-underline min-w-[280px]">
              {heroScramble.displayText}
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: revealEase }}
            className="font-body text-lg font-light leading-relaxed text-[var(--gs-gray-4)] max-w-[560px] mb-10"
          >
            Track, analyze, and dominate your <strong className="text-[var(--gs-white)] font-medium">Off The Grid</strong> NFT portfolio.
            Real&#8209;time P&L, acquisition tracking, and weapon intelligence across{' '}
            <strong className="text-[var(--gs-white)] font-medium">GunzChain</strong> and{' '}
            <strong className="text-[var(--gs-white)] font-medium">Solana</strong>.
          </motion.p>

          {/* Connect Wallet CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: revealEase }}
          >
            <button
              type="button"
              onClick={() => { setShowWalletModal(true); setModalView('choose'); setGateError(null); }}
              className="group relative px-8 py-4 bg-[rgba(166,247,0,0.85)] backdrop-blur-md text-[var(--gs-black)] font-display font-bold text-base uppercase tracking-wider hover:bg-[rgba(166,247,0,0.95)] hover:shadow-[0_0_30px_rgba(166,247,0,0.3)] transition-all clip-corner cursor-pointer flex items-center gap-3"
            >
              {/* Hex icon */}
              <svg className="w-5 h-5 transition-transform group-hover:rotate-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M12 2L21.5 7.5V16.5L12 22L2.5 16.5V7.5L12 2Z" />
                <path d="M12 12L2.5 7.5M12 12L21.5 7.5" />
                <path d="M12 12V22" />
              </svg>
              Connect Wallet
              <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </button>
          </motion.div>
        </div>
        </div>

        {/* Hero Stats Bar */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-white/[0.06] glass-effect z-10">
          <div className="max-w-7xl mx-auto flex flex-wrap">
          <div className="flex-1 min-w-[50%] md:min-w-0 px-6 lg:px-10 py-6 border-r border-white/[0.06] last:border-r-0 bg-[var(--gs-lime)]/[0.03]">
            <span className="font-mono text-caption tracking-wider uppercase text-[var(--gs-lime)] block mb-1">GUN Price</span>
            <span className="font-display text-3xl font-bold text-[var(--gs-white)]">
              {gunPrice !== null ? (
                <>$<span className="text-[var(--gs-lime)]">{gunPriceCountUp.displayValue}</span></>
              ) : (
                <span className="skeleton-stat inline-block w-24 h-8" />
              )}
            </span>
          </div>
          <div className="flex-1 min-w-[50%] md:min-w-0 px-6 lg:px-10 py-6 border-r border-white/[0.06] last:border-r-0">
            <span className="font-mono text-caption tracking-wider uppercase text-[var(--gs-gray-3)] block mb-1">Total Tracked Value</span>
            <span className="font-display text-2xl font-bold text-[var(--gs-white)]">
              {siteStats?.portfolioValueUsd != null ? (
                `$${portfolioValueCountUp.displayValue}`
              ) : (
                <span className="skeleton-stat inline-block w-28 h-7" />
              )}
            </span>
          </div>
          <div className="flex-1 min-w-[50%] md:min-w-0 px-6 lg:px-10 py-6 border-r border-white/[0.06] last:border-r-0">
            <span className="font-mono text-caption tracking-wider uppercase text-[var(--gs-gray-3)] block mb-1">Total Tracked P&L</span>
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
            <span className="font-mono text-caption tracking-wider uppercase text-[var(--gs-gray-3)] block mb-1">Total NFTs Tracked</span>
            <span className="font-display text-2xl font-bold text-[var(--gs-white)]">
              {siteStats?.nftsTracked != null ? nftsCountUp.displayValue : (
                <span className="skeleton-stat inline-block w-16 h-7" />
              )}
            </span>
          </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 py-24 border-t border-white/[0.06]" id="features">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '0px 0px -50px 0px' }}
          transition={{ duration: 0.6, ease: revealEase }}
          className="flex items-baseline gap-4 mb-10"
        >
          <span className="section-number">01</span>
          <h2 className="font-display font-bold text-3xl uppercase tracking-wide">Core Features</h2>
          <div className="section-line" />
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[1px] bg-white/[0.04] border border-white/[0.06]">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '0px 0px -50px 0px' }}
              transition={{ duration: 0.5, delay: index * 0.1, ease: revealEase }}
              className="relative p-10 bg-[var(--gs-dark-1)] hover:bg-[var(--gs-dark-2)] group overflow-hidden"
            >
              <div className="w-10 h-10 border border-[var(--gs-gray-1)] flex items-center justify-center text-[var(--gs-gray-3)] mb-6 group-hover:text-[var(--gs-lime)] group-hover:border-[var(--gs-lime)] clip-corner-sm">
                <FeatureIcon name={feature.icon} />
              </div>
              <h3 className="font-display font-semibold text-base uppercase tracking-wide text-[var(--gs-white)] mb-2">{feature.title}</h3>
              <p className="font-body text-sm font-light leading-relaxed text-[var(--gs-gray-3)]">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="relative z-10 py-16 border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div ref={socialProofRef} className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: socialProofVisible && siteStats?.walletsTracked != null ? walletsCountUp.displayValue : (siteStats?.walletsTracked ?? '—'), label: 'Wallets Connected', color: 'text-[var(--gs-lime)]' },
              { value: socialProofVisible && siteStats?.nftsTracked != null ? socialNftsCountUp.displayValue : (siteStats?.nftsTracked ?? '—'), label: 'NFTs Analyzed', color: 'text-[var(--gs-purple-bright)]' },
              { value: '2', label: 'Chains Supported', color: 'text-[var(--gs-white)]' },
              { value: '24/7', label: 'Live Tracking', color: 'text-[var(--gs-profit)]' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '0px 0px -50px 0px' }}
                transition={{ duration: 0.6, delay: i * 0.1, ease: revealEase }}
                className="group"
              >
                <div className={`font-display text-4xl md:text-5xl font-bold ${stat.color} mb-2 transition-transform group-hover:scale-105`}>
                  {stat.value}
                </div>
                <div className="font-mono text-caption tracking-wider uppercase text-[var(--gs-gray-3)]">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Community quote */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '0px 0px -50px 0px' }}
            transition={{ duration: 0.6, delay: 0.4, ease: revealEase }}
            className="mt-12 text-center"
          >
            <blockquote className="font-body text-lg italic text-[var(--gs-gray-4)] max-w-2xl mx-auto">
              "Waiting for someone cool from the OTG Discord to put a testimonial here."
            </blockquote>
            <cite className="block mt-4 font-mono text-data tracking-wider uppercase text-[var(--gs-gray-3)]">
              — OTG Discord Cool Person
            </cite>
          </motion.div>
        </div>
      </section>

      {/* Dashboard Preview Section */}
      <section className="relative z-10 py-24 border-t border-white/[0.06]" id="preview">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '0px 0px -50px 0px' }}
          transition={{ duration: 0.6, ease: revealEase }}
          className="flex items-baseline gap-4 mb-10"
        >
          <span className="section-number">03</span>
          <h2 className="font-display font-bold text-3xl uppercase tracking-wide">Dashboard Preview</h2>
          <div className="section-line" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '0px 0px -50px 0px' }}
          transition={{ duration: 0.6, delay: 0.15, ease: revealEase }}
          className="relative bg-[var(--gs-dark-2)] border border-white/[0.06] rounded-lg overflow-hidden preview-frame"
        >
          {/* Browser toolbar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-black/30">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
            </div>
            <div className="font-mono text-data text-[var(--gs-gray-3)] px-4 py-1 bg-[var(--gs-dark-3)] rounded border border-white/[0.06]">
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
                <div className="font-mono text-label tracking-wider uppercase text-[var(--gs-gray-2)] mb-1">GUN Holdings</div>
                <div className="font-display text-lg font-bold text-[var(--gs-lime)]">12,450</div>
              </div>
              <div className="px-6 py-4 bg-[var(--gs-dark-1)]">
                <div className="font-mono text-label tracking-wider uppercase text-[var(--gs-gray-2)] mb-1">GUN Value</div>
                <div className="font-display text-lg font-bold text-[var(--gs-white)]">$1,054.50</div>
              </div>
              <div className="px-6 py-4 bg-[var(--gs-dark-1)]">
                <div className="font-mono text-label tracking-wider uppercase text-[var(--gs-gray-2)] mb-1">NFT Value</div>
                <div className="font-display text-lg font-bold text-[var(--gs-purple)]">$1,792.82</div>
              </div>
              <div className="px-6 py-4 bg-[var(--gs-dark-1)]">
                <div className="font-mono text-label tracking-wider uppercase text-[var(--gs-gray-2)] mb-1">Unrealized P&L</div>
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
                      className={`absolute top-1.5 left-1.5 font-mono text-micro tracking-wide uppercase px-1.5 py-0.5 rounded-sm ${
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
                  <div className="font-mono text-label uppercase tracking-wide text-[var(--gs-gray-3)] mb-3">{nft.type}</div>
                  <div className="flex justify-between items-baseline pt-3 border-t border-white/[0.06]">
                    <span className="font-mono text-data text-[var(--gs-white)]">{nft.price}</span>
                    <span className={`font-mono text-caption ${nft.locked ? 'text-[var(--gs-gray-3)]' : nft.profit ? 'text-[var(--gs-profit)]' : 'text-[var(--gs-loss)]'}`}>
                      {nft.pnl}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
        </div>
      </section>

      {/* Wallet Connect Modal */}
      <AnimatePresence onExitComplete={handleModalExitComplete}>
      {showWalletModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Connect wallet"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/85"
            onClick={closeWalletModal}
          />

          {/* Modal container — clip-corner on outer, glass on inner to avoid clip-path blocking backdrop-filter */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.3, ease: revealEase }}
            className="relative w-full max-w-[440px] clip-corner"
          >
            <div className="relative bg-[rgba(22,22,22,0.75)] backdrop-blur-xl border border-white/[0.06] overflow-hidden">
            {/* Top accent gradient */}
            <div className="h-[2px] bg-gradient-to-r from-[var(--gs-lime)] to-[var(--gs-purple)]" />

            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-0">
              <div className="flex items-center gap-3">
                {modalView === 'paste' && (
                  <button
                    type="button"
                    onClick={() => { setModalView('choose'); setGateError(null); setShowWalletHelp(false); }}
                    className="text-[var(--gs-gray-3)] hover:text-[var(--gs-white)] transition-colors cursor-pointer"
                    aria-label="Back to options"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                    </svg>
                  </button>
                )}
                <h2 className="font-display font-bold text-sm uppercase tracking-wider text-[var(--gs-white)]">
                  {modalView === 'choose' ? 'Connect Wallet' : 'Enter Address'}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeWalletModal}
                className="text-[var(--gs-gray-3)] hover:text-[var(--gs-white)] transition-colors cursor-pointer p-2"
                aria-label="Close"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="p-6">
              {modalView === 'choose' ? (
                /* ── Choice View ── */
                <div className="space-y-3">
                  {/* In-Game Player tile */}
                  <button
                    type="button"
                    onClick={() => setModalView('paste')}
                    className="w-full text-left p-5 bg-[rgba(28,28,28,0.5)] backdrop-blur-md border border-white/[0.06] hover:bg-[rgba(36,36,36,0.7)] hover:border-[var(--gs-lime)]/40 group cursor-pointer clip-corner-sm overflow-hidden transition-all duration-200"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 flex items-center justify-center border border-white/[0.08] bg-[rgba(36,36,36,0.6)] text-[var(--gs-gray-3)] group-hover:text-[var(--gs-lime)] group-hover:border-[var(--gs-lime)] clip-corner-sm shrink-0 transition-colors duration-200">
                        {/* Gamepad icon */}
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 01-.657.643 48.39 48.39 0 01-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 01-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 00-1.003-.349c-1.035 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 01-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 00.657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 01-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.401.604-.401.959v0c0 .333.277.599.61.58a48.1 48.1 0 005.427-.63 48.05 48.05 0 00.582-4.717.532.532 0 00-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.959.401v0a.656.656 0 00.658-.663 48.422 48.422 0 00-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 01-.61-.58v0z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-display font-semibold text-sm uppercase tracking-wide text-[var(--gs-white)] mb-1 group-hover:text-[var(--gs-lime)] transition-colors duration-200">
                          In&#8209;Game Wallet
                        </div>
                        <div className="font-mono text-caption text-[var(--gs-gray-3)] leading-relaxed">
                          Paste your wallet address from Off The Grid
                        </div>
                      </div>
                      <svg className="w-4 h-4 text-[var(--gs-gray-2)] group-hover:text-[var(--gs-lime)] transition-all duration-200 group-hover:translate-x-0.5 shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </div>
                  </button>

                  {/* External Wallet tile */}
                  <button
                    type="button"
                    onClick={() => { pendingAuthFlowRef.current = true; setShowWalletModal(false); }}
                    className="w-full text-left p-5 bg-[rgba(28,28,28,0.5)] backdrop-blur-md border border-white/[0.06] hover:bg-[rgba(36,36,36,0.7)] hover:border-[var(--gs-purple)]/40 group cursor-pointer clip-corner-sm overflow-hidden transition-all duration-200"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 flex items-center justify-center border border-white/[0.08] bg-[rgba(36,36,36,0.6)] text-[var(--gs-gray-3)] group-hover:text-[var(--gs-purple-bright)] group-hover:border-[var(--gs-purple)] clip-corner-sm shrink-0 transition-colors duration-200">
                        {/* Wallet icon */}
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 110-6h5.25A2.25 2.25 0 0121 6v6zm0 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18V6a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 6" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-display font-semibold text-sm uppercase tracking-wide text-[var(--gs-white)] mb-1 group-hover:text-[var(--gs-purple-bright)] transition-colors duration-200">
                          External Wallet
                        </div>
                        <div className="font-mono text-caption text-[var(--gs-gray-3)] leading-relaxed">
                          MetaMask, Rabby, WalletConnect & 300+ more
                        </div>
                      </div>
                      <svg className="w-4 h-4 text-[var(--gs-gray-2)] group-hover:text-[var(--gs-purple-bright)] transition-all duration-200 group-hover:translate-x-0.5 shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </div>
                  </button>
                </div>
              ) : (
                /* ── Paste Address View ── */
                <div>
                  <form onSubmit={handleWalletSubmit} className="flex gap-2">
                    <div className="flex-1 relative">
                      <input
                        ref={pasteInputRef}
                        type="text"
                        value={walletAddress}
                        onChange={(e) => { handleWalletAddressChange(e.target.value); setGateError(null); }}
                        placeholder="0x... or Solana address"
                        className={`w-full py-3.5 pl-4 bg-[var(--gs-black)] border border-white/[0.08] text-[var(--gs-white)] font-mono text-sm placeholder:text-[var(--gs-gray-2)] focus:outline-none focus:border-[var(--gs-lime)]/40 transition-colors clip-corner-sm ${walletChain ? 'pr-28' : 'pr-4'}`}
                        disabled={gateLoading}
                      />
                      {walletAddress.trim() && walletChain && (
                        <span className={`absolute right-3 top-1/2 -translate-y-1/2 font-mono text-caption uppercase tracking-wider px-2 py-0.5 rounded-sm ${
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
                      disabled={gateLoading || !walletAddress.trim() || !walletChain}
                      className="px-4 py-3.5 bg-[rgba(166,247,0,0.85)] backdrop-blur-md text-[var(--gs-black)] hover:bg-[rgba(166,247,0,0.95)] hover:shadow-[0_0_20px_rgba(166,247,0,0.3)] transition-all clip-corner disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {gateLoading ? (
                        <span className="inline-block w-5 h-5 border-2 border-[var(--gs-black)]/30 border-t-[var(--gs-black)] rounded-full animate-spin" />
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                        </svg>
                      )}
                    </button>
                  </form>

                  {/* Validation hint */}
                  {walletAddress.trim() && !walletChain && (
                    <p className="font-mono text-data text-[var(--gs-gray-4)] mt-2">
                      Enter a valid GunzChain (0x...) or Solana address
                    </p>
                  )}
                  {gateError && (
                    <p className="font-mono text-data text-[var(--gs-loss)] mt-2">{gateError}</p>
                  )}

                  {/* Helper text + expandable guide */}
                  <div className="mt-4">
                    <p className="font-mono text-caption text-[var(--gs-gray-2)] leading-relaxed">
                      Paste your wallet address from Off The Grid on PC or Console.{' '}
                      <button
                        type="button"
                        onClick={() => setShowWalletHelp(prev => !prev)}
                        className={`font-mono text-caption transition-colors cursor-pointer ${showWalletHelp ? 'text-[var(--gs-lime)]' : 'text-[var(--gs-purple-bright)] hover:text-[var(--gs-lime)]'}`}
                      >
                        How do I find my wallet address?
                      </button>
                    </p>

                    {/* Expandable help panel — mechanical accordion */}
                    <div
                      className="grid"
                      style={{
                        gridTemplateRows: showWalletHelp ? '1fr' : '0fr',
                        transition: 'grid-template-rows 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                      }}
                    >
                      <div
                        className="overflow-hidden"
                        style={{
                          opacity: showWalletHelp ? 1 : 0,
                          transition: showWalletHelp
                            ? 'opacity 0.3s 0.08s ease-out'
                            : 'opacity 0.15s ease-in',
                        }}
                      >
                        <div className="mt-3 p-3 bg-[var(--gs-black)] border border-white/[0.06] clip-corner-sm space-y-2.5">
                          <p className="font-mono text-caption uppercase tracking-wider text-[var(--gs-gray-3)]">How to find your address</p>
                          <ol className="font-body text-data leading-relaxed text-[var(--gs-gray-4)] list-decimal list-inside space-y-1">
                            <li>Stop admiring your drip in the <span className="text-[var(--gs-white)]">OTG Lobby</span></li>
                            <li>Click on your <span className="text-[var(--gs-lime)]">GUN balance</span></li>
                            <li>Click <span className="text-[var(--gs-white)]">Open Wallet</span></li>
                            <li>Copy your wallet address</li>
                          </ol>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src="/otg-wallet-guide.gif" alt="How to find wallet address in OTG" className="w-full rounded-sm border border-white/[0.06]" />
                          <p className="font-mono text-caption text-[var(--gs-gray-2)]">Solana players: use your Phantom or in&#8209;game Solana address.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Footer */}
      <Footer />
    </div>
  );
}
