'use client';

import { Suspense, useState, useCallback } from 'react';
import Link from 'next/link';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useUserProfile } from '@/lib/hooks/useUserProfile';
import { useAlertPreferences, type AlertType } from '@/lib/hooks/useAlertPreferences';
import { toast } from 'sonner';

const MAX_PORTFOLIO_WALLETS = 5;

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

function AccountContent() {
  const { primaryWallet, user, setShowAuthFlow } = useDynamicContext();
  const {
    profile,
    isLoading,
    addPortfolioAddress,
    removePortfolioAddress,
    updateEmail,
    setPrimaryWallet,
    refreshProfile,
  } = useUserProfile();

  const {
    preferences: alertPreferences,
    recentAlerts,
    isLoading: alertsLoading,
    updatePreference,
  } = useAlertPreferences();

  // Local state
  const [newAddress, setNewAddress] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [emailLoaded, setEmailLoaded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [alertConfigs, setAlertConfigs] = useState<Record<string, Record<string, unknown>>>({});
  const [togglingAlert, setTogglingAlert] = useState<string | null>(null);
  const [settingPrimary, setSettingPrimary] = useState<string | null>(null);

  // Sync email from profile on first load
  if (profile && !emailLoaded) {
    setEmail(profile.email ?? '');
    setEmailLoaded(true);
  }

  const walletAddress = primaryWallet?.address ?? '';
  const portfolioAddresses = profile?.portfolioAddresses ?? [];
  const slotsUsed = portfolioAddresses.length;
  const isAtLimit = slotsUsed >= MAX_PORTFOLIO_WALLETS;

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
      <div className="min-h-dvh bg-[var(--gs-black)] text-[var(--gs-white)]">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center py-32">
          <div className="size-20 mx-auto mb-6 rounded-full bg-[var(--gs-dark-2)] border border-white/[0.06] flex items-center justify-center">
            <svg className="size-10 text-[var(--gs-gray-3)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <h1 className="text-balance font-display font-bold text-2xl sm:text-3xl uppercase mb-3">
            Login to Manage Wallets
          </h1>
          <p className="text-pretty font-body text-sm text-[var(--gs-gray-4)] mb-8 max-w-md text-center">
            Login to track up to 5 wallets and manage your portfolio.
          </p>
          <button
            onClick={() => setShowAuthFlow(true)}
            className="font-display font-semibold text-sm uppercase px-8 py-3 bg-[var(--gs-lime)] text-[var(--gs-black)] hover:bg-[var(--gs-lime-hover)] transition-colors"
          >
            Login
          </button>
        </main>
        <Footer />
      </div>
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

                    {/* Wallet list from profile */}
                    {profile && profile.wallets.length > 0 ? (
                      <div className="space-y-0 mb-4">
                        {profile.wallets.map((wallet) => (
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

                {profile && (
                  <p className="font-mono text-data text-[var(--gs-gray-3)]">
                    Member since {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                )}
              </div>
            </section>

            {/* ── Portfolio Wallets ── */}
            <section className="bg-[var(--gs-dark-2)] border border-white/[0.06] overflow-hidden">
              <div className="h-[2px] gradient-accent-line" />
              <div className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <p className="font-mono text-label uppercase tracking-[1.5px] text-[var(--gs-gray-3)]">
                    Portfolio Wallets
                  </p>
                  <p className="font-mono text-data tabular-nums text-[var(--gs-gray-3)]">
                    <span className={slotsUsed > 0 ? 'text-[var(--gs-lime)]' : ''}>{slotsUsed}</span>
                    {' / '}
                    {MAX_PORTFOLIO_WALLETS} used
                  </p>
                </div>

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
                      Your connected wallet is tracked automatically. Add up to {MAX_PORTFOLIO_WALLETS} extra wallets below to see a combined portfolio view.
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
                    Portfolio wallets are aggregated into your combined portfolio view.
                  </p>
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
                        {profile.wallets.length}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </section>

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
