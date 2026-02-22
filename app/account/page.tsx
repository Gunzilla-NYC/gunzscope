'use client';

import { Suspense, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useUserProfile } from '@/lib/hooks/useUserProfile';
import { useAlertPreferences, type AlertType } from '@/lib/hooks/useAlertPreferences';
import { useFeatureRequests } from '@/lib/hooks/useFeatureRequests';
import { useShareStats } from '@/lib/hooks/useShareStats';
import { getRelativeTime } from '@/lib/hooks/useScarcity';
import { useGlitchText } from '@/hooks/useGlitchText';
import { toast } from 'sonner';
import ReferralSection from '@/components/referral/ReferralSection';

const MAX_PORTFOLIO_WALLETS = 5;
const MAX_TRACKED_WALLETS = 10;
const ADMIN_WALLET = '0xf9434e3057432032bb621aa5144329861869c72f';

const ALERT_TYPES: {
  type: AlertType;
  name: string;
  description: string;
  hasConfig: boolean;
  configFields?: { key: string; label: string; type: 'number' | 'select'; options?: { value: string; label: string }[]; placeholder?: string; defaultValue?: unknown }[];
}[] = [
  {
    type: 'gun_price',
    name: 'GUN Price Alert',
    description: 'Get notified when GUN crosses a price threshold',
    hasConfig: true,
    configFields: [
      { key: 'direction', label: 'Direction', type: 'select', options: [{ value: 'above', label: 'Above' }, { value: 'below', label: 'Below' }] },
      { key: 'threshold', label: 'Price (USD)', type: 'number', placeholder: '0.05' },
    ],
  },
  {
    type: 'portfolio_digest',
    name: 'Weekly Portfolio Digest',
    description: 'Weekly summary of your portfolio value and changes',
    hasConfig: false,
  },
  {
    type: 'floor_drop',
    name: 'Floor Price Drop',
    description: 'Alert when NFT floor drops below your purchase price',
    hasConfig: true,
    configFields: [
      { key: 'threshold', label: 'Drop % Trigger', type: 'number', placeholder: '20', defaultValue: 20 },
    ],
  },
  {
    type: 'whale_tracker',
    name: 'Whale Tracker',
    description: 'Track activity on your watched wallets',
    hasConfig: false,
  },
  {
    type: 'collection_drop',
    name: 'New Collection Drops',
    description: 'Get notified when new OTG collections appear',
    hasConfig: false,
  },
  {
    type: 'snipe_alert',
    name: 'Snipe Alert',
    description: 'Alert when NFTs are listed below floor price',
    hasConfig: true,
    configFields: [
      { key: 'threshold', label: 'Below Floor %', type: 'number', placeholder: '10', defaultValue: 10 },
    ],
  },
];

function truncateAddress(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}\u2026${addr.slice(-4)}`;
}

function isValidEvmAddress(addr: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(addr);
}

/** Deduplicate wallets that share the same address but differ only by chain.
 *  Prefers the more specific chain name (e.g. "avalanche" over "eip155"). */
function deduplicateWallets(wallets: { id: string; address: string; chain: string; isPrimary: boolean; createdAt: string }[]) {
  const byAddress = new Map<string, typeof wallets[number]>();
  for (const w of wallets) {
    const key = w.address.toLowerCase();
    const existing = byAddress.get(key);
    if (!existing) {
      byAddress.set(key, w);
    } else {
      // Keep the one with isPrimary, or the more specific chain (not eip155)
      const preferNew = w.isPrimary || (existing.chain === 'eip155' && w.chain !== 'eip155');
      if (preferNew) byAddress.set(key, w);
    }
  }
  return Array.from(byAddress.values());
}

function LoginGate({ onLogin }: { onLogin: () => void }) {
  const { spanRef, scramble } = useGlitchText('Login or Create Account');

  return (
    <div className="min-h-dvh flex flex-col bg-[var(--gs-black)] text-[var(--gs-white)]">
      <Navbar />
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="size-20 mx-auto mb-6 rounded-full bg-[var(--gs-dark-2)] border border-white/[0.06] flex items-center justify-center">
          <svg className="size-10 text-[var(--gs-gray-3)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </div>
        <h1 className="text-balance font-display font-bold text-2xl sm:text-3xl uppercase mb-3">
          Login or Create Account
        </h1>
        <p className="text-pretty font-body text-sm text-[var(--gs-gray-4)] mb-8 max-w-md text-center">
          Login or create an account to track up to 5 wallets and manage your portfolio.
        </p>
        <button
          onClick={onLogin}
          onMouseEnter={scramble}
          className="font-display font-semibold text-sm uppercase px-8 py-3 bg-[var(--gs-lime)] text-[var(--gs-black)] hover:bg-[var(--gs-lime-hover)] transition-colors cursor-pointer"
        >
          <span ref={spanRef}>LOGIN OR CREATE ACCOUNT</span>
        </button>
      </main>
      <Footer />
    </div>
  );
}

function AccountContent() {
  // Mark wallet hint as permanently dismissed once user visits this page
  useEffect(() => { localStorage.setItem('gs_wallet_hint_dismissed', '1'); }, []);

  const { primaryWallet, user, setShowAuthFlow } = useDynamicContext();
  const {
    profile,
    isLoading,
    addPortfolioAddress,
    removePortfolioAddress,
    addTrackedAddress,
    removeTrackedAddress,
    updateEmail,
    updateDisplayName,
    setPrimaryWallet,
    refreshProfile,
  } = useUserProfile();

  const {
    preferences: alertPreferences,
    recentAlerts,
    isLoading: alertsLoading,
    updatePreference,
  } = useAlertPreferences();

  const { requests: featureRequests } = useFeatureRequests();
  const { stats: shareStats } = useShareStats();

  // Local state
  const [newAddress, setNewAddress] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [isSavingDisplayName, setIsSavingDisplayName] = useState(false);
  const [displayNameLoaded, setDisplayNameLoaded] = useState(false);
  const [email, setEmail] = useState('');
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [emailLoaded, setEmailLoaded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [walletTab, setWalletTab] = useState<'portfolio' | 'tracked'>('portfolio');
  const [newTrackedAddress, setNewTrackedAddress] = useState('');
  const [newTrackedLabel, setNewTrackedLabel] = useState('');
  const [isAddingTracked, setIsAddingTracked] = useState(false);
  const [removingTrackedId, setRemovingTrackedId] = useState<string | null>(null);
  const [alertConfigs, setAlertConfigs] = useState<Record<string, Record<string, unknown>>>({});
  const [togglingAlert, setTogglingAlert] = useState<string | null>(null);
  const [settingPrimary, setSettingPrimary] = useState<string | null>(null);

  // Sync from profile on first load
  if (profile && !displayNameLoaded) {
    setDisplayName(profile.displayName ?? '');
    setDisplayNameLoaded(true);
  }
  if (profile && !emailLoaded) {
    setEmail(profile.email ?? '');
    setEmailLoaded(true);
  }

  const walletAddress = primaryWallet?.address ?? '';
  const portfolioAddresses = profile?.portfolioAddresses ?? [];
  const slotsUsed = portfolioAddresses.length;
  const isAtLimit = slotsUsed >= MAX_PORTFOLIO_WALLETS;

  // Auto-add primary wallet to portfolio if portfolio is empty (first-time UX)
  const autoAddedRef = useRef(false);
  useEffect(() => {
    if (autoAddedRef.current) return;
    if (!profile || isLoading) return;
    if (!walletAddress) return;
    if (portfolioAddresses.length > 0) return;
    autoAddedRef.current = true;
    addPortfolioAddress(walletAddress, 'Primary Wallet');
  }, [profile, isLoading, walletAddress, portfolioAddresses.length, addPortfolioAddress]);
  const trackedAddresses = profile?.trackedAddresses ?? [];
  const trackedSlotsUsed = trackedAddresses.length;
  const isTrackedAtLimit = trackedSlotsUsed >= MAX_TRACKED_WALLETS;

  const myContributions = useMemo(() => {
    if (!profile) return [];
    return featureRequests.filter((r) => r.authorId === profile.id);
  }, [featureRequests, profile]);

  const handleCopyAddress = useCallback(() => {
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [walletAddress]);

  const handleAddWallet = useCallback(async () => {
    const trimmed = newAddress.trim();
    if (!trimmed) return;

    if (!isValidEvmAddress(trimmed)) {
      toast.error('Invalid address. Enter a valid 0x EVM address.');
      return;
    }

    setIsAdding(true);
    const result = await addPortfolioAddress(trimmed, newLabel.trim() || undefined);
    setIsAdding(false);

    if (result) {
      toast.success('Wallet added to portfolio');
      setNewAddress('');
      setNewLabel('');
    } else {
      toast.error('Failed to add wallet. It may already exist or you\u2019ve reached the limit.');
    }
  }, [newAddress, newLabel, addPortfolioAddress]);

  const handleRemoveWallet = useCallback(async (id: string) => {
    setRemovingId(id);
    const success = await removePortfolioAddress(id);
    setRemovingId(null);

    if (success) {
      toast.success('Wallet removed');
    } else {
      toast.error('Failed to remove wallet');
    }
  }, [removePortfolioAddress]);

  const handleAddTracked = useCallback(async () => {
    const trimmed = newTrackedAddress.trim();
    if (!trimmed) return;

    if (!isValidEvmAddress(trimmed)) {
      toast.error('Invalid address. Enter a valid 0x EVM address.');
      return;
    }

    setIsAddingTracked(true);
    const result = await addTrackedAddress(trimmed, newTrackedLabel.trim() || undefined);
    setIsAddingTracked(false);

    if (result) {
      toast.success('Wallet added to watchlist');
      setNewTrackedAddress('');
      setNewTrackedLabel('');
    } else {
      toast.error('Failed to add wallet. It may already exist or you\u2019ve reached the limit.');
    }
  }, [newTrackedAddress, newTrackedLabel, addTrackedAddress]);

  const handleRemoveTracked = useCallback(async (id: string) => {
    setRemovingTrackedId(id);
    const success = await removeTrackedAddress(id);
    setRemovingTrackedId(null);

    if (success) {
      toast.success('Wallet removed from watchlist');
    } else {
      toast.error('Failed to remove wallet');
    }
  }, [removeTrackedAddress]);

  const handleSaveEmail = useCallback(async () => {
    setIsSavingEmail(true);
    const success = await updateEmail(email.trim() || null);
    setIsSavingEmail(false);

    if (success) {
      toast.success('Email updated');
    } else {
      toast.error('Failed to update email');
    }
  }, [email, updateEmail]);

  const handleSaveDisplayName = useCallback(async () => {
    setIsSavingDisplayName(true);
    const success = await updateDisplayName(displayName.trim() || null);
    setIsSavingDisplayName(false);

    if (success) {
      toast.success('Display name updated');
    } else {
      toast.error('Failed to update display name');
    }
  }, [displayName, updateDisplayName]);

  const handleSetPrimary = useCallback(async (address: string) => {
    setSettingPrimary(address);
    const success = await setPrimaryWallet(address);
    setSettingPrimary(null);
    if (success) {
      toast.success('Primary wallet updated');
    } else {
      toast.error('Failed to update primary wallet');
    }
  }, [setPrimaryWallet]);

  // Gate: require authentication (use `user` not `primaryWallet` — wallet can lag behind SDK init)
  if (!user) {
    return (
      <LoginGate onLogin={() => setShowAuthFlow(true)} />
    );
  }

  return (
    <div className="min-h-dvh bg-[var(--gs-black)] text-[var(--gs-white)]">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-balance font-display font-bold text-3xl sm:text-4xl uppercase mb-2">
            Profile
          </h1>
          <p className="text-pretty font-body text-sm text-[var(--gs-gray-4)]">
            Manage your identity and portfolio wallets
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-[var(--gs-dark-2)] border border-white/[0.06] p-6">
                <div className="h-3 w-32 bg-white/10 animate-pulse mb-4" />
                <div className="h-6 w-48 bg-white/10 animate-pulse mb-2" />
                <div className="h-4 w-64 bg-white/5 animate-pulse" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {/* ── Identity Card ── */}
            <section className="bg-[var(--gs-dark-2)] border border-white/[0.06] overflow-hidden">
              <div className="h-[2px] gradient-accent-line" />
              <div className="p-6">
                {primaryWallet ? (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <p className="font-mono text-label uppercase tracking-[1.5px] text-[var(--gs-gray-3)]">
                        Connected Wallets
                      </p>
                      <span className="flex items-center gap-1.5 font-mono text-label uppercase tracking-[1.5px] text-[var(--gs-gray-3)]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--gs-lime)]" />
                        Live
                      </span>
                    </div>

                    {/* Wallet list from profile (deduplicated by address) */}
                    {profile && profile.wallets.length > 0 ? (
                      <div className="space-y-0 mb-4">
                        {deduplicateWallets(profile.wallets).map((wallet) => (
                          <div
                            key={wallet.id}
                            className="flex items-center justify-between py-2.5 border-b border-white/[0.06] last:border-b-0"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="font-mono text-sm text-[var(--gs-lime)] tabular-nums">
                                {truncateAddress(wallet.address)}
                              </span>
                              {wallet.isPrimary && (
                                <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--gs-lime)] border border-[var(--gs-lime)]/30 px-1.5 py-0.5 shrink-0">
                                  Primary
                                </span>
                              )}
                              <span className="font-mono text-caption text-[var(--gs-gray-2)]">
                                {wallet.chain}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {!wallet.isPrimary && (
                                <button
                                  onClick={() => handleSetPrimary(wallet.address)}
                                  disabled={settingPrimary === wallet.address}
                                  className="font-mono text-caption uppercase tracking-wider text-[var(--gs-gray-3)] hover:text-[var(--gs-lime)] transition-colors disabled:opacity-50"
                                >
                                  {settingPrimary === wallet.address ? 'Setting\u2026' : 'Set Primary'}
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(wallet.address);
                                  toast.success('Address copied');
                                }}
                                className="p-1 text-[var(--gs-gray-3)] hover:text-[var(--gs-white)] transition-colors"
                                aria-label="Copy address"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 mb-4">
                        <p className="font-mono text-lg text-[var(--gs-lime)] tabular-nums">
                          {truncateAddress(walletAddress)}
                        </p>
                        <button
                          onClick={handleCopyAddress}
                          className="p-1.5 text-[var(--gs-gray-3)] hover:text-[var(--gs-white)] transition-colors"
                          aria-label="Copy address"
                        >
                          {copied ? (
                            <svg className="w-4 h-4 text-[var(--gs-lime)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <p className="font-mono text-label uppercase tracking-[1.5px] text-[var(--gs-gray-3)]">
                        Account
                      </p>
                      <span className="flex items-center gap-1.5 font-mono text-label uppercase tracking-[1.5px] text-[var(--gs-gray-3)]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--gs-lime)]" />
                        Active
                      </span>
                    </div>

                    <p className="font-mono text-lg text-[var(--gs-lime)] mb-2">
                      {profile?.email || 'Email User'}
                    </p>
                    <p className="font-mono text-data text-[var(--gs-gray-3)] mb-4">
                      No wallet connected. Add your in&#8209;game wallet below to track your portfolio.
                    </p>
                  </>
                )}

                {/* Display Name */}
                {profile && (
                  <div className="mb-4 pt-4 border-t border-white/[0.06]">
                    <label className="block font-mono text-label uppercase tracking-[1.5px] text-[var(--gs-gray-3)] mb-2">
                      Display Name
                    </label>
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Enter a display name"
                        maxLength={30}
                        className="flex-1 px-3 py-2.5 bg-black/50 border border-white/10 text-sm font-mono text-[var(--gs-white)] placeholder:text-[var(--gs-gray-2)] focus:outline-none focus:border-[var(--gs-lime)]/50 transition-colors"
                      />
                      <button
                        onClick={handleSaveDisplayName}
                        disabled={isSavingDisplayName}
                        className="px-5 py-2.5 font-display font-semibold text-sm uppercase border border-[var(--gs-gray-1)] text-[var(--gs-gray-3)] hover:border-[var(--gs-gray-3)] hover:text-[var(--gs-white)] transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {isSavingDisplayName ? 'Saving\u2026' : 'Save'}
                      </button>
                    </div>
                    <p className="font-mono text-caption text-[var(--gs-gray-2)] mt-1.5">
                      Shown on feature requests and credits page. Max 30 characters.
                    </p>
                  </div>
                )}

                {profile && (
                  <p className="font-mono text-data text-[var(--gs-gray-3)]">
                    Member since {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                )}
              </div>
            </section>

            {/* ── Wallets (Portfolio + Tracked) ── */}
            <section className="bg-[var(--gs-dark-2)] border border-white/[0.06] overflow-hidden">
              <div className="h-[2px] gradient-accent-line" />
              <div className="p-6">
                {/* Tab toggle */}
                <div className="flex items-center gap-0 mb-5">
                  <button
                    onClick={() => setWalletTab('portfolio')}
                    className={`flex-1 font-mono text-data uppercase tracking-wider py-2.5 text-center transition-colors border cursor-pointer ${
                      walletTab === 'portfolio'
                        ? 'bg-[var(--gs-lime)]/[0.08] border-[var(--gs-lime)]/30 text-[var(--gs-lime)]'
                        : 'bg-transparent border-white/[0.06] text-[var(--gs-gray-3)] hover:text-[var(--gs-white)] hover:border-white/[0.12]'
                    }`}
                  >
                    Portfolio
                    {slotsUsed > 0 && (
                      <span className="ml-2 font-mono text-[9px] tabular-nums opacity-70">{slotsUsed}/{MAX_PORTFOLIO_WALLETS}</span>
                    )}
                  </button>
                  <button
                    onClick={() => setWalletTab('tracked')}
                    className={`flex-1 font-mono text-data uppercase tracking-wider py-2.5 text-center transition-colors border border-l-0 cursor-pointer ${
                      walletTab === 'tracked'
                        ? 'bg-[var(--gs-purple)]/[0.08] border-[var(--gs-purple)]/30 text-[var(--gs-purple)]'
                        : 'bg-transparent border-white/[0.06] text-[var(--gs-gray-3)] hover:text-[var(--gs-white)] hover:border-white/[0.12]'
                    }`}
                  >
                    Watchlist
                    {trackedSlotsUsed > 0 && (
                      <span className="ml-2 font-mono text-[9px] tabular-nums opacity-70">{trackedSlotsUsed}/{MAX_TRACKED_WALLETS}</span>
                    )}
                  </button>
                </div>

                {/* ── Portfolio Tab ── */}
                {walletTab === 'portfolio' && (
                  <>
                    {/* First-time guidance */}
                    {slotsUsed === 0 && !primaryWallet && (
                      <div className="mb-5 px-4 py-3 bg-[var(--gs-lime)]/[0.04] border border-[var(--gs-lime)]/10">
                        <p className="font-mono text-data text-[var(--gs-gray-4)] leading-relaxed">
                          <strong className="text-[var(--gs-white)]">In&#8209;Game Player?</strong> Enter your
                          GunzChain wallet address from Off The Grid to start tracking your NFTs and GUN tokens.
                        </p>
                      </div>
                    )}
                    {slotsUsed === 0 && primaryWallet && (
                      <div className="mb-5 px-4 py-3 bg-[var(--gs-lime)]/[0.04] border border-[var(--gs-lime)]/10">
                        <p className="font-mono text-data text-[var(--gs-gray-4)] leading-relaxed">
                          Add up to {MAX_PORTFOLIO_WALLETS} wallets to aggregate into a combined portfolio. Switch between them from the navbar.
                        </p>
                      </div>
                    )}

                    {/* Wallet list */}
                    <div className="space-y-0 mb-5">
                      {portfolioAddresses.map((pa) => (
                        <div
                          key={pa.id}
                          className="flex items-center justify-between py-3 border-b border-white/[0.06] last:border-b-0 group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--gs-lime)] shrink-0" />
                            <span className="font-mono text-sm text-[var(--gs-lime)] tabular-nums">
                              {truncateAddress(pa.address)}
                            </span>
                            {pa.label && (
                              <span className="font-mono text-data text-[var(--gs-gray-3)] truncate">
                                {pa.label}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Link
                              href={`/portfolio?address=${pa.address}`}
                              className="font-mono text-caption uppercase tracking-wider px-2.5 py-1 border border-[var(--gs-gray-1)] text-[var(--gs-gray-3)] hover:border-[var(--gs-gray-3)] hover:text-[var(--gs-white)] transition-colors"
                            >
                              View
                            </Link>
                            <button
                              onClick={() => handleRemoveWallet(pa.id)}
                              disabled={removingId === pa.id}
                              className="p-1.5 text-[var(--gs-gray-2)] hover:text-[var(--gs-loss)] transition-colors disabled:opacity-50"
                              aria-label="Remove wallet"
                            >
                              {removingId === pa.id ? (
                                <div className="w-3.5 h-3.5 border border-[var(--gs-gray-3)] border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              )}
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Empty slots — click to focus add form */}
                      {Array.from({ length: MAX_PORTFOLIO_WALLETS - slotsUsed }).map((_, i) => (
                        <button
                          key={`empty-${i}`}
                          type="button"
                          onClick={() => {
                            const input = document.getElementById('add-wallet-input');
                            if (input) { input.scrollIntoView({ behavior: 'smooth', block: 'center' }); input.focus(); }
                          }}
                          className="flex items-center w-full py-3 border-b border-white/[0.06] last:border-b-0 hover:bg-white/[0.02] transition-colors cursor-pointer text-left"
                        >
                          <span className="w-1.5 h-1.5 rounded-full border border-dashed border-[var(--gs-gray-2)] shrink-0" />
                          <span className="ml-3 font-mono text-data text-[var(--gs-gray-2)]">
                            + Add wallet
                          </span>
                        </button>
                      ))}
                    </div>

                    {/* Add wallet form */}
                    {isAtLimit ? (
                      <div className="flex items-center gap-2 py-3">
                        <svg className="w-4 h-4 text-[var(--gs-warning)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <span className="font-mono text-data text-[var(--gs-warning)]">
                          Portfolio wallet limit reached ({MAX_PORTFOLIO_WALLETS}/{MAX_PORTFOLIO_WALLETS})
                        </span>
                      </div>
                    ) : (
                      <form
                        onSubmit={(e) => { e.preventDefault(); handleAddWallet(); }}
                        className="space-y-3"
                      >
                        <div className="flex gap-3">
                          <input
                            id="add-wallet-input"
                            type="text"
                            value={newAddress}
                            onChange={(e) => setNewAddress(e.target.value)}
                            placeholder="0x wallet address"
                            className="flex-1 px-3 py-2.5 bg-black/50 border border-white/10 text-sm font-mono text-[var(--gs-white)] placeholder:text-[var(--gs-gray-2)] focus:outline-none focus:border-[var(--gs-lime)]/50 transition-colors"
                          />
                          <input
                            type="text"
                            value={newLabel}
                            onChange={(e) => setNewLabel(e.target.value)}
                            placeholder="Label (optional)"
                            className="w-40 px-3 py-2.5 bg-black/50 border border-white/10 text-sm font-mono text-[var(--gs-white)] placeholder:text-[var(--gs-gray-2)] focus:outline-none focus:border-[var(--gs-lime)]/50 transition-colors"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={isAdding || !newAddress.trim()}
                          className="w-full font-display font-semibold text-sm uppercase px-6 py-2.5 bg-[var(--gs-lime)] text-[var(--gs-black)] hover:bg-[var(--gs-lime-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isAdding ? 'Adding\u2026' : 'Add Wallet'}
                        </button>
                      </form>
                    )}

                    {slotsUsed > 0 ? (
                      <Link
                        href={walletAddress ? `/portfolio?address=${walletAddress}` : '/portfolio'}
                        className="mt-4 flex items-center font-mono text-caption tracking-wide text-[var(--gs-gray-3)] hover:text-[var(--gs-lime)] transition-colors"
                      >
                        View combined portfolio {'\u2192'}
                      </Link>
                    ) : (
                      <p className="mt-4 font-mono text-caption text-[var(--gs-gray-2)]">
                        Portfolio wallets are aggregated together. Switch between them from the navbar.
                      </p>
                    )}
                  </>
                )}

                {/* ── Watchlist Tab ── */}
                {walletTab === 'tracked' && (
                  <>
                    {/* Guidance */}
                    {trackedSlotsUsed === 0 && (
                      <div className="mb-5 px-4 py-3 bg-[var(--gs-purple)]/[0.04] border border-[var(--gs-purple)]/10">
                        <p className="font-mono text-data text-[var(--gs-gray-4)] leading-relaxed">
                          Track whale wallets, friends, or competitors. Watched wallets are <strong className="text-[var(--gs-white)]">not</strong> included in your portfolio total.
                        </p>
                      </div>
                    )}

                    {/* Tracked wallet list */}
                    <div className="space-y-0 mb-5">
                      {trackedAddresses.map((ta) => (
                        <div
                          key={ta.id}
                          className="flex items-center justify-between py-3 border-b border-white/[0.06] last:border-b-0 group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--gs-purple)] shrink-0" />
                            <span className="font-mono text-sm text-[var(--gs-purple)] tabular-nums">
                              {truncateAddress(ta.address)}
                            </span>
                            {ta.label && (
                              <span className="font-mono text-data text-[var(--gs-gray-3)] truncate">
                                {ta.label}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Link
                              href={`/portfolio?address=${ta.address}`}
                              className="font-mono text-caption uppercase tracking-wider px-2.5 py-1 border border-[var(--gs-gray-1)] text-[var(--gs-gray-3)] hover:border-[var(--gs-gray-3)] hover:text-[var(--gs-white)] transition-colors"
                            >
                              View
                            </Link>
                            <button
                              onClick={() => handleRemoveTracked(ta.id)}
                              disabled={removingTrackedId === ta.id}
                              className="p-1.5 text-[var(--gs-gray-2)] hover:text-[var(--gs-loss)] transition-colors disabled:opacity-50"
                              aria-label="Remove tracked wallet"
                            >
                              {removingTrackedId === ta.id ? (
                                <div className="w-3.5 h-3.5 border border-[var(--gs-gray-3)] border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              )}
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Empty slots */}
                      {Array.from({ length: Math.min(3, MAX_TRACKED_WALLETS - trackedSlotsUsed) }).map((_, i) => (
                        <button
                          key={`empty-tracked-${i}`}
                          type="button"
                          onClick={() => {
                            const input = document.getElementById('add-tracked-input');
                            if (input) { input.scrollIntoView({ behavior: 'smooth', block: 'center' }); input.focus(); }
                          }}
                          className="flex items-center w-full py-3 border-b border-white/[0.06] last:border-b-0 hover:bg-white/[0.02] transition-colors cursor-pointer text-left"
                        >
                          <span className="w-1.5 h-1.5 rounded-full border border-dashed border-[var(--gs-gray-2)] shrink-0" />
                          <span className="ml-3 font-mono text-data text-[var(--gs-gray-2)]">
                            + Watch a wallet
                          </span>
                        </button>
                      ))}
                    </div>

                    {/* Add tracked wallet form */}
                    {isTrackedAtLimit ? (
                      <div className="flex items-center gap-2 py-3">
                        <svg className="w-4 h-4 text-[var(--gs-warning)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <span className="font-mono text-data text-[var(--gs-warning)]">
                          Watchlist limit reached ({MAX_TRACKED_WALLETS}/{MAX_TRACKED_WALLETS})
                        </span>
                      </div>
                    ) : (
                      <form
                        onSubmit={(e) => { e.preventDefault(); handleAddTracked(); }}
                        className="space-y-3"
                      >
                        <div className="flex gap-3">
                          <input
                            id="add-tracked-input"
                            type="text"
                            value={newTrackedAddress}
                            onChange={(e) => setNewTrackedAddress(e.target.value)}
                            placeholder="0x wallet address"
                            className="flex-1 px-3 py-2.5 bg-black/50 border border-white/10 text-sm font-mono text-[var(--gs-white)] placeholder:text-[var(--gs-gray-2)] focus:outline-none focus:border-[var(--gs-purple)]/50 transition-colors"
                          />
                          <input
                            type="text"
                            value={newTrackedLabel}
                            onChange={(e) => setNewTrackedLabel(e.target.value)}
                            placeholder="Label (optional)"
                            className="w-40 px-3 py-2.5 bg-black/50 border border-white/10 text-sm font-mono text-[var(--gs-white)] placeholder:text-[var(--gs-gray-2)] focus:outline-none focus:border-[var(--gs-purple)]/50 transition-colors"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={isAddingTracked || !newTrackedAddress.trim()}
                          className="w-full font-display font-semibold text-sm uppercase px-6 py-2.5 bg-[var(--gs-purple)] text-[var(--gs-white)] hover:bg-[var(--gs-purple)]/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isAddingTracked ? 'Adding\u2026' : 'Watch Wallet'}
                        </button>
                      </form>
                    )}

                    <p className="mt-4 font-mono text-caption text-[var(--gs-gray-2)]">
                      Watched wallets are view&#8209;only. They won&apos;t appear in your portfolio total.
                    </p>
                  </>
                )}
              </div>
            </section>

            {/* ── Settings ── */}
            <section className="bg-[var(--gs-dark-2)] border border-white/[0.06] overflow-hidden">
              <div className="h-[2px] gradient-accent-line" />
              <div className="p-6">
                <p className="font-mono text-label uppercase tracking-[1.5px] text-[var(--gs-gray-3)] mb-5">
                  Settings
                </p>

                {/* Email */}
                <div className="mb-5">
                  <label className="block font-mono text-data text-[var(--gs-gray-4)] mb-2">
                    Email (Optional)
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="flex-1 px-3 py-2.5 bg-black/50 border border-white/10 text-sm font-mono text-[var(--gs-white)] placeholder:text-[var(--gs-gray-2)] focus:outline-none focus:border-[var(--gs-lime)]/50 transition-colors"
                    />
                    <button
                      onClick={handleSaveEmail}
                      disabled={isSavingEmail}
                      className="px-5 py-2.5 font-display font-semibold text-sm uppercase border border-[var(--gs-gray-1)] text-[var(--gs-gray-3)] hover:border-[var(--gs-gray-3)] hover:text-[var(--gs-white)] transition-colors disabled:opacity-50"
                    >
                      {isSavingEmail ? 'Saving\u2026' : 'Save'}
                    </button>
                  </div>
                </div>

                {/* Account info */}
                {profile && (
                  <div className="border-t border-white/[0.06] pt-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-caption text-[var(--gs-gray-3)]">Account created</span>
                      <span className="font-mono text-caption text-[var(--gs-gray-4)] tabular-nums">
                        {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-caption text-[var(--gs-gray-3)]">Connected wallets</span>
                      <span className="font-mono text-caption text-[var(--gs-gray-4)] tabular-nums">
                        {deduplicateWallets(profile.wallets).length}
                      </span>
                    </div>
                  </div>
                )}

                {/* Admin-only: UX testing modes */}
                {primaryWallet?.address?.toLowerCase() === ADMIN_WALLET && (
                  <div className="border-t border-[var(--gs-loss)]/20 pt-4 mt-4">
                    <p className="font-mono text-label uppercase tracking-[1.5px] text-[var(--gs-gray-3)] mb-1">
                      UX Testing
                    </p>
                    <p className="font-mono text-caption text-[var(--gs-gray-2)] mb-4">
                      Simulate different user states. Reloads the page after clearing.
                    </p>
                    <div className="space-y-3">
                      {/* First-time visitor */}
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-mono text-data text-[var(--gs-gray-4)]">First&#8209;Time Visitor</p>
                          <p className="font-mono text-caption text-[var(--gs-gray-2)] mt-0.5">
                            Nukes everything &mdash; onboarding, welcome, search gate, cache, history
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            localStorage.removeItem('gs-uxr-welcome-dismissed');
                            localStorage.removeItem('gs-onboarding');
                            localStorage.removeItem('gs_wallet_hint_dismissed');
                            sessionStorage.removeItem('gs_search_count');
                            sessionStorage.removeItem('gs_searched_addrs');
                            sessionStorage.removeItem('gs_last_search');
                            localStorage.removeItem('gunzscope:portfolio:history');
                            const keysToRemove: string[] = [];
                            for (let i = 0; i < localStorage.length; i++) {
                              const key = localStorage.key(i);
                              if (key?.startsWith('zillascope:')) keysToRemove.push(key);
                            }
                            keysToRemove.forEach(k => localStorage.removeItem(k));
                            toast.success('Reset to first-time visitor. Reloading\u2026');
                            setTimeout(() => window.location.reload(), 800);
                          }}
                          className="shrink-0 px-4 py-2 font-mono text-caption uppercase tracking-wider border border-[var(--gs-loss)]/30 text-[var(--gs-loss)] hover:bg-[var(--gs-loss)]/10 transition-colors cursor-pointer"
                        >
                          Reset
                        </button>
                      </div>
                      {/* New account (just signed up) */}
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-mono text-data text-[var(--gs-gray-4)]">New Account</p>
                          <p className="font-mono text-caption text-[var(--gs-gray-2)] mt-0.5">
                            Re&#8209;triggers welcome popup, onboarding checklist &amp; wallet hint
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            localStorage.removeItem('gs-uxr-welcome-dismissed');
                            localStorage.removeItem('gs-onboarding');
                            localStorage.removeItem('gs_wallet_hint_dismissed');
                            toast.success('Reset to new account. Reloading\u2026');
                            setTimeout(() => window.location.reload(), 800);
                          }}
                          className="shrink-0 px-4 py-2 font-mono text-caption uppercase tracking-wider border border-[var(--gs-purple)]/30 text-[var(--gs-purple)] hover:bg-[var(--gs-purple)]/10 transition-colors cursor-pointer"
                        >
                          Reset
                        </button>
                      </div>
                      {/* Returning user (stale cache) */}
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-mono text-data text-[var(--gs-gray-4)]">Returning User</p>
                          <p className="font-mono text-caption text-[var(--gs-gray-2)] mt-0.5">
                            Clears NFT cache &amp; portfolio history only &mdash; keeps onboarding state
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            localStorage.removeItem('gunzscope:portfolio:history');
                            const keysToRemove: string[] = [];
                            for (let i = 0; i < localStorage.length; i++) {
                              const key = localStorage.key(i);
                              if (key?.startsWith('zillascope:')) keysToRemove.push(key);
                            }
                            keysToRemove.forEach(k => localStorage.removeItem(k));
                            toast.success('Reset to returning user. Reloading\u2026');
                            setTimeout(() => window.location.reload(), 800);
                          }}
                          className="shrink-0 px-4 py-2 font-mono text-caption uppercase tracking-wider border border-[var(--gs-lime)]/30 text-[var(--gs-lime)] hover:bg-[var(--gs-lime)]/10 transition-colors cursor-pointer"
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* ── My Contributions ── */}
            {myContributions.length > 0 && (
              <section className="bg-[var(--gs-dark-2)] border border-white/[0.06] overflow-hidden">
                <div className="h-[2px] gradient-accent-line" />
                <div className="p-6">
                  <div className="flex items-center justify-between mb-5">
                    <p className="font-mono text-label uppercase tracking-[1.5px] text-[var(--gs-gray-3)]">
                      My Feature Requests
                    </p>
                    <Link
                      href="/feature-requests"
                      className="font-mono text-caption uppercase tracking-wider text-[var(--gs-gray-3)] hover:text-[var(--gs-lime)] transition-colors"
                    >
                      View All {'\u2192'}
                    </Link>
                  </div>
                  <div className="space-y-0">
                    {myContributions.map((req) => {
                      const statusStyle = {
                        open: { bg: 'bg-[var(--gs-lime)]/10', text: 'text-[var(--gs-lime)]', label: 'Open' },
                        planned: { bg: 'bg-[var(--gs-purple)]/10', text: 'text-[var(--gs-purple)]', label: 'In Flight' },
                        completed: { bg: 'bg-[var(--gs-profit)]/10', text: 'text-[var(--gs-profit)]', label: 'Done' },
                        declined: { bg: 'bg-[var(--gs-loss)]/10', text: 'text-[var(--gs-loss)]', label: 'Declined' },
                      }[req.status] || { bg: 'bg-white/5', text: 'text-[var(--gs-gray-3)]', label: req.status };

                      return (
                        <div
                          key={req.id}
                          className="flex items-center justify-between py-3 border-b border-white/[0.06] last:border-b-0"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className={`font-mono text-sm font-bold tabular-nums w-8 text-right shrink-0 ${
                              req.netVotes > 0 ? 'text-[var(--gs-lime)]' : req.netVotes < 0 ? 'text-[var(--gs-loss)]' : 'text-[var(--gs-gray-3)]'
                            }`}>
                              {req.netVotes > 0 ? '+' : ''}{req.netVotes}
                            </span>
                            <span className="font-body text-sm text-[var(--gs-white)] truncate">
                              {req.title}
                            </span>
                          </div>
                          <span className={`font-mono text-label uppercase tracking-wider px-1.5 py-0.5 shrink-0 ${statusStyle.bg} ${statusStyle.text}`}>
                            {statusStyle.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            )}

            {/* ── Share Stats ── */}
            {shareStats && shareStats.totalShares > 0 && (
              <section className="bg-[var(--gs-dark-2)] border border-white/[0.06] overflow-hidden">
                <div className="h-[2px] gradient-accent-line" />
                <div className="p-6">
                  <p className="font-mono text-label uppercase tracking-[1.5px] text-[var(--gs-gray-3)] mb-4">
                    Share Stats
                  </p>
                  <div className="flex gap-6 mb-4">
                    <div>
                      <p className="font-display text-2xl font-bold text-[var(--gs-lime)]">{shareStats.totalShares}</p>
                      <p className="font-mono text-caption text-[var(--gs-gray-3)]">Shares</p>
                    </div>
                    <div>
                      <p className="font-display text-2xl font-bold text-[var(--gs-purple)]">{shareStats.totalViews}</p>
                      <p className="font-mono text-caption text-[var(--gs-gray-3)]">Views</p>
                    </div>
                  </div>
                  <div className="space-y-0">
                    {shareStats.shares.slice(0, 10).map((s) => {
                      const shortAddr = `${s.address.slice(0, 6)}\u2026${s.address.slice(-4)}`;
                      const platformLabel = { x: 'X', discord: 'Discord', copy: 'Link' }[s.platform] ?? s.platform;
                      const timeAgo = getRelativeTime(s.createdAt);
                      return (
                        <div
                          key={s.code}
                          className="flex items-center justify-between py-2.5 border-b border-white/[0.06] last:border-b-0"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="font-mono text-data text-[var(--gs-gray-4)]">{shortAddr}</span>
                            <span className="font-mono text-caption uppercase tracking-wider px-1.5 py-0.5 bg-white/[0.04] text-[var(--gs-gray-3)]">
                              {platformLabel}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="font-mono text-data tabular-nums text-[var(--gs-gray-4)]">
                              {s.viewCount} {s.viewCount === 1 ? 'view' : 'views'}
                            </span>
                            <span className="font-mono text-caption text-[var(--gs-gray-2)]">{timeAgo}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            )}

            {/* ── Referral Program ── */}
            {primaryWallet?.address && (
              <ReferralSection walletAddress={primaryWallet.address} />
            )}

            {/* ── Notifications ── */}
            <section className="bg-[var(--gs-dark-2)] border border-white/[0.06] overflow-hidden">
              <div className="h-[2px] gradient-accent-line" />
              <div className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <p className="font-mono text-label uppercase tracking-[1.5px] text-[var(--gs-gray-3)]">
                    Notifications
                  </p>
                  <span className="font-mono text-micro tracking-widest uppercase px-2 py-1 border border-[var(--gs-warning)]/40 text-[var(--gs-warning)] bg-[var(--gs-warning)]/5 clip-corner-sm">
                    Experimental
                  </span>
                </div>
                <p className="font-mono text-data text-[var(--gs-gray-3)] mb-5">
                  Email alerts for portfolio events. Requires a saved email address.
                </p>

                {!profile?.email && (
                  <div className="mb-5 px-4 py-3 bg-[var(--gs-purple)]/[0.06] border border-[var(--gs-purple)]/20">
                    <p className="font-mono text-data text-[var(--gs-purple)] leading-relaxed">
                      Set your email address above to enable notifications.
                    </p>
                  </div>
                )}

                {alertsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-16 bg-white/[0.02] animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {ALERT_TYPES.map((alertDef) => {
                      const pref = alertPreferences.find((p) => p.type === alertDef.type);
                      const isEnabled = pref?.enabled ?? false;
                      const savedConfig = pref?.config ?? {};
                      const localConfig = alertConfigs[alertDef.type] ?? savedConfig;
                      const isToggling = togglingAlert === alertDef.type;

                      return (
                        <div
                          key={alertDef.type}
                          className={`border transition-colors ${
                            isEnabled
                              ? 'border-[var(--gs-lime)]/20 bg-[var(--gs-lime)]/[0.02]'
                              : 'border-white/[0.06] bg-white/[0.01]'
                          } p-4`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2.5">
                              <span className="font-body text-sm text-[var(--gs-white)]">{alertDef.name}</span>
                            </div>

                            {/* Toggle */}
                            <button
                              onClick={async () => {
                                if (!profile?.email) {
                                  toast.error('Set your email first to enable alerts');
                                  return;
                                }
                                setTogglingAlert(alertDef.type);
                                const newEnabled = !isEnabled;
                                const config = newEnabled ? (localConfig ?? {}) : (savedConfig ?? {});
                                const success = await updatePreference(alertDef.type, newEnabled, config);
                                setTogglingAlert(null);
                                if (success) {
                                  toast.success(newEnabled ? `${alertDef.name} enabled` : `${alertDef.name} disabled`);
                                }
                              }}
                              disabled={isToggling}
                              className={`relative w-10 h-5 rounded-full transition-colors ${
                                isEnabled ? 'bg-[var(--gs-lime)]' : 'bg-[var(--gs-gray-1)]'
                              } ${isToggling ? 'opacity-50' : 'cursor-pointer'}`}
                              aria-label={`Toggle ${alertDef.name}`}
                            >
                              <span
                                className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-black transition-transform ${
                                  isEnabled ? 'translate-x-5' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          </div>

                          <p className="font-mono text-data text-[var(--gs-gray-3)] mb-3">{alertDef.description}</p>

                          {/* Config fields */}
                          {alertDef.hasConfig && isEnabled && alertDef.configFields && (
                            <div className="flex items-end gap-3 pt-2 border-t border-white/[0.04]">
                              {alertDef.configFields.map((field) => (
                                <div key={field.key} className="flex-1">
                                  <label className="block font-mono text-label uppercase tracking-wider text-[var(--gs-gray-3)] mb-1.5">
                                    {field.label}
                                  </label>
                                  {field.type === 'select' && field.options ? (
                                    <select
                                      value={(localConfig[field.key] as string) ?? field.options[0].value}
                                      onChange={(e) => {
                                        setAlertConfigs((prev) => ({
                                          ...prev,
                                          [alertDef.type]: { ...localConfig, [field.key]: e.target.value },
                                        }));
                                      }}
                                      className="w-full px-2.5 py-2 bg-black/50 border border-white/10 text-sm font-mono text-[var(--gs-white)] focus:outline-none focus:border-[var(--gs-lime)]/50 transition-colors"
                                    >
                                      {field.options.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                          {opt.label}
                                        </option>
                                      ))}
                                    </select>
                                  ) : (
                                    <input
                                      type="number"
                                      value={(localConfig[field.key] as string) ?? field.defaultValue ?? ''}
                                      onChange={(e) => {
                                        setAlertConfigs((prev) => ({
                                          ...prev,
                                          [alertDef.type]: { ...localConfig, [field.key]: parseFloat(e.target.value) || 0 },
                                        }));
                                      }}
                                      placeholder={field.placeholder}
                                      className="w-full px-2.5 py-2 bg-black/50 border border-white/10 text-sm font-mono text-[var(--gs-white)] placeholder:text-[var(--gs-gray-2)] focus:outline-none focus:border-[var(--gs-lime)]/50 transition-colors"
                                    />
                                  )}
                                </div>
                              ))}
                              <button
                                onClick={async () => {
                                  const success = await updatePreference(alertDef.type, true, localConfig);
                                  if (success) toast.success('Config saved');
                                }}
                                className="px-3 py-2 font-mono text-caption uppercase tracking-wider border border-[var(--gs-gray-1)] text-[var(--gs-gray-3)] hover:border-[var(--gs-lime)]/50 hover:text-[var(--gs-lime)] transition-colors"
                              >
                                Save
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Recent alerts */}
                {recentAlerts.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-white/[0.06]">
                    <p className="font-mono text-label uppercase tracking-[1.5px] text-[var(--gs-gray-3)] mb-3">
                      Recent Alerts
                    </p>
                    <div className="space-y-1.5">
                      {recentAlerts.slice(0, 5).map((alert) => (
                        <div key={alert.id} className="flex items-center justify-between py-1.5">
                          <span className="font-mono text-data text-[var(--gs-gray-4)] truncate mr-3">
                            {alert.subject}
                          </span>
                          <span className="font-mono text-caption text-[var(--gs-gray-2)] tabular-nums shrink-0">
                            {new Date(alert.sentAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

export default function AccountPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-[var(--gs-black)]" />}>
      <AccountContent />
    </Suspense>
  );
}
