'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';

interface ReferralRedirectProps {
  slug: string | null;
}

export default function ReferralRedirect({ slug }: ReferralRedirectProps) {
  const router = useRouter();
  const { primaryWallet, user, setShowAuthFlow, sdkHasLoaded } = useDynamicContext();
  const trackedRef = useRef(false);

  // Prevent hydration mismatch: server always renders spinner, client defers
  // until mounted so Dynamic SDK state doesn't conflict with SSR output.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Email validation state
  const [emailValidating, setEmailValidating] = useState(false);
  const [emailBanned, setEmailBanned] = useState(false);
  const emailValidatedRef = useRef(false);

  // ── Track click + store referral data (once) ──────────────────────────────
  useEffect(() => {
    if (trackedRef.current || !slug) return;
    trackedRef.current = true;

    localStorage.setItem('gs_ref', slug);
    const sessionId = crypto.randomUUID();
    localStorage.setItem('gs_ref_session', sessionId);

    // Backup cookie (7d expiry) in case localStorage is cleared
    document.cookie = `gs_ref=${slug}; max-age=${7 * 24 * 60 * 60}; path=/; SameSite=Lax`;

    // Fire click tracking (fire-and-forget)
    fetch('/api/referral/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, event: 'clicked', sessionId }),
    }).catch(() => {});
  }, [slug]);

  // ── Redirect once wallet is connected ─────────────────────────────────────
  useEffect(() => {
    if (primaryWallet?.address) {
      router.replace('/waitlist');
    }
  }, [primaryWallet, router]);

  // ── Email-only auth: always send to waitlist ──────────────────────────────
  useEffect(() => {
    if (!user?.email || primaryWallet?.address || emailValidatedRef.current) return;
    emailValidatedRef.current = true;
    setEmailValidating(true);

    // Join waitlist via validate (auto-creates entry if needed), then redirect
    fetch('/api/access/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email }),
    })
      .then(async (res) => {
        const json = await res.json();
        if (json.banned) {
          setEmailBanned(true);
          return;
        }
        localStorage.setItem('gs_waitlist_address', `email:${user.email!}`);
        router.push(`/waitlist?email=${encodeURIComponent(user.email!)}`);
      })
      .catch(() => {
        emailValidatedRef.current = false; // Allow retry
      })
      .finally(() => setEmailValidating(false));
  }, [user?.email, primaryWallet?.address, router]);

  const handleConnect = useCallback(() => {
    setShowAuthFlow(true);
  }, [setShowAuthFlow]);

  // Already authenticated with wallet → redirect (show spinner)
  if (primaryWallet?.address) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[var(--gs-black)]">
        <div className="w-5 h-5 border-2 border-[var(--gs-lime)]/30 border-t-[var(--gs-lime)] rounded-full animate-spin" />
      </div>
    );
  }

  // Not yet mounted or SDK still loading → spinner
  // (server always hits this path, preventing hydration mismatch)
  if (!mounted || !sdkHasLoaded) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[var(--gs-black)]">
        <div className="w-5 h-5 border-2 border-[var(--gs-lime)]/30 border-t-[var(--gs-lime)] rounded-full animate-spin" />
      </div>
    );
  }

  // Email banned → show revoked message
  if (emailBanned) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[var(--gs-black)]">
        <div className="max-w-sm text-center px-6">
          <div className="w-16 h-16 mx-auto mb-6 border-2 border-[var(--gs-loss)] flex items-center justify-center clip-corner-sm">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--gs-loss)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
            </svg>
          </div>
          <h1 className="font-display font-bold text-2xl uppercase text-[var(--gs-loss)] mb-3">
            Access Revoked
          </h1>
          <p className="font-body text-sm text-[var(--gs-gray-4)] leading-relaxed">
            Your access has been revoked. If you believe this is an error, please contact support.
          </p>
        </div>
      </div>
    );
  }

  // Email validating → spinner
  if (emailValidating) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[var(--gs-black)]">
        <div className="w-5 h-5 border-2 border-[var(--gs-lime)]/30 border-t-[var(--gs-lime)] rounded-full animate-spin" />
      </div>
    );
  }

  // ── Landing page for anonymous visitors ───────────────────────────────────
  return (
    <div className="min-h-dvh flex flex-col bg-[var(--gs-black)]">
      {/* Accent line */}
      <div className="h-[2px] gradient-accent-line" />

      <main className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          {/* Logo */}
          <p className="font-display text-[var(--gs-lime)] text-2xl sm:text-3xl uppercase tracking-wider font-bold mb-2">
            GUNZscope
          </p>
          <p className="font-mono text-[9px] uppercase tracking-widest text-[var(--gs-gray-3)] mb-8">
            Portfolio Intelligence for Off The Grid
          </p>

          {/* Value prop */}
          <h1 className="font-display font-bold text-xl sm:text-2xl uppercase text-[var(--gs-white)] mb-4 leading-tight">
            Track Your NFT Arsenal
          </h1>
          <p className="font-body text-sm text-[var(--gs-gray-4)] mb-8 leading-relaxed">
            Connect your wallet to see your full Off&nbsp;The&nbsp;Grid portfolio &mdash;
            real&#8209;time valuations, P&amp;L tracking, and market intelligence.
          </p>

          {/* Feature highlights */}
          <div className="grid grid-cols-3 gap-3 mb-10">
            <div className="bg-[var(--gs-dark-2)] border border-white/[0.06] p-3">
              <div className="font-display font-bold text-lg text-[var(--gs-lime)]">P&amp;L</div>
              <div className="font-mono text-[8px] uppercase tracking-widest text-[var(--gs-gray-3)] mt-1">
                Profit &amp; Loss
              </div>
            </div>
            <div className="bg-[var(--gs-dark-2)] border border-white/[0.06] p-3">
              <div className="font-display font-bold text-lg text-[var(--gs-purple)]">NFTs</div>
              <div className="font-mono text-[8px] uppercase tracking-widest text-[var(--gs-gray-3)] mt-1">
                Full Inventory
              </div>
            </div>
            <div className="bg-[var(--gs-dark-2)] border border-white/[0.06] p-3">
              <div className="font-display font-bold text-lg text-[var(--gs-white)]">GUN</div>
              <div className="font-mono text-[8px] uppercase tracking-widest text-[var(--gs-gray-3)] mt-1">
                Token Balance
              </div>
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={handleConnect}
            className="w-full font-display font-semibold text-sm uppercase tracking-wider px-6 py-3 bg-[var(--gs-lime)] text-[var(--gs-black)] hover:bg-[var(--gs-lime-hover)] transition-colors clip-corner-sm cursor-pointer mb-4"
          >
            Connect Wallet
          </button>

          {/* Secondary */}
          <button
            onClick={() => router.push('/waitlist')}
            className="font-mono text-[10px] uppercase tracking-widest text-[var(--gs-gray-3)] hover:text-[var(--gs-white)] transition-colors cursor-pointer"
          >
            Continue without connecting &rarr;
          </button>
        </div>
      </main>

      {/* Footer accent */}
      <div className="h-px bg-gradient-to-r from-transparent via-[var(--gs-purple)]/20 to-transparent" />
    </div>
  );
}
