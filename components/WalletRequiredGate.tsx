'use client';

import { useState, useEffect } from 'react';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';

interface WalletRequiredGateProps {
  children: React.ReactNode;
  feature: string;
}

/**
 * Gate component for pages that require authentication.
 * Shows a brief loading skeleton while the Dynamic SDK initializes,
 * then either lets the user through or shows a login prompt.
 */
export default function WalletRequiredGate({ children, feature }: WalletRequiredGateProps) {
  const { primaryWallet, user, setShowAuthFlow } = useDynamicContext();
  const [sdkReady, setSdkReady] = useState(false);

  // Give the Dynamic SDK a moment to hydrate before showing the gate.
  // This prevents a flash of the lock screen during SDK initialization.
  useEffect(() => {
    const timer = setTimeout(() => setSdkReady(true), 600);
    return () => clearTimeout(timer);
  }, []);

  // Wallet connected or email-only user — full access
  if (primaryWallet?.address || user) return <>{children}</>;

  // SDK still initializing — show nothing (prevents flash)
  if (!sdkReady) {
    return <div className="min-h-[200px]" />;
  }

  // Anonymous — show login prompt
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="size-16 mx-auto mb-6 rounded-full bg-[var(--gs-dark-2)] border border-[var(--gs-purple)]/20 flex items-center justify-center">
        <svg className="size-7 text-[var(--gs-purple)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
      </div>
      <h2 className="font-display font-bold text-xl uppercase mb-3 text-[var(--gs-white)]">
        Login or Create Account
      </h2>
      <p className="font-body text-sm text-[var(--gs-gray-4)] max-w-md mb-6">
        Login or create an account to track up to 5 wallets and manage your portfolio.
      </p>
      <button
        onClick={() => setShowAuthFlow(true)}
        className="font-display font-semibold text-data uppercase tracking-wider px-6 py-2.5 bg-[var(--gs-lime)] text-[var(--gs-black)] hover:bg-[var(--gs-lime-hover)] transition-colors clip-corner-sm cursor-pointer"
      >
        Login or Create Account
      </button>
    </div>
  );
}
