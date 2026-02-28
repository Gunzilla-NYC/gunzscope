'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { motion, AnimatePresence } from 'motion/react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useWaitlist } from '@/lib/hooks/useWaitlist';
import { detectChain } from '@/lib/utils/detectChain';

// =============================================================================
// Waitlist Client Page
//
// Shown to non-whitelisted users (wallet OR email). Displays queue position,
// referral progress, and a shareable referral link. Auto-redirects on promotion.
// Email users are prompted to connect a wallet after promotion.
//
// Users arriving without authentication (e.g. from "Join Waitlist" button)
// see a join form where they can enter a wallet address or email.
// =============================================================================

function isEmailInput(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function WaitlistClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { primaryWallet, user, sdkHasLoaded, setShowAuthFlow } = useDynamicContext();

  // Manual join state — for users arriving without an authenticated session
  // Restore from localStorage so returning users see their position automatically
  const [manualIdentifier, setManualIdentifier] = useState<string | undefined>(() => {
    if (typeof window === 'undefined') return undefined;
    try {
      const saved = localStorage.getItem('gs_waitlist_id');
      if (saved) {
        const parsed = JSON.parse(saved) as { id: string; isEmail: boolean };
        return parsed.id;
      }
    } catch { /* corrupted data — ignore */ }
    return undefined;
  });
  const [manualIsEmail, setManualIsEmail] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      const saved = localStorage.getItem('gs_waitlist_id');
      if (saved) {
        const parsed = JSON.parse(saved) as { id: string; isEmail: boolean };
        return parsed.isEmail;
      }
    } catch { /* corrupted data — ignore */ }
    return false;
  });
  const [joinInput, setJoinInput] = useState('');
  const [joinSubmitting, setJoinSubmitting] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  // Handle (gamer tag) state
  const [handle, setHandle] = useState('');
  const [handleChecking, setHandleChecking] = useState(false);
  const [handleAvailable, setHandleAvailable] = useState<boolean | null>(null);
  const [handleError, setHandleError] = useState<string | null>(null);
  const handleDebounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Resolve identifier: wallet address OR email OR manually joined
  const walletAddress = primaryWallet?.address || searchParams.get('address') || undefined;
  const emailAddress = user?.email || searchParams.get('email') || undefined;
  const isEmailOnly = (!walletAddress && !!emailAddress) || (!walletAddress && manualIsEmail);

  // The identifier used for waitlist lookup — wallet takes priority, then email, then manual
  const identifier = walletAddress || emailAddress || manualIdentifier || undefined;

  const { isLoading, isPromoted, isBanned: hookBanned, data, error, refresh } = useWaitlist(
    identifier,
    isEmailOnly ? 'email' : 'wallet'
  );

  // Trial expired state — from URL param or waitlist status API
  const trialExpired = searchParams.get('trialExpired') === 'true';

  // Banned state — can come from hook (polling) or join response
  const [joinBanned, setJoinBanned] = useState(false);
  const isBanned = hookBanned || joinBanned;

  // Referral tracking: fire wallet_connected for referred visitors
  const referralTrackedRef = useRef(false);
  useEffect(() => {
    if (!identifier || referralTrackedRef.current) return;
    const slug = localStorage.getItem('gs_ref');
    const sessionId = localStorage.getItem('gs_ref_session');
    if (!slug || !sessionId) return;

    // Build the DB-format identifier: wallet address as-is, email with "email:" prefix
    const trackAddress = walletAddress
      || (emailAddress ? `email:${emailAddress.toLowerCase()}` : null)
      || (manualIsEmail ? `email:${identifier.toLowerCase()}` : identifier);
    if (!trackAddress) return;

    referralTrackedRef.current = true;
    fetch('/api/referral/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug,
        event: 'wallet_connected',
        walletAddress: trackAddress,
        sessionId,
      }),
    })
      .then(() => {
        localStorage.removeItem('gs_ref');
        localStorage.removeItem('gs_ref_session');
      })
      .catch(() => {});
  }, [identifier, walletAddress, emailAddress, manualIsEmail]);

  // Promotion celebration state
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    if (isPromoted) {
      setShowCelebration(true);
      localStorage.removeItem('gs_waitlist_address');
      localStorage.removeItem('gs_waitlist_id');

      // Email-only users: stay on celebration, they need to connect a wallet
      if (isEmailOnly) return;

      const timer = setTimeout(() => {
        router.push(
          walletAddress
            ? `/portfolio?address=${encodeURIComponent(walletAddress)}`
            : '/portfolio'
        );
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [isPromoted, router, walletAddress, isEmailOnly]);

  // Reconciliation: when a promoted email user connects a wallet, whitelist it and redirect
  const reconcileRef = useRef(false);
  useEffect(() => {
    if (!isPromoted || !emailAddress || !primaryWallet?.address || reconcileRef.current) return;
    reconcileRef.current = true;

    fetch('/api/access/reconcile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailAddress, walletAddress: primaryWallet.address }),
    })
      .then(() => {
        router.push(`/portfolio?address=${encodeURIComponent(primaryWallet.address)}`);
      })
      .catch(() => {
        // Still redirect — worst case wallet isn't whitelisted yet
        router.push(`/portfolio?address=${encodeURIComponent(primaryWallet.address)}`);
      });
  }, [isPromoted, emailAddress, primaryWallet?.address, router]);

  // Handle input change with debounced availability check
  const handleHandleChange = useCallback((value: string) => {
    const sanitized = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setHandle(sanitized);
    setHandleError(null);
    setHandleAvailable(null);

    if (handleDebounceRef.current) clearTimeout(handleDebounceRef.current);

    if (!sanitized || sanitized.length < 3) {
      setHandleChecking(false);
      return;
    }

    setHandleChecking(true);
    handleDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/referral/check-slug?slug=${encodeURIComponent(sanitized)}`);
        const json = await res.json();
        if (json.success) {
          setHandleAvailable(json.available);
          if (!json.available) {
            setHandleError(
              json.reason === 'reserved' ? 'This handle is reserved'
              : json.reason === 'invalid' ? 'Invalid format (3\u201120 chars, letters, numbers, hyphens)'
              : 'This handle is taken'
            );
          }
        }
      } catch {
        // Silently fail — non-critical
      } finally {
        setHandleChecking(false);
      }
    }, 400);
  }, []);

  // Join waitlist handler — validates input, calls /api/access/validate
  const handleJoin = useCallback(async () => {
    const trimmed = joinInput.trim();
    if (!trimmed) return;

    const email = isEmailInput(trimmed);
    const chain = detectChain(trimmed);

    if (!email && !chain) {
      setJoinError('Enter a valid wallet address or email');
      return;
    }

    // If handle is entered but not available, block submit
    if (handle && handleAvailable === false) {
      setJoinError('Please choose an available handle');
      return;
    }

    setJoinSubmitting(true);
    setJoinError(null);

    try {
      const body: Record<string, string> = email
        ? { email: trimmed.toLowerCase() }
        : { address: trimmed };

      if (handle && handle.length >= 3) {
        body.handle = handle;
      }

      const res = await fetch('/api/access/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();

      if (json.banned) {
        setJoinBanned(true);
        return;
      }

      if (json.success) {
        // Already whitelisted — redirect to portfolio
        router.push(
          email
            ? '/portfolio'
            : `/portfolio?address=${encodeURIComponent(trimmed)}`
        );
        return;
      }

      // Waitlisted — set manual identifier to activate the existing UI
      const id = email ? trimmed.toLowerCase() : trimmed;
      setManualIdentifier(id);
      setManualIsEmail(email);

      // Persist so returning users auto-load their position
      try {
        localStorage.setItem('gs_waitlist_id', JSON.stringify({ id, isEmail: email }));
      } catch { /* storage full — non-critical */ }
    } catch {
      setJoinError('Something went wrong. Please try again.');
    } finally {
      setJoinSubmitting(false);
    }
  }, [joinInput, handle, handleAvailable, router]);

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

  // Banned state — hard block, no re-enrollment
  if (isBanned) {
    return (
      <div className="min-h-dvh bg-[var(--gs-black)] text-[var(--gs-white)]">
        <Navbar />
        <main className="max-w-lg mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-6 border-2 border-[var(--gs-loss)] flex items-center justify-center clip-corner-sm">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--gs-loss)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
              </svg>
            </div>
            <h1 className="font-display font-bold text-2xl sm:text-3xl uppercase text-[var(--gs-loss)] mb-3">
              Access Revoked
            </h1>
            <p className="font-body text-sm text-[var(--gs-gray-4)] leading-relaxed">
              Your access has been revoked. If you believe this is an error, please contact support.
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Loading state — only show spinner if we have an identifier to look up
  if (!sdkHasLoaded || (identifier && isLoading && !data)) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[var(--gs-black)]">
        <div className="w-5 h-5 border-2 border-[var(--gs-lime)]/30 border-t-[var(--gs-lime)] rounded-full animate-spin" />
      </div>
    );
  }

  // No identifier yet — show join form
  if (!identifier) {
    const inputVal = joinInput.trim();
    const inputIsEmail = isEmailInput(inputVal);
    const inputChain = detectChain(inputVal);
    const inputValid = inputVal.length === 0 || inputIsEmail || !!inputChain;

    return (
      <div className="min-h-dvh bg-[var(--gs-black)] text-[var(--gs-white)]">
        <Navbar />
        <main className="max-w-lg mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div className="text-center mb-10">
            <h1 className="font-display font-bold text-2xl sm:text-3xl uppercase mb-3">
              Join the Waitlist
            </h1>
            <p className="font-body text-sm text-[var(--gs-gray-4)] leading-relaxed">
              Enter your wallet address or email to reserve your spot.<br />
              Refer 3 friends to skip the line &amp; get instant access.
            </p>
          </div>

          <div className="bg-[var(--gs-dark-2)] border border-white/[0.06] p-4 sm:p-5 mb-4">
            <p className="font-mono text-[9px] uppercase tracking-widest text-[var(--gs-gray-3)] mb-3">
              Wallet Address or Email
            </p>

            <div className="relative mb-3">
              <input
                type="text"
                value={joinInput}
                onChange={(e) => { setJoinInput(e.target.value); setJoinError(null); }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleJoin(); }}
                placeholder="0x... or email@example.com"
                disabled={joinSubmitting}
                autoFocus
                className={`w-full font-mono text-sm text-[var(--gs-white)] bg-[var(--gs-dark-3)] px-3 py-2.5 outline-none transition-colors border ${
                  !inputValid
                    ? 'border-[var(--gs-loss)]/40 focus:border-[var(--gs-loss)]/60'
                    : 'border-white/[0.08] focus:border-[var(--gs-lime)]/30'
                } ${inputChain ? 'pr-24' : ''} placeholder:text-[var(--gs-gray-2)]`}
              />
              {inputVal.length > 0 && inputChain && (
                <span className={`absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-sm pointer-events-none ${
                  inputChain === 'gunzchain'
                    ? 'bg-[var(--gs-profit)]/15 text-[var(--gs-profit)]'
                    : 'bg-[var(--gs-purple)]/15 text-[var(--gs-purple-bright)]'
                }`}>
                  {inputChain === 'gunzchain' ? 'GunzChain' : 'Solana'}
                </span>
              )}
              {inputVal.length > 0 && inputIsEmail && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-sm pointer-events-none bg-[var(--gs-purple)]/15 text-[var(--gs-purple-bright)]">
                  Email
                </span>
              )}
            </div>

            {/* Handle input */}
            <p className="font-mono text-[9px] uppercase tracking-widest text-[var(--gs-gray-3)] mb-2 mt-4">
              Choose a Handle
            </p>
            <div className="relative mb-1">
              <input
                type="text"
                value={handle}
                onChange={(e) => handleHandleChange(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleJoin(); }}
                placeholder="your-gamer-tag"
                disabled={joinSubmitting}
                maxLength={20}
                className={`w-full font-mono text-sm text-[var(--gs-white)] bg-[var(--gs-dark-3)] px-3 py-2.5 outline-none transition-colors border ${
                  handleError
                    ? 'border-[var(--gs-loss)]/40 focus:border-[var(--gs-loss)]/60'
                    : handleAvailable === true
                    ? 'border-[var(--gs-profit)]/40 focus:border-[var(--gs-profit)]/60'
                    : 'border-white/[0.08] focus:border-[var(--gs-lime)]/30'
                } placeholder:text-[var(--gs-gray-2)]`}
              />
              {handleChecking && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2">
                  <span className="w-3 h-3 border-2 border-[var(--gs-gray-3)]/30 border-t-[var(--gs-gray-3)] rounded-full animate-spin inline-block" />
                </span>
              )}
              {!handleChecking && handle.length >= 3 && handleAvailable === true && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[9px] uppercase tracking-wider text-[var(--gs-profit)]">
                  Available
                </span>
              )}
              {!handleChecking && handleError && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[9px] uppercase tracking-wider text-[var(--gs-loss)]">
                  Taken
                </span>
              )}
            </div>
            <p className="font-mono text-[9px] text-[var(--gs-gray-2)] mb-3">
              {handleError || 'Used for your referral link. You can change it later.'}
            </p>

            {joinError && (
              <p className="font-mono text-[10px] text-[var(--gs-loss)] mb-3">{joinError}</p>
            )}

            <button
              type="button"
              onClick={handleJoin}
              disabled={joinSubmitting || !inputVal}
              className="w-full min-h-10 font-display font-semibold text-[11px] uppercase tracking-wider px-8 py-3 bg-[var(--gs-lime)] text-[var(--gs-black)] hover:bg-[var(--gs-lime-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors clip-corner-sm cursor-pointer"
            >
              {joinSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-[var(--gs-black)]/30 border-t-[var(--gs-black)] rounded-full animate-spin" />
                  Joining...
                </span>
              ) : (
                'Join Waitlist'
              )}
            </button>
          </div>

          {/* How It Works */}
          <div className="mt-10 pt-8 border-t border-white/[0.06]">
            <p className="font-mono text-[9px] uppercase tracking-widest text-[var(--gs-gray-3)] mb-5 text-center">
              How It Works
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { step: '01', title: 'Join & Share', desc: 'Enter your wallet or email to get a unique referral link.' },
                { step: '02', title: 'Friends Connect', desc: 'When they visit and connect a wallet or sign up, it counts as a referral.' },
                { step: '03', title: 'Unlock Access', desc: '3 successful referrals = instant access to GUNZscope.' },
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
              className="text-center max-w-sm px-6"
            >
              <div className="w-16 h-16 mx-auto mb-6 border-2 border-[var(--gs-lime)] flex items-center justify-center clip-corner-sm">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--gs-lime)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h1 className="font-display font-bold text-3xl sm:text-4xl uppercase text-[var(--gs-lime)] mb-3">
                Access Granted
              </h1>
              {isEmailOnly ? (
                <>
                  <p className="font-body text-sm text-[var(--gs-gray-4)] leading-relaxed mb-6">
                    Connect a wallet to view your portfolio.
                  </p>
                  <button
                    onClick={() => setShowAuthFlow(true)}
                    className="min-h-10 font-display font-semibold text-[11px] uppercase tracking-wider px-8 py-3 bg-[var(--gs-lime)] text-[var(--gs-black)] hover:bg-[var(--gs-lime-hover)] transition-colors clip-corner-sm cursor-pointer"
                  >
                    Connect Wallet
                  </button>
                </>
              ) : (
                <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--gs-gray-3)]">
                  Redirecting to your portfolio...
                </p>
              )}
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
          {trialExpired ? 'Trial Ended' : 'You\u2019re on the Waitlist'}
        </h1>
        <p className="font-body text-sm text-[var(--gs-gray-4)] text-center leading-relaxed mb-10">
          {trialExpired ? (
            <>Your 72&#8209;hour trial has expired. Refer <span className="text-[var(--gs-lime)] font-semibold">{threshold} friend{threshold !== 1 ? 's' : ''}</span> for permanent access.</>
          ) : (
            <>
              Refer {threshold} friend{threshold !== 1 ? 's' : ''} to unlock instant access.
              {remaining > 0 && (
                <> Just <span className="text-[var(--gs-lime)] font-semibold">{remaining} more</span> to go.</>
              )}
            </>
          )}
        </p>

        {/* Email-only notice */}
        {isEmailOnly && (
          <div className="bg-[var(--gs-dark-2)] border border-[var(--gs-purple)]/20 px-4 py-3 mb-6 text-center">
            <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--gs-gray-3)]">
              Signed in as <span className="text-[var(--gs-purple)]">{emailAddress || manualIdentifier}</span>
            </p>
            <p className="font-body text-xs text-[var(--gs-gray-4)] mt-1">
              You&rsquo;ll need to connect a wallet after unlocking access to view your portfolio.
            </p>
          </div>
        )}

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
              { step: '02', title: 'They Connect', desc: 'When they visit and connect a wallet or sign up, it counts as a referral.' },
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
