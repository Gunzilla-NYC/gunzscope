'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { motion, AnimatePresence } from 'motion/react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useWaitlist } from '@/lib/hooks/useWaitlist';

// =============================================================================
// Waitlist Client Page
//
// Shown to non-whitelisted users. Displays queue position, referral progress,
// and a shareable referral link. Auto-redirects on promotion.
// =============================================================================

export default function WaitlistClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { primaryWallet, sdkHasLoaded } = useDynamicContext();
  // Prefer Dynamic wallet address, fall back to query param (paste-address flow)
  const walletAddress = primaryWallet?.address || searchParams.get('address') || undefined;
  const { isLoading, isPromoted, data, error, refresh } = useWaitlist(walletAddress);

  // Referral tracking: fire wallet_connected for referred visitors
  const referralTrackedRef = useRef(false);
  useEffect(() => {
    if (!walletAddress || referralTrackedRef.current) return;
    const slug = localStorage.getItem('gs_ref');
    const sessionId = localStorage.getItem('gs_ref_session');
    if (!slug || !sessionId) return;

    referralTrackedRef.current = true;
    fetch('/api/referral/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, event: 'wallet_connected', walletAddress, sessionId }),
    })
      .then(() => {
        localStorage.removeItem('gs_ref');
        localStorage.removeItem('gs_ref_session');
      })
      .catch(() => {});
  }, [walletAddress]);

  // Promotion celebration state
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    if (isPromoted) {
      setShowCelebration(true);
      const timer = setTimeout(() => {
        router.push(
          walletAddress
            ? `/portfolio?address=${encodeURIComponent(walletAddress)}`
            : '/portfolio'
        );
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [isPromoted, router, walletAddress]);

  // No wallet and no query param → redirect to home
  useEffect(() => {
    if (sdkHasLoaded && !walletAddress) {
      router.replace('/');
    }
  }, [sdkHasLoaded, walletAddress, router]);

  // Copy state
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    if (!data?.referralLink) return;
    navigator.clipboard.writeText(data.referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [data?.referralLink]);

  const handleShareX = useCallback(() => {
    if (!data?.referralLink) return;
    const text = encodeURIComponent(
      `I\u2019m on the GUNZscope waitlist \u2014 the portfolio tracker for Off The Grid. Join through my link and we both get closer to access:\n\n${data.referralLink}`
    );
    window.open(`https://x.com/intent/tweet?text=${text}`, '_blank');
  }, [data?.referralLink]);

  // Loading state
  if (!sdkHasLoaded || (isLoading && !data)) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[var(--gs-black)]">
        <div className="w-5 h-5 border-2 border-[var(--gs-lime)]/30 border-t-[var(--gs-lime)] rounded-full animate-spin" />
      </div>
    );
  }

  const referralCount = data?.referralCount ?? 0;
  const threshold = data?.promotionThreshold ?? 3;
  const remaining = Math.max(0, threshold - referralCount);

  return (
    <div className="min-h-dvh bg-[var(--gs-black)] text-[var(--gs-white)]">
      <Navbar />

      {/* ── Celebration Overlay ────────────────────────────────────────── */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--gs-black)]"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="text-center"
            >
              <div className="w-16 h-16 mx-auto mb-6 border-2 border-[var(--gs-lime)] flex items-center justify-center clip-corner-sm">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--gs-lime)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h1 className="font-display font-bold text-3xl sm:text-4xl uppercase text-[var(--gs-lime)] mb-3">
                Access Granted
              </h1>
              <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--gs-gray-3)]">
                Redirecting to your portfolio...
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main Content ──────────────────────────────────────────────── */}
      <main className="max-w-lg mx-auto px-4 sm:px-6 py-16 sm:py-24">

        {/* Position Badge */}
        <div className="text-center mb-8">
          <p className="font-mono text-[9px] uppercase tracking-widest text-[var(--gs-gray-3)] mb-3">
            Your Position
          </p>
          <div className="inline-flex items-center gap-2 bg-[var(--gs-dark-2)] border border-white/[0.06] px-5 py-3 clip-corner-sm">
            <span className="font-display font-bold text-2xl text-[var(--gs-lime)]">
              #{data?.position ?? '\u2014'}
            </span>
            <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--gs-gray-3)]">
              in queue
            </span>
          </div>
        </div>

        {/* Title */}
        <h1 className="font-display font-bold text-xl sm:text-2xl uppercase text-center mb-2">
          You&rsquo;re on the Waitlist
        </h1>
        <p className="font-body text-sm text-[var(--gs-gray-4)] text-center leading-relaxed mb-10">
          Refer {threshold} friends to unlock instant access.
          {remaining > 0 && (
            <> Just <span className="text-[var(--gs-lime)] font-semibold">{remaining} more</span> to go.</>
          )}
        </p>

        {/* ── Progress Bar ──────────────────────────────────────────── */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--gs-gray-3)]">
              Referral Progress
            </span>
            <span className="font-mono text-[11px] font-semibold text-[var(--gs-white)]">
              {referralCount}/{threshold}
            </span>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: threshold }).map((_, i) => (
              <div
                key={i}
                className={`h-2 flex-1 transition-colors duration-300 ${
                  i < referralCount
                    ? 'bg-[var(--gs-lime)]'
                    : 'bg-[var(--gs-dark-3)] border border-white/[0.06]'
                }`}
                style={{ clipPath: 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)' }}
              />
            ))}
          </div>
        </div>

        {/* ── Referral Link Card ────────────────────────────────────── */}
        <div className="bg-[var(--gs-dark-2)] border border-white/[0.06] p-4 sm:p-5 mb-4">
          <p className="font-mono text-[9px] uppercase tracking-widest text-[var(--gs-gray-3)] mb-3">
            Your Referral Link
          </p>

          {data?.referralLink ? (
            <>
              <div className="flex gap-2 mb-4">
                <div className="flex-1 bg-[var(--gs-dark-3)] border border-white/[0.06] px-3 py-2.5 font-mono text-xs text-[var(--gs-gray-4)] truncate">
                  {data.referralLink}
                </div>
                <button
                  onClick={handleCopy}
                  className="min-w-[80px] min-h-8 font-display font-semibold text-[10px] uppercase tracking-wider px-4 py-2.5 bg-[var(--gs-lime)] text-[var(--gs-black)] hover:bg-[var(--gs-lime-hover)] transition-colors clip-corner-sm cursor-pointer"
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>

              {/* Share buttons */}
              <div className="flex gap-2">
                <button
                  onClick={handleShareX}
                  className="flex-1 min-h-8 flex items-center justify-center gap-2 font-mono text-[10px] uppercase tracking-widest border border-white/[0.06] py-2.5 text-[var(--gs-gray-4)] hover:text-[var(--gs-white)] hover:border-white/[0.12] transition-colors cursor-pointer"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  Share on X
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <p className="font-body text-sm text-[var(--gs-gray-4)]">Generating your link...</p>
            </div>
          )}
        </div>

        {/* ── Error state ───────────────────────────────────────────── */}
        {error && (
          <div className="bg-[var(--gs-loss)]/10 border border-[var(--gs-loss)]/20 px-4 py-3 mb-4">
            <p className="font-mono text-[10px] text-[var(--gs-loss)]">{error}</p>
            <button
              onClick={refresh}
              className="font-mono text-[10px] uppercase tracking-widest text-[var(--gs-gray-3)] hover:text-[var(--gs-white)] mt-1 cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* ── How It Works ──────────────────────────────────────────── */}
        <div className="mt-10 pt-8 border-t border-white/[0.06]">
          <p className="font-mono text-[9px] uppercase tracking-widest text-[var(--gs-gray-3)] mb-5 text-center">
            How It Works
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { step: '01', title: 'Share Your Link', desc: 'Send your unique referral link to friends who play Off\u00A0The\u00A0Grid.' },
              { step: '02', title: 'They Connect', desc: 'When they visit and connect their wallet, it counts as a referral.' },
              { step: '03', title: 'Unlock Access', desc: `${threshold} successful referrals = instant access to GUNZscope.` },
            ].map((item) => (
              <div key={item.step} className="bg-[var(--gs-dark-2)] border border-white/[0.06] p-4">
                <span className="font-display font-bold text-lg text-[var(--gs-lime)]">{item.step}</span>
                <h3 className="font-display font-semibold text-sm uppercase mt-2 mb-1">{item.title}</h3>
                <p className="font-body text-xs text-[var(--gs-gray-4)] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
