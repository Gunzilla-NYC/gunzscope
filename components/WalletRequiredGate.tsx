'use client';

import { useDynamicContext } from '@dynamic-labs/sdk-react-core';

interface WalletRequiredGateProps {
  children: React.ReactNode;
  feature: string;
}

/**
 * Gate component for pages that require a connected wallet.
 * Anonymous users see a "Login" prompt.
 * Email-only users see a "Connect wallet" prompt.
 */
export default function WalletRequiredGate({ children, feature }: WalletRequiredGateProps) {
  const { primaryWallet, user, setShowAuthFlow } = useDynamicContext();

  // Wallet connected — full access
  if (primaryWallet?.address) return <>{children}</>;

  // Anonymous — show login prompt
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="size-16 mx-auto mb-6 rounded-full bg-[var(--gs-dark-2)] border border-[var(--gs-purple)]/20 flex items-center justify-center">
          <svg className="size-7 text-[var(--gs-purple)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </div>
        <h2 className="font-display font-bold text-xl uppercase mb-3 text-[var(--gs-white)]">
          Login to Access {feature}
        </h2>
        <p className="font-body text-sm text-[var(--gs-gray-4)] max-w-md mb-6">
          Sign in with your wallet to unlock the full GUNZscope experience including {feature.toLowerCase()}, tracked wallets, and more.
        </p>
        <button
          onClick={() => setShowAuthFlow(true)}
          className="font-display font-semibold text-data uppercase tracking-wider px-6 py-2.5 bg-[var(--gs-lime)] text-[var(--gs-black)] hover:bg-[var(--gs-lime-hover)] transition-colors clip-corner-sm cursor-pointer"
        >
          Login
        </button>
      </div>
    );
  }

  // Email-only user — show wallet connection prompt
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="size-16 mx-auto mb-6 rounded-full bg-[var(--gs-dark-2)] border border-[var(--gs-lime)]/20 flex items-center justify-center">
        <svg className="size-7 text-[var(--gs-lime)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
        </svg>
      </div>
      <h2 className="font-display font-bold text-xl uppercase mb-3 text-[var(--gs-white)]">
        Connect a Wallet to Access {feature}
      </h2>
      <p className="font-body text-sm text-[var(--gs-gray-4)] max-w-md mb-6">
        Link a GunzChain wallet to your account to unlock the full GUNZscope experience including {feature.toLowerCase()}, tracked wallets, and more.
      </p>
      <button
        onClick={() => setShowAuthFlow(true)}
        className="font-display font-semibold text-data uppercase tracking-wider px-6 py-2.5 bg-[var(--gs-lime)] text-[var(--gs-black)] hover:bg-[var(--gs-lime-hover)] transition-colors clip-corner-sm cursor-pointer"
      >
        Connect Wallet
      </button>
    </div>
  );
}
