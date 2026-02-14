'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import Link from 'next/link';

const STORAGE_KEY = 'gs-onboarding';

interface OnboardingState {
  dismissed: boolean;
  visitedPages: string[];
}

// Step definition with optional action and locked flag
interface Step {
  id: string;
  label: string;
  description: string;
  href?: string;
  action?: 'auth';
  locked?: boolean;
}

// Wallet-connected user steps (original flow)
const WALLET_STEPS: Step[] = [
  {
    id: 'view-portfolio',
    label: 'Analyze a Portfolio',
    description: 'Search any wallet by address',
    href: '/portfolio',
  },
  {
    id: 'connect-wallet',
    label: 'Create an Account',
    description: 'Session persistence & more',
    action: 'auth',
  },
  {
    id: 'explore-leaderboard',
    label: 'Explore the Leaderboard',
    description: 'See how your portfolio stacks up',
    href: '/leaderboard',
  },
  {
    id: 'manage-wallets',
    label: 'Track More Wallets',
    description: 'Add extra wallets for a combined view',
    href: '/account',
  },
];

// Email-only user steps (browse mode → upgrade path)
const EMAIL_STEPS: Step[] = [
  {
    id: 'create-account',
    label: 'Create your account',
    description: 'Sign up with email to get started',
  },
  {
    id: 'search-portfolio',
    label: 'Search a portfolio',
    description: 'Look up any wallet by address',
    href: '/portfolio',
  },
  {
    id: 'connect-wallet',
    label: 'Connect a wallet',
    description: 'Link a GunzChain wallet to unlock all features',
    action: 'auth',
  },
  {
    id: 'unlock-features',
    label: 'Unlock full features',
    description: 'Leaderboard, scarcity, and more',
    locked: true,
  },
];

function loadState(): OnboardingState {
  if (typeof window === 'undefined') return { dismissed: false, visitedPages: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { dismissed: false, visitedPages: [] };
}

function saveState(state: OnboardingState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

export default function OnboardingChecklist() {
  const pathname = usePathname();
  const { primaryWallet, user, setShowAuthFlow } = useDynamicContext();
  const [state, setState] = useState<OnboardingState>({ dismissed: false, visitedPages: [] });
  const [minimized, setMinimized] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Load persisted state
  useEffect(() => {
    setState(loadState());
    setMounted(true);
  }, []);

  // Track page visits
  useEffect(() => {
    if (!mounted || !pathname) return;
    const inAppPages = ['/portfolio', '/leaderboard', '/account'];
    if (inAppPages.includes(pathname)) {
      setState(prev => {
        if (prev.visitedPages.includes(pathname)) return prev;
        const next = { ...prev, visitedPages: [...prev.visitedPages, pathname] };
        saveState(next);
        return next;
      });
    }
  }, [pathname, mounted]);

  const dismiss = useCallback(() => {
    setState(prev => {
      const next = { ...prev, dismissed: true };
      saveState(next);
      return next;
    });
  }, []);

  // Only show on in-app pages
  const isInApp = pathname === '/portfolio' || pathname === '/leaderboard' || pathname === '/account';
  if (!mounted || !isInApp || state.dismissed) return null;

  // Determine user type
  const hasWallet = !!primaryWallet?.address;
  const hasUser = !!user;
  const isEmailOnly = hasUser && !hasWallet;

  // Select steps and calculate completion
  const steps = isEmailOnly ? EMAIL_STEPS : WALLET_STEPS;
  const completedSteps = isEmailOnly
    ? [
        hasUser,                                       // create-account: auto-complete
        state.visitedPages.includes('/portfolio'),     // search-portfolio
        hasWallet,                                     // connect-wallet: false until linked
        hasWallet,                                     // unlock-features: same
      ]
    : [
        state.visitedPages.includes('/portfolio'),                                     // analyze-portfolio
        hasWallet || hasUser,                                                          // create-account
        (hasWallet || hasUser) && state.visitedPages.includes('/leaderboard'),          // explore-leaderboard (requires auth)
        (hasWallet || hasUser) && state.visitedPages.includes('/account'),              // track-more-wallets (requires auth)
      ];

  const completedCount = completedSteps.filter(Boolean).length;
  const allDone = completedCount === steps.length;

  // Auto-dismiss 3s after all steps complete
  if (allDone) {
    setTimeout(() => dismiss(), 3000);
  }

  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-3 py-2 bg-[var(--gs-dark-2)] border border-white/[0.06] shadow-xl shadow-black/40 hover:border-[var(--gs-lime)]/20 transition-colors cursor-pointer"
        style={{ clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))' }}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--gs-lime)] animate-pulse" />
        <span className="font-mono text-caption tracking-wide text-[var(--gs-gray-3)]">
          {completedCount}/{steps.length}
        </span>
      </button>
    );
  }

  return (
    <div
      className="fixed bottom-6 right-6 z-50 w-72 bg-[var(--gs-dark-2)] border border-white/[0.06] shadow-xl shadow-black/40 overflow-hidden"
      style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div>
          <p className="font-mono text-label uppercase tracking-[1.5px] text-[var(--gs-gray-3)]">
            Getting Started
          </p>
          {/* Progress bar */}
          <div className="mt-1.5 h-[2px] w-24 bg-[var(--gs-dark-4)] overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[var(--gs-lime)] to-[var(--gs-purple)] transition-all duration-500 ease-out"
              style={{ width: `${(completedCount / steps.length) * 100}%` }}
            />
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMinimized(true)}
            className="p-1 text-[var(--gs-gray-2)] hover:text-[var(--gs-gray-4)] transition-colors cursor-pointer"
            aria-label="Minimize"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" d="M5 12h14" />
            </svg>
          </button>
          <button
            onClick={dismiss}
            className="p-1 text-[var(--gs-gray-2)] hover:text-[var(--gs-gray-4)] transition-colors cursor-pointer"
            aria-label="Dismiss"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Steps */}
      <div className="px-4 py-3 space-y-2.5">
        {steps.map((step, i) => {
          const done = completedSteps[i];
          const isLocked = step.locked && !done;

          // Locked step — grayed out, non-interactive
          if (isLocked) {
            return (
              <div key={step.id} className="-mx-1 px-1 py-1 opacity-40 cursor-not-allowed">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 w-4 h-4 shrink-0 border border-[var(--gs-gray-1)] flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-[var(--gs-gray-2)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="font-mono text-data leading-tight text-[var(--gs-gray-2)]">{step.label}</p>
                    <p className="font-body text-caption text-[var(--gs-gray-1)] mt-0.5 leading-snug">{step.description}</p>
                  </div>
                </div>
              </div>
            );
          }

          const inner = (
            <div className="flex items-start gap-3 group">
              {/* Checkbox */}
              <div className={`mt-0.5 w-4 h-4 shrink-0 border flex items-center justify-center transition-colors ${
                done
                  ? 'bg-[var(--gs-lime)]/20 border-[var(--gs-lime)]/40'
                  : 'border-[var(--gs-gray-2)] group-hover:border-[var(--gs-gray-3)]'
              }`}>
                {done && (
                  <svg className="w-2.5 h-2.5 text-[var(--gs-lime)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              {/* Text */}
              <div className="min-w-0">
                <p className={`font-mono text-data leading-tight ${
                  done ? 'text-[var(--gs-gray-3)] line-through' : 'text-[var(--gs-white)]'
                }`}>
                  {step.label}
                </p>
                {!done && (
                  <p className="font-body text-caption text-[var(--gs-gray-2)] mt-0.5 leading-snug">
                    {step.description}
                  </p>
                )}
              </div>
            </div>
          );

          // Auth action step — trigger auth flow on click
          if (step.action === 'auth' && !done) {
            return (
              <button
                key={step.id}
                onClick={() => setShowAuthFlow(true)}
                className="w-full text-left hover:bg-white/[0.02] -mx-1 px-1 py-1 transition-colors cursor-pointer"
              >
                {inner}
              </button>
            );
          }

          // Navigation steps — link to page
          if (step.href && !done) {
            return (
              <Link
                key={step.id}
                href={step.href}
                className="block hover:bg-white/[0.02] -mx-1 px-1 py-1 transition-colors"
              >
                {inner}
              </Link>
            );
          }

          // Completed steps — no interaction
          return (
            <div key={step.id} className="-mx-1 px-1 py-1 opacity-70">
              {inner}
            </div>
          );
        })}
      </div>

      {/* All done celebration */}
      {allDone && (
        <div className="px-4 py-3 border-t border-white/[0.06] bg-[var(--gs-lime)]/[0.04]">
          <p className="font-mono text-data text-[var(--gs-lime)]">
            All set! You&apos;re ready to track.
          </p>
        </div>
      )}
    </div>
  );
}
