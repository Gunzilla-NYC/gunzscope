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
import { useDynamicContext, useConnectWithOtp } from '@dynamic-labs/sdk-react-core';
import VersionBadge from '@/components/ui/VersionBadge';
import { WalletAddressInput } from '@/components/ui/WalletAddressInput';
import { detectChain } from '@/lib/utils/detectChain';
import { useKonamiCode } from '@/hooks/useKonamiCode';
import KonamiOverlay from '@/components/KonamiOverlay';
import { GlitchLink } from '@/components/navbar/GlitchLink';

// Shared animation easings
const revealEase = [0.16, 1, 0.3, 1] as const;

// Scrambled hint — glitches continuously, reveals in a 3-word window around cursor
const GLITCH_CHARS = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`0123456789ABCDEFabcdef';

function scrambleWord(word: string) {
  return word
    .split('')
    .map((ch) =>
      ch === ' ' ? ' ' : GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)]
    )
    .join('');
}

function ScrambledHint({ text }: { text: string }) {
  const words = text.split(' ');
  const [revealIndex, setRevealIndex] = useState(-1);
  const [holdRevealed, setHoldRevealed] = useState(false);
  const [scrambled, setScrambled] = useState<string[]>(() => words.map(() => ''));
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const REVEAL_RADIUS = 1; // reveal this many words on each side (total = 2*radius + 1 = 3)

  // Continuously re-scramble non-revealed words
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setScrambled(words.map(scrambleWord));
    }, 80);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [words.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Mobile: tap-and-hold to reveal all text
  const onTouchStart = useCallback(() => {
    holdTimerRef.current = setTimeout(() => setHoldRevealed(true), 400);
  }, []);
  const onTouchEnd = useCallback(() => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    setHoldRevealed(false);
  }, []);

  return (
    <>
      {/* Mobile: scrambled, tap-and-hold to reveal */}
      <span
        className="sm:hidden select-none"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
      >
        {holdRevealed
          ? <span className="text-white/40">{text}</span>
          : scrambled.map((s, i) => (
              <span key={i} className="text-white/20">
                {s}{i < words.length - 1 ? ' ' : ''}
              </span>
            ))
        }
      </span>
      {/* Desktop: scramble with hover reveal */}
      <span
        className="hidden sm:inline cursor-default"
        onMouseLeave={() => setRevealIndex(-1)}
      >
        {words.map((word, i) => {
          const revealed = revealIndex >= 0 && Math.abs(i - revealIndex) <= REVEAL_RADIUS;
          return (
            <span key={i}>
              <span
                onMouseEnter={() => setRevealIndex(i)}
                className={`transition-colors duration-200 ${
                  revealed ? 'text-white/50' : 'text-white/20'
                }`}
              >
                {revealed ? word : scrambled[i] ?? scrambleWord(word)}
              </span>
              {i < words.length - 1 ? ' ' : ''}
            </span>
          );
        })}
      </span>
    </>
  );
}

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
  const { triggered: konamiActive, reset: resetKonami } = useKonamiCode();
  const [gunPrice, setGunPrice] = useState<number | null>(null);
  const [siteStats, setSiteStats] = useState<SiteStats | null>(null);

  // Mobile menu state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
  const { connectWithEmail, verifyOneTimePassword, retryOneTimePassword } = useConnectWithOtp();
  // Track whether user had a WALLET connected on mount (don't auto-redirect on page load).
  // Email-only auth is tracked separately — email users need the validation flow to run.
  const wasConnectedOnMount = useRef<boolean | null>(null);
  if (wasConnectedOnMount.current === null) {
    wasConnectedOnMount.current = !!primaryWallet;
  }
  // Track whether email validation has been attempted (prevent duplicate calls)
  const emailValidatingRef = useRef(false);

  // Text scramble effect for hero text (LayerZero style)
  const heroScramble = useTextScramble({
    words: ['Intelligence', 'Lore', 'Legacy', 'Edge'],
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
      } else if (data.waitlisted) {
        setShowWalletModal(false);
        localStorage.setItem('gs_waitlist_address', trimmed);
        router.push(`/waitlist?address=${encodeURIComponent(trimmed)}`);
      } else {
        setGateError('Unable to validate access. Please try again.');
      }
    } catch {
      setGateError('Failed to validate. Please try again.');
    } finally {
      setGateLoading(false);
    }
  };

  // Returning waitlisted user detection — auto-redirect if still on waitlist
  useEffect(() => {
    if (primaryWallet || user) return; // Already authenticated, normal flow handles it
    const waitlistAddr = localStorage.getItem('gs_waitlist_address');
    if (!waitlistAddr) return;
    const isEmail = waitlistAddr.startsWith('email:');
    const param = isEmail
      ? `email=${encodeURIComponent(waitlistAddr.replace('email:', ''))}`
      : `address=${encodeURIComponent(waitlistAddr)}`;
    fetch(`/api/waitlist/status?${param}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.promoted) {
          localStorage.removeItem('gs_waitlist_address');
        } else if (data.position != null) {
          router.push(`/waitlist?${param}`);
        }
      })
      .catch(() => {}); // Fail silently — user can still interact normally
  }, [primaryWallet, user, router]);

  // Wallet validation — fresh wallet connection only (not on page load with existing wallet)
  useEffect(() => {
    if (wasConnectedOnMount.current || !primaryWallet?.address) return;

    // Check whitelist before allowing access
    fetch('/api/access/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: primaryWallet.address }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          // Store trial expiry for countdown display if applicable
          if (data.trial && data.expiresAt) {
            localStorage.setItem('gs_trial_expires', data.expiresAt);
          }
          router.push(`/portfolio?address=${encodeURIComponent(primaryWallet.address)}`);
        } else if (data.trialExpired) {
          // Trial expired — redirect to waitlist with trial-expired flag
          localStorage.setItem('gs_waitlist_address', primaryWallet.address);
          router.push(`/waitlist?address=${encodeURIComponent(primaryWallet.address)}&trialExpired=true`);
        } else if (data.waitlisted) {
          localStorage.setItem('gs_waitlist_address', primaryWallet.address);
          router.push(`/waitlist?address=${encodeURIComponent(primaryWallet.address)}`);
        } else {
          handleLogOut();
          setGateError('Unable to validate access. Please try again.');
        }
      })
      .catch(() => {
        handleLogOut();
        setGateError('Failed to validate access. Please try again.');
      });
  }, [primaryWallet?.address, user, router, handleLogOut]);

  // Email-only users always go to the waitlist/referral flow.
  // Email auth is for joining the waitlist, not for portfolio access.
  useEffect(() => {
    if (!user?.email || primaryWallet?.address || emailValidatingRef.current) return;
    emailValidatingRef.current = true;

    // Join waitlist via validate (auto-creates entry if needed), then redirect
    fetch('/api/access/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email }),
    })
      .then((res) => res.json())
      .then(() => {
        // Always send email users to waitlist — even if whitelisted, they need a wallet
        localStorage.setItem('gs_waitlist_address', `email:${user.email!}`);
        router.push(`/waitlist?email=${encodeURIComponent(user.email!)}`);
      })
      .catch(() => {
        emailValidatingRef.current = false; // Allow retry
      });
  }, [user?.email, primaryWallet?.address, router]);

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

  // Wallet modal: body scroll lock
  useEffect(() => {
    if (showWalletModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showWalletModal]);

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
      {/* Konami Code Easter Egg */}
      <KonamiOverlay
        active={konamiActive}
        onDismiss={resetKonami}
        onSubmit={async (id, type) => {
          if (type === 'address') {
            // Wallet: defer whitelisting to handle confirm step inside overlay
            return true;
          }
          // Email: whitelist immediately (no handle step)
          const r = await fetch('/api/access/konami', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: id }),
          });
          return r.ok;
        }}
        onProceed={() => {
          resetKonami();
          setShowAuthFlow(true);
        }}
        connectWithEmail={connectWithEmail}
        verifyOtp={verifyOneTimePassword}
        retryOtp={retryOneTimePassword}
      />
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

        <div className="hidden md:flex items-center gap-5">
          <GlitchLink href="/explore" label="Onchain Explorer" isActive={false} />
          {user && (
            <Link
              href="/portfolio"
              className="font-mono text-data tracking-wider uppercase text-[var(--gs-lime)] hover:text-[var(--gs-lime-hover)] transition-colors"
            >
              Go to Portfolio &rarr;
            </Link>
          )}
        </div>

        {/* Mobile hamburger button */}
        <button
          type="button"
          className="flex md:hidden flex-col gap-[5px] bg-transparent border-none p-2 cursor-pointer"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileMenuOpen}
        >
          <span className={`block w-[22px] h-[2px] bg-[var(--gs-lime)] transition-all duration-300 origin-center ${mobileMenuOpen ? 'translate-y-[7px] rotate-45' : ''}`} />
          <span className={`block w-[22px] h-[2px] bg-[var(--gs-lime)] transition-all duration-300 ${mobileMenuOpen ? 'opacity-0' : ''}`} />
          <span className={`block w-[22px] h-[2px] bg-[var(--gs-lime)] transition-all duration-300 origin-center ${mobileMenuOpen ? '-translate-y-[7px] -rotate-45' : ''}`} />
        </button>
        </div>

        {/* Mobile dropdown menu */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed top-16 left-0 right-0 z-50 flex flex-col items-start gap-5 px-4 py-6 bg-[rgba(10,10,10,0.97)] backdrop-blur-lg border-b border-white/[0.06]">
            <Link
              href="/explore"
              className="font-mono text-sm tracking-[1.5px] uppercase text-[var(--gs-gray-4)] hover:text-[var(--gs-lime)] transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Onchain Explorer
            </Link>
            {user && (
              <Link
                href="/portfolio"
                className="font-mono text-sm tracking-[1.5px] uppercase text-[var(--gs-lime)] hover:text-[var(--gs-lime-hover)] transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Go to Portfolio &rarr;
              </Link>
            )}
          </div>
        )}
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
            <span
              className="block text-[var(--gs-purple-bright)]"
              style={{ textShadow: '0 0 40px rgba(109, 91, 255, 0.3)' }}
            >
              Player
            </span>
            <span className="block text-[var(--gs-lime)] relative hero-underline min-w-[280px]">
              {heroScramble.displayText}
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: revealEase }}
            className="font-body text-lg font-light leading-relaxed text-[var(--gs-gray-4)] max-w-none mb-10"
          >
            The tactical intelligence layer for <strong className="text-[var(--gs-white)] font-medium">Off The Grid</strong>.
            <br />
            Start your legacy, analyze the market, dominate the meta.
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
              className="group relative px-8 py-3.5 bg-[rgba(166,247,0,0.85)] backdrop-blur-md text-[var(--gs-black)] hover:bg-[rgba(166,247,0,0.95)] hover:shadow-[0_0_30px_rgba(166,247,0,0.3)] transition-all clip-corner cursor-pointer flex items-center gap-3"
            >
              {/* Hex icon */}
              <svg className="w-5 h-5 transition-transform group-hover:rotate-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M12 2L21.5 7.5V16.5L12 22L2.5 16.5V7.5L12 2Z" />
                <path d="M12 12L2.5 7.5M12 12L21.5 7.5" />
                <path d="M12 12V22" />
              </svg>
              <div className="flex flex-col items-start">
                <span className="font-display font-bold text-base uppercase tracking-wider">Connect Wallet</span>
                <span className="font-mono text-[9px] uppercase tracking-widest opacity-70">Early access, whitelist only</span>
              </div>
              <svg className="hidden sm:block w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </button>
            <div className="mt-6 mb-8 max-w-[320px] font-mono text-[11px] leading-[1.6] italic">
              <ScrambledHint text="Don't have access? In 1986, a developer couldn't beat his own game — so he left a pattern in the code. 30 lives. The oldest backdoor in gaming still opens doors. Good luck zero." />
            </div>
          </motion.div>
        </div>
        </div>

        {/* Hero Stats Bar */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-white/[0.06] glass-effect z-10">
          <div className="max-w-7xl mx-auto flex flex-wrap">
          <div className="flex-1 min-w-[50%] md:min-w-0 px-6 lg:px-10 py-6 border-r border-white/[0.06] bg-[var(--gs-lime)]/[0.03]">
            <span className="font-mono text-caption tracking-wider uppercase text-[var(--gs-lime)] block mb-1">GUN Price</span>
            <span className="font-display text-3xl font-bold text-[var(--gs-white)]">
              {gunPrice !== null ? (
                <>$<span className="text-[var(--gs-lime)]">{gunPriceCountUp.displayValue}</span></>
              ) : (
                <span className="skeleton-stat inline-block w-24 h-8" />
              )}
            </span>
          </div>
          <div className="flex-1 min-w-[50%] md:min-w-0 px-6 lg:px-10 py-6 border-r border-white/[0.06]">
            <span className="font-mono text-caption tracking-wider uppercase text-[var(--gs-gray-3)] block mb-1">NFTs Tracked</span>
            <span className="font-display text-3xl font-bold text-[var(--gs-white)]">
              {siteStats?.nftsTracked != null ? nftsCountUp.displayValue : (
                <span className="skeleton-stat inline-block w-20 h-8" />
              )}
            </span>
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

        <div className="flex overflow-x-auto snap-x snap-mandatory gap-3 pb-4 scrollbar-hidden md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-[1px] md:bg-white/[0.04] md:border md:border-white/[0.06] md:overflow-visible md:snap-none md:pb-0">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '0px 0px -50px 0px' }}
              transition={{ duration: 0.5, delay: index * 0.1, ease: revealEase }}
              className="relative p-10 bg-[var(--gs-dark-1)] hover:bg-[var(--gs-dark-2)] group overflow-hidden snap-start flex-none w-[80vw] max-w-[320px] border border-white/[0.06] md:w-auto md:max-w-none md:flex-auto md:snap-align-none md:border-0"
            >
              <div className="w-10 h-10 border border-[var(--gs-gray-1)] flex items-center justify-center text-[var(--gs-gray-3)] mb-6 group-hover:text-[var(--gs-lime)] group-hover:border-[var(--gs-lime)] clip-corner-sm">
                <FeatureIcon name={feature.icon} />
              </div>
              <h3 className="font-display font-semibold text-base uppercase tracking-wide text-[var(--gs-white)] mb-2">{feature.title}</h3>
              <p className="font-body text-sm font-light leading-relaxed text-[var(--gs-gray-3)]">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
        <div className="md:hidden font-mono text-[10px] tracking-wider uppercase text-[var(--gs-gray-3)] text-center mt-2">&larr; swipe &rarr;</div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="relative z-10 py-16 border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div ref={socialProofRef} className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: socialProofVisible && siteStats?.walletsTracked != null ? walletsCountUp.displayValue : (siteStats?.walletsTracked ?? '—'), label: 'Wallets Connected', color: 'text-[var(--gs-lime)]' },
              { value: '50+', label: 'Collections Indexed', color: 'text-[var(--gs-purple-bright)]' },
              { value: '12', label: 'Data Points per NFT', color: 'text-[var(--gs-white)]' },
              { value: '3', label: 'Pricing Sources', color: 'text-[var(--gs-profit)]' },
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
            <div className="flex overflow-x-auto snap-x snap-mandatory gap-3 pb-4 scrollbar-hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:gap-4 sm:overflow-visible sm:snap-none sm:pb-0">
              {mockNFTs.map((nft, index) => (
                <div
                  key={index}
                  className="bg-[var(--gs-dark-3)] border border-white/[0.06] p-4 transition-all hover:border-[var(--gs-lime)]/30 hover:-translate-y-0.5 group snap-start flex-none w-[72vw] max-w-[260px] sm:w-auto sm:max-w-none sm:flex-auto sm:snap-align-none"
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
                  {modalView === 'choose' ? 'Get Started' : 'Enter Address'}
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
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-display font-semibold text-sm uppercase tracking-wide text-[var(--gs-white)] group-hover:text-[var(--gs-lime)] transition-colors duration-200">
                            In&#8209;Game Wallet
                          </span>
                          <span className="font-mono text-[9px] uppercase tracking-widest px-1.5 pt-[3px] pb-[2px] leading-none flex items-center text-[var(--gs-gray-4)] border border-white/[0.08] bg-white/[0.03]">
                            View Only
                          </span>
                        </div>
                        <div className="font-mono text-caption text-[var(--gs-gray-3)] leading-relaxed">
                          Paste your wallet address<br />from Off The Grid
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
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-display font-semibold text-sm uppercase tracking-wide text-[var(--gs-white)] group-hover:text-[var(--gs-purple-bright)] transition-colors duration-200">
                            Create Account
                          </span>
                          <span className="font-mono text-[9px] uppercase tracking-widest px-1.5 pt-[3px] pb-[2px] leading-none flex items-center text-[var(--gs-purple-bright)] border border-[var(--gs-purple)]/30 bg-[var(--gs-purple)]/[0.08]">
                            Full Access
                          </span>
                        </div>
                        <div className="font-mono text-caption text-[var(--gs-gray-3)] leading-relaxed">
                          Email, MetaMask, Phantom
                        </div>
                        <div className="font-mono text-caption text-[var(--gs-gray-2)] leading-relaxed mt-0.5">
                          Track and own multiple in&#8209;game wallets, player legacy, and more.
                        </div>
                      </div>
                      <svg className="w-4 h-4 text-[var(--gs-gray-2)] group-hover:text-[var(--gs-purple-bright)] transition-all duration-200 group-hover:translate-x-0.5 shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </div>
                  </button>

                  {/* Divider */}
                  <div className="flex items-center gap-3 py-1">
                    <div className="flex-1 h-px bg-white/[0.06]" />
                    <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--gs-gray-2)]">or</span>
                    <div className="flex-1 h-px bg-white/[0.06]" />
                  </div>

                  {/* Join Waitlist tile */}
                  <button
                    type="button"
                    onClick={() => { closeWalletModal(); router.push('/waitlist'); }}
                    className="w-full text-left p-5 bg-[rgba(28,28,28,0.5)] backdrop-blur-md border border-white/[0.06] hover:bg-[rgba(36,36,36,0.7)] hover:border-[var(--gs-lime)]/40 group cursor-pointer clip-corner-sm overflow-hidden transition-all duration-200"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 flex items-center justify-center border border-white/[0.08] bg-[rgba(36,36,36,0.6)] text-[var(--gs-gray-3)] group-hover:text-[var(--gs-lime)] group-hover:border-[var(--gs-lime)] clip-corner-sm shrink-0 transition-colors duration-200">
                        {/* Konami wave icon */}
                        <svg className="w-5 h-5" viewBox="0 0 907 762" fill="none" stroke="currentColor" strokeWidth={60}>
                          <path d="M723.63 1L685.584 107C653.538 189.83 609.28 222.86 562.29 238.64C514.49 250.14 466.78 256.74 421.51 266.56C391.38 275.94 367.86 296.5 348.75 323.05C329.64 349.6 314.89 382.18 302.31 415.72L271.78 510.81H1.42L45.22 389.1C60.45 350.56 79.9 324.14 101.82 305.53C148.17 276.08 224.61 257.73 320.26 233.42C376.03 206.81 406.51 151.85 421.82 94.76L454.15 1H723.63Z" />
                          <path d="M906.04 250.72L862.22 370.27C842.23 411.88 820.41 439.7 797.64 458.67C751.08 487.82 678.99 502.64 587.53 523.62C539.32 558.97 489.55 644.71 481.89 673.29L451.59 760.53H182.11L220.16 654.48C252.21 571.7 295.86 538.68 342.1 522.49C389.11 510.47 459.15 499.24 480.67 491.57C533.49 466.15 587.09 389.37 603.43 345.81L633.96 250.72H906.04Z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-display font-semibold text-sm uppercase tracking-wide text-[var(--gs-white)] mb-1 group-hover:text-[var(--gs-lime)] transition-colors duration-200">
                          Join Waitlist
                        </div>
                        <div className="font-mono text-caption text-[var(--gs-gray-3)] leading-relaxed">
                          Refer 3 friends to skip the line & get instant access
                        </div>
                      </div>
                      <svg className="w-4 h-4 text-[var(--gs-gray-2)] group-hover:text-[var(--gs-lime)] transition-all duration-200 group-hover:translate-x-0.5 shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </div>
                  </button>
                </div>
              ) : (
                /* ── Paste Address View ── */
                <div>
                  <form onSubmit={handleWalletSubmit} className="flex gap-2">
                    <div className="flex-1">
                      <WalletAddressInput
                        inputRef={pasteInputRef}
                        value={walletAddress}
                        onChange={(v) => { handleWalletAddressChange(v); setGateError(null); }}
                        disabled={gateLoading}
                        className="py-3.5 pl-4 text-sm bg-[var(--gs-black)] placeholder:text-[var(--gs-gray-2)] clip-corner-sm"
                        badgeRight="right-3"
                        badgePadding="pr-28"
                        showHint={false}
                      />
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
